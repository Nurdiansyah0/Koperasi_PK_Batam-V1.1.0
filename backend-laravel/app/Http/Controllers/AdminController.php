<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use \Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Barang;
use App\Models\RiwayatRestock;
use App\Models\Transaksi;
use App\Models\Anggota;
use App\Models\User;
use App\Models\SetoranKasir;
use App\Models\ShuDistribusi;
use App\Models\SerahTerimaKasir;
use App\Models\TarikTunai;
use App\Models\KonversiShu;
use App\Models\JabatanAnggota;
use App\Models\PengeluaranOperasional;
use Carbon\Carbon;

class AdminController extends Controller
{
    private function checkAdmin(Request $request) {
        if (!$request->user() || !$request->user()->isAdmin()) {
            abort(403, 'Unauthorized: Hanya Admin yang memiliki izin akses.');
        }
        return $request->user()->user_id;
    }

    public function getDashboardStats(Request $request)
    {
        $this->checkAdmin($request);
        
        // 1. Daily Metrics
        $total_transaksi_hari_ini = Transaksi::whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')->count();
        $total_pendapatan_hari_ini = Transaksi::whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')->sum('total_harga');
        $total_keuntungan_hari_ini = Transaksi::whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')->sum('total_keuntungan');

        // 2. Koperasi Assets & Liabilities
        $total_anggota = \App\Models\Anggota::count();
        $total_hutang_beredar = \App\Models\Anggota::sum('hutang');
        $total_saldo_anggota = \App\Models\Anggota::sum('saldo'); // Simpanan / E-wallet
        $total_shu_tersedia = \App\Models\Anggota::sum('shu'); // SHU allocated to members

        $total_shu_pengurus = \Illuminate\Support\Facades\DB::table('shu_distribusi')->sum('shu_10_percent') ?? 0;
        $total_shu_koperasi = \Illuminate\Support\Facades\DB::table('shu_distribusi')->sum('shu_30_percent') ?? 0;

        // Nilai Aset Barang (Total Inventory Value = Stok * Harga Modal)
        $total_aset_barang = \App\Models\Barang::sum(\Illuminate\Support\Facades\DB::raw('stok * harga_modal'));

        // 3. Operational Central Nervous System Telemetry
        // A. Critical Restock (< PKM or stock <= 2)
        $stok_kritis_query = \App\Models\Barang::where(function($q) {
            $q->whereRaw('stok < COALESCE(pkm, 1)')->orWhere('stok', '<=', 2);
        });
        $stok_kritis_count = $stok_kritis_query->count();
        $stok_kritis_items = $stok_kritis_query->orderBy('stok', 'asc')->limit(5)->get(['barang_id', 'nama_barang', 'stok', 'pkm', 'harga_modal']);

        // B. Pending Setoran Kasir (Cash-in-Transit waiting for safe deposit)
        $setoran_pending_count = \App\Models\SetoranKasir::where('status', 'pending')->count();
        $setoran_pending_nominal = (float) (\App\Models\SetoranKasir::where('status', 'pending')->sum('nominal') ?? 0);

        // C. Credit Risk Monitoring (Anggota with debt >= Rp 300.000, max limit is 400.000)
        $anggota_limit_kritis_count = \App\Models\Anggota::where('hutang', '>=', 300000)->count();

        // D. Monthly Restock Expenditure
        $total_restock_bulan_ini = (float) (\App\Models\RiwayatRestock::whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('total_biaya') ?? 0);

        // E. Expiry Tracking Telemetry (FEFO & Waste Risk)
        $today = Carbon::today()->toDateString();
        $in30Days = Carbon::today()->addDays(30)->toDateString();

        $expired_count = \App\Models\Barang::where(function($q) use ($today) {
            $q->where(function($sq) use ($today) {
                $sq->whereNotNull('tgl_kadaluarsa_toko')->where('tgl_kadaluarsa_toko', '<', $today)->where('stok_toko', '>', 0);
            })->orWhere(function($sq) use ($today) {
                $sq->whereNotNull('tgl_kadaluarsa_gudang')->where('tgl_kadaluarsa_gudang', '<', $today)->where('stok_gudang', '>', 0);
            });
        })->count();

        $near_expiry_count = \App\Models\Barang::where(function($q) use ($today, $in30Days) {
            $q->where(function($sq) use ($today, $in30Days) {
                $sq->whereNotNull('tgl_kadaluarsa_toko')->whereBetween('tgl_kadaluarsa_toko', [$today, $in30Days])->where('stok_toko', '>', 0);
            })->orWhere(function($sq) use ($today, $in30Days) {
                $sq->whereNotNull('tgl_kadaluarsa_gudang')->whereBetween('tgl_kadaluarsa_gudang', [$today, $in30Days])->where('stok_gudang', '>', 0);
            });
        })->count();

        return response()->json([
            'success' => true,
            'total_anggota' => (int) $total_anggota,
            'total_transaksi_hari_ini' => (int) $total_transaksi_hari_ini,
            'total_pendapatan_hari_ini' => (float) $total_pendapatan_hari_ini,
            'total_keuntungan_hari_ini' => (float) $total_keuntungan_hari_ini,
            'total_hutang_beredar' => (float) $total_hutang_beredar,
            'total_saldo_anggota' => (float) $total_saldo_anggota,
            'total_shu_tersedia' => (float) $total_shu_tersedia,
            'total_shu_pengurus' => (float) $total_shu_pengurus,
            'total_shu_koperasi' => (float) $total_shu_koperasi,
            'total_aset_barang' => (float) $total_aset_barang,
            'stok_kritis_count' => (int) $stok_kritis_count,
            'stok_kritis_items' => $stok_kritis_items,
            'setoran_pending_count' => (int) $setoran_pending_count,
            'setoran_pending_nominal' => (float) $setoran_pending_nominal,
            'anggota_limit_kritis_count' => (int) $anggota_limit_kritis_count,
            'total_restock_bulan_ini' => (float) $total_restock_bulan_ini,
            'expired_count' => (int) $expired_count,
            'near_expiry_count' => (int) $near_expiry_count,
        ]);
    }

    public function getBarang(Request $request)
    {
        $this->checkAdmin($request);
        $barang = Barang::all();
        return response()->json(['success' => true, 'data' => $barang]);
    }

    public function tambahBarang(Request $request)
    {
        $this->checkAdmin($request);
        $request->validate([
            'nama_barang' => 'required|string',
            'stok' => 'nullable|integer',
            'stok_toko' => 'nullable|integer|min:0',
            'stok_gudang' => 'nullable|integer|min:0',
            'tgl_kadaluarsa_toko' => 'nullable|date',
            'tgl_kadaluarsa_gudang' => 'nullable|date',
            'pkm' => 'nullable|integer|min:1',
            'harga_modal' => 'required|numeric',
            'harga_jual' => 'required|numeric',
        ]);

        $pkm = (int) ($request->pkm ?: 1);
        $inputStok = (int) ($request->stok ?: 0);
        $stokToko = $request->has('stok_toko') ? (int) $request->stok_toko : min($inputStok, $pkm);
        $stokGudang = $request->has('stok_gudang') ? (int) $request->stok_gudang : max(0, $inputStok - $stokToko);
        $totalStok = $stokToko + $stokGudang;

        Barang::create([
            'nama_barang' => $request->nama_barang,
            'stok' => $totalStok,
            'stok_toko' => $stokToko,
            'stok_gudang' => $stokGudang,
            'tgl_kadaluarsa_toko' => $request->tgl_kadaluarsa_toko ?: null,
            'tgl_kadaluarsa_gudang' => $request->tgl_kadaluarsa_gudang ?: null,
            'pkm' => $pkm,
            'harga_modal' => $request->harga_modal,
            'harga_jual' => $request->harga_jual,
        ]);

        return response()->json(['success' => true, 'message' => 'Barang berhasil ditambah dengan alokasi Toko & Gudang']);
    }

    public function updateBarang(Request $request)
    {
        $this->checkAdmin($request);
        $barang = Barang::find($request->barang_id);
        if (!$barang) return response()->json(['success' => false, 'message' => 'Barang tidak ditemukan'], 404);

        $pkm = $request->has('pkm') ? (int) $request->pkm : (int) ($barang->pkm ?: 1);
        $stokToko = $request->has('stok_toko') ? (int) $request->stok_toko : (int) $barang->stok_toko;
        $stokGudang = $request->has('stok_gudang') ? (int) $request->stok_gudang : (int) $barang->stok_gudang;

        if ($request->has('stok') && !$request->has('stok_toko') && !$request->has('stok_gudang')) {
            $inputStok = (int) $request->stok;
            $stokToko = min($inputStok, $pkm);
            $stokGudang = max(0, $inputStok - $stokToko);
        }

        $totalStok = $stokToko + $stokGudang;
        $data = $request->all();
        $data['stok_toko'] = $stokToko;
        $data['stok_gudang'] = $stokGudang;
        $data['stok'] = $totalStok;
        if ($request->has('tgl_kadaluarsa_toko')) $data['tgl_kadaluarsa_toko'] = $request->tgl_kadaluarsa_toko ?: null;
        if ($request->has('tgl_kadaluarsa_gudang')) $data['tgl_kadaluarsa_gudang'] = $request->tgl_kadaluarsa_gudang ?: null;

        $barang->update($data);

        return response()->json(['success' => true, 'message' => 'Barang berhasil diupdate']);
    }

    public function hapusBarang(Request $request)
    {
        $this->checkAdmin($request);
        Barang::destroy($request->barang_id);
        return response()->json(['success' => true, 'message' => 'Barang berhasil dihapus']);
    }

