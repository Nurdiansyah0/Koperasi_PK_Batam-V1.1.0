<?php

namespace App\Actions\CashManagement;

use App\Models\Barang;
use App\Models\SerahTerimaKasir;
use App\Models\SetoranKasir;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\JabatanAnggota;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CalculateSerahTerimaDraftAction
{
    /**
     * Calculates the draft hand-over form data including drawer balance and cycle count targets.
     */
    public function execute(int $kasirId): array
    {
        $kasirUserIds = JabatanAnggota::where('role', 'kasir')->where('status', 'aktif')->pluck('user_id');
        $kasirList = User::where(function ($q) use ($kasirUserIds) {
            $q->whereIn('user_id', $kasirUserIds)->orWhere('role', 'kasir');
        })
            ->where('user_id', '!=', $kasirId)
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

        // Load all items in the store with store & warehouse stocks
        $allItems = Barang::select('barang_id', 'nama_barang', 'stok_toko', 'stok_gudang', 'pkm', 'harga_jual', 'updated_at')
            ->orderBy('nama_barang', 'asc')
            ->get();

        $rokokKeywords = ['rokok', 'sampoerna', 'surya', 'marlboro', 'gudang garam', 'magnum', 'djarum', 'camel', 'esse', 'filter', 'kretek', 'mild', 'samsu'];
        $threeDaysAgo = Carbon::now()->subDays(3);

        $defaultItems = [];
        $allItemsList = [];

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
            } elseif ($item->stok_toko < $pkmValue) {
                $item->risk_badge = 'Perlu Restock';
                $item->audit_reason = "PKM Toko: {$pkmValue} pcs (Stok Toko < PKM)";
            } else {
                $item->risk_badge = 'Display Toko';
                $item->audit_reason = "PKM Toko 4 Hari: {$pkmValue} pcs";
            }

            // Hide from default count if both store and warehouse stock == 0 for more than 3 days
            $isZeroStock = ($item->stok_toko <= 0 && $item->stok_gudang <= 0);
            $isOldZeroStock = $isZeroStock && (! $item->updated_at || Carbon::parse($item->updated_at)->lt($threeDaysAgo));
            $item->is_hidden_default = $isOldZeroStock;

            $allItemsList[] = $item;

            if (! $isOldZeroStock) {
                $defaultItems[] = $item;
            }
        }

        // Calculate theoretical drawer cash in system (READ-ONLY POS & Cash Management Dependency)
        $saldoKasSistem = $this->calculateSaldoKasKasir($kasirId);

        // Include pending cash transactions status for transparency without blocking shift handover
        $pendingCashQuery = Transaksi::where('status', 'pending')
            ->whereIn('metode_pembayaran', ['cash', 'tunai']);
        $pendingCashCount = (int) $pendingCashQuery->count();
        $pendingCashNominal = (float) $pendingCashQuery->sum('total_harga');
        $totalPendingCount = (int) Transaksi::where('status', 'pending')->count();

        return [
            'kasir_list' => $kasirList,
            'saldo_kas_sistem' => (float) $saldoKasSistem,
            'cycle_count_items' => array_values($defaultItems),
            'all_items' => array_values($allItemsList),
            'pending_cash_orders' => [
                'count' => $pendingCashCount,
                'nominal' => $pendingCashNominal,
                'total_pending_count' => $totalPendingCount,
            ],
        ];
    }

    private function calculateSaldoKasKasir(int $kasirId): float
    {

        // OPTIMIZATION: Shift-based Bounding Box.
        // Instead of doing a full table scan of the entire history, 
        // we find the last approved handover involving this cashier to bound the queries.
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
        if ($shiftStart) $trxQuery->where('created_at', '>=', $shiftStart);
        $cashInTrx = $trxQuery->sum('total_harga');

        $setorQuery = SetoranKasir::where('kasir_id', $kasirId)->where('status', 'approved');
        if ($shiftStart) $setorQuery->where('created_at', '>=', $shiftStart);
        $cashOutSetor = $setorQuery->sum('nominal');

        $debtQuery = DB::table('pembayaran_hutang')
            ->where('kasir_id', $kasirId)
            ->where('status', 'approved')
            ->where('metode_pembayaran', 'cash');
        if ($shiftStart) $debtQuery->where('created_at', '>=', $shiftStart);
        $cashDebtRepay = $debtQuery->sum('nominal');

        $withdrawQuery = DB::table('tarik_tunai')->where('kasir_id', $kasirId);
        if ($shiftStart) $withdrawQuery->where('created_at', '>=', $shiftStart);
        $cashWithdrawals = $withdrawQuery->sum('nominal');

        return (float) ($startingBalance + $cashInTrx + $cashDebtRepay - $cashWithdrawals - $cashOutSetor);
    }
}
