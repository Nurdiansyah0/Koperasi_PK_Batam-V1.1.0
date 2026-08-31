<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RiwayatRestock extends Model
{
    use HasFactory;

    protected $table = 'riwayat_restock';
    protected $primaryKey = 'restock_id';

    protected $fillable = [
        'barang_id',
        'admin_id',
        'jumlah_tambah',
        'harga_beli_satuan',
        'total_biaya',
        'sumber_dana',
        'catatan'
    ];

    public function barang()
    {
        return $this->belongsTo(Barang::class, 'barang_id', 'barang_id');
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id', 'user_id');
    }
}
