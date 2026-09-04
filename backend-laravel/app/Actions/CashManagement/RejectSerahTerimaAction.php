<?php

namespace App\Actions\CashManagement;

use App\Models\SerahTerimaKasir;
use Illuminate\Support\Facades\DB;
use Exception;

class RejectSerahTerimaAction
{
    /**
     * Rejects the pending handover.
     */
    public function execute(int $serahId, string $alasan, int $kasirId): void
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

            $st->status = 'rejected';
            $st->alasan_penolakan = $alasan;
            $st->save();

            DB::commit();
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
