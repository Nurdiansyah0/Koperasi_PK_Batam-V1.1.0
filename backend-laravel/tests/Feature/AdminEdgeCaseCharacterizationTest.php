<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Anggota;
use App\Models\Barang;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class AdminEdgeCaseCharacterizationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_can_topup_shu()
    {
        $admin = User::where('role', 'admin')->first();
        $anggota = Anggota::first();
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/admin/topup-shu', [
                'nama_anggota' => $anggota->user->username,
                'nominal' => 50000,
            ]);

        $response->assertStatus(200)->assertJsonPath('success', true);
    }

    public function test_admin_can_mutasi_stok()
    {
        $admin = User::where('role', 'admin')->first();
        $barang = Barang::first();
        $barang->stok_gudang = 100;
        $barang->save();

        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/admin/mutasi-stok', [
                'barang_id' => $barang->barang_id,
                'tipe' => 'gudang_ke_toko',
                'jumlah' => 10,
                'catatan' => 'Mutasi Test',
            ]);

        $response->assertStatus(200)->assertJsonPath('success', true);
    }

    public function test_admin_can_write_off_expired()
    {
        $admin = User::where('role', 'admin')->first();
        $barang = Barang::first();
        $barang->stok_gudang = 100;
        $barang->save();

        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/admin/write-off-expired', [
                'barang_id' => $barang->barang_id,
                'jumlah' => 2,
                'lokasi' => 'gudang',
                'catatan' => 'Expired Test',
            ]);

        $response->assertStatus(200);
    }

    public function test_admin_can_assign_and_revoke_jabatan()
    {
        $admin = User::where('role', 'admin')->first();
        $target = User::where('role', 'anggota')->first();
        $token = $admin->createToken('test')->plainTextToken;

        $assign = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/admin/jabatan/assign', [
                'user_id' => $target->user_id,
                'role' => 'pengurus',
                'catatan' => 'Test',
            ]);

        $assign->assertStatus(200);
        $jabatanId = $assign->json('data.id');

        if ($jabatanId) {
            $revoke = $this->withHeader('Authorization', "Bearer $token")
                ->postJson('/laravel/api/admin/jabatan/revoke', [
                    'jabatan_id' => $jabatanId,
                ]);
            $revoke->assertStatus(200);
        }
    }
}
