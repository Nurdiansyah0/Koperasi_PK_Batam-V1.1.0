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
use Carbon\Carbon;

class AdminController extends Controller
{
    private function checkAdmin(Request $request) {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized');
        }
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
            'total_aset_barang' => (float) $total_aset_barang
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
            'stok' => 'required|integer',
            'harga_modal' => 'required|numeric',
            'harga_jual' => 'required|numeric',
        ]);
        Barang::create($request->all());
        return response()->json(['success' => true, 'message' => 'Barang berhasil ditambah']);
    }

    public function updateBarang(Request $request)
    {
        $this->checkAdmin($request);
        $barang = Barang::find($request->barang_id);
        if (!$barang) return response()->json(['success' => false, 'message' => 'Barang tidak ditemukan'], 404);
        $barang->update($request->all());
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
            'catatan' => 'nullable|string'
        ]);

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $barang = Barang::where('barang_id', $request->barang_id)->lockForUpdate()->first();
            if (!$barang) throw new \Exception("Barang tidak ditemukan");

            $totalBiaya = $request->jumlah_tambah * $request->harga_beli_satuan;

            // Optional: If Koperasi has a general cash ledger, deduct it here.
            // For now, we record it in RiwayatRestock.

            RiwayatRestock::create([
                'barang_id' => $barang->barang_id,
                'admin_id' => $adminId,
                'jumlah_tambah' => $request->jumlah_tambah,
                'harga_beli_satuan' => $request->harga_beli_satuan,
                'total_biaya' => $totalBiaya,
                'sumber_dana' => $request->sumber_dana,
                'catatan' => $request->catatan
            ]);

            // Update Stok
            $barang->stok += $request->jumlah_tambah;
            
            // Update harga_modal if they want to track the latest purchase price as modal
            // (Standard retail practice: update modal to latest, or moving average. We'll update to latest)
            $barang->harga_modal = $request->harga_beli_satuan;
            $barang->save();

            \Illuminate\Support\Facades\DB::commit();
            return response()->json(['success' => true, 'message' => 'Restock berhasil dan tercatat!']);
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
        $this->checkAdmin($request);
        $request->validate([
            'username' => 'required|unique:users',
            'password' => 'required',
            'role' => 'required|in:admin,kasir,anggota'
        ]);

        DB::beginTransaction();
        try {
            $user = User::create([
                'username' => $request->username,
                'password_hash' => Hash::make($request->password),
                'role' => $request->role,
            ]);

            if ($request->role === 'anggota') {
                Anggota::create([
                    'user_id' => $user->user_id,
                    'nama_lengkap' => $request->username,
                    'email' => $request->username . '@koperasi.local',
                    'saldo' => 0,
                    'hutang' => 0,
                    'shu' => 0,
                ]);
            }
            DB::commit();
            return response()->json(['success' => true, 'message' => 'User berhasil ditambah']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function updateUser(Request $request)
    {
        $this->checkAdmin($request);
        $user = User::find($request->user_id);
        if (!$user) return response()->json(['success' => false], 404);

        $user->username = $request->username;
        $user->role = $request->role;
        if ($request->password) {
            $user->password_hash = Hash::make($request->password);
        }
        $user->save();
        return response()->json(['success' => true, 'message' => 'User berhasil diupdate']);
    }

    public function hapusUser(Request $request)
    {
        $this->checkAdmin($request);
        User::destroy($request->user_id);
        return response()->json(['success' => true, 'message' => 'User berhasil dihapus']);
    }

    public function getSetoranKasir(Request $request)
    {
        $this->checkAdmin($request);
        $data = SetoranKasir::with('kasir')->get()->map(function($s) {
            return [
                'id' => $s->setoran_id,
                'nominal' => (float) $s->nominal,
                'nama_kasir' => $s->kasir ? $s->kasir->username : '',
                'tanggal' => $s->created_at ? $s->created_at->toIso8601String() : null, // Mocking format if needed
                'status' => $s->status
            ];
        });
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function approveSetoranKasir(Request $request)
    {
        $this->checkAdmin($request);
        $setoran = SetoranKasir::find($request->setoran_id);
        if ($setoran) {
            $setoran->status = 'approved';
            $setoran->approved_at = Carbon::now();
            $setoran->save();
            return response()->json(['success' => true, 'message' => 'Setoran disetujui']);
        }
        return response()->json(['success' => false], 404);
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
        $this->checkAdmin($request);
        $q = Transaksi::with('kasir');
        if ($request->tanggal_awal) $q->whereDate('created_at', '>=', $request->tanggal_awal);
        if ($request->tanggal_akhir) $q->whereDate('created_at', '<=', $request->tanggal_akhir);

        $transaksi = $q->get();

        $total_transaksi = $transaksi->count();
        $total_pendapatan = $transaksi->sum('total_harga');

        $breakdown_pembayaran = [
            'cash' => $transaksi->where('metode_pembayaran', 'cash')->sum('total_harga'),
            'qr' => $transaksi->where('metode_pembayaran', 'qr')->sum('total_harga'),
            'ewallet' => $transaksi->where('metode_pembayaran', 'ewallet')->sum('total_harga'),
            'transfer' => $transaksi->where('metode_pembayaran', 'transfer')->sum('total_harga'),
            'hutang' => $transaksi->where('metode_pembayaran', 'hutang')->sum('total_harga'),
        ];

        // This is a simplified group-by for demonstration, matching format
        return response()->json([
            'success' => true,
            'total_transaksi' => $total_transaksi,
            'total_pendapatan' => (float) $total_pendapatan,
            'breakdown_pembayaran' => $breakdown_pembayaran,
            'breakdown_kasir' => [], // Needs grouping logic if required in UI
            'transaksi_harian' => [],
            'periode' => ['tanggal_awal' => $request->tanggal_awal, 'tanggal_akhir' => $request->tanggal_akhir]
        ]);
    }

    public function getMonitorBarang(Request $request)
    {
        $this->checkAdmin($request);
        return response()->json(['success' => true, 'data' => []]);
    }

    public function getShuDistribusi(Request $request)
    {
        $this->checkAdmin($request);
        $data = ShuDistribusi::with('anggota')->get()->map(function($s) {
            return [
                'shu_id' => $s->shu_id,
                'anggota_id' => $s->anggota_id,
                'tahun' => $s->tahun,
                'nama_anggota' => $s->anggota ? $s->anggota->nama_lengkap : '',
                'shu_60_percent' => (float) $s->shu_60_percent,
                'shu_10_percent' => (float) $s->shu_10_percent,
                'shu_30_percent' => (float) $s->shu_30_percent,
                'total_shu' => (float) $s->total_shu,
                'created_at' => $s->created_at ? $s->created_at->toIso8601String() : null,
            ];
        });
        return response()->json(['success' => true, 'data' => $data, 'summary' => [
            'totalShu60' => $data->sum('shu_60_percent'),
            'totalShu10' => $data->sum('shu_10_percent'),
            'totalShu30' => $data->sum('shu_30_percent'),
            'totalAllShu' => $data->sum('total_shu'),
            'totalDistribusi' => $data->count(),
            'tahunAktif' => 'All'
        ]]);
    }

    public function getDataKasir(Request $request)
    {
        $this->checkAdmin($request);
        $kasir = User::where('role', 'kasir')->get()->map(function($u) {
            return [
                'user_id' => $u->user_id,
                'username' => $u->username,
                'nama_lengkap' => $u->username,
            ];
        });
        return response()->json(['success' => true, 'data' => $kasir]);
    }
}
