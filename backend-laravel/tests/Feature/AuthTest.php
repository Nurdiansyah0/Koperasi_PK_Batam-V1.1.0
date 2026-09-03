<?php

namespace Tests\Feature;

use App\Models\Anggota;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

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
                    'role',
                ],
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
                'message' => 'Username atau password salah',
            ]);

        $this->assertGuest();
    }

    public function test_it_can_login_as_anggota_and_return_anggota_data()
    {
        // 1. Arrange: Create an anggota user
        $password = 'password123';
        $user = User::create([
            'username' => 'testanggota_'.rand(),
            'password_hash' => Hash::make($password),
            'role' => 'anggota',
        ]);

        $anggota = Anggota::create([
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
        $response->assertStatus(200);
        $this->assertEquals(10000, (float) $response->json('user.saldo'));
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
            'name' => 'test_logout',
        ]);
    }

    public function test_reset_password_with_valid_challenge()
    {
        $user = User::create([
            'username' => 'anggota_reset_'.rand(1000, 9999),
            'password_hash' => Hash::make('oldpassword'),
            'role' => 'anggota',
        ]);

        $anggota = Anggota::create([
            'user_id' => $user->user_id,
            'nama_lengkap' => 'Anggota Reset Test',
            'no_identitas' => '87654321',
            'email' => 'reset@example.com',
            'saldo' => 500000,
            'hutang' => 350000, // 2 digit depan = '35'
            'shu' => 1458750,  // 3 digit belakang = '750'
            'created_at' => now(),
        ]);

        // Success test
        $response = $this->postJson('/laravel/api/reset-password', [
            'username' => $user->username,
            'digit_hutang' => '35',
            'digit_shu' => '750',
            'password_baru' => 'newpassword123',
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $user->refresh();
        $this->assertTrue(Hash::check('newpassword123', $user->password_hash));
    }

    public function test_reset_password_fails_with_invalid_challenge()
    {
        $user = User::create([
            'username' => 'anggota_fail_'.rand(1000, 9999),
            'password_hash' => Hash::make('oldpassword'),
            'role' => 'anggota',
        ]);

        Anggota::create([
            'user_id' => $user->user_id,
            'nama_lengkap' => 'Anggota Fail Test',
            'no_identitas' => '87654322',
            'saldo' => 500000,
            'hutang' => 350000,
            'shu' => 1458750,
            'created_at' => now(),
        ]);

        $response = $this->postJson('/laravel/api/reset-password', [
            'username' => $user->username,
            'digit_hutang' => '99', // Wrong
            'digit_shu' => '750',
            'password_baru' => 'newpassword123',
        ]);

        $response->assertStatus(422)
            ->assertJson(['success' => false]);
    }

    public function test_reset_password_fails_if_username_not_found()
    {
        $response = $this->postJson('/laravel/api/reset-password', [
            'username' => 'nonexistent_user_99999',
            'digit_hutang' => '10',
            'digit_shu' => '123',
            'password_baru' => 'newpassword123',
        ]);

        $response->assertStatus(404)
            ->assertJson(['success' => false]);
    }

    public function test_reset_password_fails_if_shu_wrong()
    {
        $user = User::create([
            'username' => 'anggota_shu_fail_'.rand(1000, 9999),
            'password_hash' => Hash::make('oldpassword'),
            'role' => 'anggota',
        ]);

        Anggota::create([
            'user_id' => $user->user_id,
            'nama_lengkap' => 'Anggota SHU Fail Test',
            'no_identitas' => '87654323',
            'saldo' => 500000,
            'hutang' => 350000,
            'shu' => 1458750,
            'created_at' => now(),
        ]);

        $response = $this->postJson('/laravel/api/reset-password', [
            'username' => $user->username,
            'digit_hutang' => '35', // Correct
            'digit_shu' => '999',  // Wrong
            'password_baru' => 'newpassword123',
        ]);

        $response->assertStatus(422)
            ->assertJson(['success' => false]);
    }
}
