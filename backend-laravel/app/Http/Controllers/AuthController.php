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

        $user = User::where('username', $request->username)->first();

        // Check if user exists and password is correct (checking standard Laravel Hash)
        // Note: The previous raw PHP system used password_verify() which is compatible with Laravel's Hash::check.
        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Username atau password salah',
            ], 401);
        }

        // Generate Sanctum token
        $token = $user->createToken('auth_token')->plainTextToken;

        // Fetch additional data if user is an anggota
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

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'token'   => $token,
            'user'    => $userData,
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'user'    => $request->user(),
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
}
