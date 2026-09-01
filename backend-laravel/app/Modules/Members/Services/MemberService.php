<?php

namespace App\Modules\Members\Services;

use App\Models\Anggota;
use App\Models\User;
use App\Models\PembayaranHutang;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MemberService
{
    public function getProfile($user): array
    {
        $anggota = $user->anggota;
        return [
            'anggota_id'        => $anggota->anggota_id,
            'user_id'           => $user->user_id,
            'nama_lengkap'      => $anggota->nama_lengkap,
            'saldo'             => (float) $anggota->saldo,
            'hutang'            => (float) $anggota->hutang,
            'shu'               => (float) $anggota->shu,
            'simpanan_pokok'    => (float) $anggota->simpanan_pokok,
            'limit_hutang'      => (float) $anggota->limit_hutang,
            'sisa_limit_hutang' => (float) $anggota->sisa_limit_hutang,
        ];
    }

    public function updateUsername($user, string $newUsername): void
    {
        $user->username = $newUsername;
        $user->save();
    }

    public function changePassword($user, string $currentPassword, string $newPassword): array
    {
        if (!Hash::check($currentPassword, $user->password_hash)) {
            return [
                'success' => false,
                'message' => 'Password saat ini salah',
                'status'  => 400,
            ];
        }

        $user->password_hash = Hash::make($newPassword);
        $user->save();

        return [
            'success' => true,
            'message' => 'Password berhasil diubah',
            'status'  => 200,
        ];
    }

    public function submitDebtPayment(int $anggotaId, float $nominal): PembayaranHutang
    {
        return PembayaranHutang::create([
            'anggota_id' => $anggotaId,
            'nominal'    => $nominal,
            'status'     => 'pending',
        ]);
    }

    public function getDebtPaymentHistory(int $anggotaId)
    {
        return PembayaranHutang::where('anggota_id', $anggotaId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getAllMembers()
    {
        return User::where('role', 'anggota')->with('anggota')->get();
    }

    public function searchMember(string $query)
    {
        return Anggota::where('nama_lengkap', 'LIKE', "%{$query}%")
            ->orWhere('no_identitas', 'LIKE', "%{$query}%")
            ->orWhereHas('user', function ($q) use ($query) {
                $q->where('username', 'LIKE', "%{$query}%");
            })
            ->with('user')
            ->get();
    }
}
