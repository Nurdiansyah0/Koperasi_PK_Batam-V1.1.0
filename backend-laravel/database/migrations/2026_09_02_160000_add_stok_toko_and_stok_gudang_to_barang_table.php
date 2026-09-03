<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('barang', function (Blueprint $table) {
            $table->integer('stok_toko')->default(0)->after('stok');
            $table->integer('stok_gudang')->default(0)->after('stok_toko');
        });

        // Initialize 2-Tier stock allocation:
        // stok_toko = min(stok, pkm) (fill retail display up to PKM limit)
        // stok_gudang = max(0, stok - pkm) (excess stock stored in backroom warehouse)
        $barangs = DB::table('barang')->get();
        foreach ($barangs as $b) {
            $stok = (int) $b->stok;
            $pkm = (int) ($b->pkm ?: 1);
            $stokToko = min($stok, $pkm);
            $stokGudang = max(0, $stok - $pkm);

            DB::table('barang')->where('barang_id', $b->barang_id)->update([
                'stok_toko' => $stokToko,
                'stok_gudang' => $stokGudang,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('barang', function (Blueprint $table) {
            $table->dropColumn(['stok_toko', 'stok_gudang']);
        });
    }
};
