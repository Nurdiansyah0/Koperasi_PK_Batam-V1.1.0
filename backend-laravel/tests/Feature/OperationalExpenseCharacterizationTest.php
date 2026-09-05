<?php

namespace Tests\Feature;

use App\Models\PengeluaranOperasional;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class OperationalExpenseCharacterizationTest extends TestCase
{
    use DatabaseTransactions;

    protected $admin;

    protected $adminToken;

    protected $kasir;

    protected $kasirToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::where('role', 'admin')->first();
        if (! $this->admin) {
            $this->admin = User::create([
                'username' => 'admin_test_opex',
                'password_hash' => bcrypt('password'),
                'role' => 'admin',
            ]);
        }
        $this->adminToken = $this->admin->createToken('admin_token')->plainTextToken;

        $this->kasir = User::where('role', 'kasir')->first();
        if (! $this->kasir) {
            $this->kasir = User::create([
                'username' => 'kasir_test_opex',
                'password_hash' => bcrypt('password'),
                'role' => 'kasir',
            ]);
        }
        $this->kasirToken = $this->kasir->createToken('kasir_token')->plainTextToken;
    }

    public function test_tc01_valid_creation_with_all_fields(): void
    {
        $payload = [
            'nama_pengeluaran' => 'Biaya Listrik Kantor',
            'nominal' => 250000,
            'tanggal' => '2026-09-01',
            'kategori' => 'Utilitas',
            'keterangan' => 'Pembayaran tagihan listrik PLN bulan Agustus',
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/laravel/api/admin/pengeluaran', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Pengeluaran kas berhasil dicatat',
                'data' => [
                    'nama_pengeluaran' => 'Biaya Listrik Kantor',
                    'nominal' => 250000.0,
                    'kategori' => 'Utilitas',
                    'tanggal' => '2026-09-01',
                    'keterangan' => 'Pembayaran tagihan listrik PLN bulan Agustus',
                    'created_by' => $this->admin->user_id,
                ],
            ]);

        $this->assertDatabaseHas('pengeluaran_operasional', [
            'nama_pengeluaran' => 'Biaya Listrik Kantor',
            'nominal' => 250000,
            'tanggal' => '2026-09-01',
            'kategori' => 'Utilitas',
            'keterangan' => 'Pembayaran tagihan listrik PLN bulan Agustus',
            'created_by' => $this->admin->user_id,
        ]);
    }

    public function test_tc02_creation_with_minimal_fields_uses_legacy_defaults(): void
    {
        $payload = [
            'nama_pengeluaran' => 'Beli Air Galon',
            'nominal' => 20000,
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/laravel/api/admin/pengeluaran', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Pengeluaran kas berhasil dicatat',
                'data' => [
                    'nama_pengeluaran' => 'Beli Air Galon',
                    'nominal' => 20000.0,
                    'kategori' => 'Operasional',
                    'tanggal' => now()->toDateString(),
                    'created_by' => $this->admin->user_id,
                ],
            ]);

        $this->assertDatabaseHas('pengeluaran_operasional', [
            'nama_pengeluaran' => 'Beli Air Galon',
            'nominal' => 20000,
            'kategori' => 'Operasional',
            'tanggal' => now()->toDateString(),
            'created_by' => $this->admin->user_id,
        ]);
    }

    public function test_tc03_missing_nama_pengeluaran_fails_validation(): void
    {
        $payload = [
            'nominal' => 50000,
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/laravel/api/admin/pengeluaran', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nama_pengeluaran']);
    }

    public function test_tc04_missing_nominal_fails_validation(): void
    {
        $payload = [
            'nama_pengeluaran' => 'Beli Kertas HVS',
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/laravel/api/admin/pengeluaran', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nominal']);
    }

    public function test_tc05_zero_nominal_fails_validation(): void
    {
        $payload = [
            'nama_pengeluaran' => 'Beli Kertas HVS',
            'nominal' => 0,
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/laravel/api/admin/pengeluaran', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nominal']);
    }

    public function test_tc06_negative_nominal_fails_validation(): void
    {
        $payload = [
            'nama_pengeluaran' => 'Beli Kertas HVS',
            'nominal' => -50000,
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/laravel/api/admin/pengeluaran', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nominal']);
    }

    public function test_tc07_non_numeric_nominal_fails_validation(): void
    {
        $payload = [
            'nama_pengeluaran' => 'Beli Kertas HVS',
            'nominal' => 'seratus_ribu',
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/laravel/api/admin/pengeluaran', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nominal']);
    }

    public function test_tc08_invalid_date_format_fails_validation(): void
    {
        $payload = [
            'nama_pengeluaran' => 'Beli Kertas HVS',
            'nominal' => 50000,
            'tanggal' => 'invalid-date-format',
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/laravel/api/admin/pengeluaran', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tanggal']);
    }

    public function test_tc09_unauthorized_role_gets_forbidden(): void
    {
        $payload = [
            'nama_pengeluaran' => 'Percobaan Akses Kasir',
            'nominal' => 50000,
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/admin/pengeluaran', $payload);

        $response->assertStatus(403);
    }

    public function test_tc10_unauthenticated_access_gets_unauthorized(): void
    {
        $payload = [
            'nama_pengeluaran' => 'Percobaan Akses Tamu',
            'nominal' => 50000,
        ];

        $response = $this->postJson('/laravel/api/admin/pengeluaran', $payload);

        $response->assertStatus(401);
    }

    public function test_tc11_listing_with_date_filters(): void
    {
        PengeluaranOperasional::create([
            'nama_pengeluaran' => 'Opex Agustus',
            'nominal' => 100000,
            'tanggal' => '2026-08-15',
            'created_by' => $this->admin->user_id,
        ]);

        PengeluaranOperasional::create([
            'nama_pengeluaran' => 'Opex Target A',
            'nominal' => 150000,
            'tanggal' => '2026-09-02',
            'created_by' => $this->admin->user_id,
        ]);

        PengeluaranOperasional::create([
            'nama_pengeluaran' => 'Opex Target B',
            'nominal' => 200000,
            'tanggal' => '2026-09-04',
            'created_by' => $this->admin->user_id,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/laravel/api/admin/pengeluaran?tanggal_awal=2026-09-01&tanggal_akhir=2026-09-05');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $data = collect($response->json('data'));
        $names = $data->pluck('nama_pengeluaran');

        $this->assertTrue($names->contains('Opex Target A'));
        $this->assertTrue($names->contains('Opex Target B'));
        $this->assertFalse($names->contains('Opex Agustus'));

        $this->assertGreaterThanOrEqual(350000, $response->json('total_pengeluaran'));
    }

    public function test_tc12_listing_with_search_across_name_category_and_notes(): void
    {
        $suffix = uniqid();

        PengeluaranOperasional::create([
            'nama_pengeluaran' => "SapuLantai_{$suffix}",
            'nominal' => 35000,
            'kategori' => 'Kebersihan',
            'keterangan' => 'Gagang kayu',
            'tanggal' => '2026-09-05',
            'created_by' => $this->admin->user_id,
        ]);

        PengeluaranOperasional::create([
            'nama_pengeluaran' => "KopiBubuk_{$suffix}",
            'nominal' => 45000,
            'kategori' => "PantryDapur_{$suffix}",
            'keterangan' => 'Rapat pengurus',
            'tanggal' => '2026-09-05',
            'created_by' => $this->admin->user_id,
        ]);

        PengeluaranOperasional::create([
            'nama_pengeluaran' => "SpidolMarker_{$suffix}",
            'nominal' => 25000,
            'kategori' => 'ATK',
            'keterangan' => "WhiteboardSpecial_{$suffix}",
            'tanggal' => '2026-09-05',
            'created_by' => $this->admin->user_id,
        ]);

        // 1. Search by name
        $resName = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson("/laravel/api/admin/pengeluaran?search=SapuLantai_{$suffix}");
        $resName->assertStatus(200)
            ->assertJsonPath('data.0.nama_pengeluaran', "SapuLantai_{$suffix}");
        $this->assertEquals(1, count($resName->json('data')));

        // 2. Search by category
        $resCat = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson("/laravel/api/admin/pengeluaran?search=PantryDapur_{$suffix}");
        $resCat->assertStatus(200)
            ->assertJsonPath('data.0.nama_pengeluaran', "KopiBubuk_{$suffix}");
        $this->assertEquals(1, count($resCat->json('data')));

        // 3. Search by notes
        $resNotes = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson("/laravel/api/admin/pengeluaran?search=WhiteboardSpecial_{$suffix}");
        $resNotes->assertStatus(200)
            ->assertJsonPath('data.0.nama_pengeluaran', "SpidolMarker_{$suffix}");
        $this->assertEquals(1, count($resNotes->json('data')));
    }

    public function test_tc13_successful_deletion_permanently_removes_record(): void
    {
        $item = PengeluaranOperasional::create([
            'nama_pengeluaran' => 'Biaya Hapus Test',
            'nominal' => 80000,
            'tanggal' => '2026-09-05',
            'created_by' => $this->admin->user_id,
        ]);

        $id = $item->pengeluaran_id;

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->deleteJson("/laravel/api/admin/pengeluaran/{$id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Catatan pengeluaran berhasil dihapus',
            ]);

        $this->assertDatabaseMissing('pengeluaran_operasional', [
            'pengeluaran_id' => $id,
        ]);
    }

    public function test_tc14_delete_nonexistent_id_returns_404_with_exact_error_key(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->deleteJson('/laravel/api/admin/pengeluaran/999999');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'error' => 'Data pengeluaran tidak ditemukan',
            ]);
    }

    public function test_tc15_downstream_net_shu_effect_in_laporan_transaksi(): void
    {
        $uniqueName = 'Beban Karpet Masjid '.uniqid();
        $item = PengeluaranOperasional::create([
            'nama_pengeluaran' => $uniqueName,
            'nominal' => 125000,
            'tanggal' => '2026-09-10',
            'kategori' => 'Sosial',
            'created_by' => $this->admin->user_id,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/laravel/api/admin/laporan-transaksi', [
                'tanggal_awal' => '2026-09-01',
                'tanggal_akhir' => '2026-09-30',
            ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $totalBebanOperasional = $response->json('summary.total_beban_operasional');
        $this->assertGreaterThanOrEqual(125000, $totalBebanOperasional);

        $listPengeluaran = collect($response->json('pengeluaran_operasional'));
        $found = $listPengeluaran->firstWhere('nama_pengeluaran', $uniqueName);

        $this->assertNotNull($found, 'Pengeluaran harus tercantum di laporan transaksi pengeluaran_operasional');
        $this->assertEquals(125000, $found['nominal']);
    }
}
