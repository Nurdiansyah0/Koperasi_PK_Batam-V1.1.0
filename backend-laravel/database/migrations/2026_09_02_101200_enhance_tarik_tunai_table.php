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
        Schema::table('tarik_tunai', function (Blueprint $table) {
            if (!Schema::hasColumn('tarik_tunai', 'sumber_dana')) {
                $table->string('sumber_dana')->default('shu')->after('nominal');
            }
            if (!Schema::hasColumn('tarik_tunai', 'transaksi_id')) {
                $table->unsignedBigInteger('transaksi_id')->nullable()->after('sumber_dana');
            }
            if (!Schema::hasColumn('tarik_tunai', 'persetujuan_shu')) {
                $table->boolean('persetujuan_shu')->default(true)->after('transaksi_id');
            }
            if (!Schema::hasColumn('tarik_tunai', 'keterangan')) {
                $table->string('keterangan')->nullable()->after('persetujuan_shu');
            }
            if (!Schema::hasColumn('tarik_tunai', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tarik_tunai', function (Blueprint $table) {
            $table->dropColumn(['sumber_dana', 'transaksi_id', 'persetujuan_shu', 'keterangan', 'updated_at']);
        });
    }
};
