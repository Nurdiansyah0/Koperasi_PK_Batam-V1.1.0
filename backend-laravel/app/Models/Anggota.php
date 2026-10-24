<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Anggota extends Model
{
    protected $table = 'anggota';

    protected $primaryKey = 'anggota_id';

    const UPDATED_AT = null;

    protected static function booted()
    {
        static::saved(function ($anggota) {
            Cache::forget('kasir_all_anggota_slim');
        });

        static::deleted(function ($anggota) {
            Cache::forget('kasir_all_anggota_slim');
        });
    }

    protected $fillable = [
        'user_id',
        'nama_lengkap',
        'email',
        'saldo',
        'simpanan_pokok',
        'simpanan_wajib',
        'hutang',
        'shu',
        'persetujuan_shu_master_at',
        'persetujuan_shu_version',
    ];

    protected $casts = [
        'saldo' => 'float',
        'simpanan_pokok' => 'float',
        'simpanan_wajib' => 'float',
        'hutang' => 'float',
        'shu' => 'float',
        'persetujuan_shu_master_at' => 'datetime',
    ];

    protected $appends = [
        'simpanan_pokok',
        'allowance_hutang',
        'limit_hutang',
        'sisa_limit_hutang',
    ];

    public function getSimpananPokokAttribute($value): float
    {
        if ($value !== null) {
            return (float) $value;
        }

        if (array_key_exists('simpanan_pokok', $this->attributes) && $this->attributes['simpanan_pokok'] !== null) {
            return (float) $this->attributes['simpanan_pokok'];
        }

        return 0.0;
    }

    public function getAllowanceHutangAttribute(): float
    {
        // Koperasi memberikan allowance ekstra Rp 100.000 hanya bagi anggota aktif dengan simpanan pokok (> 0)
        if ($this->simpanan_pokok <= 0) {
            return 0.0;
        }

        return 100000.0;
    }

    public function getLimitHutangAttribute(): float
    {
        if ($this->simpanan_pokok <= 0) {
            return 0.0;
        }

        return (float) ($this->simpanan_pokok + $this->allowance_hutang);
    }

    public function getSisaLimitHutangAttribute(): float
    {
        return (float) max(0, $this->limit_hutang - (float) $this->hutang);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}
