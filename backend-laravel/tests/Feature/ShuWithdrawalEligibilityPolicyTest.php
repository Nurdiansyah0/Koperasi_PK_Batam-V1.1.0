<?php

namespace Tests\Feature;

use App\Models\Anggota;
use App\Models\Barang;
use App\Models\Transaksi;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ShuWithdrawalEligibilityPolicyTest extends TestCase
{
    use DatabaseTransactions;

    private function authenticateAs(string $role, array $extra = []): array
    {
        $user = User::create(array_merge([
            'username' => $role.'_'.uniqid(),
            'password_hash' => Hash::make('password123'),
            'role' => $role,
        ], $extra));

        $token = $user->createToken('test-token')->plainTextToken;

        return [$user, $token];
    }

    public function test_qualifying_purchase_boundary_25000_fails_and_25001_succeeds(): void
    {
        [$kasir, $token] = $this->authenticateAs('kasir');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Boundary Anggota',
            'saldo' => 100000,
            'shu' => 100000,
            'hutang' => 0,
        ]);

        // 1. Exactly 25.000 (rejected)
        $trx25000 = Transaksi::create([
            'anggota_id' => $anggota->anggota_id,
            'kasir_id' => $kasir->user_id,
            'total_harga' => 25000,
            'total_keuntungan' => 5000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);

        $resFail = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/tarik-tunai', [
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 20000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => true,
                'transaksi_id' => $trx25000->transaksi_id,
            ]);

        $resFail->assertStatus(400);
        $this->assertStringContainsString('lebih dari rp 25.000', strtolower($resFail->json('message')));

        // 2. Exactly 25.001 (eligible)
        $trx25001 = Transaksi::create([
            'anggota_id' => $anggota->anggota_id,
            'kasir_id' => $kasir->user_id,
            'total_harga' => 25001,
            'total_keuntungan' => 5000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);

        $resSuccess = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/tarik-tunai', [
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 20000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => true,
                'transaksi_id' => $trx25001->transaksi_id,
            ]);

        $resSuccess->assertStatus(200);
        $resSuccess->assertJson(['success' => true]);
        $anggota->refresh();
        $this->assertEquals(80000, (float) $anggota->shu);
    }

    public function test_debt_netting_with_positive_net_shu_succeeds(): void
    {
        [$kasir, $token] = $this->authenticateAs('kasir');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Netting Member',
            'saldo' => 50000,
            'shu' => 100000,
            'hutang' => 30000, // Eligible SHU = 70.000 -> 50% limit = 35.000
        ]);

        $trx = Transaksi::create([
            'anggota_id' => $anggota->anggota_id,
            'kasir_id' => $kasir->user_id,
            'total_harga' => 30000,
            'total_keuntungan' => 6000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);

        // Attempting to withdraw 40.000 (> 35.000 limit) fails
        $resFail = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/tarik-tunai', [
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 40000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => true,
                'transaksi_id' => $trx->transaksi_id,
            ]);

        $resFail->assertStatus(400);
        $this->assertStringContainsString('melebihi batas maksimal penarikan shu', strtolower($resFail->json('message')));

        // Withdrawing 35.000 (at exact limit) succeeds
        $resSuccess = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/tarik-tunai', [
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 35000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => true,
                'transaksi_id' => $trx->transaksi_id,
            ]);

        $resSuccess->assertStatus(200);
        $anggota->refresh();
        $this->assertEquals(65000, (float) $anggota->shu);
        $this->assertEquals(30000, (float) $anggota->hutang); // Hutang untouched
    }

    public function test_debt_netting_where_debt_equals_or_exceeds_shu_fails(): void
    {
        [$kasir, $token] = $this->authenticateAs('kasir');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Over-indebted Member',
            'saldo' => 50000,
            'shu' => 50000,
            'hutang' => 50000, // Eligible SHU = 0
        ]);

        $trx = Transaksi::create([
            'anggota_id' => $anggota->anggota_id,
            'kasir_id' => $kasir->user_id,
            'total_harga' => 30000,
            'total_keuntungan' => 6000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);

        $res = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/tarik-tunai', [
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 10000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => true,
                'transaksi_id' => $trx->transaksi_id,
            ]);

        $res->assertStatus(400);
        $this->assertStringContainsString('melebihi batas maksimal penarikan shu rp 0', strtolower($res->json('message')));
    }

    public function test_floor_to_nearest_thousand_rounding(): void
    {
        [$kasir, $token] = $this->authenticateAs('kasir');
        [$userAnggota] = $this->authenticateAs('anggota');

        // SHU 85.555 -> 50% = 42.777,50 -> floored to 42.000
        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Fractional SHU Member',
            'saldo' => 50000,
            'shu' => 85555,
            'hutang' => 0,
        ]);

        $trx = Transaksi::create([
            'anggota_id' => $anggota->anggota_id,
            'kasir_id' => $kasir->user_id,
            'total_harga' => 30000,
            'total_keuntungan' => 6000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);

        // Requesting 43.000 exceeds 42.000 floored limit
        $resFail = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/tarik-tunai', [
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 43000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => true,
                'transaksi_id' => $trx->transaksi_id,
            ]);

        $resFail->assertStatus(400);
        $this->assertStringContainsString('melebihi batas maksimal penarikan shu rp 42.000', strtolower($resFail->json('message')));

        // Requesting 42.000 succeeds
        $resSuccess = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/tarik-tunai', [
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 42000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => true,
                'transaksi_id' => $trx->transaksi_id,
            ]);

        $resSuccess->assertStatus(200);
        $anggota->refresh();
        $this->assertEquals(43555, (float) $anggota->shu);
    }

    public function test_pos_integrated_checkout_enforces_nominal_tarik_covers_total_belanja_invariant(): void
    {
        [$kasir, $token] = $this->authenticateAs('kasir');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Integrated POS Anggota',
            'saldo' => 50000,
            'shu' => 200000,
            'hutang' => 0,
            'persetujuan_shu_master_at' => Carbon::now(),
        ]);

        $b1 = Barang::first();
        if (! $b1) {
            $b1 = Barang::create([
                'nama_barang' => 'Barang Pos Uji',
                'stok' => 50,
                'harga_modal' => 40000,
                'harga_jual' => 60000,
                'kategori' => 'makanan',
            ]);
        } else {
            $b1->update(['stok' => 50, 'harga_modal' => 40000, 'harga_jual' => 60000]);
        }

        // 1. nominalTarik < totalHarga fails invariant
        $resInvariant = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/buat-transaksi', [
                'anggota_id' => $anggota->anggota_id,
                'metode_pembayaran' => 'cash',
                'items' => [
                    ['barang_id' => $b1->barang_id, 'jumlah' => 1, 'harga_satuan' => 60000],
                ],
                'sertakan_tarik_tunai' => true,
                'tarik_tunai_nominal' => 50000, // Less than 60.000 belanja
                'tarik_tunai_sumber' => 'shu',
            ]);

        $resInvariant->assertStatus(400);
        $this->assertStringContainsString('tidak mencukupi untuk menutup total belanja', $resInvariant->json('message'));

        // 2. nominalTarik >= totalHarga (70.000 >= 60.000, and <= 100.000 max SHU limit) succeeds
        $resSuccess = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/buat-transaksi', [
                'anggota_id' => $anggota->anggota_id,
                'metode_pembayaran' => 'cash',
                'items' => [
                    ['barang_id' => $b1->barang_id, 'jumlah' => 1, 'harga_satuan' => 60000],
                ],
                'sertakan_tarik_tunai' => true,
                'tarik_tunai_nominal' => 70000,
                'tarik_tunai_sumber' => 'shu',
            ]);

        $resSuccess->assertStatus(200);
        $resSuccess->assertJsonPath('tarik_tunai.nominal_tarik', 70000);
        $resSuccess->assertJsonPath('tarik_tunai.potong_belanja', 60000);
        $resSuccess->assertJsonPath('tarik_tunai.uang_bersih_diserahkan', 10000);
    }

    public function test_eligibility_endpoints_return_exact_policy_structure(): void
    {
        [$kasir, $kasirToken] = $this->authenticateAs('kasir');
        [$userAnggota, $anggotaToken] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Eligibility Inspection Anggota',
            'saldo' => 50000,
            'shu' => 95000,
            'hutang' => 20000, // Eligible = 75.000 -> 50% = 37.500 -> floored = 37.000
        ]);

        Transaksi::create([
            'anggota_id' => $anggota->anggota_id,
            'kasir_id' => $kasir->user_id,
            'total_harga' => 30000,
            'total_keuntungan' => 6000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);

        // 1. Member endpoint
        $memberRes = $this->actingAs($userAnggota, 'sanctum')
            ->getJson('/laravel/api/anggota/cek-kelayakan-tarik-tunai');

        $memberRes->assertStatus(200);
        $memberRes->assertJsonPath('data.eligible_shu', 75000);
        $memberRes->assertJsonPath('data.raw_withdrawal_limit', 37500);
        $memberRes->assertJsonPath('data.final_withdrawal_limit', 37000);
        $memberRes->assertJsonPath('data.has_qualifying_purchase', true);

        // 2. Kasir endpoint
        $kasirRes = $this->actingAs($kasir, 'sanctum')
            ->getJson("/laravel/api/kasir/cek-kelayakan-tarik-tunai/{$anggota->anggota_id}");

        $kasirRes->assertStatus(200);
        $kasirRes->assertJsonPath('data.eligible_shu', 75000);
        $kasirRes->assertJsonPath('data.raw_withdrawal_limit', 37500);
        $kasirRes->assertJsonPath('data.final_withdrawal_limit', 37000);
        $kasirRes->assertJsonPath('data.max_kuota_tarik_tunai', 37000);
    }
}
