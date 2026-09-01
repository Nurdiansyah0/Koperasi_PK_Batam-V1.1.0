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
        'harga_modal',
        'harga_jual',
    ];
}
