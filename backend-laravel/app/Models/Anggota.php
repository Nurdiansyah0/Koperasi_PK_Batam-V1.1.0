<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Anggota extends Model
{
    protected $table = 'anggota';
    protected $primaryKey = 'anggota_id';

    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'nama_lengkap',
        'email',
        'saldo',
        'hutang',
        'shu'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}
