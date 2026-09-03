<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use NotificationChannels\WebPush\HasPushSubscriptions;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, HasPushSubscriptions;

    protected $table = 'users';

    protected $primaryKey = 'user_id';

    public $timestamps = false;

    protected $fillable = [
        'username',
        'password_hash',
        'role',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $appends = [
        'active_roles',
        'is_admin',
        'is_kasir',
    ];

    public function getAuthPasswordName()
    {
        return 'password_hash';
    }

    public function anggota()
    {
        return $this->hasOne(Anggota::class, 'user_id', 'user_id');
    }

    public function jabatan()
    {
        return $this->hasMany(JabatanAnggota::class, 'user_id', 'user_id');
    }

    public function jabatanAktif()
    {
        return $this->hasMany(JabatanAnggota::class, 'user_id', 'user_id')->where('status', 'aktif');
    }

    public function getActiveRolesAttribute(): array
    {
        $roles = $this->relationLoaded('jabatanAktif')
            ? $this->jabatanAktif->pluck('role')->toArray()
            : $this->jabatanAktif()->pluck('role')->toArray();

        // Include primary static role as well if not already present
        if ($this->role && ! in_array($this->role, $roles)) {
            $roles[] = $this->role;
        }

        // Everyone is fundamentally an anggota
        if (! in_array('anggota', $roles)) {
            $roles[] = 'anggota';
        }

        return array_values(array_unique($roles));
    }

    public function hasRole(string $role): bool
    {
        if ($role === 'anggota') {
            return true; // Everyone registered is an anggota
        }

        if ($this->role === $role) {
            return true;
        }

        if ($this->relationLoaded('jabatanAktif')) {
            return $this->jabatanAktif->contains('role', $role);
        }

        return $this->jabatanAktif()->where('role', $role)->exists();
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function isKasir(): bool
    {
        return $this->hasRole('kasir');
    }

    public function getIsAdminAttribute(): bool
    {
        return $this->isAdmin();
    }

    public function getIsKasirAttribute(): bool
    {
        return $this->isKasir();
    }
}
