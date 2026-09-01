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

    protected $appends = [
        'simpanan_pokok',
        'limit_hutang',
        'sisa_limit_hutang',
    ];

    public function getSimpananPokokAttribute(): float
    {
        return (float) (max(400000, (float)$this->saldo + (float)$this->hutang));
    }

    public function getLimitHutangAttribute(): float
    {
        return $this->simpanan_pokok;
    }

    public function getSisaLimitHutangAttribute(): float
    {
        return (float) max(0, $this->simpanan_pokok - (float)$this->hutang);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}
