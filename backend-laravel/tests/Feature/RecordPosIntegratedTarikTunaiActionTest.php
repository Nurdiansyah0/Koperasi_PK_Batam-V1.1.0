<?php

namespace Tests\Feature;

use App\Actions\CashManagement\RecordPosIntegratedTarikTunaiAction;
use App\Actions\Finance\RecordPosShuDistributionAction;
use App\Models\Anggota;
use App\Models\Barang;
use App\Models\ShuDistribusi;
use App\Models\TarikTunai;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;
use Tests\TestCase;

class RecordPosIntegratedTarikTunaiActionTest extends TestCase
{
    use DatabaseTransactions;

    protected RecordPosIntegratedTarikTunaiAction $action;

    protected $kasir;

    protected $kasirToken;

    protected $anggotaUser;

    protected $anggota;

    protected function setUp(): void
    {
        parent::setUp();
        $this->action = app(RecordPosIntegratedTarikTunaiAction::class);

        $this->kasir = User::where('role', 'kasir')->first();
        if (! $this->kasir) {
            $this->kasir = User::create([
                'username' => 'kasir_pos_tt_'.uniqid(),
                'password_hash' => bcrypt('password'),
                'role' => 'kasir',
            ]);
        }
        $this->kasirToken = $this->kasir->createToken('kasir_token')->plainTextToken;

        $this->anggotaUser = User::create([
            'username' => 'anggota_pos_tt_'.uniqid(),
            'password_hash' => bcrypt('password'),
            'role' => 'anggota',
        ]);
        $this->anggota = Anggota::create([
            'user_id' => $this->anggotaUser->id,
            'nomor_anggota' => 'ANG-TT-'.rand(10000, 99999),
            'nama_lengkap' => 'Anggota Test Tarik Tunai '.uniqid(),
            'saldo' => 200000,
            'hutang' => 0,
            'shu' => 200000,
            'limit_hutang' => 500000,
            'sisa_limit_hutang' => 500000,
            'status' => 'aktif',
            'persetujuan_shu_master_at' => Carbon::now(),
            'persetujuan_shu_version' => 'v1.0',
        ]);
    }

    public function test_creates_valid_tarik_tunai_record(): void
    {
        $tarik = $this->action->execute(
            anggotaId: (int) $this->anggota->anggota_id,
            kasirId: (int) $this->kasir->user_id,
            nominal: 60000.0,
            totalBelanja: 30000.0,
            uangBersihDiserahkan: 30000.0,
            sumberDana: 'shu'
        );

        $this->assertInstanceOf(TarikTunai::class, $tarik);
        $this->assertNotNull($tarik->tarik_id);
        $this->assertEquals($this->anggota->anggota_id, $tarik->anggota_id);
        $this->assertEquals($this->kasir->user_id, $tarik->kasir_id);
        $this->assertEquals(60000.0, (float) $tarik->nominal);
        $this->assertEquals('completed', $tarik->status);
        $this->assertEquals('shu', $tarik->sumber_dana);
        $this->assertTrue((bool) $tarik->persetujuan_shu);
        $this->assertNull($tarik->transaksi_id);
        $this->assertNotNull($tarik->approved_at);
        $this->assertStringContainsString('Potong Belanja Rp 30.000', $tarik->keterangan);
        $this->assertStringContainsString('Kas Diserahkan Rp 30.000', $tarik->keterangan);

        $this->assertDatabaseHas('tarik_tunai', [
            'tarik_id' => $tarik->tarik_id,
            'anggota_id' => $this->anggota->anggota_id,
            'nominal' => 60000.0,
            'status' => 'completed',
            'sumber_dana' => 'shu',
        ]);
    }

