<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PkmTest extends TestCase
{
    use DatabaseTransactions;

    protected $admin;

    protected $adminToken;

    protected $kasir;

    protected $kasirToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::firstOrCreate(
            ['username' => 'admin_test_pkm'],
            ['password_hash' => bcrypt('password123'), 'role' => 'admin']
        );
        $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

        $this->kasir = User::firstOrCreate(
            ['username' => 'kasir_test_pkm'],
            ['password_hash' => bcrypt('password123'), 'role' => 'kasir']
        );
        $this->kasirToken = $this->kasir->createToken('kasir-token')->plainTextToken;
    }

    /** @test */
    public function admin_can_get_pkm_analysis()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/laravel/api/admin/pkm-analysis?days=30&lead_time_days=4');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'barang_id',
                        'nama_barang',
                        'stok',
                        'ads',
                        'recommended_pkm',
                        'pkm',
                    ],
                ],
                'summary' => [
                    'total_barang',
                    'days',
                    'lead_time_days',
                    'total_pkm_units',
                ],
            ]);
    }

    /** @test */
    public function kasir_cannot_access_pkm_analysis()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->getJson('/laravel/api/admin/pkm-analysis');

        $response->assertStatus(403);
    }

    /** @test */
    public function admin_can_update_individual_pkm()
    {
        $barang = Barang::firstOrFail();

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/laravel/api/admin/update-pkm', [
                'barang_id' => $barang->barang_id,
                'pkm' => 5,
            ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertEquals(5, Barang::find($barang->barang_id)->pkm);
    }

    /** @test */
    public function admin_can_auto_calculate_all_pkm()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/laravel/api/admin/auto-calculate-pkm', [
                'days' => 30,
                'lead_time_days' => 4,
            ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }
}
