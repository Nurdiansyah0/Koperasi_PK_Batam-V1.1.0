<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ApiKey extends Model
{
    use HasFactory;

    protected $table = 'api_keys';

    protected $fillable = [
        'name',
        'key',
        'secret',
        'permissions',
        'allowed_origins',
        'is_active',
        'last_used_at',
        'expires_at',
        'created_by',
    ];

    protected $casts = [
        'permissions' => 'array',
        'is_active' => 'boolean',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public static function createKey(string $name, array $permissions = ['*'], ?string $allowedOrigins = '*', ?int $expiresInDays = null, ?int $createdBy = null): self
    {
        $key = 'kop_live_'.Str::random(32);
        $secret = 'kop_sec_'.Str::random(48);

        return self::create([
            'name' => $name,
            'key' => $key,
            'secret' => $secret,
            'permissions' => $permissions ?: ['*'],
            'allowed_origins' => $allowedOrigins ?: '*',
            'is_active' => true,
            'expires_at' => $expiresInDays ? now()->addDays($expiresInDays) : null,
            'created_by' => $createdBy,
        ]);
    }

    public function hasPermission(string $permission): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        $perms = $this->permissions ?? [];
        if (in_array('*', $perms) || in_array('all', $perms)) {
            return true;
        }

        return in_array($permission, $perms);
    }

    public function isExpired(): bool
    {
        return $this->expires_at ? $this->expires_at->isPast() : false;
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }
}