    public function test_link_transaction_updates_transaksi_id(): void
    {
        $tarik = $this->action->execute(
            anggotaId: (int) $this->anggota->anggota_id,
            kasirId: (int) $this->kasir->user_id,
            nominal: 50000.0,
            totalBelanja: 50000.0,
            uangBersihDiserahkan: 0.0,
            sumberDana: 'saldo'
        );

        $this->assertNull($tarik->transaksi_id);

        $fakeTrxId = 987654;
        $updatedTarik = $this->action->linkTransaction($tarik, $fakeTrxId);

        $this->assertEquals($fakeTrxId, $updatedTarik->transaksi_id);
        $this->assertDatabaseHas('tarik_tunai', [
            'tarik_id' => $tarik->tarik_id,
            'transaksi_id' => $fakeTrxId,
        ]);
    }

    public function test_creates_tarik_tunai_with_immediate_transaksi_id_if_provided(): void
    {
        $fakeTrxId = 555444;
        $tarik = $this->action->execute(
            anggotaId: (int) $this->anggota->anggota_id,
            kasirId: (int) $this->kasir->user_id,
            nominal: 70000.0,
            totalBelanja: 50000.0,
            uangBersihDiserahkan: 20000.0,
            sumberDana: 'shu',
            transaksiId: $fakeTrxId
        );

        $this->assertEquals($fakeTrxId, $tarik->transaksi_id);
        $this->assertDatabaseHas('tarik_tunai', [
            'tarik_id' => $tarik->tarik_id,
            'transaksi_id' => $fakeTrxId,
        ]);
    }

    public function test_action_participates_in_ambient_transaction_and_rolls_back(): void
    {
        DB::beginTransaction();

        $tarik = $this->action->execute(
            anggotaId: (int) $this->anggota->anggota_id,
            kasirId: (int) $this->kasir->user_id,
            nominal: 80000.0,
            totalBelanja: 40000.0,
            uangBersihDiserahkan: 40000.0,
            sumberDana: 'shu'
        );

        $this->assertDatabaseHas('tarik_tunai', [
            'tarik_id' => $tarik->tarik_id,
        ]);

        DB::rollBack();

        $this->assertDatabaseMissing('tarik_tunai', [
            'tarik_id' => $tarik->tarik_id,
        ]);
    }

    public function test_validation_rejects_nominal_less_than_total_belanja(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Nominal penarikan tunai tidak mencukupi untuk menutup total belanja.');

        $this->action->execute(
            anggotaId: (int) $this->anggota->anggota_id,
            kasirId: (int) $this->kasir->user_id,
            nominal: 70000.0,
            totalBelanja: 100000.0,
            uangBersihDiserahkan: 0.0,
            sumberDana: 'shu'
        );
    }

    public function test_validation_rejects_invalid_inputs(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->action->execute(
            anggotaId: 0,
            kasirId: (int) $this->kasir->user_id,
            nominal: 50000.0,
            totalBelanja: 50000.0,
            uangBersihDiserahkan: 0.0
        );
    }

    public function test_validation_rejects_negative_cash_given(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->action->execute(
            anggotaId: (int) $this->anggota->anggota_id,
            kasirId: (int) $this->kasir->user_id,
            nominal: 100000.0,
            totalBelanja: 100000.0,
            uangBersihDiserahkan: -5000.0
        );
    }

    public function test_link_transaction_rejects_invalid_transaksi_id(): void
    {
        $tarik = $this->action->execute(
            anggotaId: (int) $this->anggota->anggota_id,
            kasirId: (int) $this->kasir->user_id,
            nominal: 50000.0,
            totalBelanja: 50000.0,
            uangBersihDiserahkan: 0.0
        );

        $this->expectException(InvalidArgumentException::class);
        $this->action->linkTransaction($tarik, 0);
    }

