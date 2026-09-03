<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Remove temporary duplicate placeholder anggota rows created previously
        DB::table('anggota')->whereIn('anggota_id', [337, 338, 339, 340])->delete();

        // 2. Link official registered anggota records to the staff user accounts:
        // - Anggota 65 (Suriyadi / Suryadi) -> User 1 (Admin)
        DB::table('anggota')->where('anggota_id', 65)->update([
            'user_id' => 1,
            'nama_lengkap' => 'Suryadi',
        ]);

        // - Anggota 24 (Sufridanto / Tanggang) -> User 2 (Tanggang)
        DB::table('anggota')->where('anggota_id', 24)->update([
            'user_id' => 2,
            'nama_lengkap' => 'Sufridanto',
        ]);

        // - Anggota 35 (Daniel Firmansyah) -> User 3 (Daniel)
        DB::table('anggota')->where('anggota_id', 35)->update([
            'user_id' => 3,
            'nama_lengkap' => 'Daniel Firmansyah',
        ]);

        // - Anggota 59 (Ilham Prasetyo) -> User 4 (Ilham)
        DB::table('anggota')->where('anggota_id', 59)->update([
            'user_id' => 4,
            'nama_lengkap' => 'Ilham Prasetyo',
        ]);

        // 3. Delete redundant user accounts (70, 29, 40, 64) now that their anggota profiles are merged to user 1, 2, 3, 4
        DB::table('users')->whereIn('user_id', [70, 29, 40, 64])->delete();

        // 4. Update JabatanAnggota notes for crystal clarity
        DB::table('jabatan_anggota')->where('user_id', 1)->where('role', 'admin')->update([
            'catatan' => 'Admin Utama Koperasi - Suryadi',
        ]);
        DB::table('jabatan_anggota')->where('user_id', 2)->where('role', 'kasir')->update([
            'catatan' => 'Petugas Kasir Toko Koperasi - Sufridanto (Tanggang)',
        ]);
        DB::table('jabatan_anggota')->where('user_id', 3)->where('role', 'kasir')->update([
            'catatan' => 'Petugas Kasir Toko Koperasi - Daniel Firmansyah',
        ]);
        DB::table('jabatan_anggota')->where('user_id', 4)->where('role', 'kasir')->update([
            'catatan' => 'Petugas Kasir Toko Koperasi - Ilham Prasetyo',
        ]);
    }

    public function down(): void
    {
        // No destructive rollback needed
    }
};
