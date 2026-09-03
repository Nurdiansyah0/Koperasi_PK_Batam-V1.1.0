<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Ensure any user in users table has a corresponding row in anggota
        $usersWithoutAnggota = DB::table('users')
            ->leftJoin('anggota', 'users.user_id', '=', 'anggota.user_id')
            ->whereNull('anggota.anggota_id')
            ->select('users.user_id', 'users.username', 'users.role', 'users.created_at')
            ->get();

        foreach ($usersWithoutAnggota as $u) {
            $namaLengkap = $u->username === 'Admin' ? 'Administrator Utama' : $u->username;

            DB::table('anggota')->insert([
                'user_id' => $u->user_id,
                'nama_lengkap' => $namaLengkap,
                'email' => strtolower($u->username).'@koperasi.local',
                'saldo' => 0,
                'hutang' => 0,
                'shu' => 0,
                'created_at' => $u->created_at ?? now(),
            ]);
        }
    }

    public function down(): void
    {
        // No destructive rollback needed since anggota accounts for admin/kasir are harmless
    }
};
