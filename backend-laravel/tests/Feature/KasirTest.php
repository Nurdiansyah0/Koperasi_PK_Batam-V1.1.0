<?php

namespace Tests\Feature;

use App\Models\Anggota;
use App\Models\Barang;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class KasirTest extends TestCase
{
    use DatabaseTransactions;

    protected $kasir;

    protected $token;

    protected function setUp(): void
    {
        parent::setUp();
        // 1. Arrange: Find a Kasir and authenticate
        $this->kasir = User::where('role', 'kasir')->firstOrFail();
        $this->token = $this->kasir->createToken('test_token')->plainTextToken;
    }

    #[Test]
    public function kasir_can_view_dashboard()
    {
        // 2. Act
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/dashboard');

        // 3. Assert
        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_pendapatan_hari_ini',
                    'total_transaksi_hari_ini',
                    'saldo_kas',
                    'pending_serah_terima',
                ],
            ]);
    }

    #[Test]
    public function kasir_can_process_cash_transaction_and_reduce_stock()
    {
        // 1. Arrange: Find a barang with sufficient stock
        $barang = Barang::where('stok', '>=', 2)->firstOrFail();
        $initialStock = $barang->stok;
        $qty = 2;

        $anggota = Anggota::firstOrFail();
        $payload = [
            'anggota_id' => $anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => $qty,
                    'harga_satuan' => $barang->harga_jual,
                ],
            ],
        ];

        // 2. Act: Process transaction
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        // Debug if it fails
        if ($response->status() !== 200) {
            dd($response->getContent());
        }

        // 3. Assert: Verify response
        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        // Assert: Verify stock was reduced
        $this->assertDatabaseHas('barang', [
            'barang_id' => $barang->barang_id,
            'stok' => $initialStock - $qty,
        ]);

        // Assert: Verify transaction was recorded
        $transaksiId = $response->json('transaksi_id');
        $this->assertDatabaseHas('transaksi', [
            'transaksi_id' => $transaksiId,
            'kasir_id' => $this->kasir->user_id,
            'metode_pembayaran' => 'cash',
        ]);

        $this->assertDatabaseHas('transaksi_detail', [
            'transaksi_id' => $transaksiId,
            'barang_id' => $barang->barang_id,
            'jumlah' => $qty,
        ]);
    }

    #[Test]
    public function kasir_can_process_hutang_transaction_and_increase_anggota_debt()
    {
        // 1. Arrange: Find a barang and an anggota
        $barang = Barang::where('stok', '>=', 1)->firstOrFail();
        $anggota = Anggota::firstOrFail();
        $anggota->hutang = 0;
        $anggota->saldo = 10000000;
        $anggota->save();
        $initialHutang = 0;
        $initialHutang = $anggota->hutang;
        $qty = 1;

        $payload = [
            'metode_pembayaran' => 'hutang',
            'anggota_id' => $anggota->anggota_id,
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => $qty,
                    'harga_satuan' => $barang->harga_jual,
                ],
            ],
        ];

        // 2. Act
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        // 3. Assert
        if ($response->status() !== 200) {
            dd($response->getContent());
        }
        $response->assertStatus(200)->assertJson(['success' => true]);

        // Assert: Verify anggota hutang increased
        $expectedHutang = $initialHutang + ($barang->harga_jual * $qty);
        $this->assertDatabaseHas('anggota', [
            'anggota_id' => $anggota->anggota_id,
            'hutang' => $expectedHutang,
        ]);
    }

    #[Test]
    public function kasir_cannot_process_transaction_if_stock_insufficient()
    {
        // 1. Arrange: Find a barang
        $barang = Barang::firstOrFail();
        $impossibleQty = $barang->stok + 100;

        $payload = [
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => $impossibleQty,
                ],
            ],
        ];

        // 2. Act
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        // 3. Assert: Transaction should fail
        $response->assertStatus(400);
        $this->assertStringContainsString('Stok etalase tidak mencukupi', $response->getContent());
    }

    #[Test]
    public function kasir_can_get_paket_belanja()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/paket-belanja');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'nama_paket',
                        'deskripsi',
                        'tag',
                        'total_harga',
                        'items',
                        'is_available',
                    ],
                ],
            ]);
    }
}
