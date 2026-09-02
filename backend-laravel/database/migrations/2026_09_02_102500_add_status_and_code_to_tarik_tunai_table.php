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
            if (!Schema::hasColumn('tarik_tunai', 'kode_penarikan')) {
                $table->string('kode_penarikan')->nullable()->after('tarik_id');
            }
            if (!Schema::hasColumn('tarik_tunai', 'status')) {
                $table->string('status')->default('completed')->after('nominal');
            }
            if (!Schema::hasColumn('tarik_tunai', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('persetujuan_shu');
            }
            if (!Schema::hasColumn('tarik_tunai', 'alasan_tolak')) {
                $table->string('alasan_tolak')->nullable()->after('approved_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tarik_tunai', function (Blueprint $table) {
            $table->dropColumn(['kode_penarikan', 'status', 'approved_at', 'alasan_tolak']);
        });
    }
};
