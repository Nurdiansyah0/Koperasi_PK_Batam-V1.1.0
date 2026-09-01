<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;

class AuthTest extends TestCase
{
    use DatabaseTransactions; // Wrap each test in a transaction and roll back when done

    /** @test */
    public function it_can_login_with_valid_credentials()
    {
        // 1. Arrange: Create or find a user
        $user = User::first();
        
        // Ensure we know the password for testing
        $password = 'password123';
        $user->password_hash = Hash::make($password);
        $user->save();

        // 2. Act: Call the login endpoint
        $response = $this->postJson('/laravel/api/login', [
            'username' => $user->username,
            'password' => $password,
        ]);

        // 3. Assert: Check the response
        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'success',
                     'token',
                     'user' => [
                         'user_id',
                         'username',
                         'role'
                     ]
                 ])
                 ->assertJson(['success' => true]);
                 
        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->user_id,
        ]);
    }

    /** @test */
    public function it_fails_login_with_invalid_credentials()
    {
        // 1. Arrange
        $user = User::first();

        // 2. Act
        $response = $this->postJson('/laravel/api/login', [
            'username' => $user->username,
            'password' => 'wrongpassword',
        ]);

        // 3. Assert
        $response->assertStatus(401) // The API currently returns 401 with success:false
                 ->assertJson([
                     'success' => false,
                     'message' => 'Username atau password salah'
                 ]);
                 
        $this->assertGuest();
    }

    public function test_it_can_login_as_anggota_and_return_anggota_data()
    {
        // 1. Arrange: Create an anggota user
        $password = 'password123';
        $user = User::create([
            'username' => 'testanggota_' . rand(),
            'password_hash' => Hash::make($password),
            'role' => 'anggota'
        ]);

        $anggota = \App\Models\Anggota::create([
            'nama_lengkap' => 'Test Anggota',
            'no_identitas' => '12345678',
            'email' => 'test@example.com',
            'alamat' => 'Test',
            'no_hp' => '081234567890',
            'status_anggota' => 'aktif',
            'saldo' => 10000,
            'hutang' => 0,
            'shu' => 0,
            'created_at' => now(),
        ]);
        
        // Link the user to the anggota (assuming there's a relationship or same ID)
        // If the relation is based on user_id in anggota table:
        // Wait, looking at the models, Anggota probably has user_id
        // We'll update the user_id if needed, but the code in AuthController is: $user->anggota
        $anggota->user_id = $user->user_id;
        $anggota->save();

        // 2. Act
        $response = $this->postJson('/laravel/api/login', [
            'username' => $user->username,
            'password' => $password,
        ]);

        // 3. Assert
        $response->assertStatus(200)
                 ->assertJsonPath('user.saldo', '10000.00');
    }

    public function test_it_can_get_current_user_profile()
    {
        $user = User::first();
        $token = $user->createToken('test_profile')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
                         ->getJson('/laravel/api/me');
        
        $response->assertStatus(200)
                 ->assertJsonStructure(['success', 'user']);
    }

    public function test_it_can_logout()
    {
        $user = User::first();
        $token = $user->createToken('test_logout')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
                         ->postJson('/laravel/api/logout');
        
        $response->assertStatus(200)
                 ->assertJson(['success' => true]);
                 
        // Verify token deleted
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->user_id,
            'name' => 'test_logout'
        ]);
    }
}
