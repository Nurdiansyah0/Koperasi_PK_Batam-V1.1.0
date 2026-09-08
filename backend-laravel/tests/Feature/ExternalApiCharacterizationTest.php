<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ExternalApiCharacterizationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_can_manage_api_keys()
    {
        $admin = User::where('role', 'admin')->first();
        $token = $admin->createToken('admin-test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/admin/api-keys', [
                'name' => 'Test Integration',
            ]);

        $response->assertStatus(201)->assertJsonPath('success', true);
        $apiKey = $response->json('data.key');
        $keyId = $response->json('data.id');

        $this->withHeader('Authorization', "Bearer $token")
            ->getJson('/laravel/api/admin/api-keys')
            ->assertStatus(200);
        
        $this->withHeader('Authorization', "Bearer $token")
            ->putJson("/laravel/api/admin/api-keys/{$keyId}/toggle")
            ->assertStatus(200);

        $this->withHeader('Authorization', "Bearer $token")
            ->deleteJson("/laravel/api/admin/api-keys/{$keyId}")
            ->assertStatus(200);
    }

    public function test_external_gateway_rejects_without_valid_key()
    {
        $this->getJson('/laravel/api/v1/ping')->assertStatus(401);
    }

    public function test_external_gateway_accepts_valid_key()
    {
        ApiKey::create([
            'name' => 'Gateway Test',
            'key' => 'TEST-KEY-123',
            'is_active' => true, 'permissions' => json_encode([]),
        ]);

        $this->withHeader('X-API-KEY', 'TEST-KEY-123')
            ->getJson('/laravel/api/v1/ping')
            ->assertStatus(200);

        $this->withHeader('X-API-KEY', 'TEST-KEY-123')
            ->getJson('/laravel/api/v1/katalog')
            ->assertStatus(200);
    }
}
