<?php

namespace App\Actions\Inventory;

use App\Models\Barang;
use App\Models\RiwayatRestock;
use Illuminate\Support\Facades\DB;
use Exception;

class RestockBarangAction
{
    /**
     * Executes the restock process for a specific inventory item.
     *
     * @param array $data Validated request data containing restock details
     * @param int $adminId ID of the admin performing the restock
     * @return array Returns the updated barang and riwayat restock data if needed, or just success
     * @throws Exception
     */
    public function execute(array $data, int $adminId): array
    {
        DB::beginTransaction();
        try {
            // Preserve existing lock semantic for concurrency
            $barang = Barang::where('barang_id', $data['barang_id'])->lockForUpdate()->first();
            if (! $barang) {
                throw new Exception('Barang tidak ditemukan');
            }

            $jumlahTambah = (int) $data['jumlah_tambah'];
            $hargaBeliSatuan = $data['harga_beli_satuan']; // Kept as string/numeric for decimal precision
            $totalBiaya = $jumlahTambah * $hargaBeliSatuan;
            $alokasi = $data['alokasi'] ?? 'gudang';
            $tglExpired = $data['tanggal_kadaluarsa'] ?? null;
            $catatan = $data['catatan'] ?? null;

            $riwayatCatatan = $catatan ? ($catatan . " [Alokasi: {$alokasi}]") : "Alokasi: {$alokasi}";

            $riwayat = RiwayatRestock::create([
                'barang_id' => $barang->barang_id,
                'admin_id' => $adminId,
                'jumlah_tambah' => $jumlahTambah,
                'harga_beli_satuan' => $hargaBeliSatuan,
                'total_biaya' => $totalBiaya,
                'sumber_dana' => $data['sumber_dana'],
                'tanggal_kadaluarsa' => $tglExpired,
                'catatan' => $riwayatCatatan,
            ]);

            // 2-Tier allocation & Expiry Sync
            if ($alokasi === 'toko') {
                $barang->stok_toko += $jumlahTambah;
                if ($tglExpired) {
                    $barang->tgl_kadaluarsa_toko = $tglExpired;
                }
            } elseif ($alokasi === 'auto') {
                $pkm = (int) ($barang->pkm ?: 1);
                $neededForDisplay = max(0, $pkm - ((int) $barang->stok_toko));
                $fillToko = min($jumlahTambah, $neededForDisplay);
                $barang->stok_toko += $fillToko;
                $barang->stok_gudang += ($jumlahTambah - $fillToko);
                if ($tglExpired) {
                    if ($fillToko > 0 && ! $barang->tgl_kadaluarsa_toko) {
                        $barang->tgl_kadaluarsa_toko = $tglExpired;
                    }
                    $barang->tgl_kadaluarsa_gudang = $tglExpired;
                }
            } else {
                // Default to warehouse stock
                $barang->stok_gudang += $jumlahTambah;
                if ($tglExpired) {
                    $barang->tgl_kadaluarsa_gudang = $tglExpired;
                }
            }

            $barang->stok = $barang->stok_toko + $barang->stok_gudang;
            $barang->harga_modal = $hargaBeliSatuan;
            $barang->save();

            DB::commit();

            return [
                'barang' => $barang,
                'riwayat' => $riwayat,
                'total_biaya' => $totalBiaya,
                'alokasi' => $alokasi,
                'jumlah_tambah' => $jumlahTambah
            ];
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
