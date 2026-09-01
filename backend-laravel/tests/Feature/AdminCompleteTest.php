<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Barang;
use App\Models\Anggota;
use App\Models\SetoranKasir;
use App\Models\ShuDistribusi;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class AdminCompleteTest extends TestCase
{
    use DatabaseTransactions;

    protected $admin;
    protected $token;

    protected function setUp(): void
    {
        parent::setUp();
        // Create an admin if none exists
        $this->admin = User::where('role', 'admin')->first();
        if (!$this->admin) {
            $this->admin = User::create([
                'username' => 'test_admin',
                'password_hash' => bcrypt('password'),
                'role' => 'admin'
            ]);
        }
        $this->token = $this->admin->createToken('admin_token')->plainTextToken;
    }

    public function test_unauthorized_access()
    {
        $kasir = User::where('role', 'kasir')->firstOrFail();
        $kasirToken = $kasir->createToken('kasir_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$kasirToken}")
                         ->getJson('/laravel/api/admin/dashboard-stats');
        $response->assertStatus(403);
    }

    public function test_get_dashboard_stats()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/admin/dashboard-stats');
        $response->assertStatus(200)
                 ->assertJsonStructure(['success', 'total_anggota', 'total_transaksi_hari_ini']);
    }

    public function test_crud_barang()
    {
        // Get
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/admin/barang');
        $response->assertStatus(200);

        // Tambah
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/tambah-barang', [
                             'nama_barang' => 'Test Barang',
                             'stok' => 10,
                             'harga_modal' => 5000,
                             'harga_jual' => 10000
                         ]);
        $response->assertStatus(200);

        $barang = Barang::where('nama_barang', 'Test Barang')->first();
        $this->assertNotNull($barang);

        // Update
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/update-barang', [
                             'barang_id' => $barang->barang_id,
                             'nama_barang' => 'Test Barang Updated',
                             'stok' => 20
                         ]);
        $response->assertStatus(200);
        $this->assertEquals('Test Barang Updated', $barang->fresh()->nama_barang);

        // Update not found
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/update-barang', [
                             'barang_id' => 99999,
                             'nama_barang' => 'Test'
                         ]);
        $response->assertStatus(404);

        // Hapus
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/hapus-barang', [
                             'barang_id' => $barang->barang_id
                         ]);
        $response->assertStatus(200);
        $this->assertNull(Barang::find($barang->barang_id));
    }

    public function test_restock_barang()
    {
        $barang = Barang::first();
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/restock-barang', [
                             'barang_id' => $barang->barang_id,
                             'jumlah_tambah' => 10,
                             'harga_beli_satuan' => 5000,
                             'sumber_dana' => 'kas',
                             'catatan' => 'test'
                         ]);
        if ($response->status() !== 200) {
            dump($response->json());
        }
        $response->assertStatus(200);

        // test get riwayat
        $response2 = $this->withHeader('Authorization', "Bearer {$this->token}")
                          ->getJson('/laravel/api/admin/riwayat-restock');
        $response2->assertStatus(200);
    }

    public function test_crud_user()
    {
        // Get
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/admin/anggota');
        $response->assertStatus(200);

        // Tambah
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/tambah-user', [
                             'username' => 'new_user_123',
                             'password' => 'password',
                             'role' => 'anggota'
                         ]);
        $response->assertStatus(200);
        $user = User::where('username', 'new_user_123')->first();
        $this->assertNotNull($user);

        // Update
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/update-user', [
                             'user_id' => $user->user_id,
                             'username' => 'updated_user_123',
                             'role' => 'anggota',
                             'password' => 'newpassword'
                         ]);
        $response->assertStatus(200);
        $this->assertEquals('updated_user_123', $user->fresh()->username);

        // Update not found
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/update-user', [
                             'user_id' => 99999,
                             'username' => 'a',
                             'role' => 'admin'
                         ]);
        $response->assertStatus(404);

        // Hapus
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/hapus-user', [
                             'user_id' => $user->user_id
                         ]);
        $response->assertStatus(200);
        $this->assertNull(User::find($user->user_id));
    }

    public function test_setoran_kasir()
    {
        $kasir = User::where('role', 'kasir')->first();
        $setoran = SetoranKasir::create([
            'kasir_id' => $kasir->user_id,
            'nominal' => 50000,
            'status' => 'pending',
            'created_at' => now()
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/admin/setoran-kasir');
        $response->assertStatus(200);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/approve-setoran-kasir', [
                             'setoran_id' => $setoran->setoran_id
                         ]);
        $response->assertStatus(200);

        // Approve not found
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/approve-setoran-kasir', [
                             'setoran_id' => 99999
                         ]);
        $response->assertStatus(404);
    }

    public function test_topup_shu()
    {
        $anggotaUser = User::where('role', 'anggota')->first();
        // Assume has anggota relation
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/topup-shu', [
                             'nama_anggota' => $anggotaUser->username,
                             'nominal' => 10000
                         ]);
        $response->assertStatus(200);

        // Not found
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/topup-shu', [
                             'nama_anggota' => 'nonexistent_user',
                             'nominal' => 10000
                         ]);
        $response->assertStatus(404);
    }

    public function test_laporan_transaksi()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/laporan-transaksi', [
                             'tanggal_awal' => '2023-01-01',
                             'tanggal_akhir' => '2025-01-01'
                         ]);
        $response->assertStatus(200);
    }

    public function test_get_monitor_barang()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/admin/monitor-barang');
        $response->assertStatus(200);
    }

    public function test_get_shu_distribusi()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/admin/shu-distribusi');
        $response->assertStatus(200);
    }

    public function test_get_data_kasir()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/admin/data-kasir');
        $response->assertStatus(200);
    }

    public function test_tambah_user_exception()
    {
        // To trigger the catch (\Exception $e) block, we can bypass Laravel's validation
        // by sending a username that exceeds the DB string length limit (usually 255 chars).
        // It will pass the controller's 'string' validation but fail at the PDO execution level.
        $longUsername = str_repeat('a', 300);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/tambah-user', [
                             'username' => $longUsername,
                             'password' => 'password',
                             'role' => 'anggota'
                         ]);
        
        $response->assertStatus(400);
        $this->assertStringContainsString('Data too long', $response->json('message') ?? '');
    }

    public function test_submit_opname_massal_exception()
    {
        $barang = Barang::first();

        // Hook into the saving event to throw an exception naturally within the try-catch block
        Barang::saving(function () {
            throw new \Exception('Simulated database failure');
        });

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/opname', [
                             'adjustments' => [
                                 [
                                     'barang_id' => $barang->barang_id,
                                     'stok_akhir' => $barang->stok + 9999
                                 ]
                             ]
                         ]);
        
        $response->assertStatus(200)
                 ->assertJson(['success' => false, 'error' => 'Simulated database failure']);
        // Clean up the event listener so it doesn't affect other tests
        Barang::flushEventListeners();
        Barang::boot();
    }

    public function test_restock_barang_exception()
    {
        $barang = Barang::first();
        // Send a sumber_dana that exceeds 255 chars to trigger a PDO exception
        $longSumber = str_repeat('a', 300);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/admin/restock-barang', [
                             'barang_id' => $barang->barang_id,
                             'jumlah_tambah' => 10,
                             'harga_beli_satuan' => 5000,
                             'sumber_dana' => $longSumber
                         ]);
        
        $response->assertStatus(500);
        $this->assertStringContainsString('Data too long', $response->json('message') ?? '');
    }
}
