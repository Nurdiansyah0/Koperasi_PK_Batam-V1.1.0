<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TarikTunai extends Model
{
    protected $table = 'tarik_tunai';

    protected $primaryKey = 'tarik_id';

    public $timestamps = true;

    protected $fillable = [
        'kode_penarikan',
        'anggota_id',
        'kasir_id',
        'nominal',
        'status',
        'sumber_dana',
        'transaksi_id',
        'persetujuan_shu',
        'approved_at',
        'alasan_tolak',
        'keterangan',
    ];

    protected $casts = [
        'nominal' => 'float',
        'persetujuan_shu' => 'boolean',
        'approved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function anggota()
    {
        return $this->belongsTo(Anggota::class, 'anggota_id', 'anggota_id');
    }

    public function kasir()
    {
        return $this->belongsTo(User::class, 'kasir_id', 'user_id');
    }

    public function transaksi()
    {
        return $this->belongsTo(Transaksi::class, 'transaksi_id', 'transaksi_id');
    }
}
