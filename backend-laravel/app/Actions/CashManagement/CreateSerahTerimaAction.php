<?php

namespace App\Actions\CashManagement;

use App\Models\SerahTerimaKasir;
use Carbon\Carbon;
use Exception;

class CreateSerahTerimaAction
{
    /**
     * Submits physical cash count and items for handover (creates pending status).
     */
    public function execute(array $data, int $kasirId): array
    {
        $kasirTo = (int) $data['kasir_to'];
        if ($kasirId === $kasirTo) {
            throw new Exception('Tidak bisa serah terima ke diri sendiri', 400);
        }

        $hasilOpname = $data['hasil_opname'] ?? null;
        
        // Handle implicit payload formats like the original controller does
        if (empty($hasilOpname) && (isset($data['items']) || isset($data['uang_fisik']))) {
            $hasilOpname = [
                'uang_fisik' => (float) ($data['uang_fisik'] ?? 0),
                'catatan' => $data['catatan'] ?? '',
                'items' => $data['items'] ?? [],
            ];
        }

        $st = SerahTerimaKasir::create([
            'kasir_from' => $kasirId,
            'kasir_to' => $kasirTo,
            'hasil_opname' => is_string($hasilOpname) ? json_decode($hasilOpname, true) : $hasilOpname,
            'status' => 'pending',
            'created_at' => Carbon::now(),
        ]);

        return [
            'serah_id' => $st->serah_id,
            'serah_terima_id' => $st->serah_id,
        ];
    }
}
