<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Barang;
use App\Models\Anggota;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class KasirDashboardTest extends TestCase
{
    use DatabaseTransactions;

    /** @test */
    public function kasir_can_get_dashboard_with_indomaret_alfamart_standard_metrics()
    {
        $kasir = User::where('role', 'kasir')->firstOrFail();
        $token = $kasir->createToken('test_token')->plainTextToken;
        $anggota = Anggota::firstOrFail();
        $barang = Barang::firstOrFail();

        // Create a test transaction today
        $trx = Transaksi::create([
            'anggota_id' => $anggota->anggota_id,
            'kasir_id' => $kasir->user_id,
            'total_harga' => 50000,
            'total_keuntungan' => 10000,
            'metode_pembayaran' => 'cash',
            'status' => 'selesai',
            'created_at' => Carbon::today()->addHours(2),
        ]);

        TransaksiDetail::create([
            'transaksi_id' => $trx->transaksi_id,
            'barang_id' => $barang->barang_id,
            'jumlah' => 4,
            'harga_satuan' => 12500,
            'subtotal' => 50000,
            'keuntungan' => 10000,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
                         ->getJson('/laravel/api/kasir/dashboard');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'success',
                     'data' => [
                         'total_pendapatan_hari_ini',
                         'total_transaksi_hari_ini',
                         'total_item_terjual_hari_ini',
                         'total_transaksi_dilayani',
                         'pending_serah_terima',
                         'pending_pesanan',
                         'pending_hutang',
                         'transaksi_terbaru',
                     ]
                 ]);

        $this->assertGreaterThanOrEqual(1, $response->json('data.total_transaksi_hari_ini'));
        $this->assertGreaterThanOrEqual(4, $response->json('data.total_item_terjual_hari_ini'));
        $this->assertGreaterThanOrEqual(1, $response->json('data.total_transaksi_dilayani'));
    }
}
