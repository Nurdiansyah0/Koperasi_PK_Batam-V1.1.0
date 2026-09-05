<?php

namespace Tests\Feature;

use App\Actions\Finance\RecordPosShuDistributionAction;
use App\Models\Anggota;
use App\Models\Barang;
use App\Models\ShuDistribusi;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;
use Tests\TestCase;

class RecordPosShuDistributionActionTest extends TestCase
{
    use DatabaseTransactions;

    protected RecordPosShuDistributionAction $action;

    protected $kasir;

    protected $kasirToken;

    protected $anggotaUser;

    protected $anggota;

    protected function setUp(): void
    {
        parent::setUp();
        $this->action = app(RecordPosShuDistributionAction::class);

        $this->kasir = User::where('role', 'kasir')->first();
        if (! $this->kasir) {
            $this->kasir = User::create([
                'username' => 'kasir_shu_test_'.uniqid(),
                'password_hash' => bcrypt('password'),
                'role' => 'kasir',
            ]);
        }
        $this->kasirToken = $this->kasir->createToken('kasir_token')->plainTextToken;

        $this->anggotaUser = User::create([
            'username' => 'anggota_shu_test_'.uniqid(),
            'password_hash' => bcrypt('password'),
            'role' => 'anggota',
        ]);
        $this->anggota = Anggota::create([
            'user_id' => $this->anggotaUser->id,
            'nomor_anggota' => 'ANG-SHU-'.rand(10000, 99999),
            'nama_lengkap' => 'Anggota Test SHU '.uniqid(),
            'saldo' => 200000,
            'hutang' => 0,
            'shu' => 50000,
            'limit_hutang' => 500000,
            'sisa_limit_hutang' => 500000,
            'status' => 'aktif',
        ]);
    }

    public function test_creates_valid_shu_distribusi_record(): void
    {
        $record = $this->action->execute(
            (int) $this->anggota->anggota_id,
            6000.0,
            1000.0,
            3000.0
        );

        $this->assertInstanceOf(ShuDistribusi::class, $record);
        $this->assertNotNull($record->shu_id);
        $this->assertEquals($this->anggota->anggota_id, $record->anggota_id);
        $this->assertEquals(date('Y'), $record->tahun);
        $this->assertEquals(6000.0, (float) $record->shu_60_percent);
        $this->assertEquals(1000.0, (float) $record->shu_10_percent);
        $this->assertEquals(3000.0, (float) $record->shu_30_percent);
        $this->assertNotNull($record->created_at);

        $this->assertDatabaseHas('shu_distribusi', [
            'shu_id' => $record->shu_id,
            'anggota_id' => $this->anggota->anggota_id,
            'tahun' => date('Y'),
            'shu_60_percent' => 6000.0,
            'shu_10_percent' => 1000.0,
            'shu_30_percent' => 3000.0,
        ]);
    }

    public function test_preserves_exact_60_10_30_values_with_fractional_amounts(): void
    {
        $record = $this->action->execute(
            (int) $this->anggota->anggota_id,
            12345.67,
            2057.61,
            6172.84
        );

        $this->assertEquals(12345.67, (float) $record->shu_60_percent);
        $this->assertEquals(2057.61, (float) $record->shu_10_percent);
        $this->assertEquals(6172.84, (float) $record->shu_30_percent);

        $this->assertDatabaseHas('shu_distribusi', [
            'shu_id' => $record->shu_id,
            'anggota_id' => $this->anggota->anggota_id,
            'shu_60_percent' => 12345.67,
            'shu_10_percent' => 2057.61,
            'shu_30_percent' => 6172.84,
        ]);
    }

    public function test_preserves_custom_year_when_provided(): void
    {
        $customYear = '2024';
        $record = $this->action->execute(
            (int) $this->anggota->anggota_id,
            6000.0,
            1000.0,
            3000.0,
            $customYear
        );

        $this->assertEquals('2024', $record->tahun);
        $this->assertDatabaseHas('shu_distribusi', [
            'shu_id' => $record->shu_id,
            'tahun' => '2024',
        ]);
    }

    public function test_defaults_to_current_year_when_tahun_is_null(): void
    {
        $record = $this->action->execute(
            (int) $this->anggota->anggota_id,
            6000.0,
            1000.0,
            3000.0,
            null
        );

        $this->assertEquals(date('Y'), $record->tahun);
    }

    public function test_preserves_custom_timestamp_when_provided(): void
    {
        $customTime = Carbon::parse('2025-06-15 10:30:00');
        $record = $this->action->execute(
            (int) $this->anggota->anggota_id,
            6000.0,
            1000.0,
            3000.0,
            '2025',
            $customTime
        );

        $this->assertEquals('2025-06-15 10:30:00', Carbon::parse($record->created_at)->toDateTimeString());
    }

    public function test_defaults_to_current_timestamp_when_created_at_is_null(): void
    {
        $before = now()->subSecond();
        $record = $this->action->execute(
            (int) $this->anggota->anggota_id,
            6000.0,
            1000.0,
            3000.0
        );
        $after = now()->addSecond();

        $createdAt = Carbon::parse($record->created_at);
        $this->assertTrue($createdAt->between($before, $after));
    }

