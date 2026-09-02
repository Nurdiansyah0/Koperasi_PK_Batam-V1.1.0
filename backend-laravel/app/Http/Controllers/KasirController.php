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
use App\Models\JabatanAnggota;
use Carbon\Carbon;

class KasirController extends Controller
{
    private function checkKasir(Request $request) {
        if (!$request->user() || !$request->user()->isKasir()) {
            abort(403, 'Unauthorized: Hanya Kasir atau Admin yang memiliki akses.');
        }
        return $request->user()->user_id;
    }

    private function calculateSaldoKasKasir(int $kasirId): float
    {
        $cashInTrx = Transaksi::where('kasir_id', $kasirId)
            ->where('status', 'selesai')
            ->whereIn('metode_pembayaran', ['cash', 'tunai'])
            ->sum('total_harga');

        $cashInSerah = \App\Models\SerahTerimaKasir::where('kasir_to', $kasirId)
            ->where('status', 'approved')
            ->pluck('hasil_opname')
            ->sum(function($h) {
                if (is_string($h)) $h = json_decode($h, true);
                return $h['uang_fisik'] ?? 0;
            });

        $cashOutSerah = \App\Models\SerahTerimaKasir::where('kasir_from', $kasirId)
            ->where('status', 'approved')
            ->pluck('hasil_opname')
            ->sum(function($h) {
                if (is_string($h)) $h = json_decode($h, true);
                return $h['uang_fisik'] ?? 0;
            });

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

        return (float) ($cashInTrx + $cashDebtRepay + $cashInSerah - $cashWithdrawals - $cashOutSerah - $cashOutSetor);
    }

