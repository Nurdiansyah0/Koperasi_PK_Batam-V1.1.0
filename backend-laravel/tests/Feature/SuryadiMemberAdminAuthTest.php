<?php

namespace Tests\Feature;

use App\Models\Anggota;
use App\Models\JabatanAnggota;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SuryadiMemberAdminAuthTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        
        $suryadi = User::whereRaw('LOWER(username) = ?', ['suryadi'])->first();
        if ($suryadi) {
            $hasMandate = JabatanAnggota::where('user_id', $suryadi->user_id)
                ->where('role', 'admin')
                ->where('status', 'aktif')
                ->exists();
                
            if (!$hasMandate) {
                JabatanAnggota::create([
                    'user_id' => $suryadi->user_id,
                    'role' => 'admin',
                    'status' => 'aktif',
                    'ditugaskan_oleh' => 1,
                    'catatan' => 'Mandat admin test',
                ]);
            }
        }
    }

    public function test_admin_can_login_with_primary_admin_credentials()
    {
        $admin = User::where('user_id', 1)->first();
        $this->assertNotNull($admin);
        $this->assertEquals('Admin', $admin->username);
        $this->assertEquals('admin', $admin->role);

        // Set known password for login test
        $password = 'admin_secret_pass';
        $admin->password_hash = Hash::make($password);
        $admin->save();

        $response = $this->postJson('/laravel/api/login', [
            'username' => 'admin',
            'password' => $password,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'user' => [
                    'user_id' => 1,
                    'username' => 'Admin',
                    'role' => 'admin',
                    'is_admin' => true,
                ],
            ]);
    }

    public function test_suryadi_can_login_with_suryadi_credentials_and_loads_member_profile()
    {
        $suryadi = User::whereRaw('LOWER(username) = ?', ['suryadi'])->first();
        $this->assertNotNull($suryadi);
        $this->assertNotEquals(1, $suryadi->user_id);

        $password = 'suryadi_secret_pass';
        $suryadi->password_hash = Hash::make($password);
        $suryadi->save();

        $response = $this->postJson('/laravel/api/login', [
            'username' => 'suryadi',
            'password' => $password,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'user' => [
                    'user_id' => $suryadi->user_id,
                    'username' => 'suryadi',
                    'anggota_id' => 65,
                    'nama_lengkap' => 'Suryadi',
                    'is_admin' => true,
                ],
            ]);

        $this->assertEquals(65, $response->json('user.anggota_id'));
        $this->assertEquals('Suryadi', $response->json('user.nama_lengkap'));
    }

    public function test_suryadi_has_admin_privileges_through_jabatan_mandate_not_identity_change()
    {
        $suryadi = User::whereRaw('LOWER(username) = ?', ['suryadi'])->first();
        $this->assertNotNull($suryadi);

        // Verify Suryadi is linked to Anggota 65
        $anggota = Anggota::find(65);
        $this->assertNotNull($anggota);
        $this->assertEquals($suryadi->user_id, $anggota->user_id);
        $this->assertEquals('Suryadi', $anggota->nama_lengkap);

        // Verify Suryadi has active admin mandate in jabatan_anggota
        $mandate = JabatanAnggota::where('user_id', $suryadi->user_id)
            ->where('role', 'admin')
            ->where('status', 'aktif')
            ->first();

        $this->assertNotNull($mandate);
        $this->assertTrue($suryadi->isAdmin());
        $this->assertTrue($suryadi->hasRole('admin'));
        $this->assertContains('admin', $suryadi->active_roles);
        $this->assertContains('anggota', $suryadi->active_roles);
    }

    public function test_suryadi_can_access_admin_endpoints_and_preserves_auditability()
    {
        $suryadi = User::whereRaw('LOWER(username) = ?', ['suryadi'])->first();
        $this->assertNotNull($suryadi);

        $token = $suryadi->createToken('suryadi_audit_token')->plainTextToken;

        // Suryadi accesses admin dashboard stats
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/laravel/api/admin/dashboard-stats');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        // Suryadi performs an administrative operation (assign jabatan to another member)
        $targetUser = User::where('user_id', '!=', 1)
            ->where('user_id', '!=', $suryadi->user_id)
            ->first();

        $this->assertNotNull($targetUser);

        $assignResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/laravel/api/admin/jabatan/assign', [
                'user_id' => $targetUser->user_id,
                'role' => 'pengurus',
                'catatan' => 'Penugasan audit test oleh Suryadi',
            ]);

        $assignResponse->assertStatus(200);

        // Verify the audit trail records Suryadi's exact user_id as the actor
        $createdMandate = JabatanAnggota::where('user_id', $targetUser->user_id)
            ->where('role', 'pengurus')
            ->where('catatan', 'Penugasan audit test oleh Suryadi')
            ->first();

        $this->assertNotNull($createdMandate);
        $this->assertEquals($suryadi->user_id, $createdMandate->ditugaskan_oleh);
        $this->assertNotEquals(1, $createdMandate->ditugaskan_oleh);
    }

    public function test_no_duplicate_users_or_members_exist_for_admin_and_suryadi()
    {
        $adminUsersCount = User::whereRaw('LOWER(username) = ?', ['admin'])->count();
        $this->assertEquals(1, $adminUsersCount);

        $suryadiUsersCount = User::whereRaw('LOWER(username) = ?', ['suryadi'])->count();
        $this->assertEquals(1, $suryadiUsersCount);

        $suryadiAnggotaCount = Anggota::where('nama_lengkap', 'Suryadi')->count();
        $this->assertEquals(1, $suryadiAnggotaCount);

        $anggota65 = Anggota::find(65);
        $suryadiUser = User::whereRaw('LOWER(username) = ?', ['suryadi'])->first();
        $this->assertEquals($suryadiUser->user_id, $anggota65->user_id);
    }
}