    public function test_action_does_not_mutate_member_balance_directly(): void
    {
        $initialSaldo = (float) $this->anggota->saldo;
        $initialShu = (float) $this->anggota->shu;
        $initialHutang = (float) $this->anggota->hutang;

        $this->action->execute(
            anggotaId: (int) $this->anggota->anggota_id,
            kasirId: (int) $this->kasir->user_id,
            nominal: 60000.0,
            totalBelanja: 30000.0,
            uangBersihDiserahkan: 30000.0,
            sumberDana: 'shu'
        );

        $this->anggota->refresh();
        $this->assertEquals($initialSaldo, (float) $this->anggota->saldo, 'Cash Management Action must not mutate member saldo');
        $this->assertEquals($initialShu, (float) $this->anggota->shu, 'Cash Management Action must not mutate member SHU');
        $this->assertEquals($initialHutang, (float) $this->anggota->hutang, 'Cash Management Action must not mutate member hutang');
    }

    public function test_pos_checkout_equal_value_tarik_tunai_succeeds_with_zero_cash_given(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Equal TT '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 70000,
            'harga_jual' => 100000,
        ]);

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $barang->barang_id, 'jumlah' => 1],
            ],
            'sertakan_tarik_tunai' => true,
            'tarik_tunai_nominal' => 100000, // equal to total belanja 100.000
            'tarik_tunai_sumber' => 'shu',
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);
        $trxId = $response->json('transaksi_id');

        // Cash given must be exactly 0
        $this->assertEquals(0, $response->json('tarik_tunai.uang_bersih_diserahkan'));
        $this->assertEquals(100000, $response->json('tarik_tunai.nominal_tarik'));
        $this->assertEquals(100000, $response->json('tarik_tunai.potong_belanja'));

        // Tarik tunai record persisted and linked to transaction
        $this->assertDatabaseHas('tarik_tunai', [
            'transaksi_id' => $trxId,
            'anggota_id' => $this->anggota->anggota_id,
            'kasir_id' => $this->kasir->user_id,
            'nominal' => 100000,
            'status' => 'completed',
            'sumber_dana' => 'shu',
        ]);
    }

    public function test_pos_checkout_greater_value_tarik_tunai_succeeds_with_calculated_cash_given(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Greater TT '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 30000,
            'harga_jual' => 50000,
        ]);

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $barang->barang_id, 'jumlah' => 1], // Belanja 50.000
            ],
            'sertakan_tarik_tunai' => true,
            'tarik_tunai_nominal' => 80000, // 80.000 > 50.000, and <= min(100k, 2*50k=100k)
            'tarik_tunai_sumber' => 'shu',
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);
        $trxId = $response->json('transaksi_id');

        // Cash given: 80.000 - 50.000 = 30.000
        $this->assertEquals(30000, $response->json('tarik_tunai.uang_bersih_diserahkan'));
        $this->assertEquals(80000, $response->json('tarik_tunai.nominal_tarik'));
        $this->assertEquals(50000, $response->json('tarik_tunai.potong_belanja'));

        $this->assertDatabaseHas('tarik_tunai', [
            'transaksi_id' => $trxId,
            'nominal' => 80000,
            'status' => 'completed',
        ]);
    }

    public function test_pos_checkout_rejects_tarik_tunai_lower_than_total_belanja_and_rolls_back(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Undercover TT '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 70000,
            'harga_jual' => 100000,
        ]);

        $initialSaldo = (float) $this->anggota->saldo;
        $initialShu = (float) $this->anggota->shu;
        $initialTxCount = Transaksi::count();
        $initialDetailCount = TransaksiDetail::count();
        $initialTarikCount = TarikTunai::count();
        $initialShuDistCount = DB::table('shu_distribusi')->count();

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $barang->barang_id, 'jumlah' => 1], // Belanja 100.000
            ],
            'sertakan_tarik_tunai' => true,
            'tarik_tunai_nominal' => 70000, // Undercover: 70.000 < 100.000 (Kurang 30.000)
            'tarik_tunai_sumber' => 'shu',
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(400);
        $this->assertStringContainsString('tidak mencukupi untuk menutup total belanja', $response->json('message'));
        $this->assertStringContainsString('Kurang Rp 30.000', $response->json('message'));

        // Assert zero persistence and zero mutations
        $this->assertEquals($initialTxCount, Transaksi::count(), 'No transaction must be persisted');
        $this->assertEquals($initialDetailCount, TransaksiDetail::count(), 'No transaction details must be persisted');
        $this->assertEquals($initialTarikCount, TarikTunai::count(), 'No TarikTunai ticket must be persisted');
        $this->assertEquals($initialShuDistCount, DB::table('shu_distribusi')->count(), 'No SHU distribution must be persisted');

        // Assert member balances rolled back
        $this->anggota->refresh();
        $this->assertEquals($initialSaldo, (float) $this->anggota->saldo, 'Member saldo must remain intact');
        $this->assertEquals($initialShu, (float) $this->anggota->shu, 'Member SHU must remain intact');

        // Assert inventory stock rolled back
        $barang->refresh();
        $this->assertEquals(10, $barang->stok_toko, 'Inventory store stock must remain intact');
    }

    public function test_pos_checkout_atomicity_rolls_back_tarik_tunai_when_downstream_fails(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Atomicity TT '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 30000,
            'harga_jual' => 50000,
        ]);

        $initialSaldo = (float) $this->anggota->saldo;
        $initialShu = (float) $this->anggota->shu;
        $initialTxCount = Transaksi::count();
        $initialDetailCount = TransaksiDetail::count();
        $initialTarikCount = TarikTunai::count();
        $initialShuDistCount = DB::table('shu_distribusi')->count();

        // Bind a decorated Finance Action that throws an exception to trigger parent transaction rollback
        $failingFinanceAction = new class extends RecordPosShuDistributionAction
        {
            public function execute(
                int $anggotaId,
                float $shu60,
                float $shu10,
                float $shu30,
                ?string $tahun = null,
                mixed $createdAt = null
            ): ShuDistribusi {
                throw new RuntimeException('Simulated downstream failure after TarikTunai persistence');
            }
        };

        $this->app->instance(RecordPosShuDistributionAction::class, $failingFinanceAction);

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $barang->barang_id, 'jumlah' => 1], // 50.000
            ],
            'sertakan_tarik_tunai' => true,
            'tarik_tunai_nominal' => 80000, // Valid withdrawal
            'tarik_tunai_sumber' => 'shu',
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(400);
        $this->assertStringContainsString('Simulated downstream failure after TarikTunai persistence', $response->json('message'));

        // Verify that the TarikTunai ticket rolled back completely
        $this->assertEquals($initialTarikCount, TarikTunai::count(), 'TarikTunai ticket must be rolled back');
        $this->assertEquals($initialTxCount, Transaksi::count(), 'Transaksi header must be rolled back');
        $this->assertEquals($initialDetailCount, TransaksiDetail::count(), 'TransaksiDetail must be rolled back');
        $this->assertEquals($initialShuDistCount, DB::table('shu_distribusi')->count(), 'SHU distribution must be rolled back');

        // Verify member balances rolled back
        $this->anggota->refresh();
        $this->assertEquals($initialSaldo, (float) $this->anggota->saldo, 'Member saldo must roll back');
        $this->assertEquals($initialShu, (float) $this->anggota->shu, 'Member SHU must roll back');

        // Verify inventory rolled back
        $barang->refresh();
        $this->assertEquals(10, $barang->stok_toko, 'Inventory store stock must roll back');
    }

    public function test_pos_checkout_does_not_create_duplicate_tarik_tunai_tickets(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang No Duplicate TT '.uniqid(),
            'stok' => 10,
            'stok_toko' => 10,
            'harga_modal' => 20000,
            'harga_jual' => 30000,
        ]);

        $initialTarikCount = TarikTunai::count();

        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                ['barang_id' => $barang->barang_id, 'jumlah' => 1],
            ],
            'sertakan_tarik_tunai' => true,
            'tarik_tunai_nominal' => 50000,
            'tarik_tunai_sumber' => 'shu',
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Exactly one new record must be created
        $this->assertEquals($initialTarikCount + 1, TarikTunai::count());
    }
}
