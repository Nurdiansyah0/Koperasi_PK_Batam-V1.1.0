<?php

namespace App\Modules\Finance\Controllers;

use App\Http\Controllers\Controller;
use App\Models\SetoranKasir;
use App\Modules\Finance\Services\FinanceService;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    protected FinanceService $financeService;

    public function __construct(FinanceService $financeService)
    {
        $this->financeService = $financeService;
    }

    private function checkAdmin(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        return $request->user()->user_id;
    }

    private function checkKasir(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'kasir' && $user->role !== 'admin') {
            abort(403, 'Unauthorized. Kasir/Admin only.');
        }

        return $user->user_id;
    }

    public function getDashboardStats(Request $request)
    {
        $this->checkAdmin($request);
        $stats = $this->financeService->getDashboardStats();

        return response()->json(array_merge(['success' => true], $stats));
    }

    public function getShuDistribusi(Request $request)
    {
        $this->checkAdmin($request);
        $tahun = $request->query('tahun') ? (int) $request->query('tahun') : null;
        $search = $request->query('search');

        $result = $this->financeService->getShuDistribusi($tahun, $search);

        return response()->json([
            'success' => true,
            'summary' => $result['summary'],
            'data' => $result['data'],
        ]);
    }

    public function topupShu(Request $request)
    {
        $this->checkAdmin($request);
        $request->validate([
            'anggota_id' => 'required|integer',
            'nominal' => 'required|numeric|min:1',
        ]);

        $anggota = $this->financeService->topupShu((int) $request->anggota_id, (float) $request->nominal);

        return response()->json([
            'success' => true,
            'message' => 'Topup SHU berhasil',
            'total_shu' => (float) $anggota->shu,
        ]);
    }

    public function getSetoranKasir(Request $request)
    {
        $this->checkKasir($request);
        $setoran = SetoranKasir::with(['kasir', 'admin'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $setoran]);
    }

    public function setorAdmin(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate([
            'nominal' => 'required|numeric|min:1',
            'total_penjualan' => 'nullable|numeric',
            'keterangan' => 'nullable|string',
        ]);

        $setoran = $this->financeService->submitCashierDeposit(
            $kasirId,
            (float) $request->nominal,
            (float) ($request->total_penjualan ?? $request->nominal),
            $request->keterangan
        );

        return response()->json(['success' => true, 'message' => 'Setoran berhasil diajukan', 'data' => $setoran]);
    }

    public function approveSetoran(Request $request, $id)
    {
        $adminId = $this->checkAdmin($request);
        $setoran = $this->financeService->approveCashierDeposit((int) $id, $adminId);

        return response()->json(['success' => true, 'message' => 'Setoran disetujui', 'data' => $setoran]);
    }

    public function rejectSetoran(Request $request, $id)
    {
        $adminId = $this->checkAdmin($request);
        $request->validate(['alasan' => 'nullable|string']);
        $setoran = $this->financeService->rejectCashierDeposit((int) $id, $adminId, $request->alasan);

        return response()->json(['success' => true, 'message' => 'Setoran ditolak', 'data' => $setoran]);
    }
}
