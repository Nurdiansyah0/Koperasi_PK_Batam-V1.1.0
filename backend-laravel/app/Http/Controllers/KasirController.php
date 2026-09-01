<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Barang;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\Anggota;
use App\Models\User;
use App\Models\PembayaranHutang;
use App\Models\SetoranKasir;
use App\Models\SerahTerimaKasir;
use App\Models\TarikTunai;
use Carbon\Carbon;

class KasirController extends Controller
{
    private function checkKasir(Request $request) {
        if ($request->user()->role !== 'kasir' && $request->user()->role !== 'admin') {
            abort(403, 'Unauthorized');
        }
        return $request->user()->user_id;
    }

        public function getDashboard(Request $request)
    {
        $kasirId = $this->checkKasir($request);

        $penjualanHariIni = Transaksi::where('kasir_id', $kasirId)
            ->whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')
            ->sum('total_harga');

        $transaksiHariIni = Transaksi::where('kasir_id', $kasirId)
            ->whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')
            ->count();

        // Saldo Kas is a running tally of all physical cash held by this Kasir
        $cashInTrx = Transaksi::where('kasir_id', $kasirId)
            ->where('status', 'selesai')
            ->whereIn('metode_pembayaran', ['cash', 'tunai'])
            ->sum('total_harga');

        $cashInSerah = \App\Models\SerahTerimaKasir::where('kasir_to', $kasirId)
            ->where('status', 'approved')
            ->get()
            ->sum(function($s) { return $s->hasil_opname['uang_fisik'] ?? 0; });

        $cashOutSerah = \App\Models\SerahTerimaKasir::where('kasir_from', $kasirId)
            ->where('status', 'approved')
            ->get()
            ->sum(function($s) { return $s->hasil_opname['uang_fisik'] ?? 0; });

        $cashOutSetor = \App\Models\SetoranKasir::where('kasir_id', $kasirId)
            ->where('status', 'approved')
            ->sum('nominal');

        $cashDebtRepay = \Illuminate\Support\Facades\DB::table('pembayaran_hutang')
            ->where('kasir_id', $kasirId)
            ->where('status', 'approved')
            ->where('metode_pembayaran', 'cash')
            ->sum('nominal');

        $cashWithdrawals = \Illuminate\Support\Facades\DB::table('tarik_tunai')
            ->where('kasir_id', $kasirId)
            ->sum('nominal');

        $uangCashMasuk = $cashInTrx + $cashDebtRepay + $cashInSerah - $cashWithdrawals - $cashOutSerah - $cashOutSetor;

        $pendingSerahTerima = SerahTerimaKasir::where('kasir_to', $kasirId)
            ->where('status', 'pending')
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_pendapatan_hari_ini' => (float) $penjualanHariIni,
                'total_transaksi_hari_ini' => (int) $transaksiHariIni,
                'saldo_kas' => (float) $uangCashMasuk,
                'pending_serah_terima' => (int) $pendingSerahTerima,
                
                // Keep old keys just in case
                'totalPenjualanHariIni' => (float) $penjualanHariIni,
                'totalTransaksiHariIni' => (int) $transaksiHariIni,
            ]
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
            ->map(function($t) {
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
        $barang = Barang::select('barang_id', 'nama_barang', 'harga_jual', 'stok', 'harga_modal')
            ->where('stok', '>', 0)->get();
        return response()->json(['success' => true, 'data' => $barang]);
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
                if (!$trx) continue;

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
                        if ($anggota->hutang < 0) $anggota->hutang = 0; // sanity check
                        $anggota->save();
                    } elseif ($trx->metode_pembayaran === 'ewallet' || $trx->metode_pembayaran === 'saldo') {
                        $anggota->saldo += $trx->total_harga;
                        $anggota->save();
                    }
                }

