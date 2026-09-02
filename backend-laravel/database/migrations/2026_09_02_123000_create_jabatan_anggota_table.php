<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('jabatan_anggota');

        Schema::create('jabatan_anggota', function (Blueprint $table) {
            $table->id('jabatan_id');
            $table->integer('user_id');
            $table->string('role', 30); // 'admin', 'kasir', 'pengurus', 'anggota'
            $table->string('status', 20)->default('aktif'); // 'aktif', 'nonaktif'
            $table->integer('ditugaskan_oleh')->nullable();
            $table->text('catatan')->nullable();
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('ditugaskan_oleh');
        });

        // Seed initial active roles based on current users
        $adminUser = DB::table('users')->where('username', 'Admin')->first();
        if ($adminUser) {
            DB::table('jabatan_anggota')->insert([
                'user_id' => $adminUser->user_id,
                'role' => 'admin',
                'status' => 'aktif',
                'catatan' => 'Admin Utama Koperasi PKPPK Batam',
                'assigned_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $kasirUsers = DB::table('users')->where('role', 'kasir')->get();
        foreach ($kasirUsers as $ku) {
            DB::table('jabatan_anggota')->insert([
                'user_id' => $ku->user_id,
                'role' => 'kasir',
                'status' => 'aktif',
                'catatan' => 'Petugas Kasir Toko Koperasi',
                'assigned_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('jabatan_anggota');
    }
};
