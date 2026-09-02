<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('pengeluaran_operasional')) {
            Schema::create('pengeluaran_operasional', function (Blueprint $table) {
                $table->id('pengeluaran_id');
                $table->string('nama_pengeluaran');
                $table->decimal('nominal', 15, 2);
                $table->string('kategori')->nullable()->default('Operasional');
                $table->date('tanggal');
                $table->text('keterangan')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->index(['tanggal', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pengeluaran_operasional');
    }
};
