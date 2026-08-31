<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('riwayat_restock', function (Blueprint $table) {
            $table->id('restock_id');
            $table->integer('barang_id');
            $table->integer('admin_id');
            $table->integer('jumlah_tambah');
            $table->decimal('harga_beli_satuan', 15, 2);
            $table->decimal('total_biaya', 15, 2);
            $table->string('sumber_dana')->default('kas_koperasi');
            $table->text('catatan')->nullable();
            $table->timestamps();

            // Note: FK constraints skipped to avoid issues if legacy tables are MyISAM or different charsets, 
            // but we can add logical indexes.
            $table->index('barang_id');
            $table->index('admin_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('riwayat_restock');
    }
};
