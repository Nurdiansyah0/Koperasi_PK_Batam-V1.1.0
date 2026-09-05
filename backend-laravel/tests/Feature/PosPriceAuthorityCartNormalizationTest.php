<?php

namespace Tests\Feature;

use App\Models\Anggota;
use App\Models\Barang;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PosPriceAuthorityCartNormalizationTest extends TestCase
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
                'username' => 'kasir_price_norm_test',
                'password_hash' => bcrypt('password'),
                'role' => 'kasir',
            ]);
        }
        $this->kasirToken = $this->kasir->createToken('kasir_token')->plainTextToken;

        $this->anggota = Anggota::first();
        if (! $this->anggota) {
            $this->anggotaUser = User::create([
                'username' => 'anggota_price_norm_test',
                'password_hash' => bcrypt('password'),
                'role' => 'anggota',
            ]);
            $this->anggota = Anggota::create([
                'user_id' => $this->anggotaUser->user_id,
                'nama_lengkap' => 'Anggota Price Norm Test',
                'saldo' => 500000,
                'hutang' => 0,
                'shu' => 200000,
                'simpanan_pokok' => 300000,
            ]);
        }
    }

    // ==========================================
    // SECTION 1: PRICE AUTHORITY TESTS
    // ==========================================

    public function test_client_cannot_override_price_with_lower_amount_enforces_catalog_price(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Underprice Attack '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 15000,
            'harga_jual' => 25000,
        ]);

        // Client attempts to pass 10,000 (below modal 15,000 and below catalog 25,000)
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 2,
                    'harga_satuan' => 10000,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Catalog price 25,000 must be used
        // total = 25000 * 2 = 50000
        // keuntungan = (25000 - 15000) * 2 = 20000
        $this->assertEquals(50000, $response->json('total'));
        $this->assertEquals(20000, $response->json('total_keuntungan'));

        $transaksiId = $response->json('transaksi_id');
        $this->assertDatabaseHas('transaksi_detail', [
            'transaksi_id' => $transaksiId,
            'barang_id' => $barang->barang_id,
            'jumlah' => 2,
            'harga_satuan' => 25000,
            'subtotal' => 50000,
            'keuntungan' => 20000,
        ]);
    }

    public function test_client_cannot_override_price_with_higher_amount(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Overprice Attack '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 7000,
            'harga_jual' => 10000,
        ]);

        // Client attempts to pass inflated 50,000
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 2,
                    'harga_satuan' => 50000,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Catalog price 10,000 must be used
        $this->assertEquals(20000, $response->json('total'));
        $this->assertEquals(6000, $response->json('total_keuntungan'));

        $transaksiId = $response->json('transaksi_id');
        $this->assertDatabaseHas('transaksi_detail', [
            'transaksi_id' => $transaksiId,
            'barang_id' => $barang->barang_id,
            'harga_satuan' => 10000,
            'subtotal' => 20000,
            'keuntungan' => 6000,
        ]);
    }

    public function test_checkout_omitting_harga_satuan_uses_catalog_price_transparently(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang No Price Key '.uniqid(),
            'stok' => 15,
            'stok_toko' => 15,
            'harga_modal' => 12000,
            'harga_jual' => 18000,
        ]);

        // Client does not supply harga_satuan at all
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 3,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);
        $this->assertEquals(54000, $response->json('total'));
        $this->assertEquals(18000, $response->json('total_keuntungan'));

        $transaksiId = $response->json('transaksi_id');
        $this->assertDatabaseHas('transaksi_detail', [
            'transaksi_id' => $transaksiId,
            'barang_id' => $barang->barang_id,
            'jumlah' => 3,
            'harga_satuan' => 18000,
            'subtotal' => 54000,
            'keuntungan' => 18000,
        ]);
    }

    public function test_shu_distribution_calculated_strictly_from_catalog_price(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang SHU Authority '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 30000,
            'harga_jual' => 50000,
        ]);

        $initialShu = (float) $this->anggota->shu;

        // Client sends fake price 35,000 (margin 5,000 instead of real 20,000)
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 1,
                    'harga_satuan' => 35000,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Real margin = 50,000 - 30,000 = 20,000
        // SHU 60% = 12,000, SHU 10% = 2,000, SHU 30% = 6,000
        $this->anggota->refresh();
        $this->assertEquals($initialShu + 12000, (float) $this->anggota->shu);

        $this->assertDatabaseHas('shu_distribusi', [
            'anggota_id' => $this->anggota->anggota_id,
            'shu_60_percent' => 12000,
            'shu_10_percent' => 2000,
            'shu_30_percent' => 6000,
        ]);
    }

    public function test_ewallet_payment_deducts_exact_catalog_amount_ignoring_client_price(): void
    {
        $this->anggota->saldo = 200000;
        $this->anggota->hutang = 0;
        $this->anggota->save();

        $barang = Barang::create([
            'nama_barang' => 'Barang Ewallet Authority '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 20000,
            'harga_jual' => 30000,
        ]);

        // Client attempts to spoof price as 5,000 for 2 items (total 10,000 instead of 60,000)
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'ewallet',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 2,
                    'harga_satuan' => 5000,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Catalog deduction = 30000 * 2 = 60000
        // Member saldo should be 200000 - 60000 = 140000
        $this->anggota->refresh();
        $this->assertEquals(140000, (float) $this->anggota->saldo);
    }

    public function test_ewallet_blocks_when_catalog_price_exceeds_saldo_even_if_client_price_is_lower(): void
    {
        $this->anggota->saldo = 40000;
        $this->anggota->hutang = 0;
        $this->anggota->save();

        $barang = Barang::create([
            'nama_barang' => 'Barang Ewallet Insufficient '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 30000,
            'harga_jual' => 50000,
        ]);

        // Client claims price is 20,000 (fits in 40,000 saldo), but catalog is 50,000
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'ewallet',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 1,
                    'harga_satuan' => 20000,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(400);
        $this->assertStringContainsString('Saldo tidak mencukupi', $response->json('message'));

        $this->anggota->refresh();
        $this->assertEquals(40000, (float) $this->anggota->saldo);
    }

    public function test_debt_payment_accumulates_exact_catalog_amount_ignoring_client_price(): void
    {
        $this->anggota->saldo = 0;
        $this->anggota->hutang = 0;
        $this->anggota->save();

        $barang = Barang::create([
            'nama_barang' => 'Barang Hutang Authority '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 15000,
            'harga_jual' => 25000,
        ]);

        // Client claims price is 1,000 for 2 items
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'hutang',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 2,
                    'harga_satuan' => 1000,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Catalog debt = 25000 * 2 = 50000
        $this->anggota->refresh();
        $this->assertEquals(50000, (float) $this->anggota->hutang);
    }

    public function test_debt_limit_enforced_against_catalog_total_preventing_bypass(): void
    {
        // Plafon 400.000, existing hutang 360.000 -> sisa limit = 40.000
        $this->anggota->hutang = 360000;
        $this->anggota->save();

        $barang = Barang::create([
            'nama_barang' => 'Barang Debt Limit Bypass Attempt '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 30000,
            'harga_jual' => 50000,
        ]);

        // Client claims price is 30,000 to bypass the 40,000 limit, but catalog is 50,000
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'hutang',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 1,
                    'harga_satuan' => 30000,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(400);
        $this->assertStringContainsString('melebihi sisa limit hutang', $response->json('message'));

        $this->anggota->refresh();
        $this->assertEquals(360000, (float) $this->anggota->hutang);
    }

    public function test_integrated_tarik_tunai_potong_belanja_uses_catalog_price_for_net_cash_handover(): void
    {
        $this->anggota->hutang = 0;
        $this->anggota->shu = 100000;
        $this->anggota->persetujuan_shu_master_at = Carbon::now();
        $this->anggota->save();

        $barang = Barang::create([
            'nama_barang' => 'Barang Tarik Cash Authority '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 20000,
            'harga_jual' => 30000,
        ]);

        // Client wants 50,000 cash withdrawal.
        // Catalog price for 1 item is 30,000.
        // Client attempts to spoof price as 10,000 so net cash given is 40,000 instead of 20,000.
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 1,
                    'harga_satuan' => 10000,
                ],
            ],
            'sertakan_tarik_tunai' => true,
            'tarik_tunai_nominal' => 50000,
            'tarik_tunai_sumber' => 'shu',
            'persetujuan_shu' => true,
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Net cash handover must be max(0, nominal - totalHarga) = max(0, 50000 - 30000) = 20000
        $this->assertEquals(20000, $response->json('tarik_tunai.uang_bersih_diserahkan'));
        $this->assertEquals(30000, $response->json('tarik_tunai.potong_belanja'));

        $this->assertDatabaseHas('tarik_tunai', [
            'nominal' => 50000,
            'status' => 'completed',
        ]);
    }

    // ==========================================
    // SECTION 2: CART NORMALIZATION TESTS
    // ==========================================

    public function test_duplicate_barang_ids_are_consolidated_into_single_cart_line(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Consolidation Basic '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 5000,
            'harga_jual' => 8000,
        ]);

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 2,
                ],
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 3,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);
        $transaksiId = $response->json('transaksi_id');

        // Only 1 detail row with consolidated qty 5
        $details = TransaksiDetail::where('transaksi_id', $transaksiId)->get();
        $this->assertCount(1, $details);

        $detail = $details->first();
        $this->assertEquals($barang->barang_id, $detail->barang_id);
        $this->assertEquals(5, $detail->jumlah);
        $this->assertEquals(8000, (float) $detail->harga_satuan);
        $this->assertEquals(40000, (float) $detail->subtotal);
        $this->assertEquals(15000, (float) $detail->keuntungan);

        // Stock correctly decremented once by 5
        $barang->refresh();
        $this->assertEquals(15, $barang->stok_toko);
    }

    public function test_multiple_distinct_duplicate_items_are_properly_consolidated(): void
    {
        $b1 = Barang::create([
            'nama_barang' => 'Barang Multi Cons A '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 4000,
            'harga_jual' => 6000,
        ]);
        $b2 = Barang::create([
            'nama_barang' => 'Barang Multi Cons B '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 7000,
            'harga_jual' => 10000,
        ]);

        // Input contains alternating duplicates: [A(2), B(1), A(3), B(4)]
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $b1->barang_id, 'jumlah' => 2],
                ['barang_id' => $b2->barang_id, 'jumlah' => 1],
                ['barang_id' => $b1->barang_id, 'jumlah' => 3],
                ['barang_id' => $b2->barang_id, 'jumlah' => 4],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);
        $transaksiId = $response->json('transaksi_id');

        // Total should be: A(5 * 6000 = 30000) + B(5 * 10000 = 50000) = 80000
        $this->assertEquals(80000, $response->json('total'));

        $details = TransaksiDetail::where('transaksi_id', $transaksiId)->get();
        $this->assertCount(2, $details);

        $detailA = $details->where('barang_id', $b1->barang_id)->first();
        $this->assertNotNull($detailA);
        $this->assertEquals(5, $detailA->jumlah);
        $this->assertEquals(30000, (float) $detailA->subtotal);

        $detailB = $details->where('barang_id', $b2->barang_id)->first();
        $this->assertNotNull($detailB);
        $this->assertEquals(5, $detailB->jumlah);
        $this->assertEquals(50000, (float) $detailB->subtotal);

        $b1->refresh();
        $b2->refresh();
        $this->assertEquals(15, $b1->stok_toko);
        $this->assertEquals(15, $b2->stok_toko);
    }

    public function test_cart_normalization_preserves_first_occurrence_line_ordering(): void
    {
        $bA = Barang::create(['nama_barang' => 'Item Alpha '.uniqid(), 'stok' => 20, 'stok_toko' => 20, 'harga_modal' => 5000, 'harga_jual' => 10000]);
        $bB = Barang::create(['nama_barang' => 'Item Beta '.uniqid(), 'stok' => 20, 'stok_toko' => 20, 'harga_modal' => 5000, 'harga_jual' => 10000]);
        $bC = Barang::create(['nama_barang' => 'Item Gamma '.uniqid(), 'stok' => 20, 'stok_toko' => 20, 'harga_modal' => 5000, 'harga_jual' => 10000]);

        // First occurrence sequence: C, A, B
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $bC->barang_id, 'jumlah' => 1],
                ['barang_id' => $bA->barang_id, 'jumlah' => 2],
                ['barang_id' => $bC->barang_id, 'jumlah' => 3],
                ['barang_id' => $bB->barang_id, 'jumlah' => 1],
                ['barang_id' => $bA->barang_id, 'jumlah' => 1],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);
        $transaksiId = $response->json('transaksi_id');

        $details = TransaksiDetail::where('transaksi_id', $transaksiId)
            ->orderBy('detail_id', 'asc')
            ->get();

        $this->assertCount(3, $details);
        $this->assertEquals($bC->barang_id, $details[0]->barang_id);
        $this->assertEquals(4, $details[0]->jumlah); // 1 + 3

        $this->assertEquals($bA->barang_id, $details[1]->barang_id);
        $this->assertEquals(3, $details[1]->jumlah); // 2 + 1

        $this->assertEquals($bB->barang_id, $details[2]->barang_id);
        $this->assertEquals(1, $details[2]->jumlah);
    }

    public function test_consolidated_quantity_enforces_inventory_stock_boundary(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Stock Boundary '.uniqid(),
            'stok' => 7,
            'stok_toko' => 7,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);

        // Each line is individually <= 7 (4 and 4), but sum is 8 > 7
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $barang->barang_id, 'jumlah' => 4],
                ['barang_id' => $barang->barang_id, 'jumlah' => 4],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(400);
        $this->assertStringContainsString('Stok etalase tidak mencukupi', $response->json('message'));

        $barang->refresh();
        $this->assertEquals(7, $barang->stok_toko);
    }

    public function test_duplicate_cart_lines_with_conflicting_client_prices_are_both_ignored(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Conflicting Prices '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 8000,
            'harga_jual' => 12000,
        ]);

        // Line 1 sets 1,000; Line 2 sets 99,000
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $barang->barang_id, 'jumlah' => 2, 'harga_satuan' => 1000],
                ['barang_id' => $barang->barang_id, 'jumlah' => 3, 'harga_satuan' => 99000],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Catalog price 12,000 applied to consolidated qty 5 = 60,000
        $this->assertEquals(60000, $response->json('total'));
        $this->assertEquals(20000, $response->json('total_keuntungan'));

        $transaksiId = $response->json('transaksi_id');
        $this->assertDatabaseHas('transaksi_detail', [
            'transaksi_id' => $transaksiId,
            'barang_id' => $barang->barang_id,
            'jumlah' => 5,
            'harga_satuan' => 12000,
            'subtotal' => 60000,
            'keuntungan' => 20000,
        ]);
    }

    public function test_transaction_atomicity_and_zero_mutations_on_failure_with_normalized_cart(): void
    {
        $this->anggota->saldo = 20000; // Only 20k saldo
        $this->anggota->hutang = 0;
        $this->anggota->save();

        $b = Barang::create([
            'nama_barang' => 'Barang Atomicity Norm '.uniqid(),
            'stok' => 15,
            'stok_toko' => 15,
            'harga_modal' => 10000,
            'harga_jual' => 20000,
        ]);

        $initialTxCount = Transaksi::count();
        $initialDetailCount = TransaksiDetail::count();

        // 2 + 1 = 3 items * 20,000 = 60,000 > 20,000 saldo
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'ewallet',
            'items' => [
                ['barang_id' => $b->barang_id, 'jumlah' => 2],
                ['barang_id' => $b->barang_id, 'jumlah' => 1],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(400);
        $this->assertStringContainsString('Saldo tidak mencukupi', $response->json('message'));

        // Verify zero mutations
        $b->refresh();
        $this->assertEquals(15, $b->stok_toko);

        $this->anggota->refresh();
        $this->assertEquals(20000, (float) $this->anggota->saldo);

        $this->assertEquals($initialTxCount, Transaksi::count());
        $this->assertEquals($initialDetailCount, TransaksiDetail::count());
    }

    public function test_canonical_lock_ordering_remains_strictly_ascending_with_scrambled_duplicates(): void
    {
        $b1 = Barang::create(['nama_barang' => 'Lock B1 '.uniqid(), 'stok' => 10, 'stok_toko' => 10, 'harga_modal' => 5000, 'harga_jual' => 10000]);
        $b2 = Barang::create(['nama_barang' => 'Lock B2 '.uniqid(), 'stok' => 10, 'stok_toko' => 10, 'harga_modal' => 5000, 'harga_jual' => 10000]);
        $b3 = Barang::create(['nama_barang' => 'Lock B3 '.uniqid(), 'stok' => 10, 'stok_toko' => 10, 'harga_modal' => 5000, 'harga_jual' => 10000]);

        $minId = min($b1->barang_id, $b2->barang_id, $b3->barang_id);
        $maxId = max($b1->barang_id, $b2->barang_id, $b3->barang_id);
        $midId = ($b1->barang_id + $b2->barang_id + $b3->barang_id) - $minId - $maxId;

        // Pass scrambled order with duplicates: [max, min, max, mid, min]
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $maxId, 'jumlah' => 1],
                ['barang_id' => $minId, 'jumlah' => 1],
                ['barang_id' => $maxId, 'jumlah' => 1],
                ['barang_id' => $midId, 'jumlah' => 1],
                ['barang_id' => $minId, 'jumlah' => 1],
            ],
        ];

        $lockedBarangSequence = [];

        DB::listen(function ($query) use (&$lockedBarangSequence, $minId, $midId, $maxId) {
            $sql = strtolower($query->sql);
            if (str_contains($sql, 'from "barang"') || str_contains($sql, 'from `barang`')) {
                foreach ($query->bindings as $binding) {
                    if (in_array($binding, [$minId, $midId, $maxId])) {
                        $lockedBarangSequence[] = (int) $binding;
                    }
                }
            }
        });

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Must lock each unique barang exactly once in strictly ascending order: minId, midId, maxId
        $this->assertEquals($minId, $lockedBarangSequence[0] ?? null, 'Lowest barang_id must be locked first.');
        $this->assertEquals($midId, $lockedBarangSequence[1] ?? null, 'Middle barang_id must be locked second.');
        $this->assertEquals($maxId, $lockedBarangSequence[2] ?? null, 'Highest barang_id must be locked third.');
    }
}
