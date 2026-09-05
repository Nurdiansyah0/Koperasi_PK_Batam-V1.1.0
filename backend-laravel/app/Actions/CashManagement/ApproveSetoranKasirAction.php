<?php

namespace App\Actions\CashManagement;

use App\Models\SetoranKasir;

class ApproveSetoranKasirAction
{
    /**
     * Approve or reject a cashier cash deposit.
     *
     * @param  int|string|null  $setoranId
     * @param  int|string  $adminId
     */
    public function execute($setoranId, $adminId, string $action = 'approve'): ?SetoranKasir
    {
        $setoran = SetoranKasir::find($setoranId);

        if (! $setoran) {
            return null;
        }

        $setoran->status = ($action === 'reject') ? 'rejected' : 'approved';
        $setoran->approved_by = $adminId;
        $setoran->save();

        return $setoran;
    }
}
