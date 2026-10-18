<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AdminOpnameTest extends TestCase
{
    use DatabaseTransactions;

    protected $admin;

    protected $token;

    protected function setUp(): void
    {
        parent::setUp();
        // Arrange
        $this->admin = User::where('role', 'admin')->firstOrFail();
        $this->token = $this->admin->createToken('test_token')->plainTextToken;
    }

    #[Test]
    public function admin_can_submit_mass_opname()
    {
        // 1. Arrange: Find a barang to adjust
        $barang = Barang::firstOrFail();
        $initialStock = $barang->stok;
        $newStock = $initialStock + 10;

        $payload = [
            'adjustments' => [
                [
                    'barang_id' => $barang->barang_id,
                    'stok_awal' => $initialStock,
                    'stok_akhir' => $newStock,
                    'selisih' => 10,
                    'keterangan' => 'Penyesuaian Opname Massal',
                ],
            ],
        ];

        // 2. Act
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/admin/opname', $payload);

        // 3. Assert
        $response->assertStatus(200)->assertJson(['success' => true]);

        // Verify stock was updated in DB
        $barang->refresh();
        $this->assertEquals($newStock, $barang->stok_toko);
        $this->assertEquals($newStock + $barang->stok_gudang, $barang->stok);
    }
}
