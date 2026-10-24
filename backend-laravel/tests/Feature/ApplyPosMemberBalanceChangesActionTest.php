<?php

namespace Tests\Feature;

use App\Actions\Members\ApplyPosMemberBalanceChangesAction;
use App\Models\Anggota;
use App\Models\Barang;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\User;
use Exception;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ApplyPosMemberBalanceChangesActionTest extends TestCase
{
    use DatabaseTransactions;

    protected ApplyPosMemberBalanceChangesAction $action;

    protected $kasir;

    protected $kasirToken;

    protected $anggotaUser;

    protected $anggota;

    protected function setUp(): void
    {
        parent::setUp();
        $this->action = app(ApplyPosMemberBalanceChangesAction::class);

        $this->kasir = User::where('role', 'kasir')->first();
        if (! $this->kasir) {
            $this->kasir = User::create([
                'username' => 'kasir_member_test_'.uniqid(),
                'password_hash' => bcrypt('password'),
                'role' => 'kasir',
            ]);
        }
        $this->kasirToken = $this->kasir->createToken('kasir_token')->plainTextToken;

        $this->anggotaUser = User::create([
            'username' => 'anggota_test_'.uniqid(),
            'password_hash' => bcrypt('password'),
            'role' => 'anggota',
        ]);
        $this->anggota = Anggota::create([
            'user_id' => $this->anggotaUser->user_id,
            'nama_lengkap' => 'Anggota Unit Test',
            'saldo' => 200000,
            'simpanan_pokok' => 300000,
            'hutang' => 0,
            'shu' => 50000,
        ]);
    }

    public function test_ewallet_payment_deducts_saldo_correctly(): void
    {
        $this->anggota->saldo = 100000;
        $this->anggota->hutang = 0;
        $this->anggota->save();

        $result = $this->action->execute($this->anggota, 'ewallet', 40000);

        $this->assertSame($this->anggota, $result);
        $this->anggota->refresh();
        $this->assertEquals(60000, (float) $this->anggota->saldo);
    }

    public function test_ewallet_payment_succeeds_even_when_member_has_outstanding_debt(): void
    {
        $this->anggota->saldo = 100000;
        $this->anggota->hutang = 15000;
        $this->anggota->save();

        $result = $this->action->execute($this->anggota, 'ewallet', 40000);

        $this->assertSame($this->anggota, $result);
        $this->anggota->refresh();
        $this->assertEquals(60000, (float) $this->anggota->saldo);
        $this->assertEquals(15000, (float) $this->anggota->hutang);
    }

    public function test_saldo_payment_alias_succeeds_even_when_member_has_outstanding_debt(): void
    {
        $this->anggota->saldo = 100000;
        $this->anggota->hutang = 15000;
        $this->anggota->save();

        $result = $this->action->execute($this->anggota, 'saldo', 40000);

        $this->assertSame($this->anggota, $result);
        $this->anggota->refresh();
        $this->assertEquals(60000, (float) $this->anggota->saldo);
        $this->assertEquals(15000, (float) $this->anggota->hutang);
    }

    public function test_ewallet_payment_fails_when_saldo_is_insufficient(): void
    {
        $this->anggota->saldo = 30000;
        $this->anggota->hutang = 0;
        $this->anggota->save();

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Gagal: Saldo tidak mencukupi. Saldo tersedia: Rp 30.000');

        $this->action->execute($this->anggota, 'ewallet', 50000);
    }

    public function test_hutang_payment_increases_debt_correctly(): void
    {
        $this->anggota->hutang = 0;
        $this->anggota->save();

        $this->action->execute($this->anggota, 'hutang', 75000);

        $this->anggota->refresh();
        $this->assertEquals(75000, (float) $this->anggota->hutang);
    }

    public function test_hutang_payment_fails_when_exceeding_sisa_limit_hutang(): void
    {
        // Plafon is 400.000 (300k simpanan_pokok + 100k allowance). Existing debt 350.000 -> sisa limit 50.000
        $this->anggota->hutang = 350000;
        $this->anggota->save();

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('melebihi sisa limit hutang Rp 50.000');

        $this->action->execute($this->anggota, 'hutang', 60000);
    }

    public function test_hutang_payment_fails_when_member_has_zero_simpanan_pokok(): void
    {
        $this->anggota->simpanan_pokok = 0;
        $this->anggota->hutang = 0;
        $this->anggota->save();

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('melebihi sisa limit hutang Rp 0');

        $this->action->execute($this->anggota, 'hutang', 10000);
    }

    public function test_cash_payment_does_not_mutate_member_balance(): void
    {
        $this->anggota->saldo = 100000;
        $this->anggota->hutang = 50000;
        $this->anggota->shu = 20000;
        $this->anggota->save();

        $this->action->execute($this->anggota, 'cash', 80000);

        $this->anggota->refresh();
        $this->assertEquals(100000, (float) $this->anggota->saldo);
        $this->assertEquals(50000, (float) $this->anggota->hutang);
        $this->assertEquals(20000, (float) $this->anggota->shu);
    }

    public function test_credit_shu_increases_member_shu_balance(): void
    {
        $this->anggota->shu = 50000;
        $this->anggota->save();

        $result = $this->action->creditShu($this->anggota, 18000);

        $this->assertSame($this->anggota, $result);
        $this->anggota->refresh();
        $this->assertEquals(68000, (float) $this->anggota->shu);
    }

    public function test_deduct_tarik_tunai_from_shu_and_saldo(): void
    {
        $this->anggota->shu = 100000;
        $this->anggota->saldo = 100000;
        $this->anggota->save();

        $this->action->deductTarikTunai($this->anggota, 30000, 'shu');
        $this->anggota->refresh();
        $this->assertEquals(70000, (float) $this->anggota->shu);
        $this->assertEquals(100000, (float) $this->anggota->saldo);

        $this->action->deductTarikTunai($this->anggota, 25000, 'saldo');
        $this->anggota->refresh();
        $this->assertEquals(70000, (float) $this->anggota->shu);
        $this->assertEquals(75000, (float) $this->anggota->saldo);
    }

    public function test_action_participates_in_ambient_transaction_and_rolls_back_on_failure(): void
    {
        $this->anggota->saldo = 100000;
        $this->anggota->save();

        DB::beginTransaction();

        $this->action->execute($this->anggota, 'ewallet', 40000);

        $this->anggota->refresh();
        $this->assertEquals(60000, (float) $this->anggota->saldo);

        // Abort ambient transaction
        DB::rollBack();

        $this->anggota->refresh();
        $this->assertEquals(100000, (float) $this->anggota->saldo, 'Member balance mutation must roll back with ambient transaction');
    }

    public function test_pos_checkout_atomicity_rolls_back_member_balance_mutation_if_downstream_fails(): void
    {
        $this->anggota->saldo = 200000;
        $this->anggota->hutang = 0;
        $this->anggota->shu = 100000;
        $this->anggota->save();

        $barang = Barang::create([
            'nama_barang' => 'Barang Atomicity '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 20000,
            'harga_jual' => 30000,
        ]);

        $initialTxCount = Transaksi::count();
        $initialDetailCount = TransaksiDetail::count();

        // Payload with ewallet payment (which deducts saldo during checkout)
        // AND an invalid Tarik Tunai nominal exceeding the proportional limit (max 2x belanja = 60.000)
        // This causes Tarik Tunai validation to fail AFTER payment balance mutation, testing rollback atomicity.
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'ewallet',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 1, // 30.000
                ],
            ],
            'sertakan_tarik_tunai' => true,
            'tarik_tunai_nominal' => 95000, // Exceeds proportional limit (2 * 30.000 = 60.000)
            'tarik_tunai_sumber' => 'shu',
            'persetujuan_shu' => true,
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(400);
        $this->assertStringContainsString('melebihi batas maksimal penarikan SHU', $response->json('message'));

        // Assert that the member saldo was NOT decremented because the entire checkout transaction rolled back
        $this->anggota->refresh();
        $this->assertEquals(200000, (float) $this->anggota->saldo, 'Member saldo must remain intact after downstream rollback');
        $this->assertEquals(100000, (float) $this->anggota->shu, 'Member SHU must remain intact after downstream rollback');

        // Assert inventory was also rolled back
        $barang->refresh();
        $this->assertEquals(20, $barang->stok_toko);

        // Assert no orphaned records
        $this->assertEquals($initialTxCount, Transaksi::count());
        $this->assertEquals($initialDetailCount, TransaksiDetail::count());
    }

    public function test_pos_checkout_enforces_lock_hierarchy_barang_before_anggota(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Lock Hierarchy '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $barang->barang_id, 'jumlah' => 1],
            ],
        ];

        $lockedOrder = [];
        DB::listen(function ($query) use (&$lockedOrder, $barang) {
            $sql = strtolower($query->sql);
            if (str_contains($sql, 'from "barang"') || str_contains($sql, 'from `barang`')) {
                foreach ($query->bindings as $b) {
                    if ($b == $barang->barang_id) {
                        $lockedOrder[] = 'barang';
                    }
                }
            }
            if (str_contains($sql, 'from "anggota"') || str_contains($sql, 'from `anggota`')) {
                foreach ($query->bindings as $b) {
                    if ($b == $this->anggota->anggota_id) {
                        $lockedOrder[] = 'anggota';
                    }
                }
            }
        });

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        $this->assertNotEmpty($lockedOrder);
        $firstLock = $lockedOrder[0];
        $this->assertEquals('barang', $firstLock, 'Barang must be locked before Anggota in canonical hierarchy');
    }

    public function test_pos_checkout_uses_authoritative_price_for_member_balance_mutations(): void
    {
        $this->anggota->saldo = 100000;
        $this->anggota->hutang = 0;
        $this->anggota->save();

        $barang = Barang::create([
            'nama_barang' => 'Barang Price Auth Balance '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 20000,
            'harga_jual' => 35000,
        ]);

        // Client attempts to pass spoofed low price 5.000 instead of catalog 35.000
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'ewallet',
            'items' => [
                [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => 2,
                    'harga_satuan' => 5000, // Spoofed
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Deducted amount must be 2 * 35.000 = 70.000, leaving 30.000 saldo (not 90.000)
        $this->anggota->refresh();
        $this->assertEquals(30000, (float) $this->anggota->saldo);
    }
}
