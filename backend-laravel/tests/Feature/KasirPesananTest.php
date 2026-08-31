<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Barang;
use App\Models\Anggota;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class KasirPesananTest extends TestCase
{
    use DatabaseTransactions;

    protected $kasir;
    protected $anggotaUser;
    protected $anggota;
    protected $barang;
    protected $token;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->kasir = User::where('role', 'kasir')->firstOrFail();
        $this->token = $this->kasir->createToken('test_token')->plainTextToken;
        
        $this->anggotaUser = User::where('role', 'anggota')->firstOrFail();
        $this->anggota = Anggota::where('user_id', $this->anggotaUser->user_id)->first();
        if (!$this->anggota) {
            $this->anggota = Anggota::create([
                'user_id' => $this->anggotaUser->user_id,
                'nama_lengkap' => 'Test Anggota',
                'saldo' => 500000,
                'hutang' => 0
            ]);
        }

        $this->barang = Barang::first();
        if (!$this->barang) {
            $this->barang = Barang::create([
                'nama_barang' => 'Barang Test',
                'harga_modal' => 10000,
                'harga_jual' => 15000,
                'stok' => 100,
                'kategori' => 'Umum',
                'satuan' => 'Pcs'
            ]);
        }
    }

    private function createPendingTransaksi($metode = 'cash')
    {
        $trx = Transaksi::create([
            'anggota_id' => $this->anggota->anggota_id,
            'total_harga' => 30000,
            'total_keuntungan' => 10000,
            'metode_pembayaran' => $metode,
            'status' => 'pending'
        ]);

        TransaksiDetail::create([
            'transaksi_id' => $trx->transaksi_id,
            'barang_id' => $this->barang->barang_id,
            'jumlah' => 2,
            'harga_satuan' => 15000,
            'subtotal' => 30000,
            'keuntungan' => 10000
        ]);

        // Deduct stock immediately (simulating the Anggota order flow)
        $this->barang->stok -= 2;
        $this->barang->save();

        if ($metode === 'hutang') {
            $this->anggota->hutang += 30000;
            $this->anggota->save();
        }

        return $trx;
    }

    public function test_kasir_can_get_pending_pesanan()
    {
        $this->createPendingTransaksi();

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/pesanan-anggota');
                         
        if ($response->status() !== 200) dd($response->getContent());
        $response->assertStatus(200)
                 ->assertJsonPath('success', true);
                 
        // We might have more than 1 in the DB if the DB isn't empty, so just check it's an array
        $this->assertIsArray($response->json('data'));
    }

    public function test_kasir_can_approve_bulk_pesanan()
    {
        $trx1 = $this->createPendingTransaksi();
        $trx2 = $this->createPendingTransaksi();

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/simpan-transaksi-kasir', [
                             'transaksi' => [
                                 ['transaksi_id' => $trx1->transaksi_id],
                                 ['transaksi_id' => $trx2->transaksi_id],
                             ]
                         ]);

        if ($response->status() !== 200) dd($response->getContent());
        $response->assertStatus(200)->assertJsonPath('success', true);

        $this->assertDatabaseHas('transaksi', [
            'transaksi_id' => $trx1->transaksi_id,
            'status' => 'selesai',
            'kasir_id' => $this->kasir->user_id
        ]);
        
        $this->assertDatabaseHas('transaksi', [
            'transaksi_id' => $trx2->transaksi_id,
            'status' => 'selesai',
            'kasir_id' => $this->kasir->user_id
        ]);
    }

    public function test_kasir_can_reject_bulk_pesanan_and_restore_stock_and_hutang()
    {
        $stokAwal = $this->barang->stok;
        $hutangAwal = $this->anggota->hutang;

        $trx1 = $this->createPendingTransaksi('hutang');
        $trx2 = $this->createPendingTransaksi('hutang');
        
        // Assert stock and hutang were affected by pending creation
        $this->assertEquals($stokAwal - 4, $this->barang->fresh()->stok);
        $this->assertEquals($hutangAwal + 60000, $this->anggota->fresh()->hutang);

        // Kasir rejects BOTH
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/tolak-pesanan-anggota', [
                             'transaksi_ids' => [$trx1->transaksi_id, $trx2->transaksi_id],
                             'alasan' => 'Stok habis fisik'
                         ]);

        if ($response->status() !== 200) dd($response->getContent());
        $response->assertStatus(200)->assertJsonPath('success', true);

        // Assert transaction is cancelled
        $this->assertDatabaseHas('transaksi', [
            'transaksi_id' => $trx1->transaksi_id,
            'status' => 'batal',
            'kasir_id' => $this->kasir->user_id
        ]);

        // Assert stock is restored back to $stokAwal
        $this->assertEquals($stokAwal, $this->barang->fresh()->stok);

        // Assert hutang is restored back to $hutangAwal
        $this->assertEquals($hutangAwal, $this->anggota->fresh()->hutang);
    }
}
