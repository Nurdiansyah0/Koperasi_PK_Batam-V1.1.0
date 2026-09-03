<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Ensure user 'admin' (User 1) is strictly the primary administrator
        $adminUser = DB::table('users')->where('user_id', 1)->first();
        if ($adminUser) {
            DB::table('users')->where('user_id', 1)->update([
                'username' => 'Admin',
                'role' => 'admin',
            ]);
        }

        // 2. Ensure 'suryadi' exists as his own user identity (using AUTO_INCREMENT)
        $suryadiUser = DB::table('users')->whereRaw('LOWER(username) = ?', ['suryadi'])->first();
        if (! $suryadiUser) {
            $defaultHash = '$2y$10$KXJmPXisr.GZW/dO7tiHNOu2tjDSdCIf30fTKnLd4WGCLjTh/ypUW';

            $suryadiUserId = DB::table('users')->insertGetId([
                'username' => 'suryadi',
                'password_hash' => $defaultHash,
                'role' => 'anggota',
                'created_at' => '2025-10-09 10:40:11',
            ]);
        } else {
            $suryadiUserId = $suryadiUser->user_id;
        }

        // 3. Link Suryadi's legitimate anggota record (anggota_id = 65) to Suryadi's user_id
        DB::table('anggota')->where('anggota_id', 65)->update([
            'user_id' => $suryadiUserId,
            'nama_lengkap' => 'Suriyadi', // Kept original spelling to prevent unexpected data changes
        ]);

        // 4. Ensure primary Administrator (user_id = 1) has its own distinct anggota profile
        $adminAnggota = DB::table('anggota')->where('user_id', 1)->first();
        if (! $adminAnggota) {
            DB::table('anggota')->insert([
                'user_id' => 1,
                'nama_lengkap' => 'Administrator Utama',
                'email' => 'admin@koperasi.local',
                'saldo' => 0,
                'simpanan_pokok' => 0,
                'simpanan_wajib' => 0,
                'hutang' => 0,
                'shu' => 0,
                'created_at' => '2025-09-23 11:36:39',
            ]);
        }

        // 5. Update JabatanAnggota for User 1 (Admin)
        DB::table('jabatan_anggota')->where('user_id', 1)->where('role', 'admin')->update([
            'catatan' => 'Administrator Utama Sistem',
        ]);

        // 6. Grant Administrative access to Suryadi via the existing JabatanAnggota / role authorization system
        $hasSuryadiAdminJabatan = DB::table('jabatan_anggota')
            ->where('user_id', $suryadiUserId)
            ->where('role', 'admin')
            ->exists();

        if (! $hasSuryadiAdminJabatan) {
            DB::table('jabatan_anggota')->insert([
                'user_id' => $suryadiUserId,
                'role' => 'admin',
                'status' => 'aktif',
                'ditugaskan_oleh' => 1,
                'catatan' => 'Mandat Pengurus / Admin - Suryadi',
                'assigned_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Non-destructive rollback:
        // We do not delete users or anggota as it might violate FK constraints and lose data.
        // If rolled back, we can just remove the specific admin role for suryadi to revert access,
        // but restoring ID 1 to anggota_id 65 might lose data or cause issues. 
        // Thus, keeping down() empty or explicitly documented is safer for production.
    }
};
