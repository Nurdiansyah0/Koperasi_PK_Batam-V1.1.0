<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\SerahTerimaKasir;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SerahTerimaTest extends TestCase
{
    use DatabaseTransactions;

    protected $kasir1;

    protected $kasir2;

    protected $token1;

    protected function setUp(): void
    {
        parent::setUp();
        // Arrange: Find two Kasirs
        $this->kasir1 = User::where('role', 'kasir')->orderBy('user_id', 'asc')->firstOrFail();
        $this->kasir2 = User::where('role', 'kasir')->where('user_id', '!=', $this->kasir1->user_id)->firstOrFail();
        $this->token1 = $this->kasir1->createToken('test_token')->plainTextToken;
        
        // Clear globally seeded pending transactions so they don't interfere with cycle count guard
        \App\Models\Transaksi::where('status', 'pending')->update(['status' => 'batal']);
    }

    #[Test]
    public function kasir_can_get_serah_terima_draft()
    {
        // Act
        $response = $this->withHeader('Authorization', "Bearer {$this->token1}")
            ->getJson('/laravel/api/kasir/serah-terima-draft');

        // Assert
        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'kasir_list',
                    'cycle_count_items',
                    'all_items',
                ],
            ]);

        $this->assertTrue($response->json('success'));
        $this->assertGreaterThan(0, count($response->json('data.cycle_count_items')));
        $firstItem = $response->json('data.cycle_count_items.0');
        $this->assertArrayHasKey('pkm', $firstItem);
        $this->assertArrayHasKey('stok_toko', $firstItem);
        $this->assertArrayHasKey('stok_gudang', $firstItem);
    }

    #[Test]
    public function zero_stock_items_older_than_three_days_are_hidden_from_cycle_count_items()
    {
        // Arrange: 1 item zero stock updated 4 days ago, 1 item zero stock updated today
        $oldZeroItem = Barang::create([
            'nama_barang' => 'Barang Nol Stok Lama',
            'stok' => 0,
            'stok_toko' => 0,
            'stok_gudang' => 0,
            'harga_modal' => 1000,
            'harga_jual' => 2000,
            'updated_at' => now()->subDays(4),
        ]);

        $recentZeroItem = Barang::create([
            'nama_barang' => 'Barang Nol Stok Baru',
            'stok' => 0,
            'stok_toko' => 0,
            'stok_gudang' => 0,
            'harga_modal' => 1000,
            'harga_jual' => 2000,
            'updated_at' => now()->subHours(2),
        ]);

        // Act
        $response = $this->withHeader('Authorization', "Bearer {$this->token1}")
            ->getJson('/laravel/api/kasir/serah-terima-draft');

        // Assert
        $response->assertStatus(200);
        $cycleItemIds = collect($response->json('data.cycle_count_items'))->pluck('barang_id')->all();
        $allItemIds = collect($response->json('data.all_items'))->pluck('barang_id')->all();

        // Old zero item should NOT be in cycle count items
        $this->assertNotContains($oldZeroItem->barang_id, $cycleItemIds);
        // But should be available in all_items for search & add
        $this->assertContains($oldZeroItem->barang_id, $allItemIds);

        // Recent zero item (< 3 days) SHOULD still be in cycle count items
        $this->assertContains($recentZeroItem->barang_id, $cycleItemIds);
    }

    #[Test]
    public function kasir_can_get_serah_terima_draft_with_pending_cash_orders_status()
    {
        // Arrange: Create a pending cash order
        \App\Models\Transaksi::create([
            'anggota_id' => null,
            'kasir_id' => $this->kasir1->user_id,
            'total_harga' => 10000,
            'metode_pembayaran' => 'cash',
            'status' => 'pending',
            'created_at' => now(),
        ]);

        // Act
        $response = $this->withHeader('Authorization', "Bearer {$this->token1}")
            ->getJson('/laravel/api/kasir/serah-terima-draft');

        // Assert
        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $this->assertArrayHasKey('pending_cash_orders', $response->json('data'));
        $this->assertGreaterThanOrEqual(1, $response->json('data.pending_cash_orders.count'));
        $this->assertGreaterThanOrEqual(10000, $response->json('data.pending_cash_orders.nominal'));
    }

    #[Test]
    public function kasir_can_get_serah_terima_draft_if_pending_non_cash_orders_exist()
    {
        // Arrange: Create a pending non-cash order
        \App\Models\Transaksi::create([
            'anggota_id' => null,
            'kasir_id' => $this->kasir1->user_id,
            'total_harga' => 10000,
            'metode_pembayaran' => 'transfer',
            'status' => 'pending',
            'created_at' => now(),
        ]);

        // Act
        $response = $this->withHeader('Authorization', "Bearer {$this->token1}")
            ->getJson('/laravel/api/kasir/serah-terima-draft');

        // Assert
        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
    }

    #[Test]
    public function kasir_can_create_hybrid_serah_terima()
    {
        $barang = Barang::firstOrFail();

        $payload = [
            'kasir_to' => $this->kasir2->user_id,
            'hasil_opname' => [
                'summary' => [
                    'totalBarang' => 1,
                    'barangSesuai' => 0,
                    'barangSelisih' => 1,
                    'totalSelisih' => -2,
                ],
                'uang_fisik' => 1500000,
                'catatan' => 'Laci nyangkut',
                'items' => [
                    [
                        'barang_id' => $barang->barang_id,
                        'nama_barang' => $barang->nama_barang,
                        'stok_aktual' => $barang->stok - 2,
                        'stok_input' => $barang->stok,
                        'selisih' => -2,
                        'status' => 'selisih',
                    ],
                ],
                'type' => 'hybrid_cycle_count',
            ],
        ];

        // Act
        $response = $this->withHeader('Authorization', "Bearer {$this->token1}")
            ->postJson('/laravel/api/kasir/create-serah-terima', $payload);

        // Assert
        $response->assertStatus(200)->assertJson(['success' => true]);

        // Verify it was stored correctly
        $this->assertDatabaseHas('serah_terima_kasir', [
            'kasir_from' => $this->kasir1->user_id,
            'kasir_to' => $this->kasir2->user_id,
            'status' => 'pending',
        ]);

        // Verify JSON cast by pulling the last inserted record
        $record = SerahTerimaKasir::where('kasir_from', $this->kasir1->user_id)->orderBy('serah_id', 'desc')->first();
        $this->assertEquals(1500000, $record->hasil_opname['uang_fisik']);
        $this->assertEquals(-2, $record->hasil_opname['items'][0]['selisih']);
    }

    #[Test]
    public function receiver_can_approve_serah_terima()
    {
        // 1. Kasir 1 Creates
        $serah = SerahTerimaKasir::create([
            'kasir_from' => $this->kasir1->user_id,
            'kasir_to' => $this->kasir2->user_id,
            'hasil_opname' => ['uang_fisik' => 1000000],
            'status' => 'pending',
        ]);

        // 2. Kasir 2 (Receiver) Approves
        $token2 = $this->kasir2->createToken('test_token2')->plainTextToken;
        $response = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson('/laravel/api/kasir/approve-serah-terima', [
                'serah_id' => $serah->serah_id,
            ]);

        $response->assertStatus(200)->assertJson(['success' => true]);

        $this->assertDatabaseHas('serah_terima_kasir', [
            'serah_id' => $serah->serah_id,
            'status' => 'approved',
        ]);
    }

    #[Test]
    public function receiver_can_approve_serah_terima_and_only_updates_stok_toko()
    {
        $barang = Barang::firstOrFail();
        $barang->update([
            'stok_toko' => 5,
            'stok_gudang' => 20,
            'stok' => 25,
            'pkm' => 10,
        ]);

        $serah = SerahTerimaKasir::create([
            'kasir_from' => $this->kasir1->user_id,
            'kasir_to' => $this->kasir2->user_id,
            'hasil_opname' => json_encode([
                'uang_fisik' => 1000000,
                'items' => [
                    [
                        'barang_id' => $barang->barang_id,
                        'stok_aktual' => 4, // physical count is 4
                        'stok_input' => 5,  // original stok_toko
                        'selisih' => -1,
                    ],
                ]
            ]),
            'status' => 'pending',
        ]);

        $token2 = $this->kasir2->createToken('test_token2')->plainTextToken;
        $response = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson('/laravel/api/kasir/approve-serah-terima', [
                'serah_id' => $serah->serah_id,
            ]);

        $response->assertStatus(200)->assertJson(['success' => true]);

        $barang->refresh();
        $this->assertEquals(4, $barang->stok_toko);
        $this->assertEquals(20, $barang->stok_gudang);
        $this->assertEquals(24, $barang->stok);
    }

    #[Test]
    public function receiver_can_reject_serah_terima()
    {
        $serah = SerahTerimaKasir::create([
            'kasir_from' => $this->kasir1->user_id,
            'kasir_to' => $this->kasir2->user_id,
            'hasil_opname' => ['uang_fisik' => 1000000],
            'status' => 'pending',
        ]);

        $token2 = $this->kasir2->createToken('test_token2')->plainTextToken;
        $response = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson('/laravel/api/kasir/reject-serah-terima', [
                'serah_id' => $serah->serah_id,
                'alasan' => 'Uang fisik kurang 50rb',
            ]);

        $response->assertStatus(200)->assertJson(['success' => true]);

        $this->assertDatabaseHas('serah_terima_kasir', [
            'serah_id' => $serah->serah_id,
            'status' => 'rejected',
            'alasan_penolakan' => 'Uang fisik kurang 50rb',
        ]);
    }

    #[Test]
    public function sender_can_see_sent_handovers_in_history()
    {
        // 1. Kasir 1 Sends to Kasir 2 (and it is completed/rejected)
        SerahTerimaKasir::create([
            'kasir_from' => $this->kasir1->user_id,
            'kasir_to' => $this->kasir2->user_id,
            'hasil_opname' => ['uang_fisik' => 1000000],
            'status' => 'approved', // must be not pending to show in history
        ]);

        // 2. Kasir 1 calls getSerahTerimaForMe with type=history
        $response = $this->withHeader('Authorization', "Bearer {$this->token1}")
            ->getJson('/laravel/api/kasir/serah-terima-for-me?type=history');

        $response->assertStatus(200);
        $data = $response->json('data.data');

        // Ensure the array contains the sent handover
        $this->assertTrue(count($data) > 0);
        $found = false;
        foreach ($data as $item) {
            if ($item['kasir_from'] === $this->kasir1->user_id) {
                $found = true;
                break;
            }
        }
        $this->assertTrue($found, 'Kasir 1 should see the handover they sent in their history.');
    }
}
