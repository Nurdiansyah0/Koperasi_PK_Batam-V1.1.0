<?php

namespace Tests\Feature;

use App\Models\Anggota;
use App\Models\Barang;
use App\Models\TarikTunai;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PosCheckoutCharacterizationTest extends TestCase
{
    use DatabaseTransactions;

    protected $kasir;

    protected $kasirToken;

    protected $anggotaUser;

    protected $anggota;

    protected function setUp(): void
    {
        parent::setUp();

        $this->kasir = User::where('role', 'kasir')->first();
        if (! $this->kasir) {
            $this->kasir = User::create([
                'username' => 'kasir_pos_char_test',
                'password_hash' => bcrypt('password'),
                'role' => 'kasir',
            ]);
        }
        $this->kasirToken = $this->kasir->createToken('kasir_token')->plainTextToken;

        $this->anggota = Anggota::first();
        if (! $this->anggota) {
            $this->anggotaUser = User::create([
                'username' => 'anggota_pos_char_test',
                'password_hash' => bcrypt('password'),
                'role' => 'anggota',
            ]);
            $this->anggota = Anggota::create([
                'user_id' => $this->anggotaUser->user_id,
                'nama_lengkap' => 'Anggota Test POS',
                'saldo' => 100000,
                'hutang' => 0,
                'shu' => 50000,
            ]);
        }
    }

    public function test_checkout_persists_shu_distribution_when_profit_is_positive(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Profit Test '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'stok_gudang' => 0,
            'harga_modal' => 10000,
            'harga_jual' => 15000,
        ]);

        $this->anggota->shu = 50000;
        $this->anggota->hutang = 0;
        $this->anggota->save();

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 2,
                    'harga_satuan' => 15000,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Transaksi berhasil',
                'total' => 30000,
                'total_keuntungan' => 10000,
            ]);

        $transaksiId = $response->json('transaksi_id');

        // 1. Verify Transaksi Header & Detail
        $this->assertDatabaseHas('transaksi', [
            'transaksi_id' => $transaksiId,
            'anggota_id' => $this->anggota->anggota_id,
            'kasir_id' => $this->kasir->user_id,
            'total_harga' => 30000,
            'total_keuntungan' => 10000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
        ]);

        $this->assertDatabaseHas('transaksi_detail', [
            'transaksi_id' => $transaksiId,
            'barang_id' => $barang->barang_id,
            'jumlah' => 2,
            'harga_satuan' => 15000,
            'subtotal' => 30000,
            'keuntungan' => 10000,
        ]);

        // 2. Verify Member SHU mutation (+60% of totalKeuntungan = +6.000)
        $this->anggota->refresh();
        $this->assertEquals(56000, (float) $this->anggota->shu);

        // 3. Verify shu_distribusi table record inserted
        $this->assertDatabaseHas('shu_distribusi', [
            'anggota_id' => $this->anggota->anggota_id,
            'tahun' => date('Y'),
            'shu_60_percent' => 6000,
            'shu_10_percent' => 1000,
            'shu_30_percent' => 3000,
        ]);
    }

    public function test_checkout_rolls_back_all_mutations_when_later_item_fails(): void
    {
        $b1 = Barang::create([
            'nama_barang' => 'Barang Valid Rollback '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 5000,
            'harga_jual' => 8000,
        ]);

        $b2 = Barang::create([
            'nama_barang' => 'Barang Kurang Stok '.uniqid(),
            'stok' => 1,
            'stok_toko' => 1,
            'harga_modal' => 5000,
            'harga_jual' => 8000,
        ]);

        $initialTxCount = Transaksi::count();
        $initialDetailCount = TransaksiDetail::count();
        $initialShuDistCount = DB::table('shu_distribusi')->count();

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $b1->barang_id,
                    'jumlah' => 3, // Valid (10 >= 3)
                    'harga_satuan' => 8000,
                ],
                [
                    'barang_id' => $b2->barang_id,
                    'jumlah' => 5, // Fails stock check (1 < 5)
                    'harga_satuan' => 8000,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
            ]);
        $this->assertStringContainsString('Stok etalase tidak mencukupi', $response->json('message'));

        // Verify full rollback: b1 stock was restored to 10
        $b1->refresh();
        $this->assertEquals(10, $b1->stok_toko);

        $b2->refresh();
        $this->assertEquals(1, $b2->stok_toko);

        // Verify zero orphaned transaction or detail records
        $this->assertEquals($initialTxCount, Transaksi::count());
        $this->assertEquals($initialDetailCount, TransaksiDetail::count());
        $this->assertEquals($initialShuDistCount, DB::table('shu_distribusi')->count());
    }

    public function test_checkout_uses_client_supplied_harga_satuan(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Price Override '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 10000,
            'harga_jual' => 20000,
        ]);

        // Client supplies arbitrary harga_satuan = 12000 instead of catalog 20000
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 2,
                    'harga_satuan' => 12000,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Remediated Phase 8F behavior: client price is ignored; catalog harga_jual is enforced
        // subtotal = 20000 * 2 = 40000
        // keuntungan = (20000 - 10000) * 2 = 20000
        $this->assertEquals(40000, $response->json('total'));
        $this->assertEquals(20000, $response->json('total_keuntungan'));

        $transaksiId = $response->json('transaksi_id');
        $this->assertDatabaseHas('transaksi_detail', [
            'transaksi_id' => $transaksiId,
            'barang_id' => $barang->barang_id,
            'harga_satuan' => 20000,
            'subtotal' => 40000,
            'keuntungan' => 20000,
        ]);
    }

    public function test_checkout_allows_duplicate_barang_ids_as_current_behavior(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Duplicate Item '.uniqid(),
            'stok' => 15,
            'stok_toko' => 15,
            'harga_modal' => 5000,
            'harga_jual' => 8000,
        ]);

        // Client passes the exact same barang_id in multiple entries
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 2,
                    'harga_satuan' => 8000,
                ],
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 3,
                    'harga_satuan' => 8000,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);
        $transaksiId = $response->json('transaksi_id');

        // Remediated Phase 8F behavior: stock is decremented by consolidated total (15 - 5 = 10)
        $barang->refresh();
        $this->assertEquals(10, $barang->stok_toko);

        // Remediated: Exactly one consolidated detail record exists with total quantity 5
        $detailCount = TransaksiDetail::where('transaksi_id', $transaksiId)
            ->where('barang_id', $barang->barang_id)
            ->count();
        $this->assertEquals(1, $detailCount);

        $this->assertDatabaseHas('transaksi_detail', [
            'transaksi_id' => $transaksiId,
            'barang_id' => $barang->barang_id,
            'jumlah' => 5,
            'harga_satuan' => 8000,
            'subtotal' => 40000,
            'keuntungan' => 15000,
        ]);
    }

    public function test_checkout_with_tarik_tunai_persists_ticket_and_deducts_fund(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Belanja Tarik '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 20000,
            'harga_jual' => 30000,
        ]);

        $this->anggota->shu = 200000;
        $this->anggota->hutang = 0;
        $this->anggota->persetujuan_shu_master_at = now();
        $this->anggota->save();

        // Belanja 30.000, Tarik Tunai 60.000 (qualifying >= 25k, <= 2x belanja)
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 1,
                    'harga_satuan' => 30000,
                ],
            ],
            'sertakan_tarik_tunai' => true,
            'tarik_tunai_nominal' => 60000,
            'tarik_tunai_sumber' => 'shu',
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);
        $transaksiId = $response->json('transaksi_id');

        // 1. Transaction payment method is overridden to 'potong_tarik_tunai'
        $this->assertDatabaseHas('transaksi', [
            'transaksi_id' => $transaksiId,
            'metode_pembayaran' => 'potong_tarik_tunai',
            'status' => 'selesai',
        ]);

        // 2. TarikTunai ticket is completed and linked to transaksi
        $this->assertDatabaseHas('tarik_tunai', [
            'transaksi_id' => $transaksiId,
            'anggota_id' => $this->anggota->anggota_id,
            'kasir_id' => $this->kasir->user_id,
            'nominal' => 60000,
            'status' => 'completed',
            'sumber_dana' => 'shu',
        ]);

        // 3. Response contains calculated net cash to hand over (60k - 30k = 30k)
        $this->assertEquals(30000, $response->json('tarik_tunai.uang_bersih_diserahkan'));
        $this->assertEquals(60000, $response->json('tarik_tunai.nominal_tarik'));
    }

    public function test_checkout_ewallet_blocks_when_member_has_any_debt(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Ewallet Debt Block '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);

        $this->anggota->saldo = 500000;
        $this->anggota->hutang = 15000; // Has outstanding debt
        $this->anggota->save();

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'ewallet',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 1,
                    'harga_satuan' => 10000,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(400);
        $this->assertStringContainsString('tunggakan hutang', $response->json('message'));

        // Saldo remains untouched
        $this->anggota->refresh();
        $this->assertEquals(500000, (float) $this->anggota->saldo);
    }

    public function test_checkout_hutang_enforces_sisa_limit_ceiling(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Hutang Ceiling '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 10000,
            'harga_jual' => 60000,
        ]);

        // Simpanan pokok (300k) + default allowance (100k) = Plafon 400.000
        // Set current debt to 350.000 -> Sisa limit = 50.000
        $this->anggota->hutang = 350000;
        $this->anggota->save();

        // 1. Attempt purchase exceeding remaining limit (60.000 > 50.000)
        $payloadFail = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'hutang',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 1,
                    'harga_satuan' => 60000,
                ],
            ],
        ];

        $resFail = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payloadFail);

        $resFail->assertStatus(400);
        $this->assertStringContainsString('melebihi sisa limit hutang', $resFail->json('message'));

        // 2. Purchase within remaining limit (50.000 == 50.000)
        $barangOk = Barang::create([
            'nama_barang' => 'Barang Hutang Within Limit '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 10000,
            'harga_jual' => 50000,
        ]);

        $payloadOk = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'hutang',
            'items' => [
                [
                    'barang_id' => $barangOk->barang_id,
                    'jumlah' => 1,
                ],
            ],
        ];

        $resOk = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payloadOk);

        $resOk->assertStatus(200);

        $this->anggota->refresh();
        $this->assertEquals(400000, (float) $this->anggota->hutang);
    }

    public function test_checkout_fails_if_anggota_id_is_missing(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang No Member '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);

        $payload = [
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 1,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(400);
        $this->assertStringContainsString('wajib memilih Anggota Koperasi', $response->json('message'));
    }
}
