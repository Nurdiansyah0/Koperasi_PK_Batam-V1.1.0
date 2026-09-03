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
        $cashInTrx = Transaksi::where('kasir_id', $kasirId)
            ->where('status', 'selesai')
            ->whereIn('metode_pembayaran', ['cash', 'tunai'])
            ->sum('total_harga');

        $cashInSerah = SerahTerimaKasir::where('kasir_to', $kasirId)
            ->where('status', 'approved')
            ->pluck('hasil_opname')
            ->sum(function ($h) {
                if (is_string($h)) {
                    $h = json_decode($h, true);
                }
                return $h['uang_fisik'] ?? 0;
            });

        $cashOutSerah = SerahTerimaKasir::where('kasir_from', $kasirId)
            ->where('status', 'approved')
            ->pluck('hasil_opname')
            ->sum(function ($h) {
                if (is_string($h)) {
                    $h = json_decode($h, true);
                }
                return $h['uang_fisik'] ?? 0;
            });

        $cashOutSetor = \App\Models\SetoranKasir::where('kasir_id', $kasirId)
            ->where('status', 'approved')
            ->sum('nominal');

        $cashDebtRepay = DB::table('pembayaran_hutang')
            ->where('kasir_id', $kasirId)
            ->where('status', 'approved')
            ->where('metode_pembayaran', 'cash')
            ->sum('nominal');

        $cashWithdrawals = DB::table('tarik_tunai')
            ->where('kasir_id', $kasirId)
            ->sum('nominal');

        return (float) ($cashInTrx + $cashDebtRepay + $cashInSerah - $cashWithdrawals - $cashOutSerah - $cashOutSetor);
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
