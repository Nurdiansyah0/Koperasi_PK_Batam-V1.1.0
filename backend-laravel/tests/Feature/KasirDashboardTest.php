<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class KasirDashboardTest extends TestCase
{
    use DatabaseTransactions;

    /** @test */
    public function kasir_can_get_dashboard()
    {
        $kasir = User::where('role', 'kasir')->firstOrFail();
        $token = $kasir->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
                         ->getJson('/laravel/api/kasir/dashboard');
                         
        if ($response->status() !== 200) dd($response->getContent());
        $response->assertStatus(200);
    }
}
