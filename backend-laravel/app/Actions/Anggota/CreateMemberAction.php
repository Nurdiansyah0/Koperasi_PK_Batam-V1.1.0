<?php

namespace App\Actions\Anggota;

use App\Models\User;
use App\Models\Anggota;
use App\Models\JabatanAnggota;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CreateMemberAction
{
    /**
     * Executes the cohesive member-creation use case.
     *
     * @param array $data Validated user and member data
     * @param int $adminId ID of the admin performing the action
     * @return void
     * @throws \Exception
     */
    public function execute(array $data, int $adminId): void
    {
        DB::beginTransaction();
        try {
            $user = User::create([
                'username' => $data['username'],
                'password_hash' => Hash::make($data['password']),
                'role' => $data['role'],
            ]);

            // Every user is registered as an official anggota
            Anggota::create([
                'user_id' => $user->user_id,
                'nama_lengkap' => !empty($data['nama_lengkap']) ? $data['nama_lengkap'] : $data['username'],
                'email' => strtolower($data['username']) . '@koperasi.local',
                'saldo' => 0,
                'hutang' => 0,
                'shu' => 0,
            ]);

            // If given a staff/management role, record in jabatan_anggota
            if (in_array($data['role'], ['admin', 'kasir', 'pengurus'])) {
                JabatanAnggota::create([
                    'user_id' => $user->user_id,
                    'role' => $data['role'],
                    'status' => 'aktif',
                    'ditugaskan_oleh' => $adminId,
                    'catatan' => 'Penugasan awal saat registrasi akun',
                    'assigned_at' => now(),
                ]);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
