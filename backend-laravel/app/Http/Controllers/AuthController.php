<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $cleanUsername = strtolower(trim($request->username));
        $user = User::whereRaw('LOWER(username) = ?', [$cleanUsername])
            ->orWhereHas('anggota', function($q) use ($cleanUsername) {
                $q->whereRaw('LOWER(nama_lengkap) = ?', [$cleanUsername]);
            })
            ->first();

        // Check if user exists and password is correct
        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Username atau password salah',
            ], 401);
        }

        // Generate Sanctum token
        $token = $user->createToken('auth_token')->plainTextToken;

        // Load anggota profile and active mandates
        $user->load(['anggota', 'jabatanAktif']);
        $userData = $user->toArray();
        
        if ($user->anggota) {
            $userData['anggota_id'] = $user->anggota->anggota_id;
            $userData['nama_lengkap'] = $user->anggota->nama_lengkap;
            $userData['saldo'] = (float) $user->anggota->saldo;
            $userData['hutang'] = (float) $user->anggota->hutang;
            $userData['shu'] = (float) $user->anggota->shu;
            $userData['persetujuan_shu_master_at'] = $user->anggota->persetujuan_shu_master_at;
        }

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'token'   => $token,
            'user'    => $userData,
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load(['anggota', 'jabatanAktif']);
        $userData = $user->toArray();
        if ($user->anggota) {
            $userData['anggota_id'] = $user->anggota->anggota_id;
            $userData['nama_lengkap'] = $user->anggota->nama_lengkap;
            $userData['saldo'] = (float) $user->anggota->saldo;
            $userData['hutang'] = (float) $user->anggota->hutang;
            $userData['shu'] = (float) $user->anggota->shu;
            $userData['persetujuan_shu_master_at'] = $user->anggota->persetujuan_shu_master_at;
        }

        return response()->json([
            'success' => true,
            'user'    => $userData,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    public function resetPasswordWithChallenge(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'digit_hutang' => 'required|string',
            'digit_shu' => 'required|string',
            'password_baru' => 'required|string|min:6',
        ]);

        $cleanUsername = strtolower(trim($request->username));
        $user = User::whereRaw('LOWER(username) = ?', [$cleanUsername])
            ->orWhereHas('anggota', function($q) use ($cleanUsername) {
                $q->whereRaw('LOWER(nama_lengkap) = ?', [$cleanUsername]);
            })
            ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Username anggota tidak ditemukan',
            ], 404);
        }

        $anggota = $user->anggota;
        if (!$anggota) {
            return response()->json([
                'success' => false,
                'message' => 'Akun ini bukan akun anggota atau data buku anggota tidak terdaftar',
            ], 400);
        }

        // 1. Expected 2 digit depan hutang anggota
        $hutangInt = (int) $anggota->hutang;
        $expectedHutang = $hutangInt > 0 ? substr((string) $hutangInt, 0, 2) : '00';

        // 2. Expected 3 digit belakang SHU anggota
        $shuInt = (int) $anggota->shu;
        $expectedShu = $shuInt > 0 ? substr((string) $shuInt, -3) : '000';

        $inputHutang = trim((string) $request->digit_hutang);
        $inputShu = trim((string) $request->digit_shu);

        $hutangMatch = ($inputHutang === $expectedHutang);
        $shuMatch = ($inputShu === $expectedShu);

        if (!$hutangMatch && !$shuMatch) {
            return response()->json([
                'success' => false,
                'message' => '2 digit depan hutang dan 3 digit belakang SHU tidak cocok dengan data buku anggota.',
            ], 422);
        }

        if (!$hutangMatch) {
            return response()->json([
                'success' => false,
                'message' => '2 digit depan hutang tidak sesuai dengan data buku anggota (tanyakan ke kasir/pengurus jika lupa).',
            ], 422);
        }

        if (!$shuMatch) {
            return response()->json([
                'success' => false,
                'message' => '3 digit belakang SHU tidak sesuai dengan data buku anggota (tanyakan ke kasir/pengurus jika lupa).',
            ], 422);
        }

        // Update password
        $user->password_hash = Hash::make($request->password_baru);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diperbarui! Silakan masuk menggunakan password baru Anda.',
        ]);
    }
}
