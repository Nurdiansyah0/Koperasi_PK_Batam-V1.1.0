<?php

namespace App\Actions\Inventory;

use App\Models\Barang;
use Exception;

class DeductSaleStockAction
{
    /**
     * Deducts inventory store stock for validated retail sale lines within an ambient transaction.
     *
     * @param  array<int, array{barang_id: int, jumlah: int}>  $normalizedItems  Consolidated sale lines
     * @return array{items: array, total_harga: float, total_keuntungan: float} Authoritative product data & totals
     *
     * @throws Exception
     */
    public function execute(array $normalizedItems): array
    {
        if (empty($normalizedItems)) {
            return [
                'items' => [],
                'total_harga' => 0.0,
                'total_keuntungan' => 0.0,
            ];
        }

        // 1. Canonical Lock Hierarchy: Deterministic ascending Barang pre-locking
        $uniqueBarangIds = array_values(array_unique(array_column($normalizedItems, 'barang_id')));
        sort($uniqueBarangIds);

        $lockedBarangs = [];
        foreach ($uniqueBarangIds as $bId) {
            $b = Barang::where('barang_id', $bId)->lockForUpdate()->first();
            if (! $b) {
                throw new Exception('Stok etalase tidak mencukupi untuk barang ID: '.$bId);
            }
            $lockedBarangs[$bId] = $b;
        }

        // 2. Validate stock and deduct inventory in received business line order
        $deductedLines = [];
        $totalHarga = 0.0;
        $totalKeuntungan = 0.0;

        foreach ($normalizedItems as $item) {
            $bId = (int) $item['barang_id'];
            $qty = (int) $item['jumlah'];
            $barang = $lockedBarangs[$bId] ?? null;

            if (! $barang || $barang->stok_toko < $qty) {
                throw new Exception('Stok etalase tidak mencukupi untuk barang ID: '.$bId);
            }

            // Price Authority: Authoritative catalog prices owned by Inventory
            $hargaSatuan = (float) $barang->harga_jual;
            $hargaModal = (float) $barang->harga_modal;
            $subtotal = $hargaSatuan * $qty;
            $keuntungan = ($hargaSatuan - $hargaModal) * $qty;

            $totalHarga += $subtotal;
            $totalKeuntungan += $keuntungan;

            $deductedLines[] = [
                'barang_id' => $barang->barang_id,
                'jumlah' => $qty,
                'harga_satuan' => $hargaSatuan,
                'harga_modal' => $hargaModal,
                'subtotal' => $subtotal,
                'keuntungan' => $keuntungan,
            ];

            $barang->stok_toko -= $qty;
            $barang->save();
        }

        return [
            'items' => $deductedLines,
            'total_harga' => $totalHarga,
            'total_keuntungan' => $totalKeuntungan,
        ];
    }
}
