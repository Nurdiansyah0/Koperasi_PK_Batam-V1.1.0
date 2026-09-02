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
        Schema::table('anggota', function (Blueprint $table) {
            if (!Schema::hasColumn('anggota', 'persetujuan_shu_master_at')) {
                $table->timestamp('persetujuan_shu_master_at')->nullable()->after('shu');
            }
            if (!Schema::hasColumn('anggota', 'persetujuan_shu_version')) {
                $table->string('persetujuan_shu_version')->nullable()->after('persetujuan_shu_master_at');
            }
        });

        if (!Schema::hasTable('konversi_shu')) {
            Schema::create('konversi_shu', function (Blueprint $table) {
                $table->id('konversi_id');
                $table->unsignedBigInteger('anggota_id');
                $table->unsignedBigInteger('admin_id')->nullable();
                $table->decimal('nominal', 15, 2);
                $table->string('tipe_konversi')->default('ke_saldo_belanja'); // 'ke_saldo_belanja', 'pelunasan_hutang', 'distribusi_hari_raya'
                $table->string('keterangan')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('anggota', function (Blueprint $table) {
            $table->dropColumn(['persetujuan_shu_master_at', 'persetujuan_shu_version']);
        });
        Schema::dropIfExists('konversi_shu');
    }
};
