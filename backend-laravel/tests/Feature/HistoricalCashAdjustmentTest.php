<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\PengeluaranOperasional;
use App\Models\RiwayatRestock;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\User;
use App\Models\CashAdjustment;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use Carbon\Carbon;

class HistoricalCashAdjustmentTest extends TestCase
{
    use DatabaseTransactions;

    protected $admin;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->admin = User::create(['username'=>'test_admin_'.rand(), 'password'=>'test', 'user_id'=>rand(1000,9999),
            'role' => 'admin',
        ]);
    }

    public function test_adjustment_only_affects_cash_flow_not_profit_or_shu()
    {
        // 1. Create Baseline Transaction
        $barang = Barang::create(['nama_barang'=>'Test Item', 'kategori'=>'Test', 'satuan'=>'pcs',
            'stok_toko' => 10,
            'stok_gudang' => 0,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);

        $transaksi = Transaksi::create(['anggota_id'=>null, 'uang_bayar'=>10000, 'total_keuntungan'=>5000, 'status'=>'selesai',
            'kasir_id' => $this->admin->user_id,
            'total_harga' => 10000,
            'uang_bayar' => 10000,
            'kembalian' => 0,
            'metode_pembayaran' => 'cash',
        ]);

        TransaksiDetail::create([
            'transaksi_id' => $transaksi->transaksi_id,
            'barang_id' => $barang->barang_id,
            'jumlah' => 1,
            'harga_satuan' => 10000,
            'subtotal' => 10000,
            'keuntungan' => 5000,
        ]);

        $filterDate = ['tanggal_awal' => Carbon::now()->format('Y-m-d'), 'tanggal_akhir' => Carbon::now()->format('Y-m-d')];

        // Hit Get Laporan (Baseline)
        $response1 = $this->actingAs($this->admin)->postJson('/laravel/api/admin/laporan-transaksi', $filterDate);
        $response1->assertStatus(200);
        $summary1 = $response1->json('summary');
        
        $this->assertEquals(10000, $summary1['total_pendapatan']); // Gross Sales
        $this->assertEquals(5000, $summary1['total_keuntungan']); // Gross Profit
        $this->assertEquals(5000, $summary1['total_laba_bersih']); // Net Profit
        $this->assertEquals(10000, $summary1['net_cash_flow']); // Cash Flow before adjustment

        // 2. Submit Historical Cash Adjustment (OUT) for older missing restock
        $adjResponse = $this->actingAs($this->admin)->postJson('/laravel/api/admin/cash-adjustments', [
            'adjustment_date' => Carbon::now()->format('Y-m-d'),
            'type' => 'HISTORICAL_INVENTORY_PURCHASE',
            'amount' => 8000,
            'direction' => 'OUT',
            'source' => 'CASH',
            'reason' => 'Legacy physical inventory purchase not in system',
            'reference' => 'LEGACY-01'
        ]);

        $adjResponse->assertStatus(200);

        // 3. Hit Get Laporan Again
        $response2 = $this->actingAs($this->admin)->postJson('/laravel/api/admin/laporan-transaksi', $filterDate);
        $summary2 = $response2->json('summary');

        // assertions to guarantee separation of accounting concerns
        $this->assertEquals(10000, $summary2['total_pendapatan'], 'Revenue MUST NOT change');
        $this->assertEquals(5000, $summary2['total_keuntungan'], 'Gross profit MUST NOT change');
        $this->assertEquals(5000, $summary2['total_laba_bersih'], 'Net Profit MUST NOT change');
        
        // Only Cash flow must change (-8000)
        $this->assertEquals(-8000, $summary2['historical_cash_adjustment']);
        $this->assertEquals(2000, $summary2['net_cash_flow'], 'Cash Flow MUST drop by 8000');

        // Check Inventory
        $barang->refresh();
        $this->assertEquals(10, $barang->stok_toko, 'Inventory stock MUST NOT change');
    }

    public function test_adjustment_validation_amount_must_be_positive()
    {
        $response = $this->actingAs($this->admin)->postJson('/laravel/api/admin/cash-adjustments', [
            'adjustment_date' => Carbon::now()->format('Y-m-d'),
            'type' => 'CASH_RECONCILIATION',
            'amount' => -1000, // Invalid
            'direction' => 'OUT',
            'source' => 'CASH',
            'reason' => 'Test negative',
        ]);

        $response->assertStatus(422);
    }

    public function test_adjustment_duplicate_reference_is_prevented()
    {
        CashAdjustment::create([
            'adjustment_date' => Carbon::now(),
            'type' => 'CASH_RECONCILIATION',
            'amount' => 500,
            'direction' => 'IN',
            'source' => 'CASH',
            'reason' => 'Duplicate Test',
            'reference' => 'REF-DUP',
            'created_by' => $this->admin->user_id,
            'status' => 'APPROVED'
        ]);

        $response = $this->actingAs($this->admin)->postJson('/laravel/api/admin/cash-adjustments', [
            'adjustment_date' => Carbon::now()->format('Y-m-d'),
            'type' => 'CASH_RECONCILIATION',
            'amount' => 500,
            'direction' => 'IN',
            'source' => 'CASH',
            'reason' => 'Attempt Duplicate',
            'reference' => 'REF-DUP'
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('Duplikasi', $response->json('message'));
    }

    public function test_kasir_cannot_create_adjustment()
    {
        $kasir = User::create(['username'=>'test_admin_'.rand(), 'password'=>'test', 'user_id'=>rand(1000,9999),'role' => 'kasir']);

        $response = $this->actingAs($kasir)->postJson('/laravel/api/admin/cash-adjustments', [
            'adjustment_date' => Carbon::now()->format('Y-m-d'),
            'type' => 'CASH_RECONCILIATION',
            'amount' => 1000,
            'direction' => 'OUT',
            'source' => 'CASH',
            'reason' => 'Kasir attempt',
        ]);

        $response->assertStatus(403);
    }

    public function test_immutable_fields_cannot_be_injected()
    {
        $response = $this->actingAs($this->admin)->postJson('/laravel/api/admin/cash-adjustments', [
            'adjustment_date' => Carbon::now()->format('Y-m-d'),
            'type' => 'CASH_RECONCILIATION',
            'amount' => 500,
            'direction' => 'IN',
            'source' => 'CASH',
            'reason' => 'Injection test',
            // Try to maliciously set status to DRAFT or approved_by to someone else
            'status' => 'DRAFT',
            'approved_by' => 9999,
        ]);

        if ($response->status() !== 200) dump($response->json()); $response->assertStatus(200);
        $adjustment = CashAdjustment::where('reason', 'Injection test')->first();
        
        // Assert malicious injection was ignored
        $this->assertEquals('APPROVED', $adjustment->status);
        $this->assertEquals($this->admin->user_id, $adjustment->approved_by);
        $this->assertNotNull($adjustment->approved_at);
    }

    public function test_four_way_source_direction_filtering()
    {
        // Add 4 adjustments
        CashAdjustment::create(['adjustment_date' => Carbon::today(), 'type' => 'CASH_RECONCILIATION', 'amount' => 1000, 'direction' => 'IN', 'source' => 'CASH', 'reason' => '1', 'status' => 'APPROVED', 'created_by' => $this->admin->user_id]);
        CashAdjustment::create(['adjustment_date' => Carbon::today(), 'type' => 'CASH_RECONCILIATION', 'amount' => 2000, 'direction' => 'OUT', 'source' => 'CASH', 'reason' => '2', 'status' => 'APPROVED', 'created_by' => $this->admin->user_id]);
        CashAdjustment::create(['adjustment_date' => Carbon::today(), 'type' => 'CASH_RECONCILIATION', 'amount' => 3000, 'direction' => 'IN', 'source' => 'BANK', 'reason' => '3', 'status' => 'APPROVED', 'created_by' => $this->admin->user_id]);
        CashAdjustment::create(['adjustment_date' => Carbon::today(), 'type' => 'CASH_RECONCILIATION', 'amount' => 4000, 'direction' => 'OUT', 'source' => 'BANK', 'reason' => '4', 'status' => 'APPROVED', 'created_by' => $this->admin->user_id]);

        // Filter Cash
        $resCash = $this->actingAs($this->admin)->postJson('/laravel/api/admin/laporan-transaksi', ['metode_pembayaran' => 'cash']);
        $this->assertEquals(-1000, $resCash->json('summary.historical_cash_adjustment'));

        // Filter Bank (transfer)
        $resBank = $this->actingAs($this->admin)->postJson('/laravel/api/admin/laporan-transaksi', ['metode_pembayaran' => 'transfer']);
        $this->assertEquals(-1000, $resBank->json('summary.historical_cash_adjustment'));

        // Filter All
        $resAll = $this->actingAs($this->admin)->postJson('/laravel/api/admin/laporan-transaksi', ['metode_pembayaran' => 'all']);
        // From existing data + 4 new records: In(1000+3000) - Out(2000+4000) = -2000
        $this->assertEquals(-2000, $resAll->json('summary.historical_cash_adjustment'));
    }

}
