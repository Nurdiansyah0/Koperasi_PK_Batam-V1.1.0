<?php

namespace Tests\Feature;

use App\Models\Anggota;
use App\Models\Barang;
use App\Models\PembayaranHutang;
use App\Models\SerahTerimaKasir;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class KasirSopAuditTest extends TestCase
{
    use DatabaseTransactions;

    protected $kasir;

    protected $kasir2;

    protected $token;

    protected $anggota;

    protected $barang;

    protected function setUp(): void
    {
        parent::setUp();
        $this->kasir = User::where('role', 'kasir')->firstOrFail();
        $this->token = $this->kasir->createToken('kasir_sop_test')->plainTextToken;

        $this->kasir2 = User::where('role', 'kasir')->where('user_id', '!=', $this->kasir->user_id)->firstOrFail();

        $this->anggota = Anggota::firstOrFail();
        $this->barang = Barang::where('stok', '>=', 10)->firstOrFail();
    }

    /* -------------------------------------------------------------------------- */
    /* 1. DASHBOARD & TRANSAKSI TERBARU (SOP 1 & 2) */
    /* -------------------------------------------------------------------------- */

    public function test_get_dashboard_success()
    {
        $res = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/dashboard');

        $res->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_pendapatan_hari_ini',
                    'total_transaksi_hari_ini',
                    'saldo_kas',
                    'pending_serah_terima',
                    'pending_pesanan',
                    'pending_hutang',
                    'transaksi_terbaru',
                ],
            ]);
    }

    public function test_get_transaksi_terbaru_success()
    {
        $res = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/transaksi-terbaru');

        $res->assertStatus(200)->assertJson(['success' => true]);
    }

    public function test_get_barang_belanja_and_paket_belanja_success()
    {
        $res1 = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/barang-belanja');
        $res1->assertStatus(200)->assertJson(['success' => true]);

        $res2 = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/paket-belanja');
        $res2->assertStatus(200);
    }

    /* -------------------------------------------------------------------------- */
    /* 2. TRANSAKSI POS & CREDIT ALLOWANCE (SOP 6.F) */
    /* -------------------------------------------------------------------------- */

    public function test_buat_transaksi_kasir_cash_success()
    {
        $initialStock = $this->barang->stok;

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $this->barang->barang_id,
                    'jumlah' => 2,
                    'harga_satuan' => $this->barang->harga_jual,
                ],
            ],
        ];

        $res = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $res->assertStatus(200)->assertJson(['success' => true]);

        $this->barang->refresh();
        $this->assertEquals($initialStock - 2, $this->barang->stok);
    }

    public function test_buat_transaksi_kasir_hutang_within_limit_success()
    {
        $this->anggota->hutang = 0;
        $this->anggota->save();

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'hutang',
            'items' => [
                [
                    'barang_id' => $this->barang->barang_id,
                    'jumlah' => 1,
                    'harga_satuan' => $this->barang->harga_jual,
                ],
            ],
        ];

        $res = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $res->assertStatus(200)->assertJson(['success' => true]);

        $this->anggota->refresh();
        $this->assertEquals($this->barang->harga_jual, $this->anggota->hutang);
    }

    public function test_buat_transaksi_kasir_hutang_exceeding_limit_fails()
    {
        // SOP 6.F.2: Plafon limit = 400.000
        $this->anggota->hutang = 395000;
        $this->anggota->save();

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'hutang',
            'items' => [
                [
                    'barang_id' => $this->barang->barang_id,
                    'jumlah' => 10,
                    'harga_satuan' => 50000, // Total 500.000 exceeds limit
                ],
            ],
        ];

        $res = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $res->assertStatus(400)
            ->assertJson(['success' => false]);
    }

    public function test_buat_transaksi_kasir_insufficient_stock_fails()
    {
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $this->barang->barang_id,
                    'jumlah' => 99999, // Impossible stock
                    'harga_satuan' => $this->barang->harga_jual,
                ],
            ],
        ];

        $res = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $res->assertStatus(400);
    }

    /* -------------------------------------------------------------------------- */
    /* 3. PESANAN ANGGOTA & TOLAK DENGAN REFUND (SOP 6.E.2) */
    /* -------------------------------------------------------------------------- */

    public function test_pesanan_anggota_listing_and_tolak_refund_stock_and_limit()
    {
        $initialStock = $this->barang->stok;
        $this->barang->stok = $initialStock - 2;
        $this->barang->save();

        $this->anggota->hutang = 100000;
        $this->anggota->save();

        $trx = Transaksi::create([
            'anggota_id' => $this->anggota->anggota_id,
            'total_harga' => 50000,
            'total_keuntungan' => 10000,
            'metode_pembayaran' => 'hutang',
            'status' => 'pending',
        ]);
        TransaksiDetail::create([
            'transaksi_id' => $trx->transaksi_id,
            'barang_id' => $this->barang->barang_id,
            'jumlah' => 2,
            'harga_satuan' => 25000,
            'subtotal' => 50000,
            'keuntungan' => 10000,
        ]);

        $resList = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/pesanan-anggota');
        $resList->assertStatus(200);

        // Reject order
        $resReject = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/tolak-pesanan-anggota', [
                'transaksi_ids' => [$trx->transaksi_id],
            ]);
        $resReject->assertStatus(200)->assertJson(['success' => true]);

        $this->barang->refresh();
        $this->assertEquals($initialStock, $this->barang->stok);

        $this->anggota->refresh();
        $this->assertEquals(50000, $this->anggota->hutang);
    }

    /* -------------------------------------------------------------------------- */
    /* 4. ANGGOTA & PEMBAYARAN HUTANG (SOP 6.A & 6.F) */
    /* -------------------------------------------------------------------------- */

    public function test_all_anggota_and_cari_profil_anggota()
    {
        $res1 = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/all-anggota');
        $res1->assertStatus(200)->assertJson(['success' => true]);

        $res2 = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson("/laravel/api/kasir/cari-profil-anggota?anggota_id={$this->anggota->anggota_id}");
        $res2->assertStatus(200)->assertJson(['success' => true]);

        $res3 = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/cari-profil-anggota?anggota_id=999999');
        $res3->assertStatus(404);
    }

    public function test_approve_and_reject_pembayaran_hutang()
    {
        $this->anggota->hutang = 100000;
        $this->anggota->save();

        $ph = PembayaranHutang::create([
            'anggota_id' => $this->anggota->anggota_id,
            'kasir_id' => $this->kasir->user_id,
            'nominal' => 50000,
            'metode_pembayaran' => 'cash',
            'status' => 'pending',
        ]);

        // 1. Invalid payload
        $resInvalid = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/approve-pembayaran-hutang', []);
        $resInvalid->assertStatus(422);

        // 2. Approve
        $resApprove = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/approve-pembayaran-hutang', [
                'pembayaran_id' => $ph->pembayaran_id,
                'action' => 'approve',
            ]);
        $resApprove->assertStatus(200)->assertJson(['success' => true]);

        $this->anggota->refresh();
        $this->assertEquals(50000, $this->anggota->hutang);
    }

    /* -------------------------------------------------------------------------- */
    /* 5. TARIK TUNAI SHU (SOP 6.A, 6.B, 6.D) */
    /* -------------------------------------------------------------------------- */

    public function test_cek_kelayakan_tarik_tunai_and_antrean()
    {
        $resCheck = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson("/laravel/api/kasir/cek-kelayakan-tarik-tunai/{$this->anggota->anggota_id}");
        $resCheck->assertStatus(200)->assertJson(['success' => true]);

        $resQueue = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/antrean-tarik-tunai');
        $resQueue->assertStatus(200)->assertJson(['success' => true]);

        $resHistory = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/riwayat-tarik-tunai');
        $resHistory->assertStatus(200)->assertJson(['success' => true]);
    }

    public function test_tarik_tunai_fails_if_anggota_has_outstanding_debt()
    {
        // SOP 6.A.1: Hutang > 0 is strictly forbidden
        $this->anggota->hutang = 50000;
        $this->anggota->shu = 200000;
        $this->anggota->persetujuan_shu_master_at = Carbon::now();
        $this->anggota->save();

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'nominal' => 50000,
            'sumber_dana' => 'shu',
            'persetujuan_shu' => true,
        ];

        $res = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/tarik-tunai', $payload);

        $res->assertStatus(400)
            ->assertJson(['success' => false]);
    }

    public function test_tarik_tunai_success_with_qualifying_purchase_and_master_consent()
    {
        // SOP 6.A.2: Qualifying purchase >= 25k on same day
        $this->anggota->hutang = 0;
        $this->anggota->shu = 200000;
        $this->anggota->persetujuan_shu_master_at = Carbon::now();
        $this->anggota->save();

        // Create qualifying purchase
        Transaksi::create([
            'anggota_id' => $this->anggota->anggota_id,
            'kasir_id' => $this->kasir->user_id,
            'total_harga' => 30000,
            'total_keuntungan' => 5000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
            'created_at' => Carbon::now(),
        ]);

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'nominal' => 50000,
            'sumber_dana' => 'shu',
            'persetujuan_shu' => true,
        ];

        $res = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/tarik-tunai', $payload);

        $res->assertStatus(200)->assertJson(['success' => true]);

        $this->anggota->refresh();
        $this->assertEquals(150000, $this->anggota->shu);
    }

    /* -------------------------------------------------------------------------- */
    /* 6. SERAH TERIMA SHIFT KASIR (SOP 3 & 5) */
    /* -------------------------------------------------------------------------- */

    public function test_serah_terima_draft_and_daftar_kasir()
    {
        $res1 = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/daftar-kasir');
        $res1->assertStatus(200)->assertJson(['success' => true]);

        $res2 = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/serah-terima-draft');
        $res2->assertStatus(200)->assertJson(['success' => true]);

        $res3 = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/active-shift-info');
        $res3->assertStatus(200)->assertJson(['success' => true]);
    }

    public function test_serah_terima_self_handover_blocked()
    {
        // SOP 7.DONTS.1: Self-handover is blocked
        $payload = [
            'kasir_to' => $this->kasir->user_id,
            'uang_fisik' => 500000,
            'items' => [],
        ];

        $res = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/create-serah-terima', $payload);

        $res->assertStatus(400)->assertJson(['success' => false]);
    }

    public function test_serah_terima_flow_create_and_approve_syncs_inventory()
    {
        $initialStock = $this->barang->stok;

        // 1. Create pending handover from kasir1 to kasir2
        $serah = SerahTerimaKasir::create([
            'kasir_from' => $this->kasir->user_id,
            'kasir_to' => $this->kasir2->user_id,
            'hasil_opname' => [
                'uang_fisik' => 500000,
                'catatan' => 'Shift siang selesai, rokok pas',
                'items' => [
                    [
                        'barang_id' => $this->barang->barang_id,
                        'nama_barang' => $this->barang->nama_barang,
                        'stok_input' => $initialStock + 2, // Surplus 2 pcs
                        'stok_aktual' => $initialStock,
                        'harga_jual' => $this->barang->harga_jual,
                    ],
                ],
            ],
            'status' => 'pending',
            'created_at' => Carbon::now(),
        ]);

        // 2. Kasir 2 approves
        $token2 = $this->kasir2->createToken('kasir2_token')->plainTextToken;
        $resApprove = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson('/laravel/api/kasir/approve-serah-terima', [
                'serah_id' => $serah->serah_id,
            ]);
        $resApprove->assertStatus(200)->assertJson(['success' => true]);

        // Inventory is synced to physical input count (SOP 5.D.1)
        $this->barang->refresh();
        $this->assertEquals($initialStock + 2, $this->barang->stok);
    }

    public function test_serah_terima_flow_reject_requires_reason_and_keeps_stock()
    {
        $initialStock = $this->barang->stok;

        // 1. Create pending handover
        $serah = SerahTerimaKasir::create([
            'kasir_from' => $this->kasir->user_id,
            'kasir_to' => $this->kasir2->user_id,
            'hasil_opname' => [
                'uang_fisik' => 500000,
                'items' => [
                    [
                        'barang_id' => $this->barang->barang_id,
                        'stok_input' => 1,
                        'stok_aktual' => $initialStock,
                        'harga_jual' => $this->barang->harga_jual,
                    ],
                ],
            ],
            'status' => 'pending',
            'created_at' => Carbon::now(),
        ]);

        $token2 = $this->kasir2->createToken('kasir2_token')->plainTextToken;

        // 2. Kasir 2 rejects without reason (fails 422)
        $resRejectFail = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson('/laravel/api/kasir/reject-serah-terima', [
                'serah_id' => $serah->serah_id,
            ]);
        $resRejectFail->assertStatus(422);

        // 3. Kasir 2 rejects with valid reason
        $resRejectOk = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson('/laravel/api/kasir/reject-serah-terima', [
                'serah_id' => $serah->serah_id,
                'alasan_penolakan' => 'Fisik barang di etalase tidak sesuai dengan yang diinput',
            ]);
        $resRejectOk->assertStatus(200)->assertJson(['success' => true]);

        // Stock remains unchanged (SOP 3.4.5)
        $this->barang->refresh();
        $this->assertEquals($initialStock, $this->barang->stok);
    }

    /* -------------------------------------------------------------------------- */
    /* 7. SETORAN ADMIN & HISTORY TRANSAKSI (SOP 5.B) */
    /* -------------------------------------------------------------------------- */

    public function test_setor_admin_and_get_riwayat_setoran()
    {
        // 1. Invalid nominal
        $resFail = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/setor-admin', ['nominal' => 0]);
        $resFail->assertStatus(422);

        // 2. Valid setoran
        $resOk = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/setor-admin', ['nominal' => 250000]);
        $resOk->assertStatus(200)->assertJson(['success' => true]);

        // 3. History
        $resHistory = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/laravel/api/kasir/setoran-history');
        $resHistory->assertStatus(200)->assertJson(['success' => true]);
    }

    public function test_history_transaksi_pagination_and_filters()
    {
        $res = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/laravel/api/kasir/history-transaksi', [
                'status' => 'selesai',
                'jenis_transaksi' => 'cash',
            ]);

        $res->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data' => [
                        '*' => [
                            'transaksi_id',
                            'total_harga',
                            'metode_pembayaran',
                            'status',
                            'details',
                        ],
                    ],
                ],
            ]);
    }
}
