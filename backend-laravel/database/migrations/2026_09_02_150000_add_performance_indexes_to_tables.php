<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->index(['kasir_id', 'status', 'created_at'], 'idx_trx_kasir_status_date');
            $table->index(['anggota_id', 'created_at'], 'idx_trx_anggota_date');
            $table->index(['status', 'created_at'], 'idx_trx_status_date');
            $table->index('metode_pembayaran', 'idx_trx_metode');
        });

        Schema::table('transaksi_detail', function (Blueprint $table) {
            $table->index(['transaksi_id', 'barang_id'], 'idx_trx_detail_composite');
        });

        Schema::table('pembayaran_hutang', function (Blueprint $table) {
            $table->index(['kasir_id', 'status'], 'idx_ph_kasir_status');
            $table->index(['anggota_id', 'status'], 'idx_ph_anggota_status');
        });

        Schema::table('serah_terima_kasir', function (Blueprint $table) {
            $table->index(['kasir_to', 'status'], 'idx_st_to_status');
            $table->index(['kasir_from', 'status'], 'idx_st_from_status');
        });

        Schema::table('setoran_kasir', function (Blueprint $table) {
            $table->index(['kasir_id', 'status'], 'idx_setor_kasir_status');
        });

        Schema::table('tarik_tunai', function (Blueprint $table) {
            $table->index(['kasir_id', 'status'], 'idx_tarik_kasir_status');
            $table->index(['anggota_id', 'status'], 'idx_tarik_anggota_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->dropIndex('idx_trx_kasir_status_date');
            $table->dropIndex('idx_trx_anggota_date');
            $table->dropIndex('idx_trx_status_date');
            $table->dropIndex('idx_trx_metode');
        });

        Schema::table('transaksi_detail', function (Blueprint $table) {
            $table->dropIndex('idx_trx_detail_composite');
        });

        Schema::table('pembayaran_hutang', function (Blueprint $table) {
            $table->dropIndex('idx_ph_kasir_status');
            $table->dropIndex('idx_ph_anggota_status');
        });

        Schema::table('serah_terima_kasir', function (Blueprint $table) {
            $table->dropIndex('idx_st_to_status');
            $table->dropIndex('idx_st_from_status');
        });

        Schema::table('setoran_kasir', function (Blueprint $table) {
            $table->dropIndex('idx_setor_kasir_status');
        });

        Schema::table('tarik_tunai', function (Blueprint $table) {
            $table->dropIndex('idx_tarik_kasir_status');
            $table->dropIndex('idx_tarik_anggota_status');
        });
    }
};
