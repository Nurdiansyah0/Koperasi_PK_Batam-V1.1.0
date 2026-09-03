<?php

namespace Tests\Feature;

use App\Models\Anggota;
use App\Models\Barang;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AnggotaCompleteTest extends TestCase
{
    use DatabaseTransactions;

    protected $anggotaUser;

    protected $token;

    protected $barang;

    protected function setUp(): void
    {
        parent::setUp();

        $this->anggotaUser = User::create([
            'username' => 'test_anggota_api',
            'password_hash' => Hash::make('password123'),
            'role' => 'anggota',
        ]);

        Anggota::create([
            'user_id' => $this->anggotaUser->user_id,
            'nama_lengkap' => 'Test Anggota API',
            'email' => 'test_anggota_api@example.com',
            'saldo' => 500000,
            'hutang' => 0,
            'shu' => 0,
        ]);

        $this->token = $this->anggotaUser->createToken('anggota_token')->plainTextToken;

        $this->barang = Barang::create([
            'nama_barang' => 'Barang Anggota',
            'stok' => 10,
            'stok_toko' => 10,
            'pkm' => 10,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);
    }

    public function test_unauthorized_if_not_anggota()
    {
        $admin = User::create([
            'username' => 'admin_test_anggota',
            'password_hash' => Hash::make('pass'),
            'role' => 'admin',
        ]);
        $token = $admin->createToken('admin')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/laravel/api/anggota/profil');
        $response->assertStatus(403);
    }

    public function test_get_profil()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/anggota/profil');
        $response->assertStatus(200)
            ->assertJsonPath('user.nama_lengkap', 'Test Anggota API');
    }

    public function test_get_data_barang_belanja()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/anggota/barang');
        $response->assertStatus(200);
    }

    public function test_simpan_transaksi_success_ewallet()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/anggota/transaksi', [
                'metode_pembayaran' => 'ewallet',
                'items' => [
                    [
                        'barang_id' => $this->barang->barang_id,
                        'jumlah' => 2,
                    ],
                ],
            ]);
        $response->assertStatus(200);
        $this->assertEquals(480000, $this->anggotaUser->fresh()->anggota->saldo);
        $this->assertEquals(8, $this->barang->fresh()->stok);
    }

    public function test_simpan_transaksi_success_hutang()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/anggota/transaksi', [
                'metode_pembayaran' => 'hutang',
                'items' => [
                    [
                        'barang_id' => $this->barang->barang_id,
                        'jumlah' => 1,
                    ],
                ],
            ]);
        $response->assertStatus(200);
        $this->assertEquals(10000, $this->anggotaUser->fresh()->anggota->hutang);
    }

    public function test_simpan_transaksi_fail_insufficient_stock()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/anggota/transaksi', [
                'metode_pembayaran' => 'ewallet',
                'items' => [
                    [
                        'barang_id' => $this->barang->barang_id,
                        'jumlah' => 9999,
                    ],
                ],
            ]);
        $response->assertStatus(400);
    }

    public function test_simpan_transaksi_fail_limit_hutang()
    {
        $this->anggotaUser->anggota->hutang = 400000;
        $this->anggotaUser->anggota->save();

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/anggota/transaksi', [
                'metode_pembayaran' => 'hutang',
                'items' => [
                    [
                        'barang_id' => $this->barang->barang_id,
                        'jumlah' => 1,
                    ],
                ],
            ]);
        $response->assertStatus(400);
    }

    public function test_simpan_transaksi_fail_insufficient_saldo()
    {
        $this->anggotaUser->anggota->saldo = 0;
        $this->anggotaUser->anggota->save();

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/anggota/transaksi', [
                'metode_pembayaran' => 'ewallet',
                'items' => [
                    [
                        'barang_id' => $this->barang->barang_id,
                        'jumlah' => 1,
                    ],
                ],
            ]);
        $response->assertStatus(400);
    }

    public function test_get_histori_transaksi()
    {
        // Setup a transaction
        $trx = Transaksi::create([
            'anggota_id' => $this->anggotaUser->anggota->anggota_id,
            'total_harga' => 10000,
            'total_keuntungan' => 5000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);
        TransaksiDetail::create([
            'transaksi_id' => $trx->transaksi_id,
            'barang_id' => $this->barang->barang_id,
            'jumlah' => 1,
            'harga_satuan' => 10000,
            'subtotal' => 10000,
            'keuntungan' => 5000,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/anggota/transaksi');
        $response->assertStatus(200);
    }

    public function test_bayar_hutang()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/anggota/bayar-hutang', [
                'jumlah' => 50000,
            ]);
        $response->assertStatus(200);
    }

    public function test_get_histori_bayar_hutang()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/anggota/bayar-hutang');
        $response->assertStatus(200);
    }

    public function test_update_profile()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/anggota/update-profile', [
                'username' => 'test_anggota_api_updated',
            ]);
        $response->assertStatus(200);
        $this->assertEquals('test_anggota_api_updated', $this->anggotaUser->fresh()->username);
    }

    public function test_change_password()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/anggota/change-password', [
                'current_password' => 'password123',
                'new_password' => 'newpassword123',
            ]);
        $response->assertStatus(200);
        $this->assertTrue(Hash::check('newpassword123', $this->anggotaUser->fresh()->password_hash));

        // Fail old password
        $response2 = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/anggota/change-password', [
                'current_password' => 'wrong',
                'new_password' => 'newnew',
            ]);
        $response2->assertStatus(400);
    }
}
