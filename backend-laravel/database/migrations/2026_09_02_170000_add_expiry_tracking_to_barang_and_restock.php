<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('barang', function (Blueprint $table) {
            $table->date('tgl_kadaluarsa_toko')->nullable()->after('stok_gudang');
            $table->date('tgl_kadaluarsa_gudang')->nullable()->after('tgl_kadaluarsa_toko');
        });

        if (Schema::hasTable('riwayat_restock')) {
            Schema::table('riwayat_restock', function (Blueprint $table) {
                $table->date('tanggal_kadaluarsa')->nullable()->after('sumber_dana');
            });
        }
    }

    public function down(): void
    {
        Schema::table('barang', function (Blueprint $table) {
            $table->dropColumn(['tgl_kadaluarsa_toko', 'tgl_kadaluarsa_gudang']);
        });

        if (Schema::hasTable('riwayat_restock')) {
            Schema::table('riwayat_restock', function (Blueprint $table) {
                $table->dropColumn(['tanggal_kadaluarsa']);
            });
        }
    }
};