    public function getDashboard(Request $request)
    {
        $kasirId = $this->checkKasir($request);

        $penjualanHariIni = Transaksi::where('kasir_id', $kasirId)
            ->whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')
            ->sum('total_harga');

        $transaksiHariIniIds = Transaksi::where('kasir_id', $kasirId)
            ->whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')
            ->pluck('transaksi_id');

        $transaksiHariIni = $transaksiHariIniIds->count();
        $itemTerjualHariIni = $transaksiHariIni > 0 
            ? (int) TransaksiDetail::whereIn('transaksi_id', $transaksiHariIniIds)->sum('jumlah')
            : 0;

        $totalTransaksiDilayani = Transaksi::where('kasir_id', $kasirId)
            ->where('status', 'selesai')
            ->count();

        $uangCashMasuk = $this->calculateSaldoKasKasir($kasirId);

        $pendingSerahTerima = SerahTerimaKasir::where('kasir_to', $kasirId)
            ->where('status', 'pending')
            ->count();

        $pendingPesanan = Transaksi::where('status', 'pending')->count();

        $pendingHutang = \Illuminate\Support\Facades\DB::table('pembayaran_hutang')
            ->where('status', 'pending')
            ->count();

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
                    'metode_pembayaran' => $t->metode_pembayaran,
                    'status' => $t->status,
                    'nama_anggota' => $t->anggota ? $t->anggota->nama_lengkap : 'Non-Anggota',
                ];
            });

        $latestHandover = SerahTerimaKasir::with(['kasirFrom', 'kasirTo'])
            ->where('kasir_to', $kasirId)
            ->where('status', 'approved')
            ->orderBy('created_at', 'desc')
            ->first();

        $activeShift = $latestHandover ? [
            'serah_id' => $latestHandover->serah_id,
            'kasir_from_name' => $latestHandover->kasirFrom ? ($latestHandover->kasirFrom->nama_lengkap ?: $latestHandover->kasirFrom->username) : 'Kasir',
            'kasir_from_username' => $latestHandover->kasirFrom ? $latestHandover->kasirFrom->username : '',
            'kasir_to_name' => $latestHandover->kasirTo ? ($latestHandover->kasirTo->nama_lengkap ?: $latestHandover->kasirTo->username) : 'Anda',
            'kasir_to_username' => $latestHandover->kasirTo ? $latestHandover->kasirTo->username : '',
            'hasil_opname' => $this->parseHasilOpname($latestHandover->hasil_opname),
            'created_at' => $latestHandover->created_at,
        ] : null;

        return response()->json([
            'success' => true,
            'data' => [
                'total_pendapatan_hari_ini' => (float) $penjualanHariIni,
                'total_transaksi_hari_ini' => (int) $transaksiHariIni,
                'total_item_terjual_hari_ini' => (int) $itemTerjualHariIni,
                'total_transaksi_dilayani' => (int) $totalTransaksiDilayani,
                'saldo_kas' => (float) $uangCashMasuk,
                'pending_serah_terima' => (int) $pendingSerahTerima,
                'pending_pesanan' => (int) $pendingPesanan,
                'pending_hutang' => (int) $pendingHutang,
                'transaksi_terbaru' => $transactions,
                'active_shift' => $activeShift,
                
                // Keep old keys just in case
                'totalPenjualanHariIni' => (float) $penjualanHariIni,
                'totalTransaksiHariIni' => (int) $transaksiHariIni,
                'totalTransaksiDilayani' => (int) $totalTransaksiDilayani,
                'totalItemTerjualHariIni' => (int) $itemTerjualHariIni,
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
            ->map(function($t) {
                $tarik = $t->tarikTunai; // Already loaded, no extra query
                return [
                    'transaksi_id'      => $t->transaksi_id,
                    'anggota_id'        => $t->anggota_id,
                    'nama_anggota'      => $t->anggota ? $t->anggota->nama_lengkap : 'Unknown',
                    'metode_pembayaran' => $t->metode_pembayaran,
                    'total_harga'       => (float) $t->total_harga,
                    'created_at'        => $t->created_at,
                    'tarik_tunai'       => $tarik ? [
                        'tarik_id'                => $tarik->tarik_id,
                        'kode_penarikan'          => $tarik->kode_penarikan,
                        'nominal'                 => (float) $tarik->nominal,
                        'sumber_dana'             => $tarik->sumber_dana,
                        'uang_bersih_diserahkan'  => max(0, (float) $tarik->nominal - (float) $t->total_harga)
                    ] : null,
                    'items' => $t->details->map(function($d) {
                        return [
                            'barang_id'    => $d->barang_id,
                            'nama_barang'  => $d->barang ? $d->barang->nama_barang : '',
                            'jumlah'       => $d->jumlah,
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
            if (!$anggota_id) {
                throw new \Exception("Transaksi belanja wajib memilih Anggota Koperasi (semua transaksi khusus anggota).");
            }
            $anggota = Anggota::lockForUpdate()->find($anggota_id);
            if (!$anggota) {
                throw new \Exception("Data Anggota Koperasi tidak ditemukan.");
            }

            if ($request->metode_pembayaran === 'ewallet') {
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
                $sisa_limit = (float) $anggota->sisa_limit_hutang;
                if ($totalHarga > $sisa_limit) {
                    throw new \Exception("Gagal: Total belanja Rp " . number_format($totalHarga, 0, ',', '.') . " melebihi sisa limit hutang Rp " . number_format($sisa_limit, 0, ',', '.'));
                }
                $anggota->hutang += $totalHarga;
                $anggota->save();
            }

            $tarikTunaiData = null;
            if (!empty($request->sertakan_tarik_tunai) && (float) $request->tarik_tunai_nominal > 0) {
                if (!$anggota_id) throw new \Exception("Tarik tunai saat belanja wajib memilih data anggota.");
                
                $anggota = Anggota::lockForUpdate()->find($anggota_id);
                if (!$anggota) throw new \Exception("Anggota tidak ditemukan");

                // 1. Debt check
                if ((float) $anggota->hutang > 0) {
                    throw new \Exception("Gagal: Anggota memiliki tagihan hutang berjalan sebesar Rp " . number_format($anggota->hutang, 0, ',', '.') . ". Wajib lunasi hutang terlebih dahulu.");
                }

                // 2. Minimum purchase check (>= Rp 25.000)
                if ($totalHarga < 25000) {
                    throw new \Exception("Syarat penarikan tunai: Total belanja saat ini minimal Rp 25.000 (Belanja saat ini: Rp " . number_format($totalHarga, 0, ',', '.') . ").");
                }

                // 3. Proportional limit (Maks 2x Belanja, Plafon Rp 100.000)
                $maxPlafon = min(100000, $totalHarga * 2);
                $nominalTarik = (float) $request->tarik_tunai_nominal;
                if ($nominalTarik > $maxPlafon) {
                    throw new \Exception("Nominal tarik tunai (Rp " . number_format($nominalTarik, 0, ',', '.') . ") melebihi batas kuota proporsional Rp " . number_format($maxPlafon, 0, ',', '.') . " (Maks. 2x belanja saat ini, Plafon Rp 100.000).");
                }

                $sumberTarik = $request->tarik_tunai_sumber ?: 'shu';
                $available = ($sumberTarik === 'shu' ? (float) $anggota->shu : (float) $anggota->saldo);
                if ($nominalTarik > $available) {
                    throw new \Exception("Saldo {$sumberTarik} tidak mencukupi (Tersedia: Rp " . number_format($available, 0, ',', '.') . ").");
                }

                // Master consent check
                if (!$anggota->persetujuan_shu_master_at && !$request->persetujuan_shu) {
                    throw new \Exception("Wajib menyetujui ketentuan pemotongan SHU Hari Besar (Master Consent).");
                }

                if (!$anggota->persetujuan_shu_master_at) {
                    $anggota->persetujuan_shu_master_at = Carbon::now();
                    $anggota->persetujuan_shu_version = 'v1.0';
                }

                // Deduct total nominal from member balance
                if ($sumberTarik === 'shu') {
                    $anggota->shu -= $nominalTarik;
                } else {
                    $anggota->saldo -= $nominalTarik;
                }
                $anggota->save();

                // Net cash handover calculation
                $uangBersihDiserahkan = max(0, $nominalTarik - $totalHarga);

                $kodePenarikan = 'TRK-' . date('ymd') . '-' . rand(1000, 9999);
                $tarik = TarikTunai::create([
                    'kode_penarikan' => $kodePenarikan,
                    'kasir_id' => $kasirId,
                    'anggota_id' => $anggota->anggota_id,
                    'nominal' => $nominalTarik,
                    'status' => 'completed',
                    'sumber_dana' => $sumberTarik,
                    'persetujuan_shu' => true,
                    'approved_at' => Carbon::now(),
                    'keterangan' => "Tarik Tunai saat Belanja (Potong Belanja Rp " . number_format($totalHarga, 0, ',', '.') . ", Kas Diserahkan Rp " . number_format($uangBersihDiserahkan, 0, ',', '.') . ")",
                    'created_at' => Carbon::now()
                ]);

                $tarikTunaiData = [
                    'tarik_id' => $tarik->tarik_id,
                    'kode_penarikan' => $tarik->kode_penarikan,
                    'nominal_tarik' => $nominalTarik,
                    'potong_belanja' => $totalHarga,
                    'uang_bersih_diserahkan' => $uangBersihDiserahkan,
                    'sumber_dana' => $sumberTarik,
                    'sisa_shu' => (float) $anggota->shu,
                    'sisa_saldo' => (float) $anggota->saldo,
                ];
            }

            $metodePembayaranFinal = $tarikTunaiData ? 'potong_tarik_tunai' : $request->metode_pembayaran;

            $transaksi = Transaksi::create([
                'anggota_id' => $anggota_id,
                'kasir_id' => $kasirId,
                'total_harga' => $totalHarga,
                'total_keuntungan' => $totalKeuntungan,
                'metode_pembayaran' => $metodePembayaranFinal,
                'status' => 'selesai',
            ]);

            if ($tarikTunaiData && isset($tarik)) {
                $tarik->transaksi_id = $transaksi->transaksi_id;
                $tarik->save();
            }

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
                'message' => $tarikTunaiData 
                    ? 'Transaksi & Tarik Tunai Berhasil! Serahkan kas bersih sebesar Rp ' . number_format($tarikTunaiData['uang_bersih_diserahkan'], 0, ',', '.') . ' ke pembeli.'
                    : 'Transaksi berhasil',
                'transaksi_id' => $transaksi->transaksi_id,
                'total' => $totalHarga,
                'total_keuntungan' => $totalKeuntungan,
                'tarik_tunai' => $tarikTunaiData
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function getAllAnggota(Request $request)
    {
        $this->checkKasir($request);
        
        $anggota = \Illuminate\Support\Facades\Cache::remember('kasir_all_anggota', 30, function() {
            return Anggota::with('user:user_id,username')
                ->orderBy('nama_lengkap', 'asc')
                ->get()
                ->map(function($a) {
                    $arr = $a->toArray();
                    $arr['username'] = $a->user ? $a->user->username : '';
                    return $arr;
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


    public function cekKelayakanTarikTunai(Request $request, $anggota_id)
    {
        $this->checkKasir($request);
        $anggota = Anggota::find($anggota_id);
        if (!$anggota) {
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
            ]
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

    public function prosesTarikTunai(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate([
            'tarik_id' => 'required|integer|exists:tarik_tunai,tarik_id',
            'action' => 'required|in:approve,reject',
            'alasan_tolak' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $tarik = TarikTunai::lockForUpdate()->find($request->tarik_id);
            if (!$tarik || $tarik->status !== 'pending') {
                throw new \Exception("Tiket penarikan tidak valid atau sudah diproses.");
            }

            $anggota = Anggota::lockForUpdate()->find($tarik->anggota_id);
            if (!$anggota) throw new \Exception("Data anggota tidak ditemukan.");

            if ($request->action === 'reject') {
                $tarik->status = 'rejected';
                $tarik->kasir_id = $kasirId;
                $tarik->alasan_tolak = $request->alasan_tolak ?: 'Ditolak oleh kasir toko.';
                $tarik->save();

                DB::commit();
                return response()->json([
                    'success' => true,
                    'message' => 'Tiket penarikan tunai berhasil ditolak.',
                ]);
            }

            // 1. Re-verify debt at approval time
            if ((float) $anggota->hutang > 0) {
                throw new \Exception("Penarikan dibatalkan: Anggota masih memiliki saldo hutang belanja sebesar Rp " . number_format($anggota->hutang, 0, ',', '.') . ".");
            }

            // 2. Deduct funds
            if ($tarik->sumber_dana === 'shu') {
                if ($anggota->shu < $tarik->nominal) {
                    throw new \Exception("Saldo SHU anggota tidak mencukupi (Tersedia: Rp " . number_format($anggota->shu, 0, ',', '.') . ").");
                }
                $anggota->shu -= $tarik->nominal;
            } else {
                if ($anggota->saldo < $tarik->nominal) {
                    throw new \Exception("Saldo E-Wallet anggota tidak mencukupi (Tersedia: Rp " . number_format($anggota->saldo, 0, ',', '.') . ").");
                }
                $anggota->saldo -= $tarik->nominal;
            }
            $anggota->save();

            $tarik->status = 'completed';
            $tarik->kasir_id = $kasirId;
            $tarik->approved_at = Carbon::now();
            $tarik->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Uang tunai sebesar Rp ' . number_format($tarik->nominal, 0, ',', '.') . ' berhasil diserahkan ke ' . $anggota->nama_lengkap . '.',
                'data' => [
                    'tarik_id' => $tarik->tarik_id,
                    'kode_penarikan' => $tarik->kode_penarikan,
                    'nominal' => (float) $tarik->nominal,
                    'sisa_shu' => (float) $anggota->shu,
                    'sisa_saldo' => (float) $anggota->saldo,
                    'nama_anggota' => $anggota->nama_lengkap,
                    'transaksi_id' => $tarik->transaksi_id,
                    'created_at' => $tarik->created_at,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function tarikTunai(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate([
            'nominal' => 'required|numeric|min:1000',
            'anggota_id' => 'required|integer|exists:anggota,anggota_id',
            'sumber_dana' => 'required|in:shu,saldo',
            'persetujuan_shu' => 'nullable|boolean',
            'transaksi_id' => 'nullable|integer|exists:transaksi,transaksi_id',
            'keterangan' => 'nullable|string'
        ]);

        DB::beginTransaction();
        try {
            $anggota = Anggota::lockForUpdate()->find($request->anggota_id);
            if (!$anggota) throw new \Exception("Anggota tidak ditemukan");

            // Consent check (Master Consent or Explicit Checkbox)
            if (!$anggota->persetujuan_shu_master_at && !$request->persetujuan_shu) {
                return response()->json([
                    'success' => false, 
                    'message' => 'Penarikan tunai gagal: Anggota wajib menyetujui ketentuan pemotongan SHU Hari Besar (Master Consent) secara sadar.'
                ], 422);
            }

            if (!$anggota->persetujuan_shu_master_at && $request->persetujuan_shu) {
                $anggota->persetujuan_shu_master_at = Carbon::now();
                $anggota->persetujuan_shu_version = 'v1.0';
                $anggota->save();
            }

            // 1. Debt check
            if ((float) $anggota->hutang > 0) {
                throw new \Exception("Penarikan tunai ditolak: Anggota masih memiliki tagihan hutang berjalan sebesar Rp " . number_format($anggota->hutang, 0, ',', '.') . ". Wajib melunasi hutang terlebih dahulu.");
            }

            // 2. Qualifying purchase check (Min Rp 25.000)
            $transaksiId = $request->transaksi_id;
            if ($transaksiId) {
                $trx = Transaksi::where('transaksi_id', $transaksiId)
                    ->where('anggota_id', $anggota->anggota_id)
                    ->where('status', 'selesai')
                    ->first();
                if (!$trx || $trx->total_harga < 25000) {
                    throw new \Exception("Transaksi belanja yang ditautkan tidak memenuhi syarat minimal Rp 25.000 (Nilai: Rp " . number_format($trx ? $trx->total_harga : 0, 0, ',', '.') . ")");
                }
            } else {
                $validTrx = Transaksi::where('anggota_id', $anggota->anggota_id)
                    ->where('status', 'selesai')
                    ->where('created_at', '>=', Carbon::today())
                    ->where('total_harga', '>=', 25000)
                    ->orderBy('created_at', 'desc')
                    ->first();

                if (!$validTrx) {
                    throw new \Exception("Syarat penarikan tunai belum terpenuhi: Wajib disertai transaksi belanja produk koperasi minimal Rp 25.000 hari ini.");
                }
                $transaksiId = $validTrx->transaksi_id;
            }

            // 3. Proportional limit check (Maks 2x Belanja Hari Ini, Plafon Rp 100.000)
            $totalBelanjaHariIni = (float) Transaksi::where('anggota_id', $anggota->anggota_id)
                ->where('status', 'selesai')
                ->where('created_at', '>=', Carbon::today())
                ->where('total_harga', '>=', 25000)
                ->sum('total_harga');

            $maxPlafon = min(100000, $totalBelanjaHariIni * 2);

            if ($request->nominal > $maxPlafon) {
                throw new \Exception("Nominal penarikan (Rp " . number_format($request->nominal, 0, ',', '.') . ") melebihi kuota proporsional maksimal Rp " . number_format($maxPlafon, 0, ',', '.') . " (Maks. 2x Belanja Toko, Plafon Rp 100.000/hari).");
            }

            // 4. Deduct funds
            $sumber = $request->sumber_dana;
            if ($sumber === 'shu') {
                if ($anggota->shu < $request->nominal) {
                    throw new \Exception("Saldo SHU tidak mencukupi. Saldo SHU saat ini: Rp " . number_format($anggota->shu, 0, ',', '.'));
                }
                $anggota->shu -= $request->nominal;
            } else {
                if ($anggota->saldo < $request->nominal) {
                    throw new \Exception("Saldo E-Wallet tidak mencukupi. Saldo saat ini: Rp " . number_format($anggota->saldo, 0, ',', '.'));
                }
                $anggota->saldo -= $request->nominal;
            }
            $anggota->save();

            $kodePenarikan = 'TRK-' . date('ymd') . '-' . rand(1000, 9999);

            $tarik = TarikTunai::create([
                'kode_penarikan' => $kodePenarikan,
                'kasir_id' => $kasirId,
                'anggota_id' => $anggota->anggota_id,
                'nominal' => $request->nominal,
                'status' => 'completed',
                'sumber_dana' => $sumber,
                'transaksi_id' => $transaksiId,
                'persetujuan_shu' => true,
                'approved_at' => Carbon::now(),
                'keterangan' => $request->keterangan ?: "Tarik Tunai dari {$sumber} (Disertai Belanja Trx #{$transaksiId})",
                'created_at' => Carbon::now()
            ]);

            DB::commit();
            return response()->json([
                'success' => true, 
                'message' => 'Tarik tunai sebesar Rp ' . number_format($request->nominal, 0, ',', '.') . ' berhasil diproses.',
                'data' => [
                    'tarik_id' => $tarik->tarik_id,
                    'kode_penarikan' => $tarik->kode_penarikan,
                    'nominal' => (float) $tarik->nominal,
                    'sisa_shu' => (float) $anggota->shu,
                    'sisa_saldo' => (float) $anggota->saldo,
                    'nama_anggota' => $anggota->nama_lengkap,
                    'transaksi_id' => $transaksiId,
                    'created_at' => $tarik->created_at,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
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
            ->map(function($u) {
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
        $paginator->getCollection()->transform(function($s) use ($barangsCache) {
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
        if (empty($raw)) return null;
        if (is_array($raw)) {
            $decoded = $raw;
        } else {
            $decoded = json_decode($raw, true);
            if (!$decoded && is_string($raw)) {
                $decoded = json_decode(stripslashes($raw), true);
                if (!$decoded) {
                    $decoded = json_decode(trim(stripslashes($raw), '"'), true);
                }
            }
        }

        if (!is_array($decoded)) return null;

        // Auto-enrich items with harga_jual, selisih_nominal, risk_badge, and summary stats
        if (isset($decoded['items']) && is_array($decoded['items'])) {
            if ($barangs === null) {
                $itemIds = array_filter(array_column($decoded['items'], 'barang_id'));
                $barangs = !empty($itemIds) ? Barang::whereIn('barang_id', $itemIds)->get()->keyBy('barang_id') : collect();
            }

            $totalMinusNominal = 0;
            $barangSelisih = 0;

            foreach ($decoded['items'] as &$it) {
                $bId = $it['barang_id'] ?? null;
                $b = $bId ? $barangs->get($bId) : null;
                if (!isset($it['harga_jual']) || $it['harga_jual'] == 0) {
                    $it['harga_jual'] = $b ? (float)$b->harga_jual : 0;
                }
                if (!isset($it['risk_badge'])) {
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

            if (!isset($decoded['summary']) || !is_array($decoded['summary'])) {
                $decoded['summary'] = [];
            }
            $decoded['summary']['barangSelisih'] = $barangSelisih;
            $decoded['summary']['totalMinusNominal'] = $totalMinusNominal;
        }

        return $decoded;
    }

    public function getSerahTerimaDraft(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $kasirUserIds = JabatanAnggota::where('role', 'kasir')->where('status', 'aktif')->pluck('user_id');
        $kasirList = User::where(function($q) use ($kasirUserIds) {
                $q->whereIn('user_id', $kasirUserIds)->orWhere('role', 'kasir');
            })
            ->where('user_id', '!=', $kasirId)
            ->with('anggota')
            ->get()
            ->unique('user_id')
            ->map(function($u) {
                return [
                    'user_id' => $u->user_id,
                    'username' => $u->username,
                    'nama_lengkap' => $u->anggota ? $u->anggota->nama_lengkap : $u->username,
                ];
            })
            ->values();

        // Load all active items in the store for cycle count
        $allItems = Barang::orderBy('nama_barang', 'asc')->get();

        $rokokKeywords = ['rokok', 'sampoerna', 'surya', 'marlboro', 'gudang garam', 'magnum', 'djarum', 'camel', 'esse', 'filter', 'kretek', 'mild', 'samsu'];

        foreach ($allItems as $item) {
            $nameLower = strtolower($item->nama_barang);
            $isRokok = false;
            foreach ($rokokKeywords as $kw) {
                if (str_contains($nameLower, $kw)) {
                    $isRokok = true;
                    break;
                }
            }

            $pkmValue = (int) ($item->pkm ?: 1);
            if ($isRokok) {
                $item->risk_badge = 'Rokok';
                $item->audit_reason = "PKM Toko: {$pkmValue} pcs (Risiko Rokok)";
            } elseif ($item->stok < $pkmValue) {
                $item->risk_badge = 'Perlu Restock';
                $item->audit_reason = "PKM Toko: {$pkmValue} pcs (Stok < PKM)";
            } else {
                $item->risk_badge = 'Display Toko';
                $item->audit_reason = "PKM Toko 4 Hari: {$pkmValue} pcs";
            }
        }

        // Calculate theoretical drawer cash in system
        $saldoKasSistem = $this->calculateSaldoKasKasir($kasirId);

        return response()->json([
            'success' => true,
            'data' => [
                'kasir_list' => $kasirList,
                'saldo_kas_sistem' => (float) $saldoKasSistem,
                'cycle_count_items' => $allItems
            ]
        ]);
    }

    public function createSerahTerima(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate([
            'kasir_to' => 'required|integer',
            'hasil_opname' => 'nullable'
        ]);
        
        if ($kasirId == $request->kasir_to) {
            return response()->json(['success' => false, 'message' => 'Tidak bisa serah terima ke diri sendiri'], 400);
        }

        $hasilOpname = $request->hasil_opname;
        if (empty($hasilOpname) && ($request->has('items') || $request->has('uang_fisik'))) {
            $hasilOpname = [
                'uang_fisik' => (float) ($request->uang_fisik ?? 0),
                'catatan' => $request->catatan ?? '',
                'items' => $request->items ?? [],
            ];
        }

        $st = SerahTerimaKasir::create([
            'kasir_from' => $kasirId,
            'kasir_to' => $request->kasir_to,
            'hasil_opname' => is_string($hasilOpname) ? json_decode($hasilOpname, true) : $hasilOpname,
            'status' => 'pending',
            'created_at' => Carbon::now()
        ]);
        return response()->json([
            'success' => true, 
            'message' => 'Serah terima berhasil dibuat',
            'data' => [
                'serah_id' => $st->serah_id,
                'serah_terima_id' => $st->serah_id,
            ]
        ]);
    }

    public function approveSerahTerima(Request $request)
    {
        $kasirId = $this->checkKasir($request);

        DB::beginTransaction();
        try {
            $st = SerahTerimaKasir::where('serah_id', $request->serah_id)
                ->where('kasir_to', $kasirId)
                ->lockForUpdate()
                ->first();

            if (!$st || $st->status !== 'pending') {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Data tidak valid atau sudah diproses'], 400);
            }

            $st->status = 'approved';
            $st->save();

            // Auto-sync physical inventory stock to reflect verified count
            $opname = $this->parseHasilOpname($st->hasil_opname);
            if (isset($opname['items']) && is_array($opname['items'])) {
                foreach ($opname['items'] as $item) {
                    if (isset($item['barang_id']) && (isset($item['stok_aktual']) || isset($item['stok_input']))) {
                        $targetStock = isset($item['stok_input']) ? (int)$item['stok_input'] : (int)$item['stok_aktual'];
                        $barang = Barang::where('barang_id', $item['barang_id'])->lockForUpdate()->first();
                        if ($barang) {
                            $barang->stok = max(0, $targetStock);
                            $barang->save();
                        }
                    }
                }
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Shift operasional disetujui dan stok fisik berhasil disinkronkan ke sistem'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Gagal menyetujui shift: ' . $e->getMessage()], 500);
        }
    }

    public function rejectSerahTerima(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate([
            'serah_id' => 'required',
            'alasan_penolakan' => 'nullable|string',
            'alasan' => 'nullable|string'
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

            if (!$st || $st->status !== 'pending') {
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
            return response()->json(['success' => false, 'message' => 'Gagal menolak shift: ' . $e->getMessage()], 500);
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
            ]
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
            echo "data: " . json_encode([
                'status' => 'CONNECTED',
                'kasir_id' => $kasirId,
                'has_active_shift' => $hasActiveShift,
                'server_time' => now()->toIso8601String()
            ]) . "\n\n";
            @ob_flush();
            @flush();

            while ((time() - $startTime) < $maxExecutionSeconds) {
                // If connection aborted by client
                if (connection_aborted()) {
                    break;
                }

                // Check Cache for latest order event
                $latestEvent = \Illuminate\Support\Facades\Cache::get('koperasi_latest_order_event');
                $eventTime = (float) \Illuminate\Support\Facades\Cache::get('koperasi_latest_order_timestamp', 0);

                if ($latestEvent && $eventTime > $lastPushedTime) {
                    $lastPushedTime = $eventTime;

                    echo "event: new_order\n";
                    echo "data: " . json_encode([
                        'type' => 'NEW_ORDER',
                        'has_active_shift' => $hasActiveShift,
                        'order' => $latestEvent
                    ]) . "\n\n";

                    @ob_flush();
                    @flush();
                }

                // Heartbeat ping every 5 seconds to keep connection alive
                if ((time() - $startTime) % 5 === 0) {
                    echo "event: heartbeat\n";
                    echo "data: " . json_encode(['timestamp' => time()]) . "\n\n";
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
            'Access-Control-Allow-Origin' => '*'
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
                    return $d->jumlah . 'x ' . ($d->barang ? $d->barang->nama_barang : 'Item');
                })->implode(', ');

                return [
                    'transaksi_id' => $t->transaksi_id,
                    'anggota_id' => $t->anggota_id,
                    'nama_anggota' => $t->anggota ? $t->anggota->nama_lengkap : 'Anggota #' . $t->anggota_id,
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
            'server_timestamp' => microtime(true)
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
            ? $dummyItems->map(fn($b) => '1x ' . $b->nama_barang)->implode(', ')
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
            'is_test' => true
        ];

        \Illuminate\Support\Facades\Cache::put('koperasi_latest_order_event', $testEvent, 120);
        \Illuminate\Support\Facades\Cache::put('koperasi_latest_order_timestamp', microtime(true), 120);

        return response()->json([
            'success' => true,
            'message' => 'Test event notifikasi berhasil di-broadcast ke seluruh kasir aktif!',
            'data' => $testEvent
        ]);
    }
}
