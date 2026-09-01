<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Barang;
use App\Models\Anggota;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\PembayaranHutang;
use App\Models\SetoranKasir;
use App\Models\SerahTerimaKasir;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class KasirCompleteTest extends TestCase
{
    use DatabaseTransactions;

    protected $kasir;
    protected $token;
    protected $anggota;

    protected function setUp(): void
    {
        parent::setUp();
        $this->kasir = User::where('role', 'kasir')->firstOrFail();
        $this->token = $this->kasir->createToken('test_token')->plainTextToken;
        $this->anggota = Anggota::firstOrFail();
    }

    // 1. checkKasir - unauthorized
    public function test_unauthorized_user_cannot_access_kasir_routes()
    {
        $user = User::create(['username' => 'test_anggota_role_'.rand(), 'password' => bcrypt('12345'), 'role' => 'anggota']);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
                         ->getJson('/laravel/api/kasir/dashboard');
        $response->assertStatus(403);
    }

    // 2. getTransaksiTerbaru
    public function test_get_transaksi_terbaru()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/transaksi-terbaru');
        $response->assertStatus(200)->assertJsonStructure(['success', 'data']);
    }

    // 3. getDataBarangBelanjaKasir
    public function test_get_data_barang_belanja_kasir()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/barang-belanja');
        $response->assertStatus(200)->assertJsonStructure(['success', 'data']);
    }

    // 4. tolakPesananAnggota - branches
    public function test_tolak_pesanan_anggota_empty_payload()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/tolak-pesanan-anggota', []);
        $response->assertStatus(400)->assertJson(['success' => false, 'message' => 'Tidak ada ID transaksi']);
    }

    public function test_tolak_pesanan_anggota_with_ewallet_and_transaksi_ids_array()
    {
        $barang = Barang::where('stok', '>', 0)->first();
        $trx = Transaksi::create([
            'anggota_id' => $this->anggota->anggota_id,
            'kasir_id' => null,
            'total_harga' => $barang->harga_jual,
            'total_keuntungan' => $barang->harga_jual - $barang->harga_modal,
            'metode_pembayaran' => 'ewallet',
            'status' => 'pending',
        ]);
        TransaksiDetail::create([
            'transaksi_id' => $trx->transaksi_id,
            'barang_id' => $barang->barang_id,
            'jumlah' => 1,
            'harga_satuan' => $barang->harga_jual,
            'subtotal' => $barang->harga_jual,
            'keuntungan' => $barang->harga_jual - $barang->harga_modal,
        ]);
        $initialSaldo = $this->anggota->saldo;

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/tolak-pesanan-anggota', ['transaksi_ids' => [$trx->transaksi_id]]);
        $response->assertStatus(200);

        $this->anggota->refresh();
        $this->assertEquals($initialSaldo + $trx->total_harga, $this->anggota->saldo);
    }

    public function test_tolak_pesanan_anggota_with_singular_id()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/tolak-pesanan-anggota', ['transaksi_id' => 9999]);
        $response->assertStatus(200);
    }

    public function test_tolak_pesanan_anggota_exception()
    {
        $trx = Transaksi::create([
            'anggota_id' => $this->anggota->anggota_id,
            'total_harga' => 10000,
            'metode_pembayaran' => 'cash',
            'status' => 'pending'
        ]);
        
        $barang = Barang::first();
        TransaksiDetail::create([
            'transaksi_id' => $trx->transaksi_id,
            'barang_id' => $barang->barang_id,
            'jumlah' => 1,
            'harga_satuan' => 10000,
            'subtotal' => 10000
        ]);

        Barang::saving(function () {
            throw new \Exception('Simulated model failure');
        });

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/tolak-pesanan-anggota', ['transaksi_ids' => [$trx->transaksi_id]]);
        
        $response->assertStatus(500)
                 ->assertJson(['success' => false, 'message' => 'Simulated model failure']);

        Barang::flushEventListeners();
        Barang::boot();
    }

    // 5. simpanTransaksiKasir empty
    public function test_simpan_transaksi_kasir_empty()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/simpan-transaksi-kasir', ['transaksi' => []]);
        $response->assertStatus(400);
    }

    public function test_simpan_transaksi_kasir_exception()
    {
        $trx = Transaksi::create([
            'anggota_id' => $this->anggota->anggota_id,
            'total_harga' => 10000,
            'metode_pembayaran' => 'cash',
            'status' => 'pending'
        ]);

        Transaksi::saving(function () {
            throw new \Exception('Simulated model failure');
        });

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/simpan-transaksi-kasir', [
                             'transaksi' => [
                                 ['transaksi_id' => $trx->transaksi_id]
                             ]
                         ]);
        
        $response->assertStatus(500)
                 ->assertJson(['success' => false, 'message' => 'Simulated model failure']);

        Transaksi::flushEventListeners();
        Transaksi::boot();
    }

    // 6. buatTransaksiKasir branches
    public function test_buat_transaksi_kasir_ewallet_success()
    {
        $barang = Barang::where('stok', '>', 0)->first();
        $this->anggota->hutang = 0;
        $this->anggota->saldo = 10000000;
        $this->anggota->save();

        $payload = [
            'metode_pembayaran' => 'ewallet',
            'anggota_id' => $this->anggota->anggota_id,
            'items' => [['barang_id' => $barang->barang_id, 'jumlah' => 1, 'harga_satuan' => $barang->harga_jual]]
        ];
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/buat-transaksi', $payload);
        $response->assertStatus(200);
    }

    public function test_buat_transaksi_kasir_ewallet_missing_anggota()
    {
        $barang = Barang::where('stok', '>', 0)->first();
        $payload = [
            'metode_pembayaran' => 'ewallet',
            'items' => [['barang_id' => $barang->barang_id, 'jumlah' => 1]]
        ];
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/buat-transaksi', $payload);
        $response->assertStatus(400);
    }

    public function test_buat_transaksi_kasir_ewallet_has_hutang()
    {
        $barang = Barang::where('stok', '>', 0)->first();
        $this->anggota->hutang = 50000;
        $this->anggota->save();
        $payload = [
            'metode_pembayaran' => 'ewallet',
            'anggota_id' => $this->anggota->anggota_id,
            'items' => [['barang_id' => $barang->barang_id, 'jumlah' => 1]]
        ];
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/buat-transaksi', $payload);
        $response->assertStatus(400);
    }

    public function test_buat_transaksi_kasir_ewallet_insufficient_saldo()
    {
        $barang = Barang::where('stok', '>', 0)->first();
        $this->anggota->hutang = 0;
        $this->anggota->saldo = 0; // Insufficient
        $this->anggota->save();
        $payload = [
            'metode_pembayaran' => 'ewallet',
            'anggota_id' => $this->anggota->anggota_id,
            'items' => [['barang_id' => $barang->barang_id, 'jumlah' => 1, 'harga_satuan' => 500000]]
        ];
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/buat-transaksi', $payload);
        $response->assertStatus(400);
    }

    public function test_buat_transaksi_kasir_hutang_limit_exceeded()
    {
        $barang = Barang::where('stok', '>', 0)->first();
        $this->anggota->saldo = 0;
        $this->anggota->hutang = 100000;
        $this->anggota->save();
        $payload = [
            'metode_pembayaran' => 'hutang',
            'anggota_id' => $this->anggota->anggota_id,
            'items' => [['barang_id' => $barang->barang_id, 'jumlah' => 1]]
        ];
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/buat-transaksi', $payload);
        $response->assertStatus(400);
    }

    // 7. getAllAnggota
    public function test_get_all_anggota()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/all-anggota');
        $response->assertStatus(200);
    }

    // 8. cariProfilAnggota
    public function test_cari_profil_anggota_by_id()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/cari-profil-anggota?anggota_id=' . $this->anggota->anggota_id);
        $response->assertStatus(200);
    }
    public function test_cari_profil_anggota_by_search()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/cari-profil-anggota?search=' . $this->anggota->nama_lengkap);
        $response->assertStatus(200);
    }
    public function test_cari_profil_anggota_not_found()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/cari-profil-anggota?anggota_id=999999');
        $response->assertStatus(404);
    }

    // 9. getAllPembayaranHutang
    public function test_get_all_pembayaran_hutang()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/all-pembayaran-hutang');
        $response->assertStatus(200);
    }

    // 10. approvePembayaranHutang
    public function test_approve_pembayaran_hutang()
    {
        $id = \Illuminate\Support\Facades\DB::table('pembayaran_hutang')->insertGetId([
            'anggota_id' => $this->anggota->anggota_id,
            'nominal' => 10000,
            'status' => 'pending',
            'created_at' => now(),
        ]);
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/approve-pembayaran-hutang', [
                             'pembayaran_id' => $id,
                             'action' => 'approve'
                         ]);
        $response->assertStatus(200);
    }
    public function test_reject_pembayaran_hutang()
    {
        $id = \Illuminate\Support\Facades\DB::table('pembayaran_hutang')->insertGetId([
            'anggota_id' => $this->anggota->anggota_id,
            'nominal' => 10000,
            'status' => 'pending',
            'created_at' => now(),
        ]);
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/approve-pembayaran-hutang', [
                             'pembayaran_id' => $id,
                             'action' => 'reject'
                         ]);
        $response->assertStatus(200);
    }
    public function test_approve_invalid_pembayaran_hutang()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/approve-pembayaran-hutang', [
                             'pembayaran_id' => 9999,
                             'action' => 'approve'
                         ]);
        $response->assertStatus(400);
    }

    // 11. getHistoryTransaksi
    public function test_get_history_transaksi()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/history-transaksi', ['status' => 'selesai']);
        $response->assertStatus(200);
    }

    // 12. setorAdmin
    public function test_setor_admin()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/setor-admin', ['nominal' => 50000]);
        $response->assertStatus(200);
    }

    // 13. getRiwayatSetoran
    public function test_get_riwayat_setoran()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/setoran-history');
        $response->assertStatus(200);
    }

    // 14. tarikTunai
    public function test_tarik_tunai_success()
    {
        $this->anggota->saldo = 100000;
        $this->anggota->save();
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/tarik-tunai', [
                             'anggota_id' => $this->anggota->anggota_id,
                             'nominal' => 50000
                         ]);
        $response->assertStatus(200);
    }
    public function test_tarik_tunai_insufficient_saldo()
    {
        $this->anggota->saldo = 10000;
        $this->anggota->save();
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/tarik-tunai', [
                             'anggota_id' => $this->anggota->anggota_id,
                             'nominal' => 50000
                         ]);
        $response->assertStatus(400);
    }

    // 15. getDaftarKasir
    public function test_get_daftar_kasir()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/daftar-kasir');
        $response->assertStatus(200);
    }

    // 16. getSerahTerimaForMe
    public function test_get_serah_terima_history()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/serah-terima-for-me?type=history');
        $response->assertStatus(200);
    }
    public function test_get_serah_terima_all()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/serah-terima-for-me?type=all');
        $response->assertStatus(200);
    }
    public function test_get_serah_terima_pending()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->getJson('/laravel/api/kasir/serah-terima-for-me?type=pending');
        $response->assertStatus(200);
    }

    // 17. createSerahTerima to self
    public function test_create_serah_terima_to_self()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/create-serah-terima', [
                             'kasir_to' => $this->kasir->user_id,
                             'hasil_opname' => ['uang_fisik' => 10000]
                         ]);
        $response->assertStatus(400);
    }

    // 18. approve/reject invalid serah terima
    public function test_approve_invalid_serah_terima()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/approve-serah-terima', [
                             'serah_id' => 9999
                         ]);
        $response->assertStatus(400);
    }
    public function test_reject_invalid_serah_terima()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
                         ->postJson('/laravel/api/kasir/reject-serah-terima', [
                             'serah_id' => 9999,
                             'alasan' => 'test'
                         ]);
        $response->assertStatus(400);
    }
}
