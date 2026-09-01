<?php

namespace App\Modules\Inventory\Services;

use App\Models\Barang;
use App\Models\BarangOpname;
use App\Models\RiwayatRestock;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function getAllBarang()
    {
        return Barang::all();
    }

    public function getAvailableBarang()
    {
        return Barang::select('barang_id', 'nama_barang', 'stok', 'harga_jual')
            ->where('stok', '>', 0)
            ->get();
    }

    public function tambahBarang(array $data): Barang
    {
        return Barang::create([
            'nama_barang' => $data['nama_barang'],
            'stok'        => $data['stok'],
            'harga_modal' => $data['harga_modal'] ?? 0,
            'harga_jual'  => $data['harga_jual'] ?? ($data['harga'] ?? 0),
            'kategori'    => $data['kategori'] ?? null,
            'barcode'     => $data['barcode'] ?? null,
        ]);
    }

    public function editBarang(int $barangId, array $data): Barang
    {
        $barang = Barang::findOrFail($barangId);
        $barang->update([
            'nama_barang' => $data['nama_barang'] ?? $barang->nama_barang,
            'stok'        => $data['stok'] ?? $barang->stok,
            'harga_modal' => $data['harga_modal'] ?? $barang->harga_modal,
            'harga_jual'  => $data['harga_jual'] ?? ($data['harga'] ?? $barang->harga_jual),
            'kategori'    => $data['kategori'] ?? $barang->kategori,
            'barcode'     => $data['barcode'] ?? $barang->barcode,
        ]);
        return $barang;
    }

    public function hapusBarang(int $barangId): void
    {
        $barang = Barang::findOrFail($barangId);
        $barang->delete();
    }

    public function restockBarang(int $barangId, int $jumlah, float $hargaModal, float $hargaJual, ?string $supplier = null): array
    {
        return DB::transaction(function () use ($barangId, $jumlah, $hargaModal, $hargaJual, $supplier) {
            $barang = Barang::findOrFail($barangId);
            $stokSebelum = $barang->stok;
            $barang->stok += $jumlah;
            if ($hargaModal > 0) $barang->harga_modal = $hargaModal;
            if ($hargaJual > 0) $barang->harga_jual = $hargaJual;
            $barang->save();

            $log = RiwayatRestock::create([
                'barang_id'     => $barangId,
                'jumlah'        => $jumlah,
                'harga_modal'   => $hargaModal > 0 ? $hargaModal : $barang->harga_modal,
                'harga_jual'    => $hargaJual > 0 ? $hargaJual : $barang->harga_jual,
                'stok_sebelum'  => $stokSebelum,
                'stok_sesudah'  => $barang->stok,
                'supplier'      => $supplier,
                'created_at'    => now(),
            ]);

            return [
                'barang' => $barang,
                'log'    => $log,
            ];
        });
    }

    public function getMonitorBarang()
    {
        return Barang::select(
            'barang_id',
            'nama_barang',
            'stok',
            'harga_modal',
            'harga_jual',
            DB::raw('(stok * harga_modal) as total_nilai_modal'),
            DB::raw('(stok * harga_jual) as total_nilai_jual'),
            DB::raw('(stok * (harga_jual - harga_modal)) as potensi_laba')
        )->orderBy('stok', 'asc')->get();
    }

    public function submitMassOpname(array $items, int $adminId): array
    {
        return DB::transaction(function () use ($items, $adminId) {
            $results = [];
            foreach ($items as $item) {
                $barang = Barang::findOrFail($item['barang_id']);
                $stokSistem = $barang->stok;
                $stokFisik = $item['stok_fisik'];
                $selisih = $stokFisik - $stokSistem;

                // Update physical stock
                $barang->stok = $stokFisik;
                $barang->save();

                // Record opname log
                $opname = BarangOpname::create([
                    'barang_id'     => $barang->barang_id,
                    'user_id'       => $adminId,
                    'stok_sistem'   => $stokSistem,
                    'stok_fisik'    => $stokFisik,
                    'selisih'       => $selisih,
                    'keterangan'    => $item['keterangan'] ?? 'Opname massal berkala',
                    'created_at'    => now(),
                ]);

                $results[] = $opname;
            }
            return $results;
        });
    }
}
