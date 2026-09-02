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
        'pkm',
        'harga_modal',
        'harga_jual',
    ];

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
