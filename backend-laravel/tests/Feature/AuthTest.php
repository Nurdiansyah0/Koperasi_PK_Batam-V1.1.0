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
}
