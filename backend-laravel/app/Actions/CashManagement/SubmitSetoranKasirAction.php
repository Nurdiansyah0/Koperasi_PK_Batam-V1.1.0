<?php

namespace App\Actions\CashManagement;

use App\Models\SetoranKasir;
use Carbon\Carbon;

class SubmitSetoranKasirAction
{
    /**
     * Submit a cashier cash deposit to admin.
     *
     * @param  int|string  $kasirId
     * @param  float|int|string  $nominal
     */
    public function execute($kasirId, $nominal): SetoranKasir
    {
        return SetoranKasir::create([
            'kasir_id' => $kasirId,
            'nominal' => $nominal,
            'status' => 'pending',
            'created_at' => Carbon::now(),
        ]);
    }
}
