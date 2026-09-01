<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Services\InventoryService;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    private function checkAdmin(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized');
        }
        return $request->user()->user_id;
    }

    public function getAllBarang(Request $request)
    {
        $this->checkAdmin($request);
        $barang = $this->inventoryService->getAllBarang();
        return response()->json(['success' => true, 'data' => $barang]);
    }

    public function getAvailableBarang()
    {
        $barang = $this->inventoryService->getAvailableBarang();
        return response()->json(['success' => true, 'data' => $barang]);
    }

    public function tambahBarang(Request $request)
    {
        $this->checkAdmin($request);
        $request->validate([
            'nama_barang' => 'required|string',
            'stok'        => 'required|integer|min:0',
            'harga_modal' => 'nullable|numeric|min:0',
            'harga_jual'  => 'nullable|numeric|min:0',
            'harga'       => 'nullable|numeric|min:0',
        ]);

        $barang = $this->inventoryService->tambahBarang($request->all());
        return response()->json(['success' => true, 'message' => 'Barang berhasil ditambahkan', 'data' => $barang]);
    }

    public function editBarang(Request $request, $id)
    {
        $this->checkAdmin($request);
        $barang = $this->inventoryService->editBarang((int) $id, $request->all());
        return response()->json(['success' => true, 'message' => 'Barang berhasil diupdate', 'data' => $barang]);
    }

    public function hapusBarang(Request $request, $id)
    {
        $this->checkAdmin($request);
        $this->inventoryService->hapusBarang((int) $id);
        return response()->json(['success' => true, 'message' => 'Barang berhasil dihapus']);
    }

    public function restockBarang(Request $request)
    {
        $this->checkAdmin($request);
        $request->validate([
            'barang_id'   => 'required|integer',
            'jumlah'      => 'required|integer|min:1',
            'harga_modal' => 'nullable|numeric|min:0',
            'harga_jual'  => 'nullable|numeric|min:0',
            'supplier'    => 'nullable|string',
        ]);

        $result = $this->inventoryService->restockBarang(
            (int) $request->barang_id,
            (int) $request->jumlah,
            (float) ($request->harga_modal ?? 0),
            (float) ($request->harga_jual ?? 0),
            $request->supplier
        );

        return response()->json(['success' => true, 'message' => 'Restock berhasil', 'data' => $result]);
    }

    public function getMonitorBarang(Request $request)
    {
        $this->checkAdmin($request);
        $monitor = $this->inventoryService->getMonitorBarang();
        return response()->json(['success' => true, 'data' => $monitor]);
    }

    public function submitOpnameMassal(Request $request)
    {
        $adminId = $this->checkAdmin($request);
        $request->validate([
            'items'               => 'required|array|min:1',
            'items.*.barang_id'   => 'required|integer|exists:barang,barang_id',
            'items.*.stok_fisik'  => 'required|integer|min:0',
            'items.*.keterangan'  => 'nullable|string',
        ]);

        $results = $this->inventoryService->submitMassOpname($request->items, $adminId);

        return response()->json([
            'success'        => true,
            'message'        => 'Stock Opname berhasil disimpan',
            'total_diupdate' => count($results),
            'data'           => $results,
        ]);
    }
}
