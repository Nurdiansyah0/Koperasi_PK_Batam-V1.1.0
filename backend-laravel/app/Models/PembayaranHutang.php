<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PembayaranHutang extends Model
{
    protected $table = 'pembayaran_hutang';

    protected $primaryKey = 'pembayaran_id';

    const UPDATED_AT = null;

    protected $fillable = [
        'anggota_id',
        'kasir_id',
        'nominal',
        'status',
        'approved_at',
    ];

    public function anggota()
    {
        return $this->belongsTo(Anggota::class, 'anggota_id', 'anggota_id');
    }

    public function kasir()
    {
        return $this->belongsTo(User::class, 'kasir_id', 'user_id');
    }
}
