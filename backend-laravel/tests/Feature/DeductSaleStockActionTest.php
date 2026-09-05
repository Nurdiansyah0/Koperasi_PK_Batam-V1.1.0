<?php

namespace Tests\Feature;

use App\Actions\Inventory\DeductSaleStockAction;
use App\Models\Barang;
use Exception;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DeductSaleStockActionTest extends TestCase
{
    use DatabaseTransactions;

    protected DeductSaleStockAction $action;

    protected function setUp(): void
    {
        parent::setUp();
        $this->action = app(DeductSaleStockAction::class);
    }

    public function test_successful_single_item_stock_deduction(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Single Stock '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 10000,
            'harga_jual' => 15000,
        ]);

        $lines = [
            ['barang_id' => $barang->barang_id, 'jumlah' => 5],
        ];

        $result = $this->action->execute($lines);

        $barang->refresh();
        $this->assertEquals(15, $barang->stok_toko);

        $this->assertCount(1, $result['items']);
        $this->assertEquals(75000, $result['total_harga']);
        $this->assertEquals(25000, $result['total_keuntungan']);

        $item = $result['items'][0];
        $this->assertEquals($barang->barang_id, $item['barang_id']);
        $this->assertEquals(5, $item['jumlah']);
        $this->assertEquals(15000, $item['harga_satuan']);
        $this->assertEquals(10000, $item['harga_modal']);
        $this->assertEquals(75000, $item['subtotal']);
        $this->assertEquals(25000, $item['keuntungan']);
    }

    public function test_successful_multi_item_stock_deduction(): void
    {
        $b1 = Barang::create([
            'nama_barang' => 'Barang Multi 1 '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 5000,
            'harga_jual' => 8000,
        ]);
        $b2 = Barang::create([
            'nama_barang' => 'Barang Multi 2 '.uniqid(),
            'stok' => 15,
            'stok_toko' => 15,
            'harga_modal' => 12000,
            'harga_jual' => 20000,
        ]);

        $lines = [
            ['barang_id' => $b1->barang_id, 'jumlah' => 4],
            ['barang_id' => $b2->barang_id, 'jumlah' => 3],
        ];

        $result = $this->action->execute($lines);

        $b1->refresh();
        $b2->refresh();
        $this->assertEquals(16, $b1->stok_toko);
        $this->assertEquals(12, $b2->stok_toko);

        // b1: 4 * 8000 = 32000; b2: 3 * 20000 = 60000 -> Total: 92000
        // b1 profit: 4 * 3000 = 12000; b2 profit: 3 * 8000 = 24000 -> Total profit: 36000
        $this->assertEquals(92000, $result['total_harga']);
        $this->assertEquals(36000, $result['total_keuntungan']);
        $this->assertCount(2, $result['items']);
    }

    public function test_deterministic_ascending_barang_lock_order(): void
    {
        $b1 = Barang::create(['nama_barang' => 'Lock 1 '.uniqid(), 'stok' => 10, 'stok_toko' => 10, 'harga_modal' => 5000, 'harga_jual' => 10000]);
        $b2 = Barang::create(['nama_barang' => 'Lock 2 '.uniqid(), 'stok' => 10, 'stok_toko' => 10, 'harga_modal' => 5000, 'harga_jual' => 10000]);
        $b3 = Barang::create(['nama_barang' => 'Lock 3 '.uniqid(), 'stok' => 10, 'stok_toko' => 10, 'harga_modal' => 5000, 'harga_jual' => 10000]);

        $minId = min($b1->barang_id, $b2->barang_id, $b3->barang_id);
        $maxId = max($b1->barang_id, $b2->barang_id, $b3->barang_id);
        $midId = ($b1->barang_id + $b2->barang_id + $b3->barang_id) - $minId - $maxId;

        // Pass descending order lines: max, mid, min
        $lines = [
            ['barang_id' => $maxId, 'jumlah' => 1],
            ['barang_id' => $midId, 'jumlah' => 1],
            ['barang_id' => $minId, 'jumlah' => 1],
        ];

        $lockedSequence = [];
        DB::listen(function ($query) use (&$lockedSequence, $minId, $midId, $maxId) {
            $sql = strtolower($query->sql);
            if (str_contains($sql, 'from "barang"') || str_contains($sql, 'from `barang`')) {
                foreach ($query->bindings as $binding) {
                    if (in_array($binding, [$minId, $midId, $maxId])) {
                        $lockedSequence[] = (int) $binding;
                    }
                }
            }
        });

        $result = $this->action->execute($lines);

        // Deterministic lock acquisition MUST be strictly ascending: minId -> midId -> maxId
        $this->assertEquals($minId, $lockedSequence[0] ?? null, 'Lowest ID must be locked first');
        $this->assertEquals($midId, $lockedSequence[1] ?? null, 'Middle ID must be locked second');
        $this->assertEquals($maxId, $lockedSequence[2] ?? null, 'Highest ID must be locked third');

        // Business line ordering in returned items remains intact (maxId -> midId -> minId)
        $this->assertEquals($maxId, $result['items'][0]['barang_id']);
        $this->assertEquals($midId, $result['items'][1]['barang_id']);
        $this->assertEquals($minId, $result['items'][2]['barang_id']);
    }

    public function test_duplicate_normalized_input_does_not_lock_same_barang_repeatedly(): void
    {
        $b1 = Barang::create(['nama_barang' => 'Dup Lock '.uniqid(), 'stok' => 20, 'stok_toko' => 20, 'harga_modal' => 5000, 'harga_jual' => 10000]);

        $lines = [
            ['barang_id' => $b1->barang_id, 'jumlah' => 2],
        ];

        $lockCount = 0;
        DB::listen(function ($query) use (&$lockCount, $b1) {
            $sql = strtolower($query->sql);
            if (str_contains($sql, 'from "barang"') || str_contains($sql, 'from `barang`')) {
                foreach ($query->bindings as $binding) {
                    if ($binding == $b1->barang_id) {
                        $lockCount++;
                    }
                }
            }
        });

        $this->action->execute($lines);

        $this->assertEquals(1, $lockCount, 'Barang should only be locked once for update');
    }

    public function test_stock_insufficiency_throws_exact_semantic_exception(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Low Stock '.uniqid(),
            'stok' => 3,
            'stok_toko' => 3,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);

        $lines = [
            ['barang_id' => $barang->barang_id, 'jumlah' => 5], // 5 > 3
        ];

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Stok etalase tidak mencukupi untuk barang ID: '.$barang->barang_id);

        $this->action->execute($lines);
    }

    public function test_missing_barang_throws_exact_semantic_exception(): void
    {
        $nonExistentId = 999999;
        $lines = [
            ['barang_id' => $nonExistentId, 'jumlah' => 1],
        ];

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Stok etalase tidak mencukupi untuk barang ID: '.$nonExistentId);

        $this->action->execute($lines);
    }

    public function test_stock_mutation_remains_transactional_and_rolls_back_with_parent_transaction(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Tx Rollback '.uniqid(),
            'stok' => 25,
            'stok_toko' => 25,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);

        DB::beginTransaction();

        $lines = [
            ['barang_id' => $barang->barang_id, 'jumlah' => 10],
        ];

        $this->action->execute($lines);

        $barang->refresh();
        $this->assertEquals(15, $barang->stok_toko);

        // Simulate parent transaction failure/abort
        DB::rollBack();

        $barang->refresh();
        $this->assertEquals(25, $barang->stok_toko, 'Stock must be restored upon parent transaction rollback');
    }

    public function test_authoritative_harga_jual_and_harga_modal_are_returned(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Price Modal '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 12500,
            'harga_jual' => 22000,
        ]);

        $lines = [
            ['barang_id' => $barang->barang_id, 'jumlah' => 2],
        ];

        $result = $this->action->execute($lines);

        $this->assertEquals(44000, $result['total_harga']);
        $this->assertEquals(19000, $result['total_keuntungan']); // (22000 - 12500) * 2

        $item = $result['items'][0];
        $this->assertEquals(22000, $item['harga_satuan']);
        $this->assertEquals(12500, $item['harga_modal']);
    }

    public function test_client_harga_satuan_is_completely_ignored(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Client Price Ignore '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 8000,
            'harga_jual' => 15000,
        ]);

        // Attempt to pass spoofed harga_satuan
        $lines = [
            [
                'barang_id' => $barang->barang_id,
                'jumlah' => 2,
                'harga_satuan' => 1000, // Spoofed price
            ],
        ];

        $result = $this->action->execute($lines);

        $item = $result['items'][0];
        $this->assertEquals(15000, $item['harga_satuan'], 'Client price must be ignored; catalog harga_jual must be used');
        $this->assertEquals(30000, $result['total_harga']);
        $this->assertEquals(14000, $result['total_keuntungan']);
    }

    public function test_original_business_line_ordering_remains_intact(): void
    {
        $b1 = Barang::create(['nama_barang' => 'Item 1 '.uniqid(), 'stok' => 10, 'stok_toko' => 10, 'harga_modal' => 1000, 'harga_jual' => 2000]);
        $b2 = Barang::create(['nama_barang' => 'Item 2 '.uniqid(), 'stok' => 10, 'stok_toko' => 10, 'harga_modal' => 1000, 'harga_jual' => 2000]);
        $b3 = Barang::create(['nama_barang' => 'Item 3 '.uniqid(), 'stok' => 10, 'stok_toko' => 10, 'harga_modal' => 1000, 'harga_jual' => 2000]);

        // Business line ordering: 3 -> 1 -> 2
        $lines = [
            ['barang_id' => $b3->barang_id, 'jumlah' => 1],
            ['barang_id' => $b1->barang_id, 'jumlah' => 1],
            ['barang_id' => $b2->barang_id, 'jumlah' => 1],
        ];

        $result = $this->action->execute($lines);

        $this->assertEquals($b3->barang_id, $result['items'][0]['barang_id']);
        $this->assertEquals($b1->barang_id, $result['items'][1]['barang_id']);
        $this->assertEquals($b2->barang_id, $result['items'][2]['barang_id']);
    }

    public function test_empty_items_returns_empty_summary(): void
    {
        $result = $this->action->execute([]);

        $this->assertEquals([
            'items' => [],
            'total_harga' => 0.0,
            'total_keuntungan' => 0.0,
        ], $result);
    }

    public function test_later_item_failure_leaves_earlier_item_intact_before_parent_rollback(): void
    {
        $bGood = Barang::create([
            'nama_barang' => 'Good Stock '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);
        $bShort = Barang::create([
            'nama_barang' => 'Short Stock '.uniqid(),
            'stok' => 1,
            'stok_toko' => 1,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);

        DB::beginTransaction();
        try {
            $lines = [
                ['barang_id' => $bGood->barang_id, 'jumlah' => 5],
                ['barang_id' => $bShort->barang_id, 'jumlah' => 5], // Fails
            ];
            $this->action->execute($lines);
            $this->fail('Expected exception was not thrown');
        } catch (Exception $e) {
            DB::rollBack();
        }

        $bGood->refresh();
        $bShort->refresh();
        $this->assertEquals(10, $bGood->stok_toko);
        $this->assertEquals(1, $bShort->stok_toko);
    }
}
