<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Barang;
use App\Models\Anggota;
use App\Models\Transaksi;
use App\Models\SerahTerimaKasir;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;

class RealtimeOrderNotificationTest extends TestCase
{
    use DatabaseTransactions;

    protected $kasir;
    protected $anggotaUser;
    protected $anggota;
    protected $barang;
    protected $kasirToken;
    protected $anggotaToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->kasir = User::where('role', 'kasir')->first() ?? User::factory()->create(['role' => 'kasir']);
        $this->kasirToken = $this->kasir->createToken('kasir_test')->plainTextToken;

        $this->anggotaUser = User::where('role', 'anggota')->first() ?? User::factory()->create(['role' => 'anggota']);
        $this->anggotaToken = $this->anggotaUser->createToken('anggota_test')->plainTextToken;

        $this->anggota = Anggota::firstOrCreate(
            ['user_id' => $this->anggotaUser->user_id],
            [
                'nama_lengkap' => 'Zulkarnain Test',
                'saldo' => 500000,
                'hutang' => 0,
                'shu' => 150000
            ]
        );

        $this->barang = Barang::firstOrCreate(
            ['nama_barang' => 'Kopi Test Sachet'],
            [
                'harga_modal' => 2000,
                'harga_jual' => 3500,
                'stok' => 50,
                'stok_toko' => 20,
                'stok_gudang' => 30
            ]
        );
    }

    public function test_simpan_transaksi_broadcasts_order_event_to_cache_instantly()
    {
        Cache::forget('koperasi_latest_order_event');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->anggotaToken,
            'Accept' => 'application/json'
        ])->postJson('/laravel/api/anggota/transaksi', [
            'metode_pembayaran' => 'hutang',
            'items' => [
                [
                    'barang_id' => $this->barang->barang_id,
                    'jumlah' => 2
                ]
            ]
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Assert that Cache has received the real-time event instantly
        $cachedEvent = Cache::get('koperasi_latest_order_event');
        $this->assertNotNull($cachedEvent, 'Order event must be broadcasted to cache immediately');
        $this->assertEquals($this->anggota->nama_lengkap, $cachedEvent['nama_anggota']);
        $this->assertEquals('hutang', $cachedEvent['metode_pembayaran']);
        $this->assertEquals(7000, $cachedEvent['total_harga']);
        $this->assertStringContainsString('Kopi', $cachedEvent['items_summary']);
    }

    public function test_kasir_can_fetch_latest_pending_orders_and_active_shift()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->kasirToken,
            'Accept' => 'application/json'
        ])->getJson('/laravel/api/kasir/latest-pending-orders');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'is_active_shift',
            'pending_count',
            'orders',
            'server_timestamp'
        ]);
    }

    public function test_kasir_test_order_notification_endpoint_triggers_broadcast()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->kasirToken,
            'Accept' => 'application/json'
        ])->postJson('/laravel/api/kasir/test-order-notification');

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $cachedEvent = Cache::get('koperasi_latest_order_event');
        $this->assertNotNull($cachedEvent);
        $this->assertTrue($cachedEvent['is_test'] ?? false);
    }
}
