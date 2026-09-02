<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Barang extends Model
{
    protected $table = 'barang';
    protected $primaryKey = 'barang_id';
    
    // Disable timestamps if not present in the old schema
    public $timestamps = false; 

    protected $fillable = [
        'nama_barang',
        'stok',
        'stok_toko',
        'stok_gudang',
        'tgl_kadaluarsa_toko',
        'tgl_kadaluarsa_gudang',
        'pkm',
        'harga_modal',
        'harga_jual',
    ];

    protected $casts = [
        'tgl_kadaluarsa_toko' => 'date',
        'tgl_kadaluarsa_gudang' => 'date',
    ];

    protected $appends = [
        'hari_kadaluarsa_toko',
        'status_kadaluarsa_toko',
        'hari_kadaluarsa_gudang',
        'status_kadaluarsa_gudang',
    ];

    public function getHariKadaluarsaTokoAttribute()
    {
        if (!$this->tgl_kadaluarsa_toko) return null;
        return (int) \Carbon\Carbon::today()->diffInDays(\Carbon\Carbon::parse($this->tgl_kadaluarsa_toko), false);
    }

    public function getStatusKadaluarsaTokoAttribute()
    {
        $days = $this->hari_kadaluarsa_toko;
        if ($days === null) return 'tidak_ada';
        if ($days < 0) return 'expired';
        if ($days <= 30) return 'near_expiry';
        return 'aman';
    }

    public function getHariKadaluarsaGudangAttribute()
    {
        if (!$this->tgl_kadaluarsa_gudang) return null;
        return (int) \Carbon\Carbon::today()->diffInDays(\Carbon\Carbon::parse($this->tgl_kadaluarsa_gudang), false);
    }

    public function getStatusKadaluarsaGudangAttribute()
    {
        $days = $this->hari_kadaluarsa_gudang;
        if ($days === null) return 'tidak_ada';
        if ($days < 0) return 'expired';
        if ($days <= 30) return 'near_expiry';
        return 'aman';
    }

    public static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            if ($model->isDirty(['stok_toko', 'stok_gudang'])) {
                $model->stok = ((int) $model->stok_toko) + ((int) $model->stok_gudang);
            } elseif ($model->isDirty('stok')) {
                $pkm = (int) ($model->pkm ?: 1);
                $stok = (int) $model->stok;
                $model->stok_toko = min($stok, $pkm);
                $model->stok_gudang = max(0, $stok - $model->stok_toko);
            }
        });
    }
}