                // 3. Update Transaction Status
                $trx->status = 'batal';
                $trx->kasir_id = $kasirId;
                $trx->save();
            }

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Pesanan berhasil dibatalkan']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getPesananAnggota(Request $request)
    {
        $this->checkKasir($request);
        $pesanan = Transaksi::with(['anggota', 'details.barang'])
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get()->map(function($t) {
                return [
                    'transaksi_id' => $t->transaksi_id,
                    'anggota_id' => $t->anggota_id,
                    'nama_anggota' => $t->anggota ? $t->anggota->nama_lengkap : 'Unknown',
                    'metode_pembayaran' => $t->metode_pembayaran,
                    'total_harga' => (float) $t->total_harga,
                    'created_at' => $t->created_at,
                    'items' => $t->details->map(function($d) {
                        return [
                            'barang_id' => $d->barang_id,
                            'nama_barang' => $d->barang ? $d->barang->nama_barang : '',
                            'jumlah' => $d->jumlah,
                            'harga_satuan' => (float) $d->harga_satuan,
                        ];
                    })
                ];
            });
        return response()->json(['success' => true, 'data' => $pesanan]);
    }

    public function simpanTransaksiKasir(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $transaksiList = $request->transaksi;

        if (!is_array($transaksiList) || empty($transaksiList)) {
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
                        $anggota = \App\Models\Anggota::find($trx->anggota_id);
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
                }
            }
            DB::commit();
            return response()->json(['success' => true, 'message' => 'Pesanan berhasil diselesaikan']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function buatTransaksiKasir(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate([
            'metode_pembayaran' => 'required|string',
            'items' => 'required|array',
            'items.*.barang_id' => 'required|integer',
            'items.*.jumlah' => 'required|integer|min:1',
        ]);

        DB::beginTransaction();
        try {
            $totalHarga = 0;
            $totalKeuntungan = 0;
            $transaksiItems = [];

            foreach ($request->items as $item) {
                $barang = Barang::where('barang_id', $item['barang_id'])->lockForUpdate()->first();
                if (!$barang || $barang->stok < $item['jumlah']) {
                    throw new \Exception("Stok tidak mencukupi untuk barang ID: " . $item['barang_id']);
                }
                
                $harga_satuan = $item['harga_satuan'] ?? $barang->harga_jual;
                $subtotal = $harga_satuan * $item['jumlah'];
                $keuntungan = ($harga_satuan - $barang->harga_modal) * $item['jumlah'];

                $totalHarga += $subtotal;
                $totalKeuntungan += $keuntungan;

                $transaksiItems[] = [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => $item['jumlah'],
                    'harga_satuan' => $harga_satuan,
                    'subtotal' => $subtotal,
                    'keuntungan' => $keuntungan,
                ];

                $barang->stok -= $item['jumlah'];
                $barang->save();
            }

            $anggota_id = $request->anggota_id ?: null;
            if ($request->metode_pembayaran === 'ewallet') {
                if (!$anggota_id) throw new \Exception("Pembayaran dengan saldo (ewallet) harus memilih anggota");
                $anggota = Anggota::lockForUpdate()->find($anggota_id);
                if (!$anggota) throw new \Exception("Anggota tidak ditemukan");
                if ($anggota->hutang > 0) {
                    throw new \Exception("Gagal: Anggota ini masih memiliki tunggakan hutang. Harap lunasi terlebih dahulu.");
                }
                if ($anggota->saldo < $totalHarga) {
                    throw new \Exception("Gagal: Saldo tidak mencukupi. Saldo tersedia: Rp " . number_format($anggota->saldo, 0, ',', '.'));
                }
                $anggota->saldo -= $totalHarga;
                $anggota->save();
            }

            if ($request->metode_pembayaran === 'hutang') {
                if (!$anggota_id) throw new \Exception("Hutang harus memilih anggota");
                $anggota = Anggota::lockForUpdate()->find($anggota_id);
                if (!$anggota) throw new \Exception("Anggota tidak ditemukan");
                $limit_hutang = $anggota->saldo + 100000; // Saldo + 100k allowance
                if (($anggota->hutang + $totalHarga) > $limit_hutang) {
                    $sisa_limit = $limit_hutang - $anggota->hutang;
                    throw new \Exception("Gagal: Limit hutang Koperasi tidak mencukupi. Sisa limit Anda: Rp " . number_format($sisa_limit, 0, ',', '.'));
                }
                $anggota->hutang += $totalHarga;
                $anggota->save();
            }

            $transaksi = Transaksi::create([
                'anggota_id' => $anggota_id,
                'kasir_id' => $kasirId,
                'total_harga' => $totalHarga,
                'total_keuntungan' => $totalKeuntungan,
                'metode_pembayaran' => $request->metode_pembayaran,
                'status' => 'selesai',
            ]);

            foreach ($transaksiItems as $tItem) {
                $tItem['transaksi_id'] = $transaksi->transaksi_id;
                TransaksiDetail::create($tItem);
            }

            // Calculate and Distribute SHU (60% Anggota, 10% & 30% Koperasi)
            if ($anggota_id && $totalKeuntungan > 0) {
                $anggota = \App\Models\Anggota::find($anggota_id);
                if ($anggota) {
                    $shu60 = $totalKeuntungan * 0.60;
                    $shu10 = $totalKeuntungan * 0.10;
                    $shu30 = $totalKeuntungan * 0.30;
                    
                    $anggota->shu += $shu60;
                    $anggota->save();

                    // Record to shu_distribusi (Legacy Parity)
                    DB::table('shu_distribusi')->insert([
                        'anggota_id' => $anggota_id,
                        'tahun' => date('Y'),
                        'shu_60_percent' => $shu60,
                        'shu_10_percent' => $shu10,
                        'shu_30_percent' => $shu30,
                        'created_at' => now(),
                    ]);
                }
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil',
                'transaksi_id' => $transaksi->transaksi_id,
                'total' => $totalHarga,
                'total_keuntungan' => $totalKeuntungan
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function getAllAnggota(Request $request)
    {
        $this->checkKasir($request);
        $anggota = Anggota::orderBy('nama_lengkap', 'asc')->get();
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
            $q->where(function($query) use ($search) {
                $query->where('nama_lengkap', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
            });
        }
        $profil = $q->first();
        if (!$profil) {
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
            ->get()->map(function($p) {
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
            'action' => 'required|in:approve,reject'
        ]);

        DB::beginTransaction();
        try {
            $pembayaran = PembayaranHutang::lockForUpdate()->find($request->pembayaran_id);
            if (!$pembayaran || $pembayaran->status !== 'pending') {
                throw new \Exception("Data pembayaran tidak valid atau sudah diproses");
            }

            if ($request->action === 'approve') {
                $anggota = Anggota::find($pembayaran->anggota_id);
                $anggota->hutang -= $pembayaran->nominal;
                if ($anggota->hutang < 0) $anggota->hutang = 0;
                $anggota->save();
                $pembayaran->status = 'approved';
            } else {
                $pembayaran->status = 'rejected';
            }

            $pembayaran->kasir_id = $kasirId;
            $pembayaran->approved_at = Carbon::now();
            $pembayaran->save();

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Pembayaran ' . $request->action . 'd']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function getHistoryTransaksi(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $q = Transaksi::with(['anggota', 'kasir', 'details.barang'])->where('kasir_id', $kasirId);
        
        if ($request->tanggal_awal) $q->whereDate('created_at', '>=', $request->tanggal_awal);
        if ($request->tanggal_akhir) $q->whereDate('created_at', '<=', $request->tanggal_akhir);
        if ($request->jenis_transaksi) $q->where('metode_pembayaran', $request->jenis_transaksi);
        if ($request->status) $q->where('status', $request->status);

        $paginator = $q->orderBy('created_at', 'desc')->paginate(20);
        
        $paginator->getCollection()->transform(function($t) {
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
                'details' => $t->details->map(function($d) {
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

    public function setorAdmin(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate(['nominal' => 'required|numeric|min:1']);
        
        SetoranKasir::create([
            'kasir_id' => $kasirId,
            'nominal' => $request->nominal,
            'status' => 'pending',
            'created_at' => Carbon::now()
        ]);
        return response()->json(['success' => true, 'message' => 'Setoran berhasil diajukan']);
    }

    public function getRiwayatSetoran(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $data = \App\Models\SetoranKasir::where('kasir_id', $kasirId)
                ->orderBy('created_at', 'desc')
                ->get();
        return response()->json(['success' => true, 'data' => $data]);
    }


    public function tarikTunai(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate([
            'nominal' => 'required|numeric|min:1',
            'anggota_id' => 'required|integer'
        ]);

        DB::beginTransaction();
        try {
            $anggota = Anggota::lockForUpdate()->find($request->anggota_id);
            if (!$anggota) throw new \Exception("Anggota tidak ditemukan");

            if ($anggota->saldo < $request->nominal) throw new \Exception("Saldo tidak mencukupi");

            $anggota->saldo -= $request->nominal;
            $anggota->save();

            // Store Tarik Tunai logic if we want to save it, assuming there's a table for it
            DB::table('tarik_tunai')->insert([
                'kasir_id' => $kasirId,
                'anggota_id' => $anggota->anggota_id,
                'nominal' => $request->nominal,
                'created_at' => Carbon::now()
            ]);

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Tarik tunai berhasil diproses']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function getDaftarKasir(Request $request)
    {
        $this->checkKasir($request);
        $kasirs = User::where('role', 'kasir')->get()->map(function($u) {
            return [
                'user_id' => $u->user_id,
                'username' => $u->username,
                'nama_lengkap' => $u->username,
            ];
        });
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

        $paginator = $query->paginate(15);
        $paginator->getCollection()->transform(function($s) {
            return [
                'serah_id' => $s->serah_id,
                'kasir_from' => $s->kasir_from,
                'kasir_to' => $s->kasir_to,
                'kasir_from_name' => $s->kasirFrom ? $s->kasirFrom->username : '',
                'kasir_to_username' => $s->kasirTo ? $s->kasirTo->username : '',
                'hasil_opname' => $s->hasil_opname,
                'status' => $s->status,
                'created_at' => $s->created_at,
            ];
        });
        
        return response()->json(['success' => true, 'data' => $paginator]);
    }

    public function getSerahTerimaDraft(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $kasirList = User::where('role', 'kasir')->where('user_id', '!=', $kasirId)->select('user_id', 'username')->get();
        $highValueItems = Barang::orderBy('harga_jual', 'desc')->take(20)->get();
        $randomItems = $highValueItems->count() > 5 ? $highValueItems->random(5)->values() : $highValueItems;
        return response()->json([
            'success' => true,
            'data' => [
                'kasir_list' => $kasirList,
                'cycle_count_items' => $randomItems
            ]
        ]);
    }

    public function createSerahTerima(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate([
            'kasir_to' => 'required|integer',
            'hasil_opname' => 'required'
        ]);
        
        if ($kasirId == $request->kasir_to) {
            return response()->json(['success' => false, 'message' => 'Tidak bisa serah terima ke diri sendiri'], 400);
        }

        SerahTerimaKasir::create([
            'kasir_from' => $kasirId,
            'kasir_to' => $request->kasir_to,
            'hasil_opname' => is_string($request->hasil_opname) ? json_decode($request->hasil_opname, true) : $request->hasil_opname,
            'status' => 'pending',
            'created_at' => Carbon::now()
        ]);
        return response()->json(['success' => true, 'message' => 'Serah terima berhasil dibuat']);
    }

    public function approveSerahTerima(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $st = SerahTerimaKasir::where('serah_id', $request->serah_id)->where('kasir_to', $kasirId)->first();
        if (!$st || $st->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'Data tidak valid'], 400);
        }
        $st->status = 'approved';
        $st->save();
        return response()->json(['success' => true, 'message' => 'Opname disetujui']);
    }

    public function rejectSerahTerima(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $st = SerahTerimaKasir::where('serah_id', $request->serah_id)->where('kasir_to', $kasirId)->first();
        if (!$st || $st->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'Data tidak valid'], 400);
        }
        $st->status = 'rejected';
        $st->alasan_penolakan = $request->alasan;
        $st->save();
        return response()->json(['success' => true, 'message' => 'Opname ditolak']);
    }
}
