<?php

namespace App\Actions\Finance;

use App\Models\PengeluaranOperasional;

class DeletePengeluaranOperasionalAction
{
    /**
     * Delete an operational expense record by ID.
     *
     * @param  int|string  $id
     * @return bool True if deleted, false if not found.
     */
    public function execute($id): bool
    {
        $item = PengeluaranOperasional::find($id);

        if (! $item) {
            return false;
        }

        return (bool) $item->delete();
    }
}