    public function restockBarang(Request $request)
    {
        $adminId = $this->checkAdmin($request);
        $request->validate([
            'barang_id' => 'required|integer|exists:barang,barang_id',
            'jumlah_tambah' => 'required|integer|min:1',
            'harga_beli_satuan' => 'required|numeric|min:0',
            'sumber_dana' => 'required|string',
            'alokasi' => 'nullable|string|in:gudang,toko,auto',
            'tanggal_kadaluarsa' => 'nullable|date',
            'catatan' => 'nullable|string'
        ]);

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $barang = Barang::where('barang_id', $request->barang_id)->lockForUpdate()->first();
            if (!$barang) throw new \Exception("Barang tidak ditemukan");

            $totalBiaya = $request->jumlah_tambah * $request->harga_beli_satuan;
            $alokasi = $request->input('alokasi', 'gudang');
            $jumlahTambah = (int) $request->jumlah_tambah;
            $tglExpired = $request->tanggal_kadaluarsa ?: null;

            RiwayatRestock::create([
                'barang_id' => $barang->barang_id,
                'admin_id' => $adminId,
                'jumlah_tambah' => $jumlahTambah,
                'harga_beli_satuan' => $request->harga_beli_satuan,
                'total_biaya' => $totalBiaya,
                'sumber_dana' => $request->sumber_dana,
                'tanggal_kadaluarsa' => $tglExpired,
                'catatan' => $request->catatan ? ($request->catatan . " [Alokasi: {$alokasi}]") : "Alokasi: {$alokasi}"
            ]);

            // 2-Tier allocation & Expiry Sync
            if ($alokasi === 'toko') {
                $barang->stok_toko += $jumlahTambah;
                if ($tglExpired) $barang->tgl_kadaluarsa_toko = $tglExpired;
            } elseif ($alokasi === 'auto') {
                $pkm = (int) ($barang->pkm ?: 1);
                $neededForDisplay = max(0, $pkm - ((int) $barang->stok_toko));
                $fillToko = min($jumlahTambah, $neededForDisplay);
                $barang->stok_toko += $fillToko;
                $barang->stok_gudang += ($jumlahTambah - $fillToko);
                if ($tglExpired) {
                    if ($fillToko > 0 && !$barang->tgl_kadaluarsa_toko) $barang->tgl_kadaluarsa_toko = $tglExpired;
                    $barang->tgl_kadaluarsa_gudang = $tglExpired;
                }
            } else {
                // Default to warehouse stock
                $barang->stok_gudang += $jumlahTambah;
                if ($tglExpired) $barang->tgl_kadaluarsa_gudang = $tglExpired;
            }

            $barang->stok = $barang->stok_toko + $barang->stok_gudang;
            $barang->harga_modal = $request->harga_beli_satuan;
            $barang->save();

            \Illuminate\Support\Facades\DB::commit();
            return response()->json([
                'success' => true,
                'message' => "Restock berhasil: {$jumlahTambah} pcs dialokasikan ke {$alokasi}",
                'data' => [
                    'barang_id' => $barang->barang_id,
                    'stok_toko' => $barang->stok_toko,
                    'stok_gudang' => $barang->stok_gudang,
                    'tgl_kadaluarsa_toko' => $barang->tgl_kadaluarsa_toko,
                    'tgl_kadaluarsa_gudang' => $barang->tgl_kadaluarsa_gudang,
                    'total_stok' => $barang->stok
                ]
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function bulkRestock(Request $request)
    {
        $adminId = $this->checkAdmin($request);
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.barang_id' => 'required|integer|exists:barang,barang_id',
            'items.*.jumlah_tambah' => 'required|integer|min:1',
            'items.*.harga_beli_satuan' => 'required|numeric|min:0',
            'items.*.alokasi' => 'nullable|string|in:gudang,toko,auto',
            'items.*.tanggal_kadaluarsa' => 'nullable|date',
            'sumber_dana' => 'required|string',
            'nomor_faktur' => 'nullable|string',
            'nama_supplier' => 'nullable|string',
            'catatan' => 'nullable|string'
        ]);

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $totalExpenditure = 0;
            $totalItemsCount = 0;
            $sumberDana = $request->sumber_dana;
            $faktur = $request->nomor_faktur ?: '-';
            $supplier = $request->nama_supplier ?: '-';
            $globalNote = $request->catatan ?: '';

            foreach ($request->input('items') as $itemData) {
                $barang = Barang::where('barang_id', $itemData['barang_id'])->lockForUpdate()->first();
                if (!$barang) continue;

                $jumlahTambah = (int) $itemData['jumlah_tambah'];
                $hargaBeliSatuan = (float) $itemData['harga_beli_satuan'];
                $totalBiaya = $jumlahTambah * $hargaBeliSatuan;
                $alokasi = $itemData['alokasi'] ?? 'gudang';
                $tglExpired = !empty($itemData['tanggal_kadaluarsa']) ? $itemData['tanggal_kadaluarsa'] : null;

                $itemNote = "Faktur: {$faktur} | Supplier: {$supplier} [Alokasi: {$alokasi}]";
                if ($globalNote) $itemNote .= " - " . $globalNote;

                RiwayatRestock::create([
                    'barang_id' => $barang->barang_id,
                    'admin_id' => $adminId,
                    'jumlah_tambah' => $jumlahTambah,
                    'harga_beli_satuan' => $hargaBeliSatuan,
                    'total_biaya' => $totalBiaya,
                    'sumber_dana' => $sumberDana,
                    'tanggal_kadaluarsa' => $tglExpired,
                    'catatan' => $itemNote
                ]);

                // 2-Tier allocation & Expiry Sync
                if ($alokasi === 'toko') {
                    $barang->stok_toko += $jumlahTambah;
                    if ($tglExpired) $barang->tgl_kadaluarsa_toko = $tglExpired;
                } elseif ($alokasi === 'auto') {
                    $pkm = (int) ($barang->pkm ?: 1);
                    $neededForDisplay = max(0, $pkm - ((int) $barang->stok_toko));
                    $fillToko = min($jumlahTambah, $neededForDisplay);
                    $barang->stok_toko += $fillToko;
                    $barang->stok_gudang += ($jumlahTambah - $fillToko);
                    if ($tglExpired) {
                        if ($fillToko > 0 && !$barang->tgl_kadaluarsa_toko) $barang->tgl_kadaluarsa_toko = $tglExpired;
                        $barang->tgl_kadaluarsa_gudang = $tglExpired;
                    }
                } else {
                    // Default to warehouse stock
                    $barang->stok_gudang += $jumlahTambah;
                    if ($tglExpired) $barang->tgl_kadaluarsa_gudang = $tglExpired;
                }

                $barang->stok = $barang->stok_toko + $barang->stok_gudang;
                $barang->harga_modal = $hargaBeliSatuan;
                $barang->save();

                $totalExpenditure += $totalBiaya;
                $totalItemsCount += $jumlahTambah;
            }

            \Illuminate\Support\Facades\DB::commit();
            return response()->json([
                'success' => true,
                'message' => "Faktur kulakan berhasil dicatat: {$totalItemsCount} pcs barang masuk (Total Rp " . number_format($totalExpenditure, 0, ',', '.') . ")",
                'data' => [
                    'total_biaya' => $totalExpenditure,
                    'total_items' => $totalItemsCount,
                    'nomor_faktur' => $faktur,
                    'nama_supplier' => $supplier
                ]
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function writeOffExpired(Request $request)
    {
        $adminId = $this->checkAdmin($request);
        $request->validate([
            'barang_id' => 'required|integer|exists:barang,barang_id',
            'lokasi' => 'required|in:toko,gudang,semua',
            'jumlah' => 'required|integer|min:1',
            'alasan' => 'nullable|string'
        ]);

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $barang = Barang::where('barang_id', $request->barang_id)->lockForUpdate()->first();
            if (!$barang) throw new \Exception("Barang tidak ditemukan");

            $jumlah = (int) $request->jumlah;
            $lokasi = $request->lokasi;

            if ($lokasi === 'toko') {
                if ($barang->stok_toko < $jumlah) throw new \Exception("Stok toko ({$barang->stok_toko} pcs) kurang dari jumlah write-off ({$jumlah} pcs)");
                $barang->stok_toko -= $jumlah;
            } elseif ($lokasi === 'gudang') {
                if ($barang->stok_gudang < $jumlah) throw new \Exception("Stok gudang ({$barang->stok_gudang} pcs) kurang dari jumlah write-off ({$jumlah} pcs)");
                $barang->stok_gudang -= $jumlah;
            } else {
                if ($barang->stok < $jumlah) throw new \Exception("Total stok ({$barang->stok} pcs) kurang dari jumlah write-off ({$jumlah} pcs)");
                if ($barang->stok_toko >= $jumlah) {
                    $barang->stok_toko -= $jumlah;
                } else {
                    $rem = $jumlah - $barang->stok_toko;
                    $barang->stok_toko = 0;
                    $barang->stok_gudang = max(0, $barang->stok_gudang - $rem);
                }
            }

            $barang->stok = $barang->stok_toko + $barang->stok_gudang;
            $barang->save();

            \Illuminate\Support\Facades\DB::commit();
            return response()->json([
                'success' => true,
                'message' => "Pemusnahan/Tarik barang kadaluarsa {$barang->nama_barang} ({$jumlah} pcs dari {$lokasi}) berhasil dicatat!",
                'data' => [
                    'barang_id' => $barang->barang_id,
                    'stok_toko' => $barang->stok_toko,
                    'stok_gudang' => $barang->stok_gudang,
                    'total_stok' => $barang->stok
                ]
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function mutasiStok(Request $request)
    {
        $this->checkAdmin($request);
        $request->validate([
            'barang_id' => 'required|integer|exists:barang,barang_id',
            'tipe' => 'required|in:gudang_ke_toko,toko_ke_gudang',
            'jumlah' => 'required|integer|min:1',
            'catatan' => 'nullable|string'
        ]);

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $barang = Barang::where('barang_id', $request->barang_id)->lockForUpdate()->first();
            if (!$barang) throw new \Exception("Barang tidak ditemukan");

            $jumlah = (int) $request->jumlah;
            if ($request->tipe === 'gudang_ke_toko') {
                if ($barang->stok_gudang < $jumlah) {
                    throw new \Exception("Stok gudang tidak mencukupi (Tersedia di gudang: {$barang->stok_gudang} pcs)");
                }
                $barang->stok_gudang -= $jumlah;
                $barang->stok_toko += $jumlah;
            } else {
                if ($barang->stok_toko < $jumlah) {
                    throw new \Exception("Stok toko tidak mencukupi (Tersedia di etalase toko: {$barang->stok_toko} pcs)");
                }
                $barang->stok_toko -= $jumlah;
                $barang->stok_gudang += $jumlah;
            }

            $barang->stok = $barang->stok_toko + $barang->stok_gudang;
            $barang->save();

            \Illuminate\Support\Facades\DB::commit();
            $arah = $request->tipe === 'gudang_ke_toko' ? 'Gudang ➔ Toko' : 'Toko ➔ Gudang';
            return response()->json([
                'success' => true,
                'message' => "Mutasi stok {$barang->nama_barang} ({$jumlah} pcs, {$arah}) berhasil!",
                'data' => [
                    'barang_id' => $barang->barang_id,
                    'stok_toko' => $barang->stok_toko,
                    'stok_gudang' => $barang->stok_gudang,
                    'total_stok' => $barang->stok
                ]
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function autoRefillDisplay(Request $request)
    {
        $this->checkAdmin($request);
        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $totalRefilled = 0;
            $itemsRefilled = 0;

            if ($request->has('items') && is_array($request->input('items'))) {
                // Confirmed picking list with custom physical counts
                foreach ($request->input('items') as $item) {
                    $barangId = $item['barang_id'] ?? null;
                    $jumlah = (int) ($item['jumlah'] ?? 0);
                    if (!$barangId || $jumlah <= 0) continue;

                    $barang = Barang::where('barang_id', $barangId)->lockForUpdate()->first();
                    if ($barang) {
                        $canTransfer = min($jumlah, (int) $barang->stok_gudang);
                        if ($canTransfer > 0) {
                            $barang->stok_gudang -= $canTransfer;
                            $barang->stok_toko += $canTransfer;
                            $barang->stok = $barang->stok_toko + $barang->stok_gudang;
                            if (!$barang->tgl_kadaluarsa_toko && $barang->tgl_kadaluarsa_gudang) {
                                $barang->tgl_kadaluarsa_toko = $barang->tgl_kadaluarsa_gudang;
                            }
                            $barang->save();

                            $totalRefilled += $canTransfer;
                            $itemsRefilled++;
                        }
                    }
                }
            } else {
                // Automated fallback: calculate all PKM deficits
                $barangs = Barang::where('stok_gudang', '>', 0)->lockForUpdate()->get();
                foreach ($barangs as $barang) {
                    $pkm = (int) ($barang->pkm ?: 1);
                    $currentToko = (int) $barang->stok_toko;
                    if ($currentToko < $pkm) {
                        $deficit = $pkm - $currentToko;
                        $canTransfer = min($deficit, (int) $barang->stok_gudang);
                        if ($canTransfer > 0) {
                            $barang->stok_gudang -= $canTransfer;
                            $barang->stok_toko += $canTransfer;
                            $barang->stok = $barang->stok_toko + $barang->stok_gudang;
                            if (!$barang->tgl_kadaluarsa_toko && $barang->tgl_kadaluarsa_gudang) {
                                $barang->tgl_kadaluarsa_toko = $barang->tgl_kadaluarsa_gudang;
                            }
                            $barang->save();

                            $totalRefilled += $canTransfer;
                            $itemsRefilled++;
                        }
                    }
                }
            }

            \Illuminate\Support\Facades\DB::commit();
            return response()->json([
                'success' => true,
                'message' => "Refill berhasil dikonfirmasi: {$totalRefilled} pcs telah dipindahkan ke display rak toko ({$itemsRefilled} SKU)",
                'total_refilled' => $totalRefilled,
                'items_refilled' => $itemsRefilled
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getRiwayatRestock(Request $request)
    {
        $this->checkAdmin($request);
        $riwayat = RiwayatRestock::with(['barang', 'admin'])
                    ->orderBy('created_at', 'desc')
                    ->get()
                    ->map(function($r) {
                        return [
                            'restock_id' => $r->restock_id,
                            'nama_barang' => $r->barang ? $r->barang->nama_barang : 'Barang Dihapus',
                            'nama_admin' => $r->admin ? $r->admin->username : 'Unknown',
                            'jumlah_tambah' => $r->jumlah_tambah,
                            'harga_beli_satuan' => (float) $r->harga_beli_satuan,
                            'total_biaya' => (float) $r->total_biaya,
                            'sumber_dana' => $r->sumber_dana,
                            'catatan' => $r->catatan,
                            'tanggal' => $r->created_at->format('Y-m-d H:i')
                        ];
                    });
        
        $totalPengeluaran = RiwayatRestock::sum('total_biaya');

        return response()->json([
            'success' => true, 
            'data' => $riwayat,
            'total_pengeluaran' => (float) $totalPengeluaran
        ]);
    }

    public function getAnggota(Request $request)
    {
        $this->checkAdmin($request);
        $anggota = Anggota::with('user')->get()->map(function($a) {
            return [
                'anggota_id' => $a->anggota_id,
                'nama_lengkap' => $a->nama_lengkap,
                'username' => $a->user ? $a->user->username : '',
                'saldo' => (float) $a->saldo,
                'hutang' => (float) $a->hutang,
                'shu' => (float) $a->shu,
            ];
        });
        return response()->json(['success' => true, 'data' => $anggota]);
    }

    public function tambahUser(Request $request)
    {
        $adminId = $this->checkAdmin($request);
        $request->validate([
            'username' => 'required|unique:users',
            'password' => 'required',
            'role' => 'required|in:admin,kasir,pengurus,anggota',
            'nama_lengkap' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $user = User::create([
                'username' => $request->username,
                'password_hash' => Hash::make($request->password),
                'role' => $request->role,
            ]);

            // Every user is registered as an official anggota
            Anggota::create([
                'user_id' => $user->user_id,
                'nama_lengkap' => $request->nama_lengkap ?: $request->username,
                'email' => strtolower($request->username) . '@koperasi.local',
                'saldo' => 0,
                'hutang' => 0,
                'shu' => 0,
            ]);

            // If given a staff/management role, record in jabatan_anggota
            if (in_array($request->role, ['admin', 'kasir', 'pengurus'])) {
                JabatanAnggota::create([
                    'user_id' => $user->user_id,
                    'role' => $request->role,
                    'status' => 'aktif',
                    'ditugaskan_oleh' => $adminId,
                    'catatan' => 'Penugasan awal saat registrasi akun',
                    'assigned_at' => now(),
                ]);
            }

            DB::commit();
            return response()->json(['success' => true, 'message' => 'User & anggota berhasil ditambahkan']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function updateUser(Request $request)
    {
        $adminId = $this->checkAdmin($request);
        $user = User::find($request->user_id);
        if (!$user) return response()->json(['success' => false, 'message' => 'User tidak ditemukan'], 404);

        DB::beginTransaction();
        try {
            $user->username = $request->username;
            $oldRole = $user->role;
            $newRole = $request->role ?: $oldRole;
            $user->role = $newRole;

            if ($request->password) {
                $user->password_hash = Hash::make($request->password);
            }
            $user->save();

            // Update anggota record nama_lengkap if provided
            if ($request->nama_lengkap && $user->anggota) {
                $user->anggota->nama_lengkap = $request->nama_lengkap;
                $user->anggota->save();
            }

            // Sync jabatan_anggota if role changed
            if ($newRole !== $oldRole) {
                // Deactivate old active mandate of this specific role
                $oldMandates = JabatanAnggota::where('user_id', $user->user_id)
                    ->where('role', $oldRole)
                    ->where('status', 'aktif')
                    ->get();

                foreach ($oldMandates as $om) {
                    $om->status = 'nonaktif';
                    $om->revoked_at = now();
                    $om->catatan = ($om->catatan ? $om->catatan . ' | ' : '') . 'Diubah melalui update user';
                    $om->save();
                }

                if (in_array($newRole, ['admin', 'kasir', 'pengurus'])) {
                    JabatanAnggota::create([
                        'user_id' => $user->user_id,
                        'role' => $newRole,
                        'status' => 'aktif',
                        'ditugaskan_oleh' => $adminId,
                        'catatan' => 'Penugasan peran baru via perbaruan data user',
                        'assigned_at' => now(),
                    ]);
                }
            }

            DB::commit();
            return response()->json(['success' => true, 'message' => 'User berhasil diupdate']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function hapusUser(Request $request)
    {
        $this->checkAdmin($request);
        $user = User::find($request->user_id);
        if (!$user) return response()->json(['success' => false, 'message' => 'User tidak ditemukan'], 404);

        if ($user->isAdmin()) {
            $adminCount = JabatanAnggota::where('role', 'admin')->where('status', 'aktif')->count();
            if ($adminCount <= 1) {
                return response()->json(['success' => false, 'message' => 'Tidak dapat menghapus admin terakhir'], 422);
            }
        }

        User::destroy($request->user_id);
        return response()->json(['success' => true, 'message' => 'User berhasil dihapus']);
    }

    public function getSetoranKasir(Request $request)
    {
        $this->checkAdmin($request);
        $data = SetoranKasir::with('kasir.anggota')->orderBy('created_at', 'desc')->get()->map(function($s) {
            $namaKasir = $s->kasir ? ($s->kasir->anggota ? $s->kasir->anggota->nama_lengkap : $s->kasir->username) : 'Kasir';
            $tglIso = $s->created_at ? $s->created_at->toIso8601String() : ($s->tanggal ? \Carbon\Carbon::parse($s->tanggal)->toIso8601String() : null);
            return [
                'id' => $s->setoran_id,
                'setoran_id' => $s->setoran_id,
                'nominal' => (float) $s->nominal,
                'nama_kasir' => $namaKasir,
                'kasir' => [
                    'nama_lengkap' => $namaKasir,
                    'username' => $s->kasir ? $s->kasir->username : ''
                ],
                'tanggal' => $tglIso,
                'created_at' => $tglIso,
                'status' => $s->status
            ];
        });
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function approveSetoranKasir(Request $request)
    {
        $adminId = $this->checkAdmin($request);
        $setoran = SetoranKasir::find($request->setoran_id);
        if ($setoran) {
            $action = $request->input('action', 'approve');
            $setoran->status = ($action === 'reject') ? 'rejected' : 'approved';
            $setoran->approved_by = $adminId;
            $setoran->save();
            return response()->json([
                'success' => true,
                'message' => $action === 'reject' ? 'Setoran ditolak' : 'Setoran disetujui'
            ]);
        }
        return response()->json(['success' => false, 'error' => 'Setoran tidak ditemukan'], 404);
    }

    public function topupSHU(Request $request)
    {
        $this->checkAdmin($request);
        $user = User::where('username', $request->nama_anggota)->first();
        if (!$user || !$user->anggota) return response()->json(['success' => false, 'message' => 'Anggota tidak ditemukan'], 404);
        
        $anggota = $user->anggota;
        $anggota->shu += $request->nominal;
        $anggota->save();
        return response()->json(['success' => true, 'message' => 'SHU berhasil ditopup']);
    }

    public function submitOpnameMassal(Request $request)
    {
        $this->checkAdmin($request);
        $adjustments = $request->input('adjustments');
        if (!$adjustments || !is_array($adjustments)) return response()->json(['success' => false, 'message' => 'Invalid data' ]);
        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            foreach ($adjustments as $adj) {
                $barang = Barang::find($adj['barang_id']);
                if ($barang) {
                    $barang->stok = $adj['stok_akhir'];
                    $barang->save();
                }
            }
            \Illuminate\Support\Facades\DB::commit();
            return response()->json(['success' => true, 'message' => 'Stok berhasil disesuaikan' ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    public function getLaporanTransaksi(Request $request)
    {
        try {
            $this->checkAdmin($request);

            $tglAwal = $request->input('tanggal_awal');
            $tglAkhir = $request->input('tanggal_akhir');
            $metode = $request->input('metode_pembayaran');
            $kasirId = $request->input('kasir_id');
            $pembeliType = $request->input('pembeli_type');
            $search = $request->input('search');
            $perPage = $request->input('per_page', 25);

            $q = Transaksi::query()->where('status', '!=', 'batal')->where('status', '!=', 'ditolak');

            if ($tglAwal) {
                $q->whereDate('created_at', '>=', $tglAwal);
            }
            if ($tglAkhir) {
                $q->whereDate('created_at', '<=', $tglAkhir);
            }
            if ($metode && $metode !== 'all') {
                $q->where('metode_pembayaran', $metode);
            }
            if ($kasirId && $kasirId !== 'all') {
                $q->where('kasir_id', $kasirId);
            }
            if ($pembeliType === 'anggota') {
                $q->whereNotNull('anggota_id');
            } elseif ($pembeliType === 'umum') {
                $q->whereNull('anggota_id');
            }
            if ($search) {
                $q->where(function($sub) use ($search) {
                    $sub->where('transaksi_id', 'like', "%{$search}%")
                        ->orWhereHas('anggota', fn($a) => $a->where('nama_lengkap', 'like', "%{$search}%"))
                        ->orWhereHas('kasir', fn($k) => $k->where('username', 'like', "%{$search}%"));
                });
            }

            // Summary Aggregations calculated directly on database
            $summaryAgg = (clone $q)->selectRaw('
                COUNT(*) as total_transaksi,
                COALESCE(SUM(total_harga), 0) as total_pendapatan,
                COALESCE(SUM(total_keuntungan), 0) as total_keuntungan,
                COALESCE(SUM(CASE WHEN metode_pembayaran = "cash" THEN total_harga ELSE 0 END), 0) as total_cash,
                COALESCE(SUM(CASE WHEN metode_pembayaran = "ewallet" THEN total_harga ELSE 0 END), 0) as total_ewallet,
                COALESCE(SUM(CASE WHEN metode_pembayaran = "hutang" THEN total_harga ELSE 0 END), 0) as total_hutang,
                COALESCE(SUM(CASE WHEN metode_pembayaran = "qr" THEN total_harga ELSE 0 END), 0) as total_qr,
                COALESCE(SUM(CASE WHEN metode_pembayaran = "transfer" THEN total_harga ELSE 0 END), 0) as total_transfer,
                COALESCE(SUM(CASE WHEN anggota_id IS NOT NULL THEN total_harga ELSE 0 END), 0) as omset_anggota,
                COALESCE(SUM(CASE WHEN anggota_id IS NULL THEN total_harga ELSE 0 END), 0) as omset_umum,
                COALESCE(SUM(CASE WHEN anggota_id IS NOT NULL THEN total_keuntungan ELSE 0 END), 0) as laba_anggota,
                COALESCE(SUM(CASE WHEN anggota_id IS NULL THEN total_keuntungan ELSE 0 END), 0) as laba_umum
            ')->first();

            $totalTransaksi = (int) ($summaryAgg->total_transaksi ?? 0);
            $totalPendapatan = (float) ($summaryAgg->total_pendapatan ?? 0);
            $totalKeuntungan = (float) ($summaryAgg->total_keuntungan ?? 0);
            $totalHpp = max(0, $totalPendapatan - $totalKeuntungan);
            $avgTransaksi = $totalTransaksi > 0 ? round($totalPendapatan / $totalTransaksi, 2) : 0;

            $breakdownPembayaran = [
                'cash' => (float) ($summaryAgg->total_cash ?? 0),
                'ewallet' => (float) ($summaryAgg->total_ewallet ?? 0),
                'hutang' => (float) ($summaryAgg->total_hutang ?? 0),
                'qr' => (float) ($summaryAgg->total_qr ?? 0),
                'transfer' => (float) ($summaryAgg->total_transfer ?? 0),
            ];

            // Breakdown Kasir
            $breakdownKasir = (clone $q)
                ->selectRaw('kasir_id, COUNT(*) as total_transaksi, COALESCE(SUM(total_harga), 0) as total_omset, COALESCE(SUM(total_keuntungan), 0) as total_laba')
                ->groupBy('kasir_id')
                ->with('kasir:user_id,username')
                ->get()
                ->map(function($item) {
                    return [
                        'kasir_id' => $item->kasir_id,
                        'kasir_username' => $item->kasir ? $item->kasir->username : 'System',
                        'total_transaksi' => (int) $item->total_transaksi,
                        'total_omset' => (float) $item->total_omset,
                        'total_laba' => (float) $item->total_laba,
                    ];
                });

            // Transaksi Harian (Grouping by Date)
            $transaksiHarian = (clone $q)
                ->selectRaw('DATE(created_at) as tanggal, COUNT(*) as jumlah_transaksi, COALESCE(SUM(total_harga), 0) as total_pendapatan, COALESCE(SUM(total_keuntungan), 0) as total_keuntungan')
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('tanggal', 'asc')
                ->get()
                ->map(function($item) {
                    return [
                        'tanggal' => $item->tanggal,
                        'jumlah_transaksi' => (int) $item->jumlah_transaksi,
                        'total_pendapatan' => (float) $item->total_pendapatan,
                        'total_keuntungan' => (float) $item->total_keuntungan,
                    ];
                });

            $withRelations = [
                'kasir:user_id,username',
                'anggota:anggota_id,nama_lengkap,nomor_anggota',
                'details:detail_id,transaksi_id,barang_id,jumlah,harga_satuan,subtotal,keuntungan',
                'details.barang:barang_id,nama_barang,satuan'
            ];

            // Pagination or All records
            if ($perPage === 'all' || $perPage == -1) {
                $transaksiList = $q->with($withRelations)->orderBy('created_at', 'desc')->get();

                $paginated = [
                    'current_page' => 1,
                    'last_page' => 1,
                    'total' => $transaksiList->count(),
                    'per_page' => $transaksiList->count(),
                ];
                $items = $transaksiList;
            } else {
                $paginator = $q->with($withRelations)->orderBy('created_at', 'desc')->paginate((int) $perPage);

                $paginated = [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'total' => $paginator->total(),
                    'per_page' => $paginator->perPage(),
                ];
                $items = $paginator->items();
            }

            $data = collect($items)->map(function($t) {
                return [
                    'transaksi_id' => $t->transaksi_id,
                    'created_at' => $t->created_at ? $t->created_at->toIso8601String() : null,
                    'anggota_id' => $t->anggota_id,
                    'nama_anggota' => $t->anggota ? $t->anggota->nama_lengkap : 'Pelanggan Umum',
                    'kasir_id' => $t->kasir_id,
                    'metode_pembayaran' => $t->metode_pembayaran,
                    'total_harga' => (float) $t->total_harga,
                    'total_keuntungan' => (float) $t->total_keuntungan,
                    'modal_hpp' => max(0, (float) $t->total_harga - (float) $t->total_keuntungan),
                    'status' => $t->status,
                    'created_at' => $t->created_at ? $t->created_at->toISOString() : null,
                    'items_count' => $t->details ? $t->details->count() : 0,
                    'details' => $t->details ? $t->details->map(function($d) {
                        return [
                            'detail_id' => $d->detail_id,
                            'barang_id' => $d->barang_id,
                            'nama_barang' => $d->barang ? $d->barang->nama_barang : 'Barang #' . $d->barang_id,
                            'jumlah' => (int) $d->jumlah,
                            'harga_satuan' => (float) $d->harga_satuan,
                            'harga_beli_saat_ini' => (float) ($d->harga_beli_saat_ini ?? 0),
                            'subtotal' => (float) $d->subtotal,
                            'keuntungan' => (float) ($d->keuntungan ?? 0),
                        ];
                    }) : []
                ];
            });

            $daftarKasir = User::where('role', 'kasir')->select('user_id', 'username')->get();

            // Total Beban Operasional Kas (OPEX)
            $qPengeluaran = PengeluaranOperasional::query();
            if ($tglAwal) $qPengeluaran->whereDate('tanggal', '>=', $tglAwal);
            if ($tglAkhir) $qPengeluaran->whereDate('tanggal', '<=', $tglAkhir);

            $totalBebanOperasional = (float) $qPengeluaran->sum('nominal');
            $daftarPengeluaran = (clone $qPengeluaran)->orderBy('tanggal', 'desc')->get();

            $totalLabaKotor = $totalKeuntungan;
            $totalLabaBersih = max(0, $totalLabaKotor - $totalBebanOperasional);

            $totalLabaAnggota = (float) ($summaryAgg->laba_anggota ?? 0);
            $totalLabaUmum = (float) ($summaryAgg->laba_umum ?? 0);

            // Alokasi Net SHU Tripartit:
            // 1. Bagian Anggota (60%) berasal dari Laba Partisipasi Belanja Anggota
            $proporsiOpexAnggota = $totalLabaKotor > 0 ? ($totalLabaAnggota / $totalLabaKotor) * $totalBebanOperasional : 0;
            $netLabaAnggota = max(0, $totalLabaAnggota - $proporsiOpexAnggota);

            $shuAnggota60 = round(0.60 * $netLabaAnggota, 2);
            $shuPengurus10 = round(0.10 * $netLabaAnggota, 2);
            $shuCadangan30 = round($totalLabaBersih - $shuAnggota60 - $shuPengurus10, 2);

            // Rekapitulasi Partisipasi Belanja & Hak SHU Seluruh Anggota Koperasi (Sub-Ledger SHU)
            $totalOmsetAnggota = (float) ($summaryAgg->omset_anggota ?? 0);

            $allAnggota = Anggota::select('anggota_id', 'nomor_anggota', 'nama_lengkap', 'email', 'saldo', 'hutang')
                ->orderBy('nama_lengkap', 'asc')
                ->get();

            $txAggPerAnggota = (clone $q)
                ->whereNotNull('anggota_id')
                ->selectRaw("
                    anggota_id,
                    COUNT(*) as frekuensi_belanja,
                    COALESCE(SUM(total_harga), 0) as total_belanja,
                    COALESCE(SUM(CASE WHEN metode_pembayaran != 'hutang' THEN total_harga ELSE 0 END), 0) as total_lunas,
                    COALESCE(SUM(CASE WHEN metode_pembayaran = 'hutang' THEN total_harga ELSE 0 END), 0) as total_hutang,
                    COALESCE(SUM(total_keuntungan), 0) as total_margin
                ")
                ->groupBy('anggota_id')
                ->get()
                ->keyBy('anggota_id');

            $rekapAnggota = $allAnggota->map(function($a) use ($txAggPerAnggota, $totalOmsetAnggota, $totalLabaAnggota, $shuAnggota60) {
                $tx = $txAggPerAnggota->get($a->anggota_id);
                $belanja = $tx ? (float) $tx->total_belanja : 0.0;
                $lunas = $tx ? (float) $tx->total_lunas : 0.0;
                $hutang = $tx ? (float) $tx->total_hutang : 0.0;
                $margin = $tx ? (float) $tx->total_margin : 0.0;
                $frek = $tx ? (int) $tx->frekuensi_belanja : 0;

                $rasioBelanja = ($totalOmsetAnggota > 0 && $belanja > 0) ? ($belanja / $totalOmsetAnggota) : 0;
                $rasioMargin = ($totalLabaAnggota > 0 && $margin > 0) ? ($margin / $totalLabaAnggota) : 0;
                $hakShu = round($rasioMargin * $shuAnggota60, 2);

                return [
                    'anggota_id' => $a->anggota_id,
                    'nomor_anggota' => $a->nomor_anggota,
                    'nama_lengkap' => $a->nama_lengkap ?: 'Anggota #' . $a->anggota_id,
                    'frekuensi_belanja' => $frek,
                    'total_belanja' => $belanja,
                    'total_lunas' => $lunas,
                    'total_hutang' => $hutang,
                    'saldo_hutang_koperasi' => (float) ($a->hutang ?? 0),
                    'porsi_persen' => round($rasioBelanja * 100, 2),
                    'hak_shu' => $hakShu,
                ];
            });

            // Rekapitulasi Bulanan (Bila rentang waktu multi-bulan)
            $isSqlite = DB::connection()->getDriverName() === 'sqlite';
            $monthExpr = $isSqlite ? "strftime('%Y-%m', created_at)" : "DATE_FORMAT(created_at, '%Y-%m')";
            
            $rekapBulanan = (clone $q)
                ->selectRaw("
                    {$monthExpr} as periode_bulan,
                    COUNT(*) as total_transaksi,
                    COALESCE(SUM(total_harga), 0) as omset_bulan,
                    COALESCE(SUM(total_keuntungan), 0) as margin_bulan,
                    COALESCE(SUM(CASE WHEN metode_pembayaran = 'hutang' THEN total_harga ELSE 0 END), 0) as piutang_bulan
                ")
                ->groupBy(DB::raw($monthExpr))
                ->orderBy('periode_bulan', 'asc')
                ->get()
                ->map(function($m) {
                    return [
                        'periode_bulan' => $m->periode_bulan,
                        'total_transaksi' => (int) $m->total_transaksi,
                        'omset_bulan' => (float) $m->omset_bulan,
                        'margin_bulan' => (float) $m->margin_bulan,
                        'piutang_bulan' => (float) $m->piutang_bulan,
                    ];
                });

            // ── 1. RASIO MANAJEMEN KEUANGAN & KESEHATAN KOPERASI (Permenkop UKM & Financial Ratio Analysis) ──
            $totalSeluruhAnggota = $allAnggota->count();
            $jumlahAnggotaAktif = $rekapAnggota->where('total_belanja', '>', 0)->count();
            $rasioPartisipasiAnggota = $totalSeluruhAnggota > 0 
                ? round(($jumlahAnggotaAktif / $totalSeluruhAnggota) * 100, 1) 
                : 0;

            $kasLikuidMasuk = (float) (($summaryAgg->total_cash ?? 0) + ($summaryAgg->total_ewallet ?? 0) + ($summaryAgg->total_qr ?? 0) + ($summaryAgg->total_transfer ?? 0));
            $totalPiutang = (float) ($summaryAgg->total_hutang ?? 0);

            // Rasio Piutang terhadap Omset (A/R to Sales Ratio)
            $rasioPiutang = $totalPendapatan > 0 ? round(($totalPiutang / $totalPendapatan) * 100, 1) : 0;

            // Cash Coverage Ratio: Kas Masuk / (Beban OPEX + Piutang)
            $pembagiKas = $totalBebanOperasional + $totalPiutang;
            $cashCoverageRatio = $pembagiKas > 0 ? round(($kasLikuidMasuk / $pembagiKas) * 100, 1) : 100;

            // Gross Profit Margin (GPM) & Net Profit Margin (NPM)
            $gpm = $totalPendapatan > 0 ? round(($totalLabaKotor / $totalPendapatan) * 100, 1) : 0;
            $npm = $totalPendapatan > 0 ? round(($totalLabaBersih / $totalPendapatan) * 100, 1) : 0;

            // Operating Expense Ratio (OER): Beban Operasional / Laba Kotor
            $oer = $totalLabaKotor > 0 ? round(($totalBebanOperasional / $totalLabaKotor) * 100, 1) : 0;

            // ── 2. SCORING KESEHATAN FINANSIAL KOMPREHENSIF (Skala 0 - 100) ──
            $skorLikuiditas = $cashCoverageRatio >= 100 ? 30 : ($cashCoverageRatio >= 50 ? 20 : 10);
            $skorPiutang = $rasioPiutang <= 15 ? 25 : ($rasioPiutang <= 35 ? 18 : ($rasioPiutang <= 50 ? 10 : 5));
            $skorProfitabilitas = $npm >= 10 ? 25 : ($npm >= 5 ? 18 : ($npm > 0 ? 12 : 0));
            $skorEfisiensi = $oer <= 35 ? 20 : ($oer <= 60 ? 15 : ($oer <= 85 ? 10 : 5));

            $totalSkorKesehatan = $skorLikuiditas + $skorPiutang + $skorProfitabilitas + $skorEfisiensi;
            
            if ($totalSkorKesehatan >= 80) {
                $statusKesehatan = 'SEHAT (GRADE A)';
                $badgeColor = 'green';
                $kesimpulan = 'Perputaran kas, margin kotor, dan kolektibilitas sangat prima. Koperasi mandiri dan kuat menopang pasokan kebutuhan unit kerja PKP-PK.';
            } elseif ($totalSkorKesehatan >= 60) {
                $statusKesehatan = 'CUKUP SEHAT (GRADE B)';
                $badgeColor = 'blue';
                $kesimpulan = 'Kondisi operasional stabil dan menghasilkan laba, namun perlu penertiban batas kasbon piutang belanja anggota.';
            } elseif ($totalSkorKesehatan >= 40) {
                $statusKesehatan = 'KURANG SEHAT (GRADE C)';
                $badgeColor = 'yellow';
                $kesimpulan = 'Terjadi tekanan likuiditas. Modal kulakan terhambat oleh besarnya akumulasi piutang belanja yang belum dilunasi.';
            } else {
                $statusKesehatan = 'KRITIS / DALAM PENGAWASAN (GRADE D)';
                $badgeColor = 'red';
                $kesimpulan = 'Arus kas terganggu signifikan. Diperlukan tindakan darurat pembatasan kasbon belanja dan penagihan piutang anggota.';
            }

            $analisisKesehatan = [
                'total_anggota_terdaftar' => $totalSeluruhAnggota,
                'jumlah_anggota_aktif' => $jumlahAnggotaAktif,
                'rasio_partisipasi_persen' => $rasioPartisipasiAnggota,
                'kas_likuid_masuk' => $kasLikuidMasuk,
                'total_piutang_berjalan' => $totalPiutang,
                'rasio_piutang_omset_persen' => $rasioPiutang,
                'cash_coverage_ratio_persen' => $cashCoverageRatio,
                'gross_profit_margin_persen' => $gpm,
                'net_profit_margin_persen' => $npm,
                'operating_expense_ratio_persen' => $oer,
                'skor_kesehatan' => $totalSkorKesehatan,
                'status_kesehatan' => $statusKesehatan,
                'badge_color' => $badgeColor,
                'kesimpulan_evaluasi' => $kesimpulan,
            ];

            return response()->json([
                'success' => true,
                'summary' => [
                    'total_transaksi' => $totalTransaksi,
                    'total_pendapatan' => $totalPendapatan,
                    'total_keuntungan' => $totalKeuntungan,
                    'total_laba_kotor' => $totalLabaKotor,
                    'total_hpp' => $totalHpp,
                    'total_beban_operasional' => $totalBebanOperasional,
                    'total_laba_bersih' => $totalLabaBersih,
                    'shu_anggota_60' => $shuAnggota60,
                    'shu_cadangan_30' => $shuCadangan30,
                    'shu_pengurus_10' => $shuPengurus10,
                    'total_hutang' => (float) ($summaryAgg->total_hutang ?? 0),
                    'total_cash' => (float) ($summaryAgg->total_cash ?? 0),
                    'total_ewallet' => (float) ($summaryAgg->total_ewallet ?? 0),
                    'total_qr' => (float) ($summaryAgg->total_qr ?? 0),
                    'total_transfer' => (float) ($summaryAgg->total_transfer ?? 0),
                    'omset_anggota' => (float) ($summaryAgg->omset_anggota ?? 0),
                    'omset_umum' => (float) ($summaryAgg->omset_umum ?? 0),
                    'avg_transaksi' => $avgTransaksi,
                    'analisis_kesehatan' => $analisisKesehatan,
                ],
                'data' => $data,
                'rekap_anggota' => $rekapAnggota,
                'rekap_bulanan' => $rekapBulanan,
                'analisis_kesehatan' => $analisisKesehatan,
                'pengeluaran_operasional' => $daftarPengeluaran,
                'pagination' => $paginated,
                'breakdown_pembayaran' => $breakdownPembayaran,
                'breakdown_kasir' => $breakdownKasir,
                'transaksi_harian' => $transaksiHarian,
                'daftar_kasir' => $daftarKasir,
                'periode' => ['tanggal_awal' => $tglAwal, 'tanggal_akhir' => $tglAkhir]
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('getLaporanTransaksi Error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => basename($e->getFile())
            ], 500);
        }
    }

    public function getPengeluaran(Request $request)
    {
        $this->checkAdmin($request);
        $tglAwal = $request->input('tanggal_awal');
        $tglAkhir = $request->input('tanggal_akhir');
        $search = $request->input('search');

        $query = PengeluaranOperasional::with('user:user_id,username')->orderBy('tanggal', 'desc')->orderBy('created_at', 'desc');

        if ($tglAwal) $query->whereDate('tanggal', '>=', $tglAwal);
        if ($tglAkhir) $query->whereDate('tanggal', '<=', $tglAkhir);
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('nama_pengeluaran', 'like', "%{$search}%")
                  ->orWhere('kategori', 'like', "%{$search}%")
                  ->orWhere('keterangan', 'like', "%{$search}%");
            });
        }

        $totalNominal = (clone $query)->sum('nominal');
        $data = $query->get();

        return response()->json([
            'success' => true,
            'total_pengeluaran' => (float) $totalNominal,
            'data' => $data
        ]);
    }

    public function tambahPengeluaran(Request $request)
    {
        $adminId = $this->checkAdmin($request);
        $request->validate([
            'nama_pengeluaran' => 'required|string|max:255',
            'nominal' => 'required|numeric|min:1',
            'tanggal' => 'nullable|date',
            'kategori' => 'nullable|string|max:100',
            'keterangan' => 'nullable|string|max:1000',
        ]);

        $item = PengeluaranOperasional::create([
            'nama_pengeluaran' => $request->nama_pengeluaran,
            'nominal' => (float) $request->nominal,
            'kategori' => $request->kategori ?: 'Operasional',
            'tanggal' => $request->tanggal ?: now()->toDateString(),
            'keterangan' => $request->keterangan,
            'created_by' => $adminId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengeluaran kas berhasil dicatat',
            'data' => $item
        ]);
    }

    public function hapusPengeluaran(Request $request, $id)
    {
        $this->checkAdmin($request);
        $item = PengeluaranOperasional::find($id);
        if ($item) {
            $item->delete();
            return response()->json(['success' => true, 'message' => 'Catatan pengeluaran berhasil dihapus']);
        }
        return response()->json(['success' => false, 'error' => 'Data pengeluaran tidak ditemukan'], 404);
    }

    public function getMonitorBarang(Request $request)
    {
        $this->checkAdmin($request);
        return response()->json(['success' => true, 'data' => []]);
    }

    public function getShuDistribusi(Request $request)
    {
        $this->checkAdmin($request);

        $aggregates = DB::table('shu_distribusi')
            ->selectRaw('
                COUNT(*) as total_distribusi,
                COALESCE(SUM(shu_60_percent), 0) as total_shu_60,
                COALESCE(SUM(shu_10_percent), 0) as total_shu_10,
                COALESCE(SUM(shu_30_percent), 0) as total_shu_30,
                COALESCE(SUM(shu_60_percent + shu_10_percent + shu_30_percent), 0) as total_all_shu
            ')
            ->first();

        $query = ShuDistribusi::with('anggota')->orderByDesc('created_at');
        if ($request->filled('tahun')) {
            $query->where('tahun', $request->input('tahun'));
        }

        $limit = (int) $request->input('limit', 100);
        $records = $query->limit($limit)->get();

        $data = $records->map(function($s) {
            return [
                'shu_id' => $s->shu_id,
                'anggota_id' => $s->anggota_id,
                'tahun' => $s->tahun,
                'nama_anggota' => $s->anggota ? $s->anggota->nama_lengkap : '',
                'shu_60_percent' => (float) $s->shu_60_percent,
                'shu_10_percent' => (float) $s->shu_10_percent,
                'shu_30_percent' => (float) $s->shu_30_percent,
                'total_shu' => (float) ($s->shu_60_percent + $s->shu_10_percent + $s->shu_30_percent),
                'created_at' => $s->created_at ? $s->created_at->toIso8601String() : null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'summary' => [
                'totalShu60' => (float) $aggregates->total_shu_60,
                'totalShu10' => (float) $aggregates->total_shu_10,
                'totalShu30' => (float) $aggregates->total_shu_30,
                'totalAllShu' => (float) $aggregates->total_all_shu,
                'totalDistribusi' => (int) $aggregates->total_distribusi,
                'tahunAktif' => $request->input('tahun', 'All')
            ]
        ]);
    }

    public function getDataKasir(Request $request)
    {
        $this->checkAdmin($request);
        $kasirUserIds = JabatanAnggota::where('role', 'kasir')->where('status', 'aktif')->pluck('user_id');
        $kasir = User::whereIn('user_id', $kasirUserIds)
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
        return response()->json(['success' => true, 'data' => $kasir]);
    }

    public function getPkmAnalysis(Request $request)
    {
        $this->checkAdmin($request);

        $days = (int) $request->input('days', 30);
        $leadTimeDays = (int) $request->input('lead_time_days', 4);
        $search = $request->input('search');

        $maxDate = DB::table('transaksi')->max('created_at') ?: now();
        $startDate = Carbon::parse($maxDate)->subDays($days);

        $sales = DB::table('transaksi_detail')
            ->join('transaksi', 'transaksi_detail.transaksi_id', '=', 'transaksi.transaksi_id')
            ->where('transaksi.created_at', '>=', $startDate)
            ->select('transaksi_detail.barang_id', DB::raw('SUM(transaksi_detail.jumlah) as total_sold'))
            ->groupBy('transaksi_detail.barang_id')
            ->pluck('total_sold', 'barang_id')
            ->toArray();

        $query = Barang::query();
        if ($search) {
            $query->where('nama_barang', 'like', "%{$search}%");
        }
        $barangs = $query->orderBy('nama_barang', 'asc')->get();

        $data = $barangs->map(function ($b) use ($sales, $days, $leadTimeDays) {
            $sold = (int) ($sales[$b->barang_id] ?? 0);
            $ads = round($sold / max(1, $days), 2);
            $currentPkm = (int) ($b->pkm ?: 1);
            $recommendedPkm = $sold > 0 ? max(1, (int) ceil($ads * $leadTimeDays)) : $currentPkm;
            $stokToko = (int) ($b->stok_toko ?? min($b->stok, $currentPkm));
            $stokGudang = (int) ($b->stok_gudang ?? max(0, $b->stok - $stokToko));
            $totalStok = (int) $b->stok;

            // Recommended buy: Only recommend buying if the item is moving (has sales)
            if ($sold > 0) {
                $targetBuffer = $recommendedPkm * 2;
                $recommendedBuy = max(0, $targetBuffer - $totalStok);
            } else {
                // 0 sales in period -> Do not auto buy dead stock
                $recommendedBuy = 0;
            }

            $hargaModal = (float) $b->harga_modal;
            $estimasiBiaya = $recommendedBuy * $hargaModal;

            return [
                'barang_id' => $b->barang_id,
                'nama_barang' => $b->nama_barang,
                'stok' => $totalStok,
                'stok_toko' => $stokToko,
                'stok_gudang' => $stokGudang,
                'harga_modal' => $hargaModal,
                'harga_jual' => (float) $b->harga_jual,
                'sales_period_days' => $days,
                'total_sold' => $sold,
                'ads' => $ads,
                'lead_time_days' => $leadTimeDays,
                'recommended_pkm' => $recommendedPkm,
                'recommended_buy' => $recommendedBuy,
                'estimasi_biaya_kulakan' => $estimasiBiaya,
                'pkm' => $currentPkm,
                'status_pkm' => $totalStok > $currentPkm ? 'Stok Aman' : ($totalStok < $currentPkm ? 'Kritis / Butuh Kulakan' : 'Optimal'),
            ];
        });

        $totalEstimatedBudget = $data->sum('estimasi_biaya_kulakan');
        $totalItemsToBuy = $data->sum('recommended_buy');

        return response()->json([
            'success' => true,
            'data' => $data,
            'summary' => [
                'total_barang' => $barangs->count(),
                'days' => $days,
                'lead_time_days' => $leadTimeDays,
                'total_pkm_units' => $data->sum('pkm'),
                'avg_pkm' => round($data->avg('pkm'), 1),
                'total_estimated_budget' => $totalEstimatedBudget,
                'total_items_to_buy' => $totalItemsToBuy,
            ]
        ]);
    }

    public function updatePkm(Request $request)
    {
        $this->checkAdmin($request);
        $request->validate([
            'barang_id' => 'required|integer|exists:barang,barang_id',
            'pkm' => 'required|integer|min:1'
        ]);

        $barang = Barang::findOrFail($request->barang_id);
        $barang->pkm = $request->pkm;
        $barang->save();

        return response()->json([
            'success' => true,
            'message' => "PKM {$barang->nama_barang} berhasil diperbarui menjadi {$request->pkm} pcs."
        ]);
    }

    public function autoCalculatePkm(Request $request)
    {
        $this->checkAdmin($request);
        $days = (int) $request->input('days', 30);
        $leadTimeDays = (int) $request->input('lead_time_days', 4);

        $maxDate = DB::table('transaksi')->max('created_at') ?: now();
        $startDate = Carbon::parse($maxDate)->subDays($days);

        $sales = DB::table('transaksi_detail')
            ->join('transaksi', 'transaksi_detail.transaksi_id', '=', 'transaksi.transaksi_id')
            ->where('transaksi.created_at', '>=', $startDate)
            ->select('transaksi_detail.barang_id', DB::raw('SUM(transaksi_detail.jumlah) as total_sold'))
            ->groupBy('transaksi_detail.barang_id')
            ->pluck('total_sold', 'barang_id')
            ->toArray();

        $updatedCount = DB::transaction(function () use ($sales, $days, $leadTimeDays) {
            $barangs = Barang::all();
            $count = 0;
            foreach ($barangs as $b) {
                $sold = (int) ($sales[$b->barang_id] ?? 0);
                $ads = $sold / max(1, $days);
                $pkm = max(1, (int) ceil($ads * $leadTimeDays));
                $b->pkm = $pkm;
                $b->save();
                $count++;
            }
            return $count;
        });

        return response()->json([
            'success' => true,
            'message' => "Berhasil mengkalkulasi dan menerapkan PKM 4 hari untuk {$updatedCount} produk berdasarkan data penjualan {$days} hari terakhir."
        ]);
    }

    public function getLaporanSelisihKasir(Request $request)
    {
        $this->checkAdmin($request);

        $handovers = SerahTerimaKasir::with(['kasirFrom', 'kasirTo'])
            ->where('status', 'approved')
            ->orderBy('created_at', 'desc')
            ->get();

        $kasirLosses = [];
        $detailedLogs = [];

        foreach ($handovers as $st) {
            $opname = $st->hasil_opname;
            if (!$opname || !isset($opname['summary'])) continue;

            $totalMinusNominal = (float) ($opname['summary']['totalMinusNominal'] ?? 0);
            $selisihKas = (float) ($opname['selisih_kas'] ?? 0);
            $minusKasNominal = $selisihKas < 0 ? abs($selisihKas) : 0;
            $totalKerugianShift = $totalMinusNominal + $minusKasNominal;

            $fromName = $st->kasirFrom ? $st->kasirFrom->username : "Kasir #{$st->kasir_from}";
            $fromId = $st->kasir_from;

            if (!isset($kasirLosses[$fromId])) {
                $kasirLosses[$fromId] = [
                    'kasir_id' => $fromId,
                    'kasir_name' => $fromName,
                    'total_shift_selesai' => 0,
                    'total_shift_ada_selisih' => 0,
                    'total_minus_barang_nominal' => 0,
                    'total_minus_kas_nominal' => 0,
                    'total_akumulasi_kerugian' => 0,
                ];
            }

            $kasirLosses[$fromId]['total_shift_selesai']++;
            if ($totalKerugianShift > 0) {
                $kasirLosses[$fromId]['total_shift_ada_selisih']++;
                $kasirLosses[$fromId]['total_minus_barang_nominal'] += $totalMinusNominal;
                $kasirLosses[$fromId]['total_minus_kas_nominal'] += $minusKasNominal;
                $kasirLosses[$fromId]['total_akumulasi_kerugian'] += $totalKerugianShift;
            }

            $discrepantItems = [];
            if (isset($opname['items']) && is_array($opname['items'])) {
                foreach ($opname['items'] as $it) {
                    if (($it['selisih'] ?? 0) != 0) {
                        $discrepantItems[] = [
                            'nama_barang' => $it['nama_barang'] ?? '',
                            'selisih' => $it['selisih'] ?? 0,
                            'harga_jual' => $it['harga_jual'] ?? 0,
                            'selisih_nominal' => $it['selisih_nominal'] ?? 0,
                        ];
                    }
                }
            }

            $detailedLogs[] = [
                'serah_id' => $st->serah_id,
                'kasir_from_name' => $fromName,
                'kasir_to_name' => $st->kasirTo ? $st->kasirTo->username : "Kasir #{$st->kasir_to}",
                'created_at' => $st->created_at,
                'uang_fisik' => (float) ($opname['uang_fisik'] ?? 0),
                'saldo_kas_sistem' => (float) ($opname['saldo_kas_sistem'] ?? 0),
                'selisih_kas' => $selisihKas,
                'total_minus_barang_nominal' => $totalMinusNominal,
                'total_kerugian_shift' => $totalKerugianShift,
                'catatan' => $opname['catatan'] ?? '',
                'discrepant_items' => $discrepantItems,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'rekap_per_kasir' => array_values($kasirLosses),
                'riwayat_selisih' => $detailedLogs,
            ]
        ]);
    }

    public function getLaporanTarikTunai(Request $request)
    {
        $this->checkAdmin($request);

        $tarikList = TarikTunai::with(['anggota', 'kasir', 'transaksi'])
            ->orderBy('created_at', 'desc')
            ->get();

        $totalNominalTarik = (float) $tarikList->sum('nominal');
        $totalSalesPenyerta = (float) $tarikList->sum(function ($t) {
            return $t->transaksi ? $t->transaksi->total_harga : 0;
        });

        $data = $tarikList->map(function ($t) {
            return [
                'tarik_id' => $t->tarik_id,
                'nama_anggota' => $t->anggota ? $t->anggota->nama_lengkap : 'Anggota',
                'kasir_name' => $t->kasir ? $t->kasir->username : 'Kasir',
                'nominal' => (float) $t->nominal,
                'sumber_dana' => $t->sumber_dana,
                'transaksi_id' => $t->transaksi_id,
                'belanja_nominal' => $t->transaksi ? (float) $t->transaksi->total_harga : 0,
                'persetujuan_shu' => (bool) $t->persetujuan_shu,
                'keterangan' => $t->keterangan,
                'created_at' => $t->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'summary' => [
                'total_penarikan_count' => $tarikList->count(),
                'total_nominal_keluar' => $totalNominalTarik,
                'total_sales_kontribusi' => $totalSalesPenyerta,
                'rasio_sales_to_tarik' => $totalNominalTarik > 0 ? round(($totalSalesPenyerta / $totalNominalTarik) * 100, 1) : 0,
            ]
        ]);
    }

    public function getShuManagement(Request $request)
    {
        $this->checkAdmin($request);

        $totalShu = (float) Anggota::sum('shu');
        $totalSaldo = (float) Anggota::sum('saldo');
        $totalHutang = (float) Anggota::sum('hutang');
        $totalAnggota = Anggota::count();
        $anggotaConsentCount = Anggota::whereNotNull('persetujuan_shu_master_at')->count();

        $anggotaList = Anggota::orderBy('nama_lengkap', 'asc')->get()->map(function ($a) {
            return [
                'anggota_id' => $a->anggota_id,
                'nama_lengkap' => $a->nama_lengkap,
                'saldo' => (float) $a->saldo,
                'shu' => (float) $a->shu,
                'hutang' => (float) $a->hutang,
                'has_master_consent' => !is_null($a->persetujuan_shu_master_at),
                'master_consent_at' => $a->persetujuan_shu_master_at,
            ];
        });

        $riwayatKonversi = KonversiShu::with(['anggota', 'admin'])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($k) {
                return [
                    'konversi_id' => $k->konversi_id,
                    'anggota_id' => $k->anggota_id,
                    'nama_anggota' => $k->anggota ? $k->anggota->nama_lengkap : 'Semua Anggota (Massal)',
                    'admin_name' => $k->admin ? $k->admin->username : 'Admin',
                    'nominal' => (float) $k->nominal,
                    'tipe_konversi' => $k->tipe_konversi,
                    'keterangan' => $k->keterangan,
                    'created_at' => $k->created_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => [
                    'total_shu' => $totalShu,
                    'total_saldo' => $totalSaldo,
                    'total_hutang' => $totalHutang,
                    'total_anggota' => $totalAnggota,
                    'anggota_consent_count' => $anggotaConsentCount,
                    'consent_percentage' => $totalAnggota > 0 ? round(($anggotaConsentCount / $totalAnggota) * 100, 1) : 0,
                ],
                'anggota' => $anggotaList,
                'riwayat_konversi' => $riwayatKonversi,
            ]
        ]);
    }

    public function prosesKonversiShu(Request $request)
    {
        $adminId = $this->checkAdmin($request);
        $request->validate([
            'mode' => 'required|in:individual,ke_saldo_belanja,pelunasan_hutang,massal_ke_saldo',
            'anggota_id' => 'nullable|integer|exists:anggota,anggota_id',
            'nominal' => 'nullable|numeric|min:1',
            'persentase' => 'nullable|numeric|min:1|max:100',
            'keterangan' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $mode = $request->mode;

            if ($mode === 'individual' || $mode === 'ke_saldo_belanja') {
                $anggota = Anggota::lockForUpdate()->find($request->anggota_id);
                if (!$anggota) throw new \Exception("Data anggota tidak ditemukan.");

                $nominal = (float) $request->nominal;
                if ($nominal <= 0 || $nominal > $anggota->shu) {
                    throw new \Exception("Nominal konversi tidak valid atau melebihi saldo SHU (Tersedia: Rp " . number_format($anggota->shu, 0, ',', '.') . ").");
                }

                $anggota->shu -= $nominal;
                $anggota->saldo += $nominal;
                $anggota->save();

                KonversiShu::create([
                    'anggota_id' => $anggota->anggota_id,
                    'admin_id' => $adminId,
                    'nominal' => $nominal,
                    'tipe_konversi' => 'ke_saldo_belanja',
                    'keterangan' => $request->keterangan ?: "Konversi SHU ke Saldo Belanja E-Wallet",
                ]);

                $message = "Berhasil memindahkan SHU sebesar Rp " . number_format($nominal, 0, ',', '.') . " ke Saldo Belanja " . $anggota->nama_lengkap . ".";

            } elseif ($mode === 'pelunasan_hutang') {
                $anggota = Anggota::lockForUpdate()->find($request->anggota_id);
                if (!$anggota) throw new \Exception("Data anggota tidak ditemukan.");

                if ($anggota->hutang <= 0) {
                    throw new \Exception("Anggota tidak memiliki tunggakan hutang.");
                }

                $maxPotong = min($anggota->shu, $anggota->hutang);
                $nominal = $request->nominal ? min((float) $request->nominal, $maxPotong) : $maxPotong;

                if ($nominal <= 0) {
                    throw new \Exception("Saldo SHU tidak mencukupi untuk memotong hutang.");
                }

                $anggota->shu -= $nominal;
                $anggota->hutang -= $nominal;
                $anggota->save();

                KonversiShu::create([
                    'anggota_id' => $anggota->anggota_id,
                    'admin_id' => $adminId,
                    'nominal' => $nominal,
                    'tipe_konversi' => 'pelunasan_hutang',
                    'keterangan' => $request->keterangan ?: "Kompensasi Pelunasan Hutang dari Saldo SHU",
                ]);

                $message = "Berhasil memotong SHU sebesar Rp " . number_format($nominal, 0, ',', '.') . " untuk pelunasan hutang " . $anggota->nama_lengkap . ".";

            } elseif ($mode === 'massal_ke_saldo') {
                $persentase = (float) ($request->persentase ?: 100);
                $ratio = $persentase / 100.0;
                $totalConverted = 0;
                $countMembers = 0;

                $anggotas = Anggota::lockForUpdate()->where('shu', '>', 0)->get();
                foreach ($anggotas as $a) {
                    $nominalToConvert = round($a->shu * $ratio, 2);
                    if ($nominalToConvert > 0) {
                        $a->shu -= $nominalToConvert;
                        $a->saldo += $nominalToConvert;
                        $a->save();

                        KonversiShu::create([
                            'anggota_id' => $a->anggota_id,
                            'admin_id' => $adminId,
                            'nominal' => $nominalToConvert,
                            'tipe_konversi' => 'distribusi_hari_raya',
                            'keterangan' => $request->keterangan ?: "Distribusi Massal SHU ({$persentase}%) ke Saldo Belanja Hari Raya",
                        ]);

                        $totalConverted += $nominalToConvert;
                        $countMembers++;
                    }
                }

                $message = "Distribusi massal berhasil! Rp " . number_format($totalConverted, 0, ',', '.') . " dipindahkan ke saldo belanja {$countMembers} anggota.";
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => $message,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function getDaftarJabatan(Request $request)
    {
        $this->checkAdmin($request);

        $jabatanList = JabatanAnggota::with(['user.anggota', 'ditugaskanOlehUser.anggota'])
            ->orderBy('status', 'asc') // 'aktif' comes first before 'nonaktif'
            ->orderBy('assigned_at', 'desc')
            ->get()
            ->map(function ($j) {
                return [
                    'jabatan_id' => $j->jabatan_id,
                    'user_id' => $j->user_id,
                    'username' => $j->user ? $j->user->username : 'Unknown',
                    'nama_lengkap' => $j->user && $j->user->anggota ? $j->user->anggota->nama_lengkap : ($j->user ? $j->user->username : 'Unknown'),
                    'role' => $j->role,
                    'status' => $j->status,
                    'catatan' => $j->catatan,
                    'assigned_at' => $j->assigned_at ? $j->assigned_at->format('Y-m-d H:i') : null,
                    'revoked_at' => $j->revoked_at ? $j->revoked_at->format('Y-m-d H:i') : null,
                    'ditugaskan_oleh' => $j->ditugaskanOlehUser ? ($j->ditugaskanOlehUser->anggota ? $j->ditugaskanOlehUser->anggota->nama_lengkap : $j->ditugaskanOlehUser->username) : 'Sistem Utama',
                ];
            });

        // Summary metrics
        $totalAdminAktif = JabatanAnggota::where('role', 'admin')->where('status', 'aktif')->count();
        $totalKasirAktif = JabatanAnggota::where('role', 'kasir')->where('status', 'aktif')->count();
        $totalPengurusAktif = JabatanAnggota::where('role', 'pengurus')->where('status', 'aktif')->count();
        $totalNonaktif = JabatanAnggota::where('status', 'nonaktif')->count();

        return response()->json([
            'success' => true,
            'data' => $jabatanList,
            'summary' => [
                'admin_aktif' => $totalAdminAktif,
                'kasir_aktif' => $totalKasirAktif,
                'pengurus_aktif' => $totalPengurusAktif,
                'total_riwayat' => $jabatanList->count(),
                'total_nonaktif' => $totalNonaktif,
            ],
        ]);
    }

    public function assignJabatan(Request $request)
    {
        $adminId = $this->checkAdmin($request);
        $request->validate([
            'user_id' => 'required|exists:users,user_id',
            'role' => 'required|in:admin,kasir,pengurus',
            'catatan' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $userId = (int) $request->user_id;
            $role = $request->role;

            // Check if already active with this role
            $existing = JabatanAnggota::where('user_id', $userId)
                ->where('role', $role)
                ->where('status', 'aktif')
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anggota ini sudah memiliki mandat aktif sebagai ' . strtoupper($role) . '.',
                ], 422);
            }

            // Create new mandate
            $jabatan = JabatanAnggota::create([
                'user_id' => $userId,
                'role' => $role,
                'status' => 'aktif',
                'ditugaskan_oleh' => $adminId,
                'catatan' => $request->catatan ?: "Penugasan mandat {$role} oleh Admin",
                'assigned_at' => now(),
            ]);

            // Sync user's primary role for seamless backward compatibility
            $user = User::find($userId);
            if ($user) {
                if ($role === 'admin' || ($role === 'kasir' && $user->role !== 'admin')) {
                    $user->role = $role;
                    $user->save();
                }
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => "Mandat " . strtoupper($role) . " berhasil ditugaskan kepada anggota.",
                'data' => $jabatan,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function revokeJabatan(Request $request)
    {
        $adminId = $this->checkAdmin($request);
        $request->validate([
            'jabatan_id' => 'required|exists:jabatan_anggota,jabatan_id',
            'alasan' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $jabatan = JabatanAnggota::find($request->jabatan_id);
            if ($jabatan->status === 'nonaktif') {
                return response()->json([
                    'success' => false,
                    'message' => 'Mandat jabatan ini sudah berstatus nonaktif sebelumnya.',
                ], 422);
            }

            // Guard: Cannot revoke the last active admin
            if ($jabatan->role === 'admin') {
                $activeAdminCount = JabatanAnggota::where('role', 'admin')->where('status', 'aktif')->count();
                if ($activeAdminCount <= 1) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Tidak dapat mencabut mandat Admin utama terakhir! Sistem membutuhkan minimal 1 Admin aktif.',
                    ], 422);
                }
            }

            // Revoke mandate
            $jabatan->status = 'nonaktif';
            $jabatan->revoked_at = now();
            if ($request->alasan) {
                $jabatan->catatan = ($jabatan->catatan ? $jabatan->catatan . ' | ' : '') . 'Alasan pencabutan: ' . $request->alasan;
            }
            $jabatan->save();

            // Update user's primary role fallback if no other active staff role
            $user = User::find($jabatan->user_id);
            if ($user) {
                $remainingActiveRoles = JabatanAnggota::where('user_id', $user->user_id)->where('status', 'aktif')->pluck('role')->toArray();
                if (in_array('admin', $remainingActiveRoles)) {
                    $user->role = 'admin';
                } elseif (in_array('kasir', $remainingActiveRoles)) {
                    $user->role = 'kasir';
                } else {
                    $user->role = 'anggota';
                }
                $user->save();
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => "Mandat jabatan berhasil dinonaktifkan/dicabut.",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
