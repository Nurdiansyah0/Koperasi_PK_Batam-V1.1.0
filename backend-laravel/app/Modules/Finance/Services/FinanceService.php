<?php

namespace App\Modules\Finance\Services;

use App\Models\Anggota;
use App\Models\Barang;
use App\Models\SetoranKasir;
use App\Models\Transaksi;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FinanceService
{
    public function getDashboardStats(): array
    {
        // 1. Daily Metrics
        $totalTransaksiHariIni = Transaksi::whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')->count();
        $totalPendapatanHariIni = Transaksi::whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')->sum('total_harga');
        $totalKeuntunganHariIni = Transaksi::whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')->sum('total_keuntungan');

        // 2. Koperasi Assets & Liabilities
        $totalAnggota = Anggota::count();
        $totalHutangBeredar = Anggota::sum('hutang') ?? 0;
        $totalSaldoAnggota = Anggota::sum('saldo') ?? 0;
        $totalShuTersedia = Anggota::sum('shu') ?? 0;

        $totalShuPengurus = DB::table('shu_distribusi')->sum('shu_10_percent') ?? 0;
        $totalShuKoperasi = DB::table('shu_distribusi')->sum('shu_30_percent') ?? 0;

        // Total Inventory Asset Value
        $totalAsetBarang = Barang::sum(DB::raw('stok * harga_modal')) ?? 0;

        return [
            'total_anggota' => (int) $totalAnggota,
            'total_transaksi_hari_ini' => (int) $totalTransaksiHariIni,
            'total_pendapatan_hari_ini' => (float) $totalPendapatanHariIni,
            'total_keuntungan_hari_ini' => (float) $totalKeuntunganHariIni,
            'total_hutang_beredar' => (float) $totalHutangBeredar,
            'total_saldo_anggota' => (float) $totalSaldoAnggota,
            'total_shu_tersedia' => (float) $totalShuTersedia,
            'total_shu_pengurus' => (float) $totalShuPengurus,
            'total_shu_koperasi' => (float) $totalShuKoperasi,
            'total_aset_barang' => (float) $totalAsetBarang,
        ];
    }

    public function getShuDistribusi(?int $tahun = null, ?string $search = null): array
    {
        $targetTahun = $tahun ?: (int) date('Y');

        $summary = DB::table('shu_distribusi')
            ->where('tahun', $targetTahun)
            ->selectRaw('
                COUNT(DISTINCT anggota_id) as total_penerima,
                COALESCE(SUM(shu_60_percent), 0) as total_shu_60,
                COALESCE(SUM(shu_10_percent), 0) as total_shu_10,
                COALESCE(SUM(shu_30_percent), 0) as total_shu_30,
                COALESCE(SUM(shu_60_percent + shu_10_percent + shu_30_percent), 0) as total_all_shu
            ')
            ->first();

        $query = DB::table('shu_distribusi as sd')
            ->join('anggota as a', 'sd.anggota_id', '=', 'a.anggota_id')
            ->where('sd.tahun', $targetTahun)
            ->select(
                'sd.anggota_id',
                'a.nama_lengkap',
                'sd.tahun',
                DB::raw('SUM(sd.shu_60_percent) as shu_60_percent'),
                DB::raw('SUM(sd.shu_10_percent) as shu_10_percent'),
                DB::raw('SUM(sd.shu_30_percent) as shu_30_percent')
            )
            ->groupBy('sd.anggota_id', 'a.nama_lengkap', 'sd.tahun');

        if ($search) {
            $query->where('a.nama_lengkap', 'LIKE', "%{$search}%");
        }

        $items = $query->orderByDesc('shu_60_percent')->limit(100)->get();

        return [
            'summary' => [
                'tahun' => (int) $targetTahun,
                'total_penerima' => (int) ($summary->total_penerima ?? 0),
                'total_shu_60' => (float) ($summary->total_shu_60 ?? 0),
                'total_shu_10' => (float) ($summary->total_shu_10 ?? 0),
                'total_shu_30' => (float) ($summary->total_shu_30 ?? 0),
                'total_all_shu' => (float) ($summary->total_all_shu ?? 0),
            ],
            'data' => $items,
        ];
    }

    public function topupShu(int $anggotaId, float $nominal): Anggota
    {
        return DB::transaction(function () use ($anggotaId, $nominal) {
            $anggota = Anggota::findOrFail($anggotaId);
            $anggota->shu += $nominal;
            $anggota->save();

            DB::table('shu_distribusi')->insert([
                'anggota_id' => $anggotaId,
                'tahun' => (int) date('Y'),
                'shu_60_percent' => $nominal,
                'shu_10_percent' => 0,
                'shu_30_percent' => 0,
                'created_at' => now(),
            ]);

            return $anggota;
        });
    }

    public function submitCashierDeposit(int $kasirId, float $nominal, float $totalPenjualan, ?string $keterangan = null): SetoranKasir
    {
        return SetoranKasir::create([
            'kasir_id' => $kasirId,
            'nominal' => $nominal,
            'total_penjualan' => $totalPenjualan,
            'keterangan' => $keterangan,
            'status' => 'pending',
            'created_at' => now(),
        ]);
    }

    public function approveCashierDeposit(int $setoranId, int $adminId): SetoranKasir
    {
        $setoran = SetoranKasir::findOrFail($setoranId);
        $setoran->status = 'approved';
        $setoran->admin_id = $adminId;
        $setoran->save();

        return $setoran;
    }

    public function rejectCashierDeposit(int $setoranId, int $adminId, ?string $alasan = null): SetoranKasir
    {
        $setoran = SetoranKasir::findOrFail($setoranId);
        $setoran->status = 'rejected';
        $setoran->admin_id = $adminId;
        $setoran->keterangan = $alasan ? ($setoran->keterangan." [Ditolak: {$alasan}]") : $setoran->keterangan;
        $setoran->save();

        return $setoran;
    }
}
