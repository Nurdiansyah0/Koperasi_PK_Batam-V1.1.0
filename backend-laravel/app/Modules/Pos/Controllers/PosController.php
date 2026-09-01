<?php

namespace App\Modules\Pos\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Pos\Services\PosCheckoutService;
use App\Models\Transaksi;
use App\Models\PembayaranHutang;
use App\Models\Anggota;
use App\Models\User;
use Illuminate\Http\Request;
use Exception;

class PosController extends Controller
{
    protected PosCheckoutService $posService;

    public function __construct(PosCheckoutService $posService)
    {
        $this->posService = $posService;
    }

    private function checkKasir(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'kasir' && $user->role !== 'admin') {
            abort(403, 'Unauthorized. Kasir/Admin only.');
        }
        return $user->user_id;
    }

    private function getAnggotaId(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'anggota') {
            abort(403, 'Akses ditolak. Anda bukan anggota.');
        }
        return $user->anggota->anggota_id;
    }

    public function simpanTransaksiKasir(Request $request)
    {
        $kasirId = $this->checkKasir($request);

        $request->validate([
            'total_harga'       => 'nullable|numeric',
            'metode_pembayaran' => 'required|string',
            'anggota_id'        => 'nullable',
            'items'             => 'required|array|min:1',
            'items.*.barang_id' => 'required|integer',
            'items.*.jumlah'    => 'required|integer|min:1',
        ]);

        try {
            $trx = $this->posService->processCashierCheckout(
                $request->items,
                $request->metode_pembayaran,
                $request->anggota_id ? (int) $request->anggota_id : null,
                $kasirId
            );

            return response()->json([
                'success'      => true,
                'message'      => 'Transaksi kasir berhasil disimpan',
                'transaksi_id' => $trx->transaksi_id,
            ]);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function buatTransaksiAnggota(Request $request)
    {
        $anggotaId = $this->getAnggotaId($request);

        $request->validate([
            'metode_pembayaran' => 'required|string',
            'items'             => 'required|array|min:1',
            'items.*.barang_id' => 'required|integer',
            'items.*.jumlah'    => 'required|integer|min:1',
        ]);

        try {
            $trx = $this->posService->processMemberOrder($request->items, $request->metode_pembayaran, $anggotaId);

            return response()->json([
                'success'      => true,
                'message'      => 'Pesanan berhasil dibuat, menunggu konfirmasi kasir.',
                'transaksi_id' => $trx->transaksi_id,
            ]);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function getPendingPesanan(Request $request)
    {
        $this->checkKasir($request);

        $pesanan = Transaksi::with(['detail.barang', 'anggota'])
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $pesanan]);
    }

    public function approvePesanan(Request $request)
    {
        $kasirId = $this->checkKasir($request);

        $request->validate([
            'transaksi_id'   => 'nullable',
            'transaksi_list' => 'nullable|array',
        ]);

        $list = $request->transaksi_list ?? ($request->transaksi_id ? [$request->transaksi_id] : []);

        try {
            $this->posService->approveMemberOrders($list, $kasirId);
            return response()->json(['success' => true, 'message' => 'Pesanan berhasil disetujui & diselesaikan']);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function tolakPesanan(Request $request)
    {
        $kasirId = $this->checkKasir($request);

        $request->validate([
            'transaksi_id'   => 'nullable',
            'transaksi_list' => 'nullable|array',
            'alasan'         => 'nullable|string',
        ]);

        $list = $request->transaksi_list ?? ($request->transaksi_id ? [$request->transaksi_id] : []);
        if (empty($list)) {
            return response()->json(['success' => false, 'message' => 'Daftar transaksi kosong'], 400);
        }

        try {
            $this->posService->rejectMemberOrders($list, $kasirId, $request->alasan);
            return response()->json(['success' => true, 'message' => 'Pesanan berhasil ditolak & stok dikembalikan']);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getAllPembayaranHutang(Request $request)
    {
        $this->checkKasir($request);

        $pembayaran = PembayaranHutang::with('anggota')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $pembayaran]);
    }

    public function approvePembayaranHutang(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate(['pembayaran_id' => 'required|integer']);

        try {
            $this->posService->approveDebtPayment((int) $request->pembayaran_id, $kasirId);
            return response()->json(['success' => true, 'message' => 'Pembayaran hutang disetujui']);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function rejectPembayaranHutang(Request $request)
    {
        $kasirId = $this->checkKasir($request);
        $request->validate([
            'pembayaran_id' => 'required|integer',
            'alasan'        => 'nullable|string',
        ]);

        try {
            $this->posService->rejectDebtPayment((int) $request->pembayaran_id, $kasirId, $request->alasan);
            return response()->json(['success' => true, 'message' => 'Pembayaran hutang ditolak']);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
