<?php

namespace App\Modules\Auth\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function login(string $username, string $password): array
    {
        $cleanUsername = strtolower(trim($username));
        $user = User::whereRaw('LOWER(username) = ?', [$cleanUsername])->first();

        if (! $user || ! Hash::check($password, $user->password_hash)) {
            return [
                'success' => false,
                'message' => 'Username atau password salah',
                'status' => 401,
            ];
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        $userData = $user->toArray();
        if ($user->role === 'anggota') {
            $anggota = $user->anggota;
            if ($anggota) {
                $userData['anggota_id'] = $anggota->anggota_id;
                $userData['saldo'] = $anggota->saldo;
                $userData['hutang'] = $anggota->hutang;
                $userData['shu'] = $anggota->shu;
            }
        }

        return [
            'success' => true,
            'message' => 'Login berhasil',
            'token' => $token,
            'user' => $userData,
            'status' => 200,
        ];
    }

    public function resetPasswordWithChallenge(string $username, string $digitHutang, string $digitShu, string $passwordBaru): array
    {
        $cleanUsername = strtolower(trim($username));
        $user = User::whereRaw('LOWER(username) = ?', [$cleanUsername])->first();

        if (! $user) {
            return [
                'success' => false,
                'message' => 'Username anggota tidak ditemukan',
                'status' => 404,
            ];
        }

        $anggota = $user->anggota;
        if (! $anggota) {
            return [
                'success' => false,
                'message' => 'Akun ini bukan akun anggota atau data buku anggota tidak terdaftar',
                'status' => 400,
            ];
        }

        $hutangInt = (int) $anggota->hutang;
        $expectedHutang = $hutangInt > 0 ? substr((string) $hutangInt, 0, 2) : '00';

        $shuInt = (int) $anggota->shu;
        $expectedShu = $shuInt > 0 ? substr((string) $shuInt, -3) : '000';

        $inputHutang = trim($digitHutang);
        $inputShu = trim($digitShu);

        $hutangMatch = ($inputHutang === $expectedHutang);
        $shuMatch = ($inputShu === $expectedShu);

        if (! $hutangMatch && ! $shuMatch) {
            return [
                'success' => false,
                'message' => '2 digit depan hutang dan 3 digit belakang SHU tidak cocok dengan data buku anggota.',
                'status' => 422,
            ];
        }

        if (! $hutangMatch) {
            return [
                'success' => false,
                'message' => '2 digit depan hutang tidak sesuai dengan data buku anggota (tanyakan ke kasir/pengurus jika lupa).',
                'status' => 422,
            ];
        }

        if (! $shuMatch) {
            return [
                'success' => false,
                'message' => '3 digit belakang SHU tidak sesuai dengan data buku anggota (tanyakan ke kasir/pengurus jika lupa).',
                'status' => 422,
            ];
        }

        $user->password_hash = Hash::make($passwordBaru);
        $user->save();

        return [
            'success' => true,
            'message' => 'Password berhasil diperbarui! Silakan masuk menggunakan password baru Anda.',
            'status' => 200,
        ];
    }
}
