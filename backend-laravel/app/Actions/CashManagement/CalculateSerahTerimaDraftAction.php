<?php

namespace App\Actions\CashManagement;

use App\Models\Barang;
use App\Models\SerahTerimaKasir;
use App\Models\SetoranKasir;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\JabatanAnggota;
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

        // Calculate theoretical drawer cash in system (READ-ONLY POS & Cash Management Dependency)
        $saldoKasSistem = $this->calculateSaldoKasKasir($kasirId);

        return [
            'kasir_list' => $kasirList,
            'saldo_kas_sistem' => (float) $saldoKasSistem,
            'cycle_count_items' => $allItems,
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

        $cashOutSetor = SetoranKasir::where('kasir_id', $kasirId)
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
}
