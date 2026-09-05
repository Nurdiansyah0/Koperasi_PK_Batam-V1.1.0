<?php

namespace Tests\Feature;

use App\Models\Anggota;
use App\Models\Barang;
use App\Models\TransaksiDetail;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PosLockOrderingTest extends TestCase
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
                'username' => 'kasir_lock_test',
                'password_hash' => bcrypt('password'),
                'role' => 'kasir',
            ]);
        }
        $this->kasirToken = $this->kasir->createToken('kasir_token')->plainTextToken;

        $this->anggota = Anggota::first();
        if (! $this->anggota) {
            $this->anggotaUser = User::create([
                'username' => 'anggota_lock_test',
                'password_hash' => bcrypt('password'),
                'role' => 'anggota',
            ]);
            $this->anggota = Anggota::create([
                'user_id' => $this->anggotaUser->user_id,
                'nama_lengkap' => 'Anggota Lock Test',
                'saldo' => 100000,
                'hutang' => 0,
                'shu' => 50000,
            ]);
        }
    }

    public function test_pos_checkout_acquires_barang_locks_in_ascending_order_regardless_of_payload_order(): void
    {
        $b1 = Barang::create([
            'nama_barang' => 'Barang A '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);

        $b2 = Barang::create([
            'nama_barang' => 'Barang B '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 6000,
            'harga_jual' => 12000,
        ]);

        $lowId = min($b1->barang_id, $b2->barang_id);
        $highId = max($b1->barang_id, $b2->barang_id);

        // Client payload explicitly places HIGH id first, then LOW id
        $payload = [
            'anggota_id' => $this->anggota->anggota_id,
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $highId,
                    'jumlah' => 1,
                    'harga_satuan' => 12000,
                ],
                [
                    'barang_id' => $lowId,
                    'jumlah' => 2,
                    'harga_satuan' => 10000,
                ],
            ],
        ];

        $lockedBarangSequence = [];

        DB::listen(function ($query) use (&$lockedBarangSequence, $lowId, $highId) {
            $sql = strtolower($query->sql);
            if (str_contains($sql, 'from "barang"') || str_contains($sql, 'from `barang`')) {
                foreach ($query->bindings as $binding) {
                    if ($binding == $lowId || $binding == $highId) {
                        $lockedBarangSequence[] = (int) $binding;
                    }
                }
            }
        });

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Assert that lock query for lowId executed BEFORE highId
        $firstLockedId = $lockedBarangSequence[0] ?? null;
        $secondLockedId = $lockedBarangSequence[1] ?? null;

        $this->assertEquals($lowId, $firstLockedId, 'Lowest barang_id must be locked first.');
        $this->assertEquals($highId, $secondLockedId, 'Highest barang_id must be locked second.');

        // Assert that transaction details still preserve original client payload order (highId first)
        $txId = $response->json('transaksi_id');
        $details = TransaksiDetail::where('transaksi_id', $txId)->orderBy('detail_id', 'asc')->get();
        $this->assertEquals($highId, $details[0]->barang_id, 'Detail row 1 must match client payload item 1.');
        $this->assertEquals($lowId, $details[1]->barang_id, 'Detail row 2 must match client payload item 2.');
    }

    public function test_pos_checkout_locks_barang_before_anggota_canonical_hierarchy(): void
    {
        $barang = Barang::create([
            'nama_barang' => 'Barang Hierarchy '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);

        $queryOrder = [];

        DB::listen(function ($query) use (&$queryOrder) {
            $sql = strtolower($query->sql);
            if (str_contains($sql, 'from "barang"') || str_contains($sql, 'from `barang`')) {
                $queryOrder[] = 'barang';
            } elseif (str_contains($sql, 'from "anggota"') || str_contains($sql, 'from `anggota`')) {
                $queryOrder[] = 'anggota';
            }
        });

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
        ];

        $response = $this->withHeader('Authorization', "Bearer {$this->kasirToken}")
            ->postJson('/laravel/api/kasir/buat-transaksi', $payload);

        $response->assertStatus(200);

        // Find first occurrence of 'barang' and 'anggota'
        $firstBarangIdx = array_search('barang', $queryOrder);
        $firstAnggotaIdx = array_search('anggota', $queryOrder);

        $this->assertNotFalse($firstBarangIdx, 'Barang query must have executed.');
        $this->assertNotFalse($firstAnggotaIdx, 'Anggota query must have executed.');
        $this->assertLessThan($firstAnggotaIdx, $firstBarangIdx, 'Barang lock must precede Anggota lock under canonical hierarchy.');
    }

    public function test_member_order_simpan_transaksi_follows_same_canonical_lock_hierarchy(): void
    {
        $b1 = Barang::create([
            'nama_barang' => 'Barang Mobile A '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 5000,
            'harga_jual' => 10000,
        ]);

        $b2 = Barang::create([
            'nama_barang' => 'Barang Mobile B '.uniqid(),
            'stok' => 20,
            'stok_toko' => 20,
            'harga_modal' => 6000,
            'harga_jual' => 12000,
        ]);

        $lowId = min($b1->barang_id, $b2->barang_id);
        $highId = max($b1->barang_id, $b2->barang_id);

        $memberUser = User::where('user_id', $this->anggota->user_id)->first();
        if (! $memberUser) {
            $memberUser = User::create([
                'username' => 'member_mobile_'.uniqid(),
                'password_hash' => bcrypt('password'),
                'role' => 'anggota',
            ]);
            $this->anggota->user_id = $memberUser->user_id;
            $this->anggota->save();
        }
        $memberToken = $memberUser->createToken('member_token')->plainTextToken;

        $lockedSequence = [];
        $resourceTypeOrder = [];

        DB::listen(function ($query) use (&$lockedSequence, &$resourceTypeOrder, $lowId, $highId) {
            $sql = strtolower($query->sql);
            if (str_contains($sql, 'from "barang"') || str_contains($sql, 'from `barang`')) {
                $resourceTypeOrder[] = 'barang';
                foreach ($query->bindings as $binding) {
                    if ($binding == $lowId || $binding == $highId) {
                        $lockedSequence[] = (int) $binding;
                    }
                }
            } elseif ((str_contains($sql, 'from "anggota"') || str_contains($sql, 'from `anggota`'))
                && (str_contains($sql, 'anggota_id') && ! str_contains($sql, 'user_id'))) {
                $resourceTypeOrder[] = 'anggota';
            }
        });

        // Client payload places HIGH id first
        $payload = [
            'metode_pembayaran' => 'cash',
            'items' => [
                [
                    'barang_id' => $highId,
                    'jumlah' => 1,
                ],
                [
                    'barang_id' => $lowId,
                    'jumlah' => 1,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$memberToken}")
            ->postJson('/laravel/api/anggota/transaksi', $payload);

        $response->assertStatus(200);

        // 1. Assert ascending Barang locking
        $this->assertEquals($lowId, $lockedSequence[0] ?? null, 'Mobile order must lock lowest barang_id first.');
        $this->assertEquals($highId, $lockedSequence[1] ?? null, 'Mobile order must lock highest barang_id second.');

        // 2. Assert Barang locked before Anggota (canonical alignment)
        $firstBarang = array_search('barang', $resourceTypeOrder);
        $firstAnggota = array_search('anggota', $resourceTypeOrder);
        $this->assertLessThan($firstAnggota, $firstBarang, 'Mobile order must lock Barang before Anggota to prevent lock hierarchy inversion.');
    }
}