    public function test_action_does_not_mutate_member_shu_or_balances(): void
    {
        $initialShu = (float) $this->anggota->shu;
        $initialSaldo = (float) $this->anggota->saldo;
        $initialHutang = (float) $this->anggota->hutang;

        $this->action->execute(
            (int) $this->anggota->anggota_id,
            6000.0,
            1000.0,
            3000.0
        );

        $this->anggota->refresh();
        $this->assertEquals($initialShu, (float) $this->anggota->shu, 'Finance Action must not mutate member SHU');
        $this->assertEquals($initialSaldo, (float) $this->anggota->saldo, 'Finance Action must not mutate member saldo');
        $this->assertEquals($initialHutang, (float) $this->anggota->hutang, 'Finance Action must not mutate member hutang');
    }

    public function test_validation_rejects_invalid_anggota_id(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Anggota ID must be a positive integer.');

        $this->action->execute(0, 6000.0, 1000.0, 3000.0);
    }

    public function test_validation_rejects_negative_distribution_amounts(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('SHU distribution amounts cannot be negative.');

        $this->action->execute((int) $this->anggota->anggota_id, -100.0, 1000.0, 3000.0);
    }

    public function test_participates_in_ambient_transaction_and_rolls_back(): void
    {
        DB::beginTransaction();

        $record = $this->action->execute(
            (int) $this->anggota->anggota_id,
            9000.0,
            1500.0,
            4500.0
        );

        $this->assertDatabaseHas('shu_distribusi', [
            'shu_id' => $record->shu_id,
            'shu_60_percent' => 9000.0,
        ]);

        DB::rollBack();

        $this->assertDatabaseMissing('shu_distribusi', [
            'shu_id' => $record->shu_id,
        ]);
    }

    public function test_pos_checkout_integrates_finance_action_on_positive_profit(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Pos SHU '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 5000,
            'harga_jual' => 15000, // profit = 10.000 per unit
        ]);

        $initialShuDistCount = DB::table('shu_distribusi')->count();

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $barang->barang_id, 'jumlah' => 2], // total profit = 20.000
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // 60% = 12.000, 10% = 2.000, 30% = 6.000
        $this->assertEquals($initialShuDistCount + 1, DB::table('shu_distribusi')->count());
        $this->assertDatabaseHas('shu_distribusi', [
            'anggota_id' => $this->anggota->anggota_id,
            'tahun' => date('Y'),
            'shu_60_percent' => 12000.0,
            'shu_10_percent' => 2000.0,
            'shu_30_percent' => 6000.0,
        ]);
    }

    public function test_pos_checkout_does_not_create_distribution_when_profit_is_zero(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Zero Profit '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 10000,
            'harga_jual' => 10000, // profit = 0
        ]);

        $initialShuDistCount = DB::table('shu_distribusi')->count();

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $barang->barang_id, 'jumlah' => 1],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        $this->assertEquals($initialShuDistCount, DB::table('shu_distribusi')->count());
    }

    public function test_pos_checkout_does_not_create_distribution_when_no_member_associated(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Non Member '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);

        $initialShuDistCount = DB::table('shu_distribusi')->count();

        $payload = [
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $barang->barang_id, 'jumlah' => 1],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(400);
        $this->assertStringContainsString('wajib memilih Anggota Koperasi', $response->json('message'));

        $this->assertEquals($initialShuDistCount, DB::table('shu_distribusi')->count());
    }

    public function test_pos_checkout_atomicity_rolls_back_finance_distribution_when_downstream_fails(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Atomicity SHU '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 5000,
            'harga_jual' => 15000,
        ]);

        $initialSaldo = (float) $this->anggota->saldo;
        $initialShu = (float) $this->anggota->shu;
        $initialTxCount = Transaksi::count();
        $initialDetailCount = TransaksiDetail::count();
        $initialShuDistCount = DB::table('shu_distribusi')->count();

        // Bind a decorated Action that performs the real insertion but throws immediately before POS commit
        $failingAction = new class extends RecordPosShuDistributionAction
        {
            public function execute(
                int $anggotaId,
                float $shu60,
                float $shu10,
                float $shu30,
                ?string $tahun = null,
                mixed $createdAt = null
            ): ShuDistribusi {
                // Execute genuine insertion within parent transaction
                parent::execute($anggotaId, $shu60, $shu10, $shu30, $tahun, $createdAt);

                // Throw exception to trigger parent transaction rollback
                throw new RuntimeException('Simulated failure after SHU distribution insertion');
            }
        };

        $this->app->instance(RecordPosShuDistributionAction::class, $failingAction);

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'ewallet',
            'items' => [
                ['barang_id' => $barang->barang_id, 'jumlah' => 1], // price: 15.000, profit: 10.000
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(400);
        $this->assertStringContainsString('Simulated failure after SHU distribution insertion', $response->json('message'));

        // Verify that shu_distribusi insertion rolled back completely
        $this->assertEquals($initialShuDistCount, DB::table('shu_distribusi')->count(), 'SHU distribution record must roll back');

        // Verify member balances rolled back
        $this->anggota->refresh();
        $this->assertEquals($initialSaldo, (float) $this->anggota->saldo, 'Member saldo must roll back');
        $this->assertEquals($initialShu, (float) $this->anggota->shu, 'Member SHU must roll back');

        // Verify inventory rolled back
        $barang->refresh();
        $this->assertEquals(10, $barang->stok_toko, 'Inventory stock must roll back');

        // Verify transaction header and details rolled back
        $this->assertEquals($initialTxCount, Transaksi::count());
        $this->assertEquals($initialDetailCount, TransaksiDetail::count());
    }
}
