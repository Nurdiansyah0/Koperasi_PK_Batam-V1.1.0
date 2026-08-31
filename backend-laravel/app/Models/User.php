<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'users';
    protected $primaryKey = 'user_id';
    
    // Original DB does not use standard timestamps if they aren't named created_at/updated_at, but we have them.
    
    public $timestamps = false;
    
    protected $fillable = [
        'username',
        'password_hash',
        'role',
    ];

    protected $hidden = [
        'password_hash',
    ];

    // Tell Laravel to use password_hash instead of password for Auth checking
    public function getAuthPasswordName()
    {
        return 'password_hash';
    }

    // Optional relation for anggota
    public function anggota()
    {
        return $this->hasOne(Anggota::class, 'user_id', 'user_id');
    }
}
