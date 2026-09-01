<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Anggota;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;

class AiTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected User $kasir;
    protected User $anggotaUser;
    protected string $adminToken;
    protected string $kasirToken;
    protected string $anggotaToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::firstOrCreate(
            ['username' => 'TestAdminAI'],
            ['role' => 'admin', 'password_hash' => bcrypt('password')]
        );
        $this->adminToken = $this->admin->createToken('admin_token')->plainTextToken;

        $this->kasir = User::firstOrCreate(
            ['username' => 'TestKasirAI'],
            ['role' => 'kasir', 'password_hash' => bcrypt('password')]
        );
        $this->kasirToken = $this->kasir->createToken('kasir_token')->plainTextToken;

        $this->anggotaUser = User::firstOrCreate(
            ['username' => 'TestAnggotaAI'],
            ['role' => 'anggota', 'password_hash' => bcrypt('password')]
        );
        $this->anggotaToken = $this->anggotaUser->createToken('anggota_token')->plainTextToken;

        // Mock Google AI Studio API for fast & reliable testing
        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'summary' => 'Analisis operasional koperasi sangat baik.',
                                        'kpi_score' => 90,
                                        'highlights' => ['Stok stabil', 'Penjualan meningkat'],
                                        'recommendations' => ['Restock minyak goreng'],
                                        'supplier_name' => 'Supplier Jaya',
                                        'items' => [
                                            [
                                                'nama_barang' => 'Minyak Goreng 2L',
                                                'jumlah' => 10,
                                                'harga_beli_satuan' => 28000,
                                                'total_harga' => 280000,
                                            ]
                                        ]
                                    ])
                                ]
                            ]
                        ]
                    ]
                ]
            ], 200),
        ]);
    }

    public function test_ai_status_endpoint()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
                         ->getJson('/laravel/api/ai/status');

        $response->assertStatus(200)
                 ->assertJsonStructure(['success', 'is_configured', 'model']);
    }

    public function test_ai_chat_assistant()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->anggotaToken}")
                         ->postJson('/laravel/api/ai/chat', [
                             'message' => 'Berapa saldo dan hutang saya?',
                         ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['success', 'reply']);
    }

    public function test_ai_chat_validation()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->anggotaToken}")
                         ->postJson('/laravel/api/ai/chat', []);

        $response->assertStatus(422);
    }

    public function test_ai_insights_admin_access()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
                         ->getJson('/laravel/api/ai/insights');

        $response->assertStatus(200)
                 ->assertJsonStructure(['success', 'data']);
    }

    public function test_ai_insights_forbidden_for_anggota()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->anggotaToken}")
                         ->getJson('/laravel/api/ai/insights');

        $response->assertStatus(403);
    }

    public function test_ai_scan_invoice_admin_success()
    {
        $fakeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
                         ->postJson('/laravel/api/ai/scan-invoice', [
                             'image_base64' => $fakeBase64,
                             'mime_type' => 'image/png',
                         ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['success', 'data']);
    }

    public function test_ai_scan_invoice_validation_missing_image()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
                         ->postJson('/laravel/api/ai/scan-invoice', []);

        $response->assertStatus(422);
    }

    public function test_ai_scan_invoice_forbidden_for_anggota()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->anggotaToken}")
                         ->postJson('/laravel/api/ai/scan-invoice', [
                             'image_base64' => 'abc',
                         ]);

        $response->assertStatus(403);
    }
}
