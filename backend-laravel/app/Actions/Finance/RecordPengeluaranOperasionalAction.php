<?php

namespace App\Actions\Finance;

use App\Models\PengeluaranOperasional;

class RecordPengeluaranOperasionalAction
{
    /**
     * Record a new operational expense.
     *
     * @param  int|string  $adminId
     */
    public function execute(array $data, $adminId): PengeluaranOperasional
    {
        return PengeluaranOperasional::create([
            'nama_pengeluaran' => $data['nama_pengeluaran'],
            'nominal' => (float) $data['nominal'],
            'kategori' => ($data['kategori'] ?? null) ?: 'Operasional',
            'tanggal' => ($data['tanggal'] ?? null) ?: now()->toDateString(),
            'keterangan' => $data['keterangan'] ?? null,
            'created_by' => $adminId,
        ]);
    }
}
