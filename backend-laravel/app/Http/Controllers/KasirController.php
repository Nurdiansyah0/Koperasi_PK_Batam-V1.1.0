<?php

namespace App\Http\Controllers;

use App\Actions\POS\ProcessPosCheckoutAction;
use App\Models\Anggota;
use App\Models\Barang;
use App\Models\JabatanAnggota;
use App\Models\PembayaranHutang;
use App\Models\SerahTerimaKasir;
use App\Models\SetoranKasir;
use App\Models\TarikTunai;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class KasirController extends Controller
{
    private function checkKasir(Request $request)
    {
        if (! $request->user() || ! $request->user()->isKasir()) {
            abort(403, 'Unauthorized: Hanya Kasir atau Admin yang memiliki akses.');
        }

        return $request->user()->user_id;
    }

        public function getDashboard(Request $request, \App\Actions\Kasir\GetCashierDashboardQuery $query)
    {
        $kasirId = $this->checkKasir($request);
        $data = $query->execute($kasirId);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function getTransaksiTerbaru(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $transactions = Transaksi::with('anggota')
            ->where('kasir_id', $kasirId)
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($t) {
                return [
                    'id' => $t->transaksi_id,
                    'transaksi_id' => $t->transaksi_id,
                    'created_at' => $t->created_at ? $t->created_at->toIso8601String() : now()->toIso8601String(),
                    'total_harga' => (float) $t->total_harga,
                    'created_at' => $t->created_at,
                    'metode_pembayaran' => $t->metode_pembayaran,
                    'status' => $t->status,
                    'nama_anggota' => $t->anggota ? $t->anggota->nama_lengkap : 'Non-Anggota',
                ];
            });

        return response()->json(['success' => true, 'data' => $transactions]);
    }

    public function getDataBarangBelanjaKasir(Request $request)
    {
        $this->checkKasir($request);

        $barang = Cache::remember('kasir_barang_catalog', 60, function () {
            return Barang::select('barang_id', 'nama_barang', 'harga_jual', 'stok_toko as stok')
                ->where('stok_toko', '>', 0)
                ->orderBy('nama_barang', 'asc')
                ->get();
        });

        return response()->json(['success' => true, 'data' => $barang]);
    }

    public function getPaketBelanja(Request $request)
    {
        $this->checkKasir($request);

        return (new AnggotaController)->getPaketBelanja($request);
    }

    public function tolakPesananAnggota(Request $request)
    {
        $kasirId = $this->checkKasir($request);

        $transaksiIds = [];
        if ($request->has('transaksi_id')) {
            $transaksiIds[] = $request->transaksi_id;
        } elseif ($request->has('transaksi_ids') && is_array($request->transaksi_ids)) {
            $transaksiIds = $request->transaksi_ids;
        }

        if (empty($transaksiIds)) {
            return response()->json(['success' => false, 'message' => 'Tidak ada ID transaksi'], 400);
        }

        DB::beginTransaction();
        try {
            foreach ($transaksiIds as $tid) {
                $trx = Transaksi::with(['details', 'anggota'])->where('transaksi_id', $tid)->where('status', 'pending')->lockForUpdate()->first();
                if (! $trx) {
                    continue;
                }

                // 1. Restore Stock
                foreach ($trx->details as $detail) {
                    $barang = Barang::find($detail->barang_id);
                    if ($barang) {
                        $barang->stok += $detail->jumlah;
                        $barang->save();
                    }
                }

                // 2. Restore Saldo/Hutang if applicable
                $anggota = $trx->anggota;
                if ($anggota) {
                    if ($trx->metode_pembayaran === 'hutang') {
                        $anggota->hutang -= $trx->total_harga;
                        if ($anggota->hutang < 0) {
                            $anggota->hutang = 0;
                        } // sanity check
                        $anggota->save();
                    } elseif ($trx->metode_pembayaran === 'ewallet' || $trx->metode_pembayaran === 'saldo') {
                        $anggota->saldo += $trx->total_harga;
                        $anggota->save();
                    }

                    // 2b. Restore Tarik Tunai SHU / Saldo if attached
                    $tarik = TarikTunai::where('transaksi_id', $trx->transaksi_id)->where('status', 'pending')->first();
                    if ($tarik) {
                        if ($tarik->sumber_dana === 'shu') {
                            $anggota->shu += $tarik->nominal;
                        } else {
                            $anggota->saldo += $tarik->nominal;
                        }
                        $anggota->save();

                        $tarik->status = 'rejected';
                        $tarik->kasir_id = $kasirId;
                        $tarik->alasan_tolak = 'Pesanan belanja dibatalkan/ditolak oleh kasir.';
                        $tarik->save();
                    }
                }

                // 3. Update Transaction Status
                $trx->status = 'batal';
                $trx->kasir_id = $kasirId;
                $trx->save();
            }

            DB::commit();
            Cache::forget('kasir_barang_catalog');

            return response()->json(['success' => true, 'message' => 'Pesanan berhasil dibatalkan dan saldo dikembalikan']);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getPesananAnggota(Request $request)
    {
        $this->checkKasir($request);

        $pesanan = Transaksi::with(['anggota', 'details.barang', 'tarikTunai'])
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($t) {
                $tarik = $t->tarikTunai; // Already loaded, no extra query

                return [
                    'transaksi_id' => $t->transaksi_id,
                    'anggota_id' => $t->anggota_id,
                    'nama_anggota' => $t->anggota ? $t->anggota->nama_lengkap : 'Unknown',
                    'metode_pembayaran' => $t->metode_pembayaran,
                    'total_harga' => (float) $t->total_harga,
                    'created_at' => $t->created_at,
                    'tarik_tunai' => $tarik ? [
                        'tarik_id' => $tarik->tarik_id,
                        'kode_penarikan' => $tarik->kode_penarikan,
                        'nominal' => (float) $tarik->nominal,
                        'sumber_dana' => $tarik->sumber_dana,
                        'uang_bersih_diserahkan' => max(0, (float) $tarik->nominal - (float) $t->total_harga),
                    ] : null,
                    'items' => $t->details->map(function ($d) {
                        return [
                            'barang_id' => $d->barang_id,
                            'nama_barang' => $d->barang ? $d->barang->nama_barang : '',
                            'jumlah' => $d->jumlah,
                            'harga_satuan' => (float) $d->harga_satuan,
                        ];
                    }),
                ];
            });

        return response()->json(['success' => true, 'data' => $pesanan]);
    }

    public function simpanTransaksiKasir(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $transaksiList = $request->transaksi;

        if (! is_array($transaksiList) || empty($transaksiList)) {
            return response()->json(['success' => false, 'message' => 'Data transaksi kosong'], 400);
        }

        DB::beginTransaction();
        try {
            foreach ($transaksiList as $t) {
                $trx = Transaksi::where('transaksi_id', $t['transaksi_id'])->where('status', 'pending')->first();
                if ($trx) {
                    $trx->status = 'selesai';
                    $trx->kasir_id = $kasirId;
                    $trx->save();

                    // Calculate and Distribute SHU (60% Anggota, 10% & 30% Koperasi)
                    if ($trx->anggota_id && $trx->total_keuntungan > 0) {
                        $anggota = Anggota::find($trx->anggota_id);
                        if ($anggota) {
                            $shu60 = $trx->total_keuntungan * 0.60;
                            $shu10 = $trx->total_keuntungan * 0.10;
                            $shu30 = $trx->total_keuntungan * 0.30;

                            $anggota->shu += $shu60;
                            $anggota->save();

                            // Record to shu_distribusi (Legacy Parity)
                            DB::table('shu_distribusi')->insert([
                                'anggota_id' => $trx->anggota_id,
                                'tahun' => date('Y'),
                                'shu_60_percent' => $shu60,
                                'shu_10_percent' => $shu10,
                                'shu_30_percent' => $shu30,
                                'created_at' => now(),
                            ]);
                        }
                    }

                    // Complete linked Tarik Tunai ticket if attached
                    $tarik = TarikTunai::where('transaksi_id', $trx->transaksi_id)->where('status', 'pending')->first();
                    if ($tarik) {
                        $tarik->status = 'completed';
                        $tarik->kasir_id = $kasirId;
                        $tarik->approved_at = Carbon::now();
                        $tarik->save();
                    }
                }
            }
            DB::commit();
            Cache::forget('kasir_barang_catalog');

            return response()->json(['success' => true, 'message' => 'Pesanan berhasil diselesaikan']);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function buatTransaksiKasir(Request $request, ProcessPosCheckoutAction $action)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate([
            'metode_pembayaran' => 'required|string',
            'items' => 'required|array',
            'items.*.barang_id' => 'required|integer',
            'items.*.jumlah' => 'required|integer|min:1',
        ]);

        try {
            $result = $action->execute($request->all(), $kasirId);

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'transaksi_id' => $result['transaksi_id'],
                'total' => $result['total'],
                'total_keuntungan' => $result['total_keuntungan'],
                'tarik_tunai' => $result['tarik_tunai'],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function getAllAnggota(Request $request)
    {
        $this->checkKasir($request);

        $anggota = Cache::remember('kasir_all_anggota_slim', 120, function () {
            // NOTE: limit_hutang, sisa_limit_hutang, allowance_hutang adalah computed attributes
            // (accessor di Model Anggota via $appends), BUKAN kolom database.
            // Jangan masukkan ke select() — Eloquent akan append otomatis setelah get().
            return Anggota::select(
                'anggota_id', 'user_id', 'nama_lengkap',
                'saldo', 'hutang', 'shu'
            )
                ->with('user:user_id,username')
                ->orderBy('nama_lengkap', 'asc')
                ->get()
                ->map(function ($a) {
                    return [
                        'anggota_id' => $a->anggota_id,
                        'nama_lengkap' => $a->nama_lengkap,
                        'username' => $a->user?->username ?? '',
                        'saldo' => (float) $a->saldo,
                        'hutang' => (float) $a->hutang,
                        'shu' => (float) $a->shu,
                        // Computed via accessor (simpanan_pokok + allowance_hutang):
                        'limit_hutang' => (float) $a->limit_hutang,
                        'sisa_limit_hutang' => (float) $a->sisa_limit_hutang,
                        'allowance_hutang' => (float) $a->allowance_hutang,
                    ];
                });
        });

        return response()->json(['success' => true, 'data' => $anggota]);
    }

    public function cariProfilAnggota(Request $request)
    {
        $this->checkKasir($request);
        $search = $request->search;
        $anggotaId = $request->anggota_id;

        $q = Anggota::query();
        if ($anggotaId) {
            $q->where('anggota_id', $anggotaId);
        } elseif ($search) {
            $q->where(function ($query) use ($search) {
                $query->where('nama_lengkap', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }
        $profil = $q->first();
        if (! $profil) {
            return response()->json(['success' => false, 'message' => 'Anggota tidak ditemukan'], 404);
        }

        return response()->json(['success' => true, 'profil' => $profil]);
    }

    public function getAllPembayaranHutang(Request $request)
    {
        $this->checkKasir($request);
        $pembayaran = PembayaranHutang::with(['anggota', 'kasir'])
            ->orderByRaw("CASE status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 WHEN 'rejected' THEN 3 ELSE 4 END")
            ->orderBy('created_at', 'desc')
            ->get()->map(function ($p) {
                return [
                    'pembayaran_id' => $p->pembayaran_id,
                    'anggota_id' => $p->anggota_id,
                    'nama_anggota' => $p->anggota ? $p->anggota->nama_lengkap : 'Unknown',
                    'nominal' => (float) $p->nominal,
                    'status' => $p->status,
                    'created_at' => $p->created_at->toIso8601String(),
                    'nama_kasir' => $p->kasir ? $p->kasir->username : null,
                ];
            });

        return response()->json(['success' => true, 'data' => $pembayaran]);
    }

    public function approvePembayaranHutang(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate([
            'pembayaran_id' => 'required|integer',
            'action' => 'required|in:approve,reject',
        ]);

        DB::beginTransaction();
        try {
            $pembayaran = PembayaranHutang::lockForUpdate()->find($request->pembayaran_id);
            if (! $pembayaran || $pembayaran->status !== 'pending') {
                throw new \Exception('Data pembayaran tidak valid atau sudah diproses');
            }

            if ($request->action === 'approve') {
                $anggota = Anggota::find($pembayaran->anggota_id);
                $anggota->hutang -= $pembayaran->nominal;
                if ($anggota->hutang < 0) {
                    $anggota->hutang = 0;
                }
                $anggota->save();
                $pembayaran->status = 'approved';
            } else {
                $pembayaran->status = 'rejected';
            }

            $pembayaran->kasir_id = $kasirId;
            $pembayaran->approved_at = Carbon::now();
            $pembayaran->save();

            DB::commit();

            return response()->json(['success' => true, 'message' => 'Pembayaran '.$request->action.'d']);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function getHistoryTransaksi(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $q = Transaksi::with(['anggota', 'kasir', 'details.barang'])->where('kasir_id', $kasirId);

        if ($request->tanggal_awal) {
            $q->whereDate('created_at', '>=', $request->tanggal_awal);
        }
        if ($request->tanggal_akhir) {
            $q->whereDate('created_at', '<=', $request->tanggal_akhir);
        }
        if ($request->jenis_transaksi) {
            $q->where('metode_pembayaran', $request->jenis_transaksi);
        }
        if ($request->status) {
            $q->where('status', $request->status);
        }

        $paginator = $q->orderBy('created_at', 'desc')->paginate(20);

        $paginator->getCollection()->transform(function ($t) {
            return [
                'id' => $t->transaksi_id,
                'transaksi_id' => $t->transaksi_id,
                'anggota_id' => $t->anggota_id,
                'total' => (float) $t->total_harga,
                'total_harga' => (float) $t->total_harga,
                'created_at' => $t->created_at,
                'total_keuntungan' => (float) $t->total_keuntungan,
                'jenis_transaksi' => $t->metode_pembayaran,
                'metode_pembayaran' => $t->metode_pembayaran,
                'status' => $t->status,
                'tanggal' => $t->created_at ? $t->created_at->toIso8601String() : now()->toIso8601String(),
                'created_at' => $t->created_at ? $t->created_at->toIso8601String() : now()->toIso8601String(),
                'nama_anggota' => $t->anggota ? $t->anggota->nama_lengkap : null,
                'nama_kasir' => $t->kasir ? $t->kasir->username : null,
                'details' => $t->details->map(function ($d) {
                    return [
                        'detail_id' => $d->detail_id,
                        'barang_id' => $d->barang_id,
                        'nama_barang' => $d->barang ? $d->barang->nama_barang : 'Barang dihapus',
                        'jumlah' => (int) $d->jumlah,
                        'harga_satuan' => (float) $d->harga_satuan,
                        'subtotal' => (float) $d->subtotal,
                    ];
                })->values()->all(),
            ];
        });

        return response()->json(['success' => true, 'data' => $paginator]);
    }

    public function setorAdmin(Request $request, \App\Actions\CashManagement\SubmitSetoranKasirAction $action)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate(['nominal' => 'required|numeric|min:1']);

        $action->execute($kasirId, $request->nominal);

        return response()->json(['success' => true, 'message' => 'Setoran berhasil diajukan']);
    }

    public function getRiwayatSetoran(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $data = SetoranKasir::where('kasir_id', $kasirId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function cekKelayakanTarikTunai(Request $request, $anggota_id)
    {
        $this->checkKasir($request);
        $anggota = Anggota::find($anggota_id);
        if (! $anggota) {
            return response()->json(['success' => false, 'message' => 'Anggota tidak ditemukan'], 404);
        }

        // Check recent completed transactions today with min Rp 25.000
        $todayTransactions = Transaksi::where('anggota_id', $anggota_id)
            ->where('status', 'selesai')
            ->where('created_at', '>=', Carbon::today())
            ->where('total_harga', '>=', 25000)
            ->orderBy('created_at', 'desc')
            ->get(['transaksi_id', 'total_harga', 'metode_pembayaran', 'created_at']);

        return response()->json([
            'success' => true,
            'data' => [
                'anggota_id' => $anggota->anggota_id,
                'nama_lengkap' => $anggota->nama_lengkap,
                'saldo_ewallet' => (float) $anggota->saldo,
                'saldo_shu' => (float) $anggota->shu,
                'transaksi_valid_hari_ini' => $todayTransactions,
                'has_qualifying_purchase' => $todayTransactions->isNotEmpty(),
                'min_belanja_required' => 25000,
            ],
        ]);
    }

    public function getAntreanTarikTunai(Request $request)
    {
        $this->checkKasir($request);

        $pending = TarikTunai::with(['anggota', 'transaksi'])
            ->where('status', 'pending')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($t) {
                return [
                    'tarik_id' => $t->tarik_id,
                    'kode_penarikan' => $t->kode_penarikan,
                    'anggota_id' => $t->anggota_id,
                    'nama_anggota' => $t->anggota ? $t->anggota->nama_lengkap : 'Anggota',
                    'nominal' => (float) $t->nominal,
                    'sumber_dana' => $t->sumber_dana,
                    'transaksi_id' => $t->transaksi_id,
                    'belanja_nominal' => $t->transaksi ? (float) $t->transaksi->total_harga : 0,
                    'keterangan' => $t->keterangan,
                    'created_at' => $t->created_at,
                ];
            });

        return response()->json(['success' => true, 'data' => $pending]);
    }

    public function prosesTarikTunai(Request $request, \App\Actions\CashManagement\ProsesTarikTunaiAction $action)
    {
        $kasirId = $this->checkKasir($request);
        $validated = $request->validate([
            'tarik_id' => 'required|integer|exists:tarik_tunai,tarik_id',
            'action' => 'required|in:approve,reject',
            'alasan_tolak' => 'nullable|string',
        ]);

        try {
            $result = $action->execute($validated, $kasirId);

            if ($result['status'] === 'rejected') {
                return response()->json([
                    'success' => true,
                    'message' => $result['message'],
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'data' => $result['data']
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
    public function tarikTunai(Request $request, \App\Actions\CashManagement\TarikTunaiAction $action)
    {
        $kasirId = $this->checkKasir($request);
        $validated = $request->validate([
            'nominal' => 'required|numeric|min:1000',
            'anggota_id' => 'required|integer|exists:anggota,anggota_id',
            'sumber_dana' => 'required|in:shu,saldo',
            'persetujuan_shu' => 'nullable|boolean',
            'transaksi_id' => 'nullable|integer|exists:transaksi,transaksi_id',
            'keterangan' => 'nullable|string',
        ]);

        try {
            $result = $action->execute($validated, $kasirId);

            return response()->json([
                'success' => true,
                'message' => 'Tarik tunai sebesar Rp '.number_format($validated['nominal'], 0, ',', '.').' berhasil diproses.',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            // Specifically handling 422 for the consent check as in original
            $status = $e->getCode() === 422 ? 422 : 400;
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], $status);
        }
    }
    public function getRiwayatTarikTunaiKasir(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $data = TarikTunai::with(['anggota', 'transaksi'])
            ->where('kasir_id', $kasirId)
            ->orderBy('created_at', 'desc')
            ->take(50)
            ->get()
            ->map(function ($t) {
                return [
                    'tarik_id' => $t->tarik_id,
                    'anggota_id' => $t->anggota_id,
                    'nama_anggota' => $t->anggota ? $t->anggota->nama_lengkap : 'Anggota',
                    'nominal' => (float) $t->nominal,
                    'sumber_dana' => $t->sumber_dana,
                    'transaksi_id' => $t->transaksi_id,
                    'belanja_nominal' => $t->transaksi ? (float) $t->transaksi->total_harga : 0,
                    'keterangan' => $t->keterangan,
                    'created_at' => $t->created_at,
                ];
            });

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getDaftarKasir(Request $request)
    {
        $this->checkKasir($request);
        $kasirUserIds = JabatanAnggota::where('role', 'kasir')->where('status', 'aktif')->pluck('user_id');
        $kasirs = User::whereIn('user_id', $kasirUserIds)
            ->orWhere('role', 'kasir')
            ->with('anggota')
            ->get()
            ->unique('user_id')
            ->map(function ($u) {
                return [
                    'user_id' => $u->user_id,
                    'username' => $u->username,
                    'nama_lengkap' => $u->anggota ? $u->anggota->nama_lengkap : $u->username,
                ];
            })
            ->values();

        return response()->json(['success' => true, 'data' => $kasirs]);
    }

    public function getSerahTerimaForMe(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $type = $request->query('type', 'all');

        $query = SerahTerimaKasir::with(['kasirFrom', 'kasirTo'])
            ->orderBy('created_at', 'desc');

        if ($type === 'pending') {
            // Pending tasks are only those assigned TO me
            $query->where('kasir_to', $kasirId)->where('status', 'pending');
        } elseif ($type === 'history') {
            // History should include handovers sent TO me AND sent BY me
            $query->where(function ($q) use ($kasirId) {
                $q->where('kasir_to', $kasirId)
                    ->orWhere('kasir_from', $kasirId);
            })->where('status', '!=', 'pending');
        } else {
            // All
            $query->where(function ($q) use ($kasirId) {
                $q->where('kasir_to', $kasirId)
                    ->orWhere('kasir_from', $kasirId);
            });
        }

        $barangsCache = Barang::all()->keyBy('barang_id');

        $paginator = $query->paginate(15);
        $paginator->getCollection()->transform(function ($s) use ($barangsCache) {
            return [
                'serah_id' => $s->serah_id,
                'serah_terima_id' => $s->serah_id,
                'kasir_from' => $s->kasir_from,
                'kasir_to' => $s->kasir_to,
                'kasir_from_name' => $s->kasirFrom ? ($s->kasirFrom->nama_lengkap ?: $s->kasirFrom->username) : '',
                'kasir_from_username' => $s->kasirFrom ? $s->kasirFrom->username : '',
                'kasir_to_name' => $s->kasirTo ? ($s->kasirTo->nama_lengkap ?: $s->kasirTo->username) : '',
                'kasir_to_username' => $s->kasirTo ? $s->kasirTo->username : '',
                'hasil_opname' => $this->parseHasilOpname($s->hasil_opname, $barangsCache),
                'status' => $s->status,
                'alasan_penolakan' => $s->alasan_penolakan,
                'created_at' => $s->created_at,
            ];
        });

        return response()->json(['success' => true, 'data' => $paginator]);
    }

    private function parseHasilOpname($raw, $barangs = null)
    {
        if (empty($raw)) {
            return null;
        }
        if (is_array($raw)) {
            $decoded = $raw;
        } else {
            $decoded = json_decode($raw, true);
            if (! $decoded && is_string($raw)) {
                $decoded = json_decode(stripslashes($raw), true);
                if (! $decoded) {
                    $decoded = json_decode(trim(stripslashes($raw), '"'), true);
                }
            }
        }

        if (! is_array($decoded)) {
            return null;
        }

        // Auto-enrich items with harga_jual, selisih_nominal, risk_badge, and summary stats
        if (isset($decoded['items']) && is_array($decoded['items'])) {
            if ($barangs === null) {
                $itemIds = array_filter(array_column($decoded['items'], 'barang_id'));
                $barangs = ! empty($itemIds) ? Barang::whereIn('barang_id', $itemIds)->get()->keyBy('barang_id') : collect();
            }

            $totalMinusNominal = 0;
            $barangSelisih = 0;

            foreach ($decoded['items'] as &$it) {
                $bId = $it['barang_id'] ?? null;
                $b = $bId ? $barangs->get($bId) : null;
                if (! isset($it['harga_jual']) || $it['harga_jual'] == 0) {
                    $it['harga_jual'] = $b ? (float) $b->harga_jual : 0;
                }
                if (! isset($it['risk_badge'])) {
                    $nameLower = strtolower($it['nama_barang'] ?? '');
                    if (str_contains($nameLower, 'rokok') || str_contains($nameLower, 'samsu') || str_contains($nameLower, 'surya') || str_contains($nameLower, 'mild') || str_contains($nameLower, 'sampoerna') || str_contains($nameLower, 'camel') || str_contains($nameLower, 'djarum')) {
                        $it['risk_badge'] = 'Rokok';
                    } elseif (($it['selisih'] ?? 0) != 0) {
                        $it['risk_badge'] = 'Riwayat Minus';
                    } else {
                        $it['risk_badge'] = 'Cycle Count';
                    }
                }
                $selisih = $it['selisih'] ?? 0;
                if ($selisih != 0) {
                    $barangSelisih++;
                }
                $it['selisih_nominal'] = $selisih * ($it['harga_jual'] ?? 0);
                if ($selisih < 0) {
                    $totalMinusNominal += abs($it['selisih_nominal']);
                }
            }
            unset($it);

            if (! isset($decoded['summary']) || ! is_array($decoded['summary'])) {
                $decoded['summary'] = [];
            }
            $decoded['summary']['barangSelisih'] = $barangSelisih;
            $decoded['summary']['totalMinusNominal'] = $totalMinusNominal;
        }

        return $decoded;
    }

    public function getSerahTerimaDraft(Request $request, \App\Actions\CashManagement\CalculateSerahTerimaDraftAction $action)
    {
        $kasirId = $this->checkKasir($request);
        
        $data = $action->execute($kasirId);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
    public function createSerahTerima(Request $request, \App\Actions\CashManagement\CreateSerahTerimaAction $action)
    {
        $kasirId = $this->checkKasir($request);
        
        // We capture all to pass implicit payloads
        $allData = $request->all();

        try {
            $data = $action->execute($allData, $kasirId);

            return response()->json([
                'success' => true,
                'message' => 'Serah terima berhasil dibuat',
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            $status = $e->getCode() == 400 ? 400 : 500;
            return response()->json(['success' => false, 'message' => $e->getMessage()], $status);
        }
    }
    public function approveSerahTerima(Request $request, \App\Actions\CashManagement\ApproveSerahTerimaAction $action)
    {
        $kasirId = $this->checkKasir($request);

        try {
            $action->execute((int)$request->serah_id, $kasirId);

            return response()->json([
                'success' => true,
                'message' => 'Shift operasional disetujui dan stok fisik berhasil disinkronkan ke sistem',
            ]);
        } catch (\Exception $e) {
            if ($e->getCode() == 400) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
            }
            return response()->json(['success' => false, 'message' => 'Gagal menyetujui shift: '.$e->getMessage()], 500);
        }
    }
    public function rejectSerahTerima(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate([
            'serah_id' => 'required',
            'alasan_penolakan' => 'nullable|string',
            'alasan' => 'nullable|string',
        ]);

        $alasan = $request->alasan_penolakan ?: $request->alasan;
        if (empty($alasan)) {
            return response()->json(['success' => false, 'message' => 'Alasan penolakan wajib diisi secara jelas'], 422);
        }

        DB::beginTransaction();
        try {
            $st = SerahTerimaKasir::where('serah_id', $request->serah_id)
                ->where('kasir_to', $kasirId)
                ->lockForUpdate()
                ->first();

            if (! $st || $st->status !== 'pending') {
                DB::rollBack();

                return response()->json(['success' => false, 'message' => 'Data tidak valid atau sudah diproses'], 400);
            }

            $st->status = 'rejected';
            $st->alasan_penolakan = $alasan;
            $st->save();

            DB::commit();

            return response()->json(['success' => true, 'message' => 'Serah terima shift berhasil ditolak']);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['success' => false, 'message' => 'Gagal menolak shift: '.$e->getMessage()], 500);
        }
    }

    public function getActiveShiftInfo(Request $request)
    {
        $kasirId = $this->checkKasir($request);

        // Find latest approved handover where current user is the receiver
        $latestHandover = SerahTerimaKasir::with(['kasirFrom', 'kasirTo'])
            ->where('kasir_to', $kasirId)
            ->where('status', 'approved')
            ->orderBy('created_at', 'desc')
            ->first();

        // Also check if current user has an unapproved outgoing handover
        $pendingOutgoing = SerahTerimaKasir::where('kasir_from', $kasirId)
            ->where('status', 'pending')
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'latest_incoming' => $latestHandover ? [
                    'serah_id' => $latestHandover->serah_id,
                    'kasir_from_name' => $latestHandover->kasirFrom ? ($latestHandover->kasirFrom->nama_lengkap ?: $latestHandover->kasirFrom->username) : 'Kasir',
                    'kasir_from_username' => $latestHandover->kasirFrom ? $latestHandover->kasirFrom->username : '',
                    'kasir_to_name' => $latestHandover->kasirTo ? ($latestHandover->kasirTo->nama_lengkap ?: $latestHandover->kasirTo->username) : 'Anda',
                    'kasir_to_username' => $latestHandover->kasirTo ? $latestHandover->kasirTo->username : '',
                    'hasil_opname' => $this->parseHasilOpname($latestHandover->hasil_opname),
                    'created_at' => $latestHandover->created_at,
                ] : null,
                'has_pending_outgoing' => $pendingOutgoing ? true : false,
            ],
        ]);
    }

    /**
     * ── REAL-TIME ORDER STREAM (Server-Sent Events / SSE) ──
     * 0s-Latency push notification channel to active cashier on shift.
     */
    public function orderStream(Request $request)
    {
        $kasirId = $this->checkKasir($request);

        // Check if cashier has an active accepted shift or is admin
        $hasActiveShift = SerahTerimaKasir::where('kasir_to', $kasirId)
            ->where('status', 'approved')
            ->exists() || ($request->user() && $request->user()->isAdmin());

        return response()->stream(function () use ($kasirId, $hasActiveShift) {
            // Close PHP session lock immediately to allow other concurrent requests from this user
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_write_close();
            }

            @set_time_limit(35);
            @ignore_user_abort(false);

            $lastPushedTime = microtime(true);
            $maxExecutionSeconds = 25; // Reconnect smoothly every 25s
            $startTime = time();

            // Initial connection greeting
            echo "event: connected\n";
            echo 'data: '.json_encode([
                'status' => 'CONNECTED',
                'kasir_id' => $kasirId,
                'has_active_shift' => $hasActiveShift,
                'server_time' => now()->toIso8601String(),
            ])."\n\n";
            @ob_flush();
            @flush();

            while ((time() - $startTime) < $maxExecutionSeconds) {
                // If connection aborted by client
                if (connection_aborted()) {
                    break;
                }

                // Check Cache for latest order event
                $latestEvent = Cache::get('koperasi_latest_order_event');
                $eventTime = (float) Cache::get('koperasi_latest_order_timestamp', 0);

                if ($latestEvent && $eventTime > $lastPushedTime) {
                    $lastPushedTime = $eventTime;

                    echo "event: new_order\n";
                    echo 'data: '.json_encode([
                        'type' => 'NEW_ORDER',
                        'has_active_shift' => $hasActiveShift,
                        'order' => $latestEvent,
                    ])."\n\n";

                    @ob_flush();
                    @flush();
                }

                // Heartbeat ping every 5 seconds to keep connection alive
                if ((time() - $startTime) % 5 === 0) {
                    echo "event: heartbeat\n";
                    echo 'data: '.json_encode(['timestamp' => time()])."\n\n";
                    @ob_flush();
                    @flush();
                }

                usleep(300000); // 300ms sleep for micro-latency response
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
            'Access-Control-Allow-Origin' => '*',
        ]);
    }

    /**
     * Fast-polling & Delta Sync Fallback endpoint
     */
    public function getLatestPendingOrders(Request $request)
    {
        $kasirId = $this->checkKasir($request);

        $hasActiveShift = SerahTerimaKasir::where('kasir_to', $kasirId)
            ->where('status', 'approved')
            ->exists() || ($request->user() && $request->user()->isAdmin());

        $pendingOrders = Transaksi::with(['anggota', 'details.barang'])
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($t) {
                $itemsSummary = $t->details->map(function ($d) {
                    return $d->jumlah.'x '.($d->barang ? $d->barang->nama_barang : 'Item');
                })->implode(', ');

                return [
                    'transaksi_id' => $t->transaksi_id,
                    'anggota_id' => $t->anggota_id,
                    'nama_anggota' => $t->anggota ? $t->anggota->nama_lengkap : 'Anggota #'.$t->anggota_id,
                    'username' => $t->anggota ? $t->anggota->username : '',
                    'total_harga' => (float) $t->total_harga,
                    'metode_pembayaran' => $t->metode_pembayaran,
                    'items_count' => $t->details->count(),
                    'items_summary' => $itemsSummary,
                    'created_at' => $t->created_at ? $t->created_at->toIso8601String() : null,
                ];
            });

        return response()->json([
            'success' => true,
            'is_active_shift' => $hasActiveShift,
            'pending_count' => $pendingOrders->count(),
            'latest_order' => $pendingOrders->first(),
            'orders' => $pendingOrders,
            'server_timestamp' => microtime(true),
        ]);
    }

    /**
     * Simulate / Test incoming order push notification
     */
    public function testOrderNotification(Request $request)
    {
        $this->checkKasir($request);

        $dummyMember = Anggota::first();
        $dummyItems = Barang::where('stok', '>', 0)->limit(2)->get();

        $namaAnggota = $dummyMember ? $dummyMember->nama_lengkap : 'Zulkarnain';
        $itemsSummary = $dummyItems->count() > 0
            ? $dummyItems->map(fn ($b) => '1x '.$b->nama_barang)->implode(', ')
            : '2x Kopi, 1x Samsu';
        $totalHarga = $dummyItems->sum('harga_jual') ?: 25500;

        $testEvent = [
            'transaksi_id' => rand(9000, 9999),
            'anggota_id' => $dummyMember ? $dummyMember->anggota_id : 2,
            'nama_anggota' => $namaAnggota,
            'username' => $dummyMember ? $dummyMember->username : 'zulkarnain',
            'total_harga' => (float) $totalHarga,
            'metode_pembayaran' => 'hutang',
            'items_count' => max(1, $dummyItems->count()),
            'items_summary' => $itemsSummary,
            'items' => [
                ['barang_id' => 1, 'nama_barang' => 'Kopi', 'jumlah' => 2, 'harga_satuan' => 3500, 'subtotal' => 7000],
                ['barang_id' => 2, 'nama_barang' => 'Samsu', 'jumlah' => 1, 'harga_satuan' => 22000, 'subtotal' => 22000],
            ],
            'created_at' => now()->toIso8601String(),
            'timestamp' => microtime(true),
            'is_test' => true,
        ];

        Cache::put('koperasi_latest_order_event', $testEvent, 120);
        Cache::put('koperasi_latest_order_timestamp', microtime(true), 120);

        return response()->json([
            'success' => true,
            'message' => 'Test event notifikasi berhasil di-broadcast ke seluruh kasir aktif!',
            'data' => $testEvent,
        ]);
    }
    public function storePushSubscription(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['success' => false], 401);
        
        $request->validate([
            'endpoint' => 'required',
            'keys.auth' => 'required',
            'keys.p256dh' => 'required'
        ]);

        $user->updatePushSubscription(
            $request->endpoint,
            $request->keys['p256dh'],
            $request->keys['auth']
        );

        return response()->json(['success' => true]);
    }

    public function deletePushSubscription(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['success' => false], 401);
        
        $request->validate(['endpoint' => 'required']);
        $user->deletePushSubscription($request->endpoint);

        return response()->json(['success' => true]);
    }
}
