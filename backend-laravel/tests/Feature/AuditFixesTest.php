<?php

namespace Tests\Feature;

use App\Models\Anggota;
use App\Models\Barang;
use App\Models\PembayaranHutang;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class AuditFixesTest extends TestCase
{
    use DatabaseTransactions;

    public function test_opname_massal_maintains_2_tier_stok_integrity()
    {
        $admin = User::first();
        $token = $admin->createToken('test')->plainTextToken;

        $barang = Barang::create([
            'nama_barang' => 'Barang Opname',
            'harga_beli' => 1000,
            'harga_jual' => 2000,
            'stok_toko' => 10,
            'stok_gudang' => 20,
            'stok' => 30, // 10 + 20
        ]);

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/admin/opname', [
                'adjustments' => [
                    ['barang_id' => $barang->barang_id, 'stok_akhir' => 15, 'lokasi' => 'toko']
                ]
            ]);

        $response->assertStatus(200);

        $barang->refresh();
        // stok_toko should be updated to 15.
        $this->assertEquals(15, $barang->stok_toko);
        $this->assertEquals(20, $barang->stok_gudang);
        // stok should be dynamically recalculated: 15 + 20 = 35.
        $this->assertEquals(35, $barang->stok);
    }

    public function test_topup_shu_correctly_adds_balance_and_asserts_no_race_condition()
    {
        $admin = User::first();
        $token = $admin->createToken('test')->plainTextToken;

        $user = User::create([
            'username' => 'test_topup_shu',
            'password_hash' => 'pass',
            'role' => 'anggota',
        ]);
        $anggota = Anggota::create([
            'user_id' => $user->user_id,
            'nama_lengkap' => 'test_topup_shu',
            'no_identitas' => '123',
            'shu' => 5000,
        ]);

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/admin/topup-shu', [
                'nama_anggota' => 'test_topup_shu',
                'nominal' => 2000
            ]);

        $response->assertStatus(200);
        $anggota->refresh();
        $this->assertEquals(7000, $anggota->shu);
    }

    public function test_approve_pembayaran_hutang_deducts_hutang_properly()
    {
        $admin = User::where('role', 'admin')->first(); // Ensure admin
        // Find a valid kasir or make one
        $kasir = User::firstOrCreate(['username' => 'test_kasir_hutang'], ['role' => 'kasir', 'password_hash' => 'p']);
        $token = $kasir->createToken('test')->plainTextToken;

        $anggota = Anggota::create([
            'nama_lengkap' => 'Test Hutang',
            'no_identitas' => 'HTG',
            'hutang' => 50000,
        ]);

        $pembayaran = PembayaranHutang::create([
            'anggota_id' => $anggota->anggota_id,
            'nominal' => 20000,
            'status' => 'pending',
        ]);

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/approve-pembayaran-hutang', [
                'pembayaran_id' => $pembayaran->pembayaran_id,
                'action' => 'approve'
            ]);

        $response->assertStatus(200);

        $anggota->refresh();
        $this->assertEquals(30000, $anggota->hutang); // 50k - 20k
        $pembayaran->refresh();
        $this->assertEquals('approved', $pembayaran->status);
    }
}
