<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaksi extends Model
{
    protected $table = 'transaksi';

    protected $primaryKey = 'transaksi_id';

    const UPDATED_AT = null;

    protected $fillable = [
        'anggota_id',
        'kasir_id',
        'total_harga',
        'total_keuntungan',
        'metode_pembayaran',
        'status',
    ];

    public function details()
    {
        return $this->hasMany(TransaksiDetail::class, 'transaksi_id', 'transaksi_id');
    }

    public function anggota()
    {
        return $this->belongsTo(Anggota::class, 'anggota_id', 'anggota_id');
    }

    public function kasir()
    {
        return $this->belongsTo(User::class, 'kasir_id', 'user_id');
    }

    public function tarikTunai()
    {
        return $this->hasOne(TarikTunai::class, 'transaksi_id', 'transaksi_id');
    }
}
