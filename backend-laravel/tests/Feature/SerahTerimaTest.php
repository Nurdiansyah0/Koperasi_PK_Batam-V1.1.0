<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Barang;
use App\Models\SerahTerimaKasir;
use Illuminate\Foundation\Testing\DatabaseTransactions;

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
    }

    /** @test */
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
                         'cycle_count_items'
                     ]
                 ]);
        
        $this->assertTrue($response->json('success'));
        $this->assertGreaterThan(0, count($response->json('data.cycle_count_items')));
        $firstItem = $response->json('data.cycle_count_items.0');
        $this->assertArrayHasKey('pkm', $firstItem);
    }

    /** @test */
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
                    'totalSelisih' => -2
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
                        'status' => 'selisih'
                    ]
                ],
                'type' => 'hybrid_cycle_count'
            ]
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
            'status' => 'pending'
        ]);
        
        // Verify JSON cast by pulling the last inserted record
        $record = SerahTerimaKasir::where('kasir_from', $this->kasir1->user_id)->orderBy('serah_id', 'desc')->first();
        $this->assertEquals(1500000, $record->hasil_opname['uang_fisik']);
        $this->assertEquals(-2, $record->hasil_opname['items'][0]['selisih']);
    }

    /** @test */
    public function receiver_can_approve_serah_terima()
    {
        // 1. Kasir 1 Creates
        $serah = SerahTerimaKasir::create([
            'kasir_from' => $this->kasir1->user_id,
            'kasir_to' => $this->kasir2->user_id,
            'hasil_opname' => ['uang_fisik' => 1000000],
            'status' => 'pending'
        ]);

        // 2. Kasir 2 (Receiver) Approves
        $token2 = $this->kasir2->createToken('test_token2')->plainTextToken;
        $response = $this->withHeader('Authorization', "Bearer {$token2}")
                         ->postJson('/laravel/api/kasir/approve-serah-terima', [
                             'serah_id' => $serah->serah_id
                         ]);

        $response->assertStatus(200)->assertJson(['success' => true]);
        
        $this->assertDatabaseHas('serah_terima_kasir', [
            'serah_id' => $serah->serah_id,
            'status' => 'approved'
        ]);
    }

    /** @test */
    public function receiver_can_reject_serah_terima()
    {
        $serah = SerahTerimaKasir::create([
            'kasir_from' => $this->kasir1->user_id,
            'kasir_to' => $this->kasir2->user_id,
            'hasil_opname' => ['uang_fisik' => 1000000],
            'status' => 'pending'
        ]);

        $token2 = $this->kasir2->createToken('test_token2')->plainTextToken;
        $response = $this->withHeader('Authorization', "Bearer {$token2}")
                         ->postJson('/laravel/api/kasir/reject-serah-terima', [
                             'serah_id' => $serah->serah_id,
                             'alasan' => 'Uang fisik kurang 50rb'
                         ]);

        $response->assertStatus(200)->assertJson(['success' => true]);
        
        $this->assertDatabaseHas('serah_terima_kasir', [
            'serah_id' => $serah->serah_id,
            'status' => 'rejected',
            'alasan_penolakan' => 'Uang fisik kurang 50rb'
        ]);
    }

    /** @test */
    public function sender_can_see_sent_handovers_in_history()
    {
        // 1. Kasir 1 Sends to Kasir 2 (and it is completed/rejected)
        SerahTerimaKasir::create([
            'kasir_from' => $this->kasir1->user_id,
            'kasir_to' => $this->kasir2->user_id,
            'hasil_opname' => ['uang_fisik' => 1000000],
            'status' => 'approved' // must be not pending to show in history
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
        $this->assertTrue($found, "Kasir 1 should see the handover they sent in their history.");
    }
}
