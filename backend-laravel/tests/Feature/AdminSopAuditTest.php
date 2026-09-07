<?php

namespace Tests\Feature;

use App\Models\Anggota;
use App\Models\Barang;
use App\Models\RiwayatRestock;
use App\Models\SerahTerimaKasir;
use App\Models\SetoranKasir;
use App\Models\Transaksi;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class AdminSopAuditTest extends TestCase
{
    use DatabaseTransactions;

    private $admin;

    private $adminToken;

    private $kasir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::where('role', 'admin')->firstOrFail();
        $this->adminToken = $this->admin->createToken('admin_audit_token')->plainTextToken;
        $this->kasir = User::where('role', 'kasir')->firstOrFail();
    }

    private function authGet($uri, $params = [])
    {
        return $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson($uri.($params ? '?'.http_build_query($params) : ''));
    }

    private function authPost($uri, $data = [])
    {
        return $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson($uri, $data);
    }

    /** @test */
    public function audit_01_dashboard_stats()
    {
        $res = $this->authGet('/laravel/api/admin/dashboard-stats');

        $res->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'total_anggota',
                'total_transaksi_hari_ini',
                'total_pendapatan_hari_ini',
                'total_keuntungan_hari_ini',
                'total_hutang_beredar',
                'total_saldo_anggota',
                'total_shu_tersedia',
                'total_shu_pengurus',
                'total_shu_koperasi',
                'total_aset_barang',
            ]);

        $this->assertTrue($res->json('success'));
        $this->assertGreaterThanOrEqual(1, $res->json('total_anggota'));
    }

    /** @test */
    public function audit_02_master_barang_crud()
    {
        // 1. Get Barang
        $resGet = $this->authGet('/laravel/api/admin/barang');
        $resGet->assertStatus(200)->assertJson(['success' => true]);
        $this->assertIsArray($resGet->json('data'));

        // 2. Tambah Barang
        $resAdd = $this->authPost('/laravel/api/admin/tambah-barang', [
            'nama_barang' => 'Test Barang SOP Audit',
            'stok' => 50,
            'harga_modal' => 10000,
            'harga_jual' => 13000,
        ]);
        $resAdd->assertStatus(200)->assertJson(['success' => true]);

        $created = Barang::where('nama_barang', 'Test Barang SOP Audit')->firstOrFail();
        $this->assertEquals(50, $created->stok);

        // 3. Update Barang
        $resUpdate = $this->authPost('/laravel/api/admin/update-barang', [
            'barang_id' => $created->barang_id,
            'nama_barang' => 'Test Barang SOP Audit Updated',
            'stok' => 60,
            'harga_modal' => 11000,
            'harga_jual' => 14000,
        ]);
        $resUpdate->assertStatus(200)->assertJson(['success' => true]);

        // 4. Hapus Barang
        $resDel = $this->authPost('/laravel/api/admin/hapus-barang', [
            'barang_id' => $created->barang_id,
        ]);
        $resDel->assertStatus(200)->assertJson(['success' => true]);
        $this->assertNull(Barang::find($created->barang_id));
    }

    /** @test */
    public function audit_03_restock_barang_and_riwayat()
    {
        $barang = Barang::firstOrFail();
        $initialStock = $barang->stok;

        $resRestock = $this->authPost('/laravel/api/admin/restock-barang', [
            'barang_id' => $barang->barang_id,
            'jumlah_tambah' => 20,
            'harga_beli_satuan' => 15000,
            'sumber_dana' => 'kas_koperasi',
            'catatan' => 'Restock pengadaan mingguan',
        ]);

        $resRestock->assertStatus(200)->assertJson(['success' => true]);

        $barang->refresh();
        $this->assertEquals($initialStock + 20, $barang->stok);
        $this->assertEquals(15000, $barang->harga_modal);

        // Check Riwayat Restock
        $resHistory = $this->authGet('/laravel/api/admin/riwayat-restock');
        $resHistory->assertStatus(200)->assertJson(['success' => true]);
        $this->assertGreaterThanOrEqual(1, count($resHistory->json('data')));
        $this->assertGreaterThanOrEqual(300000, $resHistory->json('total_pengeluaran'));
    }

    /** @test */
    public function audit_04_opname_massal()
    {
        $b1 = Barang::firstOrFail();
        $b2 = Barang::skip(1)->firstOrFail();

        $resOpname = $this->authPost('/laravel/api/admin/opname', [
            'adjustments' => [
                ['barang_id' => $b1->barang_id, 'stok_akhir' => 99],
                ['barang_id' => $b2->barang_id, 'stok_akhir' => 88],
            ],
        ]);

        $resOpname->assertStatus(200)->assertJson(['success' => true]);

        $b1->refresh();
        $b2->refresh();
        $this->assertEquals(99, $b1->stok_toko);
        $this->assertEquals(88, $b2->stok_toko);
        $this->assertEquals(99 + $b1->stok_gudang, $b1->stok);
        $this->assertEquals(88 + $b2->stok_gudang, $b2->stok);
    }

    /** @test */
    public function audit_05_pkm_analysis_and_auto_calculate()
    {
        // 1. Get PKM Analysis
        $resAnalysis = $this->authGet('/laravel/api/admin/pkm-analysis', ['days' => 30, 'lead_time_days' => 4]);
        $resAnalysis->assertStatus(200)->assertJson(['success' => true]);
        $this->assertArrayHasKey('summary', $resAnalysis->json());
        $this->assertEquals(4, $resAnalysis->json('summary.lead_time_days'));

        // 2. Update PKM Individual
        $b = Barang::firstOrFail();
        $resUpdate = $this->authPost('/laravel/api/admin/update-pkm', [
            'barang_id' => $b->barang_id,
            'pkm' => 15,
        ]);
        $resUpdate->assertStatus(200)->assertJson(['success' => true]);
        $b->refresh();
        $this->assertEquals(15, $b->pkm);

        // 3. Auto Calculate PKM Massal
        $resAuto = $this->authPost('/laravel/api/admin/auto-calculate-pkm', [
            'days' => 30,
            'lead_time_days' => 4,
        ]);
        $resAuto->assertStatus(200)->assertJson(['success' => true]);
    }

    /** @test */
    public function audit_06_anggota_and_user_management_with_last_admin_lock()
    {
        // 1. Get Anggota
        $resAnggota = $this->authGet('/laravel/api/admin/anggota');
        $resAnggota->assertStatus(200)->assertJson(['success' => true]);

        // 2. Tambah User Staf
        $testUsername = 'user_audit_'.time();
        $resAdd = $this->authPost('/laravel/api/admin/tambah-user', [
            'username' => $testUsername,
            'password' => 'password123',
            'role' => 'kasir',
            'nama_lengkap' => 'Staff Audit POS',
        ]);
        $resAdd->assertStatus(200)->assertJson(['success' => true]);

        $createdUser = User::where('username', $testUsername)->firstOrFail();
        $this->assertEquals('kasir', $createdUser->role);
        $this->assertNotNull($createdUser->anggota);

        // 3. Update User
        $resUpdate = $this->authPost('/laravel/api/admin/update-user', [
            'user_id' => $createdUser->user_id,
            'username' => $testUsername.'_edit',
            'role' => 'pengurus',
            'nama_lengkap' => 'Staff Pengurus Audit',
        ]);
        $resUpdate->assertStatus(200)->assertJson(['success' => true]);

        // 4. Hapus User
        $resDel = $this->authPost('/laravel/api/admin/hapus-user', [
            'user_id' => $createdUser->user_id,
        ]);
        $resDel->assertStatus(200)->assertJson(['success' => true]);

        // 5. Test Safety Lock: Cannot delete last admin
        // Ensure only 1 active admin
        $adminUsers = User::where('role', 'admin')->get();
        if ($adminUsers->count() === 1) {
            $resDelAdmin = $this->authPost('/laravel/api/admin/hapus-user', [
                'user_id' => $this->admin->user_id,
            ]);
            $resDelAdmin->assertStatus(422)->assertJson(['success' => false]);
        }
    }

    /** @test */
    public function audit_07_jabatan_and_mandat_governance()
    {
        // 1. Get Daftar Jabatan
        $resGet = $this->authGet('/laravel/api/admin/jabatan');
        $resGet->assertStatus(200)->assertJson(['success' => true]);
        $this->assertArrayHasKey('summary', $resGet->json());

        // 2. Assign Mandat to a regular member
        $anggotaUser = User::where('role', 'anggota')->firstOrFail();
        $resAssign = $this->authPost('/laravel/api/admin/jabatan/assign', [
            'user_id' => $anggotaUser->user_id,
            'role' => 'kasir',
            'catatan' => 'Penugasan kasir bantuan',
        ]);
        $resAssign->assertStatus(200)->assertJson(['success' => true]);

        $jabatanId = $resAssign->json('data.jabatan_id');

        // 3. Revoke Mandat
        $resRevoke = $this->authPost('/laravel/api/admin/jabatan/revoke', [
            'jabatan_id' => $jabatanId,
            'alasan' => 'Masa tugas kasir bantuan berakhir',
        ]);
        $resRevoke->assertStatus(200)->assertJson(['success' => true]);
    }

    /** @test */
    public function audit_08_setoran_kasir_and_approval()
    {
        // 1. Create a pending setoran kasir
        $setoran = SetoranKasir::create([
            'kasir_id' => $this->kasir->user_id,
            'nominal' => 250000,
            'status' => 'pending',
        ]);

        // 2. Get Setoran Kasir
        $resGet = $this->authGet('/laravel/api/admin/setoran-kasir');
        $resGet->assertStatus(200)->assertJson(['success' => true]);

        // 3. Approve Setoran
        $resApprove = $this->authPost('/laravel/api/admin/approve-setoran-kasir', [
            'setoran_id' => $setoran->setoran_id,
        ]);
        $resApprove->assertStatus(200)->assertJson(['success' => true]);

        $setoran->refresh();
        $this->assertEquals('approved', $setoran->status);
    }

    /** @test */
    public function audit_09_shu_management_distribution_and_conversions()
    {
        $anggota = Anggota::firstOrFail();
        $initialShu = (float) $anggota->shu;

        // 1. Topup SHU
        $resTopup = $this->authPost('/laravel/api/admin/topup-shu', [
            'nama_anggota' => $anggota->user->username,
            'nominal' => 50000,
        ]);
        $resTopup->assertStatus(200)->assertJson(['success' => true]);
        $anggota->refresh();
        $this->assertEquals($initialShu + 50000, $anggota->shu);

        // 2. Get SHU Management
        $resMgmt = $this->authGet('/laravel/api/admin/shu-management');
        $resMgmt->assertStatus(200)->assertJson(['success' => true]);

        // 3. Konversi Mode: ke_saldo_belanja (Closed-loop e-wallet)
        $initialSaldo = (float) $anggota->saldo;
        $resKonversi1 = $this->authPost('/laravel/api/admin/konversi-shu', [
            'mode' => 'ke_saldo_belanja',
            'anggota_id' => $anggota->anggota_id,
            'nominal' => 20000,
            'keterangan' => 'Konversi e-wallet belanja toko',
        ]);
        $resKonversi1->assertStatus(200)->assertJson(['success' => true]);
        $anggota->refresh();
        $this->assertEquals($initialSaldo + 20000, $anggota->saldo);

        // 4. Konversi Mode: pelunasan_hutang
        $anggota->hutang = 15000;
        $anggota->save();
        $resKonversi2 = $this->authPost('/laravel/api/admin/konversi-shu', [
            'mode' => 'pelunasan_hutang',
            'anggota_id' => $anggota->anggota_id,
            'nominal' => 15000,
            'keterangan' => 'Auto-offset hutang dari SHU',
        ]);
        $resKonversi2->assertStatus(200)->assertJson(['success' => true]);
        $anggota->refresh();
        $this->assertEquals(0, $anggota->hutang);

        // 5. Get SHU Distribusi Ledger (60/10/30)
        $resDistribusi = $this->authGet('/laravel/api/admin/shu-distribusi');
        $resDistribusi->assertStatus(200)->assertJson(['success' => true]);
        $this->assertArrayHasKey('summary', $resDistribusi->json());
    }

    /** @test */
    public function audit_10_laporan_transaksi_and_tarik_tunai()
    {
        // 1. Laporan Transaksi
        $resTrx = $this->authPost('/laravel/api/admin/laporan-transaksi', [
            'tanggal_awal' => Carbon::today()->subDays(7)->toDateString(),
            'tanggal_akhir' => Carbon::today()->toDateString(),
        ]);
        $resTrx->assertStatus(200)->assertJson(['success' => true]);
        $this->assertArrayHasKey('breakdown_pembayaran', $resTrx->json());

        // 2. Laporan Tarik Tunai
        $resTarik = $this->authGet('/laravel/api/admin/laporan-tarik-tunai');
        $resTarik->assertStatus(200)->assertJson(['success' => true]);
        $this->assertArrayHasKey('summary', $resTarik->json());
    }

    /** @test */
    public function audit_11_laporan_selisih_kasir_and_data_kasir()
    {
        // 1. Create a serah terima with variance to test calculation
        $sender = $this->kasir;
        $receiver = User::where('role', 'kasir')->where('user_id', '!=', $this->kasir->user_id)->first() ?: $this->admin;

        SerahTerimaKasir::create([
            'kasir_from' => $sender->user_id,
            'kasir_to' => $receiver->user_id,
            'status' => 'approved',
            'hasil_opname' => [
                'uang_fisik' => 480000,
                'saldo_kas_sistem' => 500000,
                'selisih_kas' => -20000,
                'summary' => [
                    'barangCocok' => 10,
                    'barangSelisih' => 1,
                    'totalMinusNominal' => 25000,
                ],
                'items' => [
                    [
                        'nama_barang' => 'Djarum Super 12',
                        'selisih' => -1,
                        'harga_jual' => 25000,
                        'selisih_nominal' => -25000,
                    ],
                ],
                'catatan' => 'Minus 1 rokok dan kurang kas 20rb',
            ],
        ]);

        // 2. Test getLaporanSelisihKasir
        $resSelisih = $this->authGet('/laravel/api/admin/laporan-selisih-kasir');
        $resSelisih->assertStatus(200)->assertJson(['success' => true]);

        $rekap = $resSelisih->json('data.rekap_per_kasir');
        $this->assertIsArray($rekap);
        $this->assertNotEmpty($rekap);

        $riwayat = $resSelisih->json('data.riwayat_selisih');
        $this->assertIsArray($riwayat);
        $this->assertNotEmpty($riwayat);

        // Verify calculation: Minus barang 25k + Minus kas 20k = 45k total loss
        $foundLog = collect($riwayat)->firstWhere('total_kerugian_shift', 45000);
        $this->assertNotNull($foundLog);
        $this->assertEquals(-20000, $foundLog['selisih_kas']);
        $this->assertEquals(25000, $foundLog['total_minus_barang_nominal']);

        // 3. Test getDataKasir
        $resKasir = $this->authGet('/laravel/api/admin/data-kasir');
        $resKasir->assertStatus(200)->assertJson(['success' => true]);
        $this->assertIsArray($resKasir->json('data'));
    }

    /** @test */
    public function audit_12_two_tier_inventory_mutation_and_auto_refill()
    {
        // 1. Create a product with 2-Tier stock allocation
        $barang = Barang::create([
            'nama_barang' => 'Minyak Goreng Sania 2L',
            'stok' => 20,
            'stok_toko' => 4,
            'stok_gudang' => 16,
            'pkm' => 6,
            'harga_modal' => 30000,
            'harga_jual' => 35000,
        ]);

        $this->assertEquals(20, $barang->stok);
        $this->assertEquals(4, $barang->stok_toko);
        $this->assertEquals(16, $barang->stok_gudang);

        // 2. Test Mutasi Stok: Gudang -> Toko (Refill 2 pcs)
        $resMutasi = $this->authPost('/laravel/api/admin/mutasi-stok', [
            'barang_id' => $barang->barang_id,
            'tipe' => 'gudang_ke_toko',
            'jumlah' => 2,
            'catatan' => 'Refill etalase minyak',
        ]);
        $resMutasi->assertStatus(200)->assertJson(['success' => true]);

        $barang->refresh();
        $this->assertEquals(6, $barang->stok_toko); // 4 + 2
        $this->assertEquals(14, $barang->stok_gudang); // 16 - 2
        $this->assertEquals(20, $barang->stok);

        // 3. Test Mutasi Stok: Toko -> Gudang (Return 1 pcs)
        $resReturn = $this->authPost('/laravel/api/admin/mutasi-stok', [
            'barang_id' => $barang->barang_id,
            'tipe' => 'toko_ke_gudang',
            'jumlah' => 1,
            'catatan' => 'Kembalikan ke kardus',
        ]);
        $resReturn->assertStatus(200)->assertJson(['success' => true]);

        $barang->refresh();
        $this->assertEquals(5, $barang->stok_toko); // 6 - 1
        $this->assertEquals(15, $barang->stok_gudang); // 14 + 1
        $this->assertEquals(20, $barang->stok);

        // 4. Test Auto-Refill Display Toko
        $resAuto = $this->authPost('/laravel/api/admin/auto-refill-display', []);
        $resAuto->assertStatus(200)->assertJson(['success' => true]);

        $barang->refresh();
        // Because PKM is 6 and current toko is 5, auto-refill should transfer 1 pc
        $this->assertEquals(6, $barang->stok_toko);
        $this->assertEquals(14, $barang->stok_gudang);

        // 5. Test Restock with 2-Tier allocation modes ('gudang', 'toko', 'auto')
        $resRestock = $this->authPost('/laravel/api/admin/restock-barang', [
            'barang_id' => $barang->barang_id,
            'jumlah_tambah' => 10,
            'harga_beli_satuan' => 31000,
            'sumber_dana' => 'kas_koperasi',
            'alokasi' => 'gudang',
            'catatan' => 'Kulakan kartonan supplier',
        ]);
        $resRestock->assertStatus(200)->assertJson(['success' => true]);

        $barang->refresh();
        $this->assertEquals(6, $barang->stok_toko);
        $this->assertEquals(24, $barang->stok_gudang); // 14 + 10
        $this->assertEquals(30, $barang->stok);
    }

    /** @test */
    public function audit_13_expiry_tracking_and_write_off()
    {
        // 1. Create an item with expired date on display toko
        $yesterday = Carbon::yesterday()->toDateString();
        $in15Days = Carbon::today()->addDays(15)->toDateString();

        $barang = Barang::create([
            'nama_barang' => 'Roti Tawar Manis Expired',
            'stok' => 10,
            'stok_toko' => 4,
            'stok_gudang' => 6,
            'tgl_kadaluarsa_toko' => $yesterday,
            'tgl_kadaluarsa_gudang' => $in15Days,
            'pkm' => 4,
            'harga_modal' => 10000,
            'harga_jual' => 12000,
        ]);

        $this->assertEquals('expired', $barang->status_kadaluarsa_toko);
        $this->assertEquals('near_expiry', $barang->status_kadaluarsa_gudang);

        // 2. Check Dashboard Stats reflects expired and near-expiry count
        $resDash = $this->authGet('/laravel/api/admin/dashboard-stats');
        $resDash->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, $resDash->json('expired_count'));
        $this->assertGreaterThanOrEqual(1, $resDash->json('near_expiry_count'));

        // 3. Test Write-Off Expired from Toko
        $resWriteOff = $this->authPost('/laravel/api/admin/write-off-expired', [
            'barang_id' => $barang->barang_id,
            'lokasi' => 'toko',
            'jumlah' => 4,
            'alasan' => 'Pemusnahan roti jamuran lewat tanggal',
        ]);
        $resWriteOff->assertStatus(200)->assertJson(['success' => true]);

        $barang->refresh();
        $this->assertEquals(0, $barang->stok_toko);
        $this->assertEquals(6, $barang->stok_gudang);
        $this->assertEquals(6, $barang->stok);
    }

    /** @test */
    public function audit_14_bulk_restock_inbound_faktur()
    {
        $b1 = Barang::create([
            'nama_barang' => 'Indomie Goreng Spesial PO',
            'stok' => 5,
            'stok_toko' => 2,
            'stok_gudang' => 3,
            'pkm' => 4,
            'harga_modal' => 2800,
            'harga_jual' => 3500,
        ]);

        $b2 = Barang::create([
            'nama_barang' => 'Teh Kotak Sosro PO',
            'stok' => 10,
            'stok_toko' => 4,
            'stok_gudang' => 6,
            'pkm' => 6,
            'harga_modal' => 4000,
            'harga_jual' => 5000,
        ]);

        $in6Months = Carbon::today()->addMonths(6)->toDateString();

        $payload = [
            'nomor_faktur' => 'FAK-TEST-9988',
            'nama_supplier' => 'PT Indomarco Batam',
            'sumber_dana' => 'kas_koperasi',
            'catatan' => 'Kulakan restock bulk faktur',
            'items' => [
                [
                    'barang_id' => $b1->barang_id,
                    'jumlah_tambah' => 40,
                    'harga_beli_satuan' => 2900,
                    'alokasi' => 'gudang',
                    'tanggal_kadaluarsa' => $in6Months,
                ],
                [
                    'barang_id' => $b2->barang_id,
                    'jumlah_tambah' => 24,
                    'harga_beli_satuan' => 4100,
                    'alokasi' => 'auto',
                    'tanggal_kadaluarsa' => $in6Months,
                ],
            ],
        ];

        $res = $this->authPost('/laravel/api/admin/bulk-restock', $payload);
        $res->assertStatus(200)
            ->assertJson(['success' => true]);

        $b1->refresh();
        $this->assertEquals(2, $b1->stok_toko);
        $this->assertEquals(43, $b1->stok_gudang); // 3 + 40
        $this->assertEquals(45, $b1->stok);
        $this->assertEquals(2900, $b1->harga_modal);
        $this->assertEquals($in6Months, $b1->tgl_kadaluarsa_gudang->toDateString());

        $b2->refresh();
        // PKM = 6, stok_toko was 4 -> needed 2 -> auto fills 2 to toko, 22 to gudang
        $this->assertEquals(6, $b2->stok_toko); // 4 + 2
        $this->assertEquals(28, $b2->stok_gudang); // 6 + 22
        $this->assertEquals(34, $b2->stok);
        $this->assertEquals(4100, $b2->harga_modal);

        // Verify RiwayatRestock created
        $this->assertDatabaseHas('riwayat_restock', [
            'barang_id' => $b1->barang_id,
            'jumlah_tambah' => 40,
            'harga_beli_satuan' => 2900,
        ]);
        $this->assertDatabaseHas('riwayat_restock', [
            'barang_id' => $b2->barang_id,
            'jumlah_tambah' => 24,
            'harga_beli_satuan' => 4100,
        ]);
    }
}
