<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    use DatabaseTransactions;

    private function makeUser(string $role, string $password = 'lama123'): User
    {
        return User::create([
            'username' => 'test_'.$role.'_'.uniqid(),
            'password_hash' => Hash::make($password),
            'role' => $role,
        ]);
    }

    #[Test]
    public function admin_can_change_own_password()
    {
        $admin = $this->makeUser('admin');
        $token = $admin->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/change-password', [
                'current_password' => 'lama123',
                'new_password' => 'baru456',
            ])
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->assertTrue(Hash::check('baru456', $admin->fresh()->password_hash));
    }

    #[Test]
    public function kasir_can_change_own_password()
    {
        $kasir = $this->makeUser('kasir');
        $token = $kasir->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/change-password', [
                'current_password' => 'lama123',
                'new_password' => 'baru456',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('baru456', $kasir->fresh()->password_hash));
    }

    #[Test]
    public function change_password_rejects_wrong_current_password()
    {
        $admin = $this->makeUser('admin');
        $token = $admin->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/change-password', [
                'current_password' => 'salah',
                'new_password' => 'baru456',
            ])
            ->assertStatus(400)
            ->assertJson(['success' => false]);

        $this->assertTrue(Hash::check('lama123', $admin->fresh()->password_hash));
    }

    #[Test]
    public function admin_can_reset_other_user_password_and_revoke_tokens()
    {
        $admin = $this->makeUser('admin');
        $kasir = $this->makeUser('kasir');
        $kasir->createToken('kasir_session');
        $token = $admin->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/admin/reset-password-user', [
                'user_id' => $kasir->user_id,
                'password_baru' => 'reset789',
            ])
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->assertTrue(Hash::check('reset789', $kasir->fresh()->password_hash));
        $this->assertSame(0, $kasir->tokens()->count());
    }

    #[Test]
    public function admin_cannot_reset_own_password_without_current_password()
    {
        $admin = $this->makeUser('admin');
        $token = $admin->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/admin/reset-password-user', [
                'user_id' => $admin->user_id,
                'password_baru' => 'reset789',
            ])
            ->assertStatus(422);
    }

    #[Test]
    public function non_admin_cannot_reset_other_user_password()
    {
        $kasir = $this->makeUser('kasir');
        $target = $this->makeUser('anggota');
        $token = $kasir->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/laravel/api/admin/reset-password-user', [
                'user_id' => $target->user_id,
                'password_baru' => 'reset789',
            ])
            ->assertStatus(403);

        $this->assertTrue(Hash::check('lama123', $target->fresh()->password_hash));
    }
}
