<?php

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auth\Services\AuthService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $res = $this->authService->login($request->username, $request->password);
        $status = $res['status'] ?? 200;
        unset($res['status']);

        return response()->json($res, $status);
    }

    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'user' => $request->user(),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
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

        $res = $this->authService->resetPasswordWithChallenge(
            $request->username,
            $request->digit_hutang,
            $request->digit_shu,
            $request->password_baru
        );

        $status = $res['status'] ?? 200;
        unset($res['status']);

        return response()->json($res, $status);
    }
}
