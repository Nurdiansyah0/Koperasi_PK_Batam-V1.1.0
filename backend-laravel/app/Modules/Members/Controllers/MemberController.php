<?php

namespace App\Modules\Members\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Members\Services\MemberService;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    protected MemberService $memberService;

    public function __construct(MemberService $memberService)
    {
        $this->memberService = $memberService;
    }

    private function getAnggotaId(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'anggota') {
            abort(403, 'Akses ditolak. Anda bukan anggota.');
        }

        return $user->anggota->anggota_id;
    }

    public function getProfile(Request $request)
    {
        $this->getAnggotaId($request);
        $profile = $this->memberService->getProfile($request->user());

        return response()->json([
            'success' => true,
            'user' => $profile,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'username' => 'required|string|unique:users,username,'.$request->user()->user_id.',user_id',
        ]);

        $this->memberService->updateUsername($request->user(), $request->username);

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diupdate',
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        $res = $this->memberService->changePassword($request->user(), $request->current_password, $request->new_password);
        $status = $res['status'] ?? 200;
        unset($res['status']);

        return response()->json($res, $status);
    }

    public function submitDebtPayment(Request $request)
    {
        $request->validate([
            'jumlah' => 'required|numeric|min:1',
        ]);

        $anggotaId = $this->getAnggotaId($request);
        $pembayaran = $this->memberService->submitDebtPayment($anggotaId, (float) $request->jumlah);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan pembayaran hutang berhasil dibuat, silakan bayar ke kasir.',
            'pembayaran_id' => $pembayaran->pembayaran_id,
        ]);
    }

    public function getDebtPaymentHistory(Request $request)
    {
        $anggotaId = $this->getAnggotaId($request);
        $history = $this->memberService->getDebtPaymentHistory($anggotaId);

        return response()->json([
            'success' => true,
            'data' => $history,
        ]);
    }
}
