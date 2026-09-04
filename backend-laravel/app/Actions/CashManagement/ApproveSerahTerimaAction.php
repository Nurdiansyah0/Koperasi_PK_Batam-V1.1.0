<?php

namespace App\Actions\CashManagement;

use App\Models\Barang;
use App\Models\SerahTerimaKasir;
use Illuminate\Support\Facades\DB;
use Exception;

class ApproveSerahTerimaAction
{
    /**
     * Approves the handover and synchronizes physical stock.
     */
    public function execute(int $serahId, int $kasirId): void
    {
        DB::beginTransaction();
        try {
            $st = SerahTerimaKasir::where('serah_id', $serahId)
                ->where('kasir_to', $kasirId)
                ->lockForUpdate()
                ->first();

            if (! $st || $st->status !== 'pending') {
                throw new Exception('Data tidak valid atau sudah diproses', 400);
            }

            $st->status = 'approved';
            $st->save();

            // Auto-sync physical inventory stock to reflect verified count
            // KNOWN TRANSITIONAL CROSS-MODULE WRITE — PRESERVED FOR BEHAVIORAL COMPATIBILITY
            $opname = $this->parseHasilOpnameLocally($st->hasil_opname);
            if (isset($opname['items']) && is_array($opname['items'])) {
                foreach ($opname['items'] as $item) {
                    if (isset($item['barang_id']) && (isset($item['stok_aktual']) || isset($item['stok_input']))) {
                        $targetStock = isset($item['stok_input']) ? (int) $item['stok_input'] : (int) $item['stok_aktual'];
                        $barang = Barang::where('barang_id', $item['barang_id'])->lockForUpdate()->first();
                        if ($barang) {
                            $barang->stok = max(0, $targetStock);
                            $barang->save();
                        }
                    }
                }
            }

            DB::commit();
        } catch (Exception $e) {
            DB::rollBack();
            // Re-throw with custom code mapping or just rethrow
            throw $e;
        }
    }

    private function parseHasilOpnameLocally($raw)
    {
        if (empty($raw)) {
            return null;
        }
        if (is_array($raw)) {
            return $raw;
        }
        $decoded = json_decode($raw, true);
        if (! $decoded && is_string($raw)) {
            $decoded = json_decode(stripslashes($raw), true);
            if (! $decoded) {
                $decoded = json_decode(trim(stripslashes($raw), '"'), true);
            }
        }
        return is_array($decoded) ? $decoded : null;
    }
}
