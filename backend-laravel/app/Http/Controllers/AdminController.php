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
            $setoran->approved_by = $request->user()->user_id;
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
        $q = Transaksi::with(['kasir', 'anggota']);
        if ($request->tanggal_awal) $q->whereDate('created_at', '>=', $request->tanggal_awal);
        if ($request->tanggal_akhir) $q->whereDate('created_at', '<=', $request->tanggal_akhir);

        $transaksi = $q->get();

        $total_transaksi = $transaksi->count();
        $total_pendapatan = $transaksi->sum('total_harga');

        $breakdown_pembayaran = [
            'cash' => (float) $transaksi->where('metode_pembayaran', 'cash')->sum('total_harga'),
            'qr' => (float) $transaksi->where('metode_pembayaran', 'qr')->sum('total_harga'),
            'ewallet' => (float) $transaksi->where('metode_pembayaran', 'ewallet')->sum('total_harga'),
            'transfer' => (float) $transaksi->where('metode_pembayaran', 'transfer')->sum('total_harga'),
            'hutang' => (float) $transaksi->where('metode_pembayaran', 'hutang')->sum('total_harga'),
        ];

        $data = $transaksi->map(function($t) {
            return [
                'transaksi_id' => $t->transaksi_id,
                'created_at' => $t->created_at ? $t->created_at->toIso8601String() : null,
                'nama_anggota' => $t->anggota ? $t->anggota->nama_lengkap : 'Umum',
                'metode_pembayaran' => $t->metode_pembayaran,
                'total_harga' => (float) $t->total_harga,
                'kasir_username' => $t->kasir ? $t->kasir->username : null,
            ];
        });

        return response()->json([
            'success' => true,
            'summary' => [
                'total_transaksi' => $total_transaksi,
                'total_pendapatan' => (float) $total_pendapatan,
                'total_hutang' => $breakdown_pembayaran['hutang'],
            ],
            'data' => $data,
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
            $recommendedPkm = max(1, (int) ceil($ads * $leadTimeDays));
            $currentPkm = (int) ($b->pkm ?: 1);

            return [
                'barang_id' => $b->barang_id,
                'nama_barang' => $b->nama_barang,
                'stok' => (int) $b->stok,
                'harga_modal' => (float) $b->harga_modal,
                'harga_jual' => (float) $b->harga_jual,
                'sales_period_days' => $days,
                'total_sold' => $sold,
                'ads' => $ads,
                'lead_time_days' => $leadTimeDays,
                'recommended_pkm' => $recommendedPkm,
                'pkm' => $currentPkm,
                'status_pkm' => $b->stok > $currentPkm ? 'Etalase Cukup (Ada Stok Cadangan)' : ($b->stok < $currentPkm ? 'Perlu Restock Toko' : 'Optimal'),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'summary' => [
                'total_barang' => $barangs->count(),
                'days' => $days,
                'lead_time_days' => $leadTimeDays,
                'total_pkm_units' => $data->sum('pkm'),
                'avg_pkm' => round($data->avg('pkm'), 1),
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
