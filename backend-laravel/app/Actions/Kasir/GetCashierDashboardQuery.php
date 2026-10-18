<?php

namespace App\Actions\Kasir;

use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\SerahTerimaKasir;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class GetCashierDashboardQuery
{
    /**
     * Executes the dashboard read model query.
     */
    public function execute(int $kasirId): array
    {
        $todayStart = Carbon::today()->startOfDay();
        $todayEnd = Carbon::today()->endOfDay();

        $dailyStats = Transaksi::where('kasir_id', $kasirId)
            ->where('status', 'selesai')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->selectRaw('COUNT(*) as total_transaksi, COALESCE(SUM(total_harga), 0) as total_penjualan')
            ->first();

        $penjualanHariIni = (float) ($dailyStats->total_penjualan ?? 0);
        $transaksiHariIni = (int) ($dailyStats->total_transaksi ?? 0);

        $itemTerjualHariIni = $transaksiHariIni > 0
            ? (int) TransaksiDetail::join('transaksi', 'transaksi.transaksi_id', '=', 'transaksi_detail.transaksi_id')
                ->where('transaksi.kasir_id', $kasirId)
                ->where('transaksi.status', 'selesai')
                ->whereBetween('transaksi.created_at', [$todayStart, $todayEnd])
                ->sum('transaksi_detail.jumlah')
            : 0;

        $totalTransaksiDilayani = Transaksi::where('kasir_id', $kasirId)
            ->where('status', 'selesai')
            ->count();

        $uangCashMasuk = $this->calculateSaldoKasKasir($kasirId);

        $pendingSerahTerima = SerahTerimaKasir::where('kasir_to', $kasirId)
            ->where('status', 'pending')
            ->count();

        $pendingPesanan = Transaksi::where('status', 'pending')->count();

        $pendingHutang = DB::table('pembayaran_hutang')
            ->where('status', 'pending')
            ->count();

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

        return [
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
        ];
    }

    private function calculateSaldoKasKasir(int $kasirId): float
    {
        $lastHandover = SerahTerimaKasir::where('status', 'approved')
            ->where(function ($q) use ($kasirId) {
                $q->where('kasir_to', $kasirId)->orWhere('kasir_from', $kasirId);
            })
            ->orderBy('created_at', 'desc')
            ->first();

        $shiftStart = $lastHandover ? $lastHandover->created_at : null;

        $startingBalance = 0;
        if ($lastHandover && $lastHandover->kasir_to == $kasirId) {
            $h = $lastHandover->hasil_opname;
            if (is_string($h)) {
                $h = json_decode($h, true);
            }
            $startingBalance = $h['uang_fisik'] ?? 0;
        }

        $trxQuery = Transaksi::where('kasir_id', $kasirId)
            ->where('status', 'selesai')
            ->whereIn('metode_pembayaran', ['cash', 'tunai', 'potong_tarik_tunai']);
        if ($shiftStart) {
            $trxQuery->where('created_at', '>=', $shiftStart);
        }
        $cashInTrx = $trxQuery->sum('total_harga');

        $setorQuery = \App\Models\SetoranKasir::where('kasir_id', $kasirId)
            ->where('status', 'approved');
        if ($shiftStart) {
            $setorQuery->where('created_at', '>=', $shiftStart);
        }
        $cashOutSetor = $setorQuery->sum('nominal');

        $debtQuery = DB::table('pembayaran_hutang')
            ->where('kasir_id', $kasirId)
            ->where('status', 'approved')
            ->where('metode_pembayaran', 'cash');
        if ($shiftStart) {
            $debtQuery->where('created_at', '>=', $shiftStart);
        }
        $cashDebtRepay = $debtQuery->sum('nominal');

        $withdrawQuery = DB::table('tarik_tunai')
            ->where('kasir_id', $kasirId);
        if ($shiftStart) {
            $withdrawQuery->where('created_at', '>=', $shiftStart);
        }
        $cashWithdrawals = $withdrawQuery->sum('nominal');

        return (float) ($startingBalance + $cashInTrx + $cashDebtRepay - $cashWithdrawals - $cashOutSetor);
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

        return $decoded;
    }
}
