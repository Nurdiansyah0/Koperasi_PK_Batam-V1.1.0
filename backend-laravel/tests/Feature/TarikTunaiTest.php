<?php
namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\User;
use App\Models\Anggota;
use App\Models\Transaksi;
use App\Models\Barang;
use App\Models\TarikTunai;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class TarikTunaiTest extends TestCase
{
    use DatabaseTransactions;
    private function authenticateAs(string $role, array $extra = [])
    {
        $user = User::create(array_merge([
            'username' => $role . '_' . uniqid(),
            'password_hash' => Hash::make('password123'),
            'role' => $role,
        ], $extra));

        $token = $user->createToken('test-token')->plainTextToken;
        return [$user, $token];
    }

    public function test_tarik_tunai_fails_without_persetujuan_shu()
    {
        [$kasir, $token] = $this->authenticateAs('kasir');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Uji',
            'saldo' => 100000,
            'shu' => 50000,
            'hutang' => 0,
        ]);

        $res = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/tarik-tunai', [
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 20000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => false,
            ]);

        $res->assertStatus(422);
    }

    public function test_tarik_tunai_fails_without_qualifying_purchase_of_25k()
    {
        [$kasir, $token] = $this->authenticateAs('kasir');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Uji Belanja Kurang',
            'saldo' => 100000,
            'shu' => 50000,
            'hutang' => 0,
        ]);

        // Purchase of only 15.000 (below 25.000 requirement)
        $trx = Transaksi::create([
            'anggota_id' => $anggota->anggota_id,
            'kasir_id' => $kasir->user_id,
            'total_harga' => 15000,
            'total_keuntungan' => 3000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);

        $res = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/tarik-tunai', [
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 20000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => true,
                'transaksi_id' => $trx->transaksi_id,
            ]);

        $res->assertStatus(400);
        $this->assertStringContainsString('25.000', $res->json('message'));
    }

    public function test_tarik_tunai_success_with_qualifying_purchase_and_deducts_shu()
    {
        [$kasir, $token] = $this->authenticateAs('kasir');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Sukses SHU',
            'saldo' => 100000,
            'shu' => 80000,
            'hutang' => 0,
        ]);

        // Qualifying purchase of 35.000 (>= 25.000)
        $trx = Transaksi::create([
            'anggota_id' => $anggota->anggota_id,
            'kasir_id' => $kasir->user_id,
            'total_harga' => 35000,
            'total_keuntungan' => 7000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);

        $res = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/tarik-tunai', [
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 50000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => true,
                'transaksi_id' => $trx->transaksi_id,
            ]);

        $res->assertStatus(200);
        $res->assertJson(['success' => true]);

        $anggota->refresh();
        $this->assertEquals(30000, $anggota->shu); // 80.000 - 50.000 = 30.000

        $this->assertDatabaseHas('tarik_tunai', [
            'anggota_id' => $anggota->anggota_id,
            'nominal' => 50000,
            'sumber_dana' => 'shu',
            'transaksi_id' => $trx->transaksi_id,
            'persetujuan_shu' => 1,
        ]);
    }

    public function test_tarik_tunai_fails_if_member_has_debt()
    {
        [$kasir, $token] = $this->authenticateAs('kasir');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Berhutang',
            'saldo' => 100000,
            'shu' => 80000,
            'hutang' => 45000, // Still has unpaid debt
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
                'nominal' => 20000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => true,
                'transaksi_id' => $trx->transaksi_id,
            ]);

        $res->assertStatus(400);
        $this->assertStringContainsString('hutang', strtolower($res->json('message')));
    }

    public function test_tarik_tunai_fails_if_exceeds_proportional_limit()
    {
        [$kasir, $token] = $this->authenticateAs('kasir');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Tarik Terlalu Banyak',
            'saldo' => 500000,
            'shu' => 500000,
            'hutang' => 0,
        ]);

        // Purchase of 25.000 -> Max withdrawal is 2x = 50.000
        $trx = Transaksi::create([
            'anggota_id' => $anggota->anggota_id,
            'kasir_id' => $kasir->user_id,
            'total_harga' => 25000,
            'total_keuntungan' => 5000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);

        // Attempting to withdraw 100.000 (> 2x 25.000 = 50.000)
        $res = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/tarik-tunai', [
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 100000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => true,
                'transaksi_id' => $trx->transaksi_id,
            ]);

        $res->assertStatus(400);
        $this->assertStringContainsString('kuota proporsional', strtolower($res->json('message')));
    }

    public function test_anggota_can_pre_verify_and_submit_ticket_and_kasir_approve()
    {
        [$kasir, $kasirToken] = $this->authenticateAs('kasir');
        [$userAnggota, $anggotaToken] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Mandiri Pre-verified',
            'saldo' => 100000,
            'shu' => 80000,
            'hutang' => 0,
        ]);

        // 1. Qualifying purchase of 30.000
        $trx = Transaksi::create([
            'anggota_id' => $anggota->anggota_id,
            'kasir_id' => $kasir->user_id,
            'total_harga' => 30000,
            'total_keuntungan' => 6000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);

        // 2. Member checks eligibility
        $eligibilityRes = $this->actingAs($userAnggota, 'sanctum')
            ->getJson('/laravel/api/anggota/cek-kelayakan-tarik-tunai');

        $eligibilityRes->assertStatus(200);
        $this->assertTrue($eligibilityRes->json('data.is_eligible'));
        $this->assertEquals(60000, $eligibilityRes->json('data.max_kuota_tarik_tunai')); // 2x 30.000 = 60.000

        // 3. Member submits ticket for 40.000
        $submitRes = $this->actingAs($userAnggota, 'sanctum')
            ->postJson('/laravel/api/anggota/ajukan-tarik-tunai', [
                'nominal' => 40000,
                'sumber_dana' => 'shu',
                'persetujuan_shu' => true,
                'transaksi_id' => $trx->transaksi_id,
            ]);

        $submitRes->assertStatus(200);
        $tarikId = $submitRes->json('data.tarik_id');
        $this->assertNotNull($submitRes->json('data.kode_penarikan'));

        // 4. Cashier views queue
        $queueRes = $this->actingAs($kasir, 'sanctum')
            ->getJson('/laravel/api/kasir/antrean-tarik-tunai');
        $queueRes->assertStatus(200);
        $this->assertNotEmpty($queueRes->json('data'));

        // 5. Cashier processes approval
        $approveRes = $this->actingAs($kasir, 'sanctum')
            ->postJson('/laravel/api/kasir/proses-tarik-tunai', [
                'tarik_id' => $tarikId,
                'action' => 'approve',
            ]);

        $approveRes->assertStatus(200);
        $anggota->refresh();
        $this->assertEquals(40000, $anggota->shu); // 80.000 - 40.000 = 40.000
    }

    public function test_admin_can_view_laporan_tarik_tunai()
    {
        [$admin, $token] = $this->authenticateAs('admin');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Laporan Admin',
            'saldo' => 100000,
            'shu' => 80000,
            'hutang' => 0,
        ]);

        $res = $this->withHeader('Authorization', "Bearer $token")
            ->getJson('/laravel/api/admin/laporan-tarik-tunai');

        $res->assertStatus(200);
        $res->assertJsonStructure([
            'success',
            'data',
            'summary' => [
                'total_penarikan_count',
                'total_nominal_keluar',
                'total_sales_kontribusi',
                'rasio_sales_to_tarik',
            ]
        ]);
    }

    public function test_anggota_can_agree_to_master_consent_once_and_reuse_it()
    {
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Master Consent',
            'saldo' => 100000,
            'shu' => 80000,
            'hutang' => 0,
        ]);

        // 1. Submit master consent
        $consentRes = $this->actingAs($userAnggota, 'sanctum')
            ->postJson('/laravel/api/anggota/setujui-master-consent-shu');

        $consentRes->assertStatus(200);
        $this->assertTrue($consentRes->json('data.has_master_consent'));

        $anggota->refresh();
        $this->assertNotNull($anggota->persetujuan_shu_master_at);

        // 2. Member can withdraw with persetujuan_shu omitted (uses master consent)
        $trx = Transaksi::create([
            'anggota_id' => $anggota->anggota_id,
            'kasir_id' => 1,
            'total_harga' => 30000,
            'total_keuntungan' => 6000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);

        $withdrawRes = $this->actingAs($userAnggota, 'sanctum')
            ->postJson('/laravel/api/anggota/ajukan-tarik-tunai', [
                'nominal' => 25000,
                'sumber_dana' => 'shu',
                'transaksi_id' => $trx->transaksi_id,
            ]);

        $withdrawRes->assertStatus(200);
    }

    public function test_admin_can_manage_shu_and_convert_individual()
    {
        [$admin] = $this->authenticateAs('admin');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Konversi SHU',
            'saldo' => 50000,
            'shu' => 100000,
            'hutang' => 0,
        ]);

        // Admin checks SHU management
        $mgmtRes = $this->actingAs($admin, 'sanctum')
            ->getJson('/laravel/api/admin/shu-management');

        $mgmtRes->assertStatus(200);
        $mgmtRes->assertJsonStructure(['success', 'data' => ['summary', 'anggota', 'riwayat_konversi']]);

        // Admin converts 40.000 from SHU to Saldo
        $convertRes = $this->actingAs($admin, 'sanctum')
            ->postJson('/laravel/api/admin/konversi-shu', [
                'mode' => 'individual',
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 40000,
            ]);

        $convertRes->assertStatus(200);
        $anggota->refresh();
        $this->assertEquals(60000, $anggota->shu); // 100k - 40k = 60k
        $this->assertEquals(90000, $anggota->saldo); // 50k + 40k = 90k
    }

    public function test_admin_can_auto_offset_debt_from_shu()
    {
        [$admin] = $this->authenticateAs('admin');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Auto Pelunasan Hutang',
            'saldo' => 0,
            'shu' => 150000,
            'hutang' => 75000, // Has 75k debt
        ]);

        $offsetRes = $this->actingAs($admin, 'sanctum')
            ->postJson('/laravel/api/admin/konversi-shu', [
                'mode' => 'pelunasan_hutang',
                'anggota_id' => $anggota->anggota_id,
                'nominal' => 75000,
            ]);

        $offsetRes->assertStatus(200);
        $anggota->refresh();
        $this->assertEquals(75000, $anggota->shu); // 150k - 75k = 75k
        $this->assertEquals(0, $anggota->hutang); // 75k debt fully cleared!
    }

    public function test_admin_can_mass_convert_shu_to_wallet_for_hari_raya()
    {
        [$admin] = $this->authenticateAs('admin');
        [$user1] = $this->authenticateAs('anggota');
        [$user2] = $this->authenticateAs('anggota');

        $a1 = Anggota::create(['user_id' => $user1->user_id, 'nama_lengkap' => 'A1', 'saldo' => 0, 'shu' => 100000, 'hutang' => 0]);
        $a2 = Anggota::create(['user_id' => $user2->user_id, 'nama_lengkap' => 'A2', 'saldo' => 0, 'shu' => 200000, 'hutang' => 0]);

        // Mass convert 50% SHU for Hari Raya
        $massRes = $this->actingAs($admin, 'sanctum')
            ->postJson('/laravel/api/admin/konversi-shu', [
                'mode' => 'massal_ke_saldo',
                'persentase' => 50,
            ]);

        $massRes->assertStatus(200);
        $a1->refresh();
        $a2->refresh();

        $this->assertEquals(50000, $a1->shu);
        $this->assertEquals(50000, $a1->saldo);
        $this->assertEquals(100000, $a2->shu);
        $this->assertEquals(100000, $a2->saldo);
    }

    public function test_buat_transaksi_kasir_with_tarik_tunai_and_auto_purchase_deduction()
    {
        [$kasir, $token] = $this->authenticateAs('kasir');
        [$userAnggota] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Tarik Saat Belanja',
            'saldo' => 20000,
            'shu' => 150000,
            'hutang' => 0,
            'persetujuan_shu_master_at' => now(),
        ]);

        $b1 = Barang::first();
        if (!$b1) {
            $b1 = Barang::create([
                'nama_barang' => 'Bearbrand',
                'stok' => 50,
                'harga_modal' => 35000,
                'harga_jual' => 50000,
                'kategori' => 'minuman',
            ]);
        } else {
            $b1->update(['stok' => 50, 'harga_modal' => 35000, 'harga_jual' => 50000]);
        }

        // Member buys 1 item (Rp 50.000) and withdraws Rp 100.000 from SHU (2x Belanja = 100k)
        $res = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/kasir/buat-transaksi', [
                'anggota_id' => $anggota->anggota_id,
                'metode_pembayaran' => 'cash',
                'items' => [
                    ['barang_id' => $b1->barang_id, 'jumlah' => 1, 'harga_satuan' => 50000]
                ],
                'sertakan_tarik_tunai' => true,
                'tarik_tunai_nominal' => 100000,
                'tarik_tunai_sumber' => 'shu',
            ]);

        $res->assertStatus(200);
        $res->assertJsonPath('tarik_tunai.nominal_tarik', 100000);
        $res->assertJsonPath('tarik_tunai.potong_belanja', 50000);
        $res->assertJsonPath('tarik_tunai.uang_bersih_diserahkan', 50000); // 100k - 50k = 50k

        $anggota->refresh();
        // 150k - 100k + 60% of (50k - 35k = 15k profit) = 50k + 9k = 59k
        $this->assertEquals(59000, $anggota->shu);
    }

    public function test_anggota_simpan_transaksi_with_tarik_tunai_and_auto_purchase_deduction()
    {
        [$userAnggota, $token] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Checkout Belanja Tarik',
            'saldo' => 50000,
            'shu' => 200000,
            'hutang' => 0,
            'persetujuan_shu_master_at' => now(),
        ]);

        $b1 = Barang::first();
        $b1->update(['stok' => 20, 'harga_modal' => 20000, 'harga_jual' => 30000]);

        // Anggota buys 1 item (Rp 30.000) and requests Rp 60.000 cash out from SHU (<= 2x 30k)
        $res = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/anggota/transaksi', [
                'metode_pembayaran' => 'cash',
                'items' => [
                    ['barang_id' => $b1->barang_id, 'jumlah' => 1, 'harga_satuan' => 30000]
                ],
                'sertakan_tarik_tunai' => true,
                'tarik_tunai_nominal' => 60000,
                'tarik_tunai_sumber' => 'shu',
            ]);

        $res->assertStatus(200);
        $res->assertJsonPath('tarik_tunai.nominal_tarik', 60000);
        $res->assertJsonPath('tarik_tunai.potong_belanja', 30000);
        $res->assertJsonPath('tarik_tunai.uang_bersih_diserahkan', 30000); // 60k - 30k = 30k

        $anggota->refresh();
        $this->assertEquals(140000, $anggota->shu); // 200k - 60k = 140k
    }

    public function test_tolak_pesanan_anggota_refunds_tarik_tunai_and_stock()
    {
        [$kasir, $kasirToken] = $this->authenticateAs('kasir');
        [$userAnggota, $token] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Reject Test',
            'saldo' => 50000,
            'shu' => 200000,
            'hutang' => 0,
            'persetujuan_shu_master_at' => now(),
        ]);

        $b1 = Barang::first();
        $b1->update(['stok' => 20, 'harga_modal' => 20000, 'harga_jual' => 30000]);

        // Anggota creates order with Tarik Tunai
        $res = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/anggota/transaksi', [
                'metode_pembayaran' => 'cash',
                'items' => [
                    ['barang_id' => $b1->barang_id, 'jumlah' => 2, 'harga_satuan' => 30000]
                ],
                'sertakan_tarik_tunai' => true,
                'tarik_tunai_nominal' => 80000,
                'tarik_tunai_sumber' => 'shu',
            ]);

        $res->assertStatus(200);
        $trxId = $res->json('transaksi_id');
        $this->assertNotNull($trxId);

        // Stock decreased and SHU decreased
        $b1->refresh();
        $this->assertEquals(18, $b1->stok);
        $anggota->refresh();
        $this->assertEquals(120000, $anggota->shu); // 200k - 80k = 120k

        // Kasir rejects the order
        $rejectRes = $this->actingAs($kasir, 'sanctum')
            ->postJson('/laravel/api/kasir/tolak-pesanan-anggota', [
                'transaksi_id' => $trxId
            ]);

        $rejectRes->assertStatus(200);

        // Verify FULL REFUND & STOCK RESTORATION
        $b1->refresh();
        $this->assertEquals(20, $b1->stok); // Restored from 18 back to 20

        $anggota->refresh();
        $this->assertEquals(200000, $anggota->shu); // Restored from 120k back to 200k!

        $tarik = TarikTunai::where('transaksi_id', $trxId)->first();
        $this->assertEquals('rejected', $tarik->status);
    }

    public function test_failed_automated_verification_records_rejected_tarik_tunai_with_reason()
    {
        [$userAnggota, $token] = $this->authenticateAs('anggota');

        $anggota = Anggota::create([
            'user_id' => $userAnggota->user_id,
            'nama_lengkap' => 'Anggota Auto Reject Test',
            'saldo' => 50000,
            'shu' => 200000,
            'hutang' => 45000, // Has debt!
            'persetujuan_shu_master_at' => now(),
        ]);

        // Member attempts to withdraw despite having debt
        $res = $this->actingAs($userAnggota, 'sanctum')
            ->postJson('/laravel/api/anggota/ajukan-tarik-tunai', [
                'nominal' => 50000,
                'sumber_dana' => 'shu',
            ]);

        $res->assertStatus(400);

        // Verify that the failed attempt was logged in database with status 'rejected' and automated reason!
        $rejectedLog = TarikTunai::where('anggota_id', $anggota->anggota_id)
            ->where('status', 'rejected')
            ->latest('tarik_id')
            ->first();

        $this->assertNotNull($rejectedLog);
        $this->assertEquals(50000, $rejectedLog->nominal);
        $this->assertStringContainsString('hutang', $rejectedLog->alasan_tolak);

        // Verify that the member's history endpoint returns this rejected log with reason
        $histRes = $this->actingAs($userAnggota, 'sanctum')
            ->getJson('/laravel/api/anggota/riwayat-tarik-tunai');

        $histRes->assertStatus(200);
        $this->assertEquals('rejected', $histRes->json('data.0.status'));
        $this->assertStringContainsString('hutang', $histRes->json('data.0.alasan_tolak'));
    }
}
