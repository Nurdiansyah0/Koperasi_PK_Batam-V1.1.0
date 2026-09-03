<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KonversiShu extends Model
{
    protected $table = 'konversi_shu';

    protected $primaryKey = 'konversi_id';

    public $timestamps = true;

    protected $fillable = [
        'anggota_id',
        'admin_id',
        'nominal',
        'tipe_konversi',
        'keterangan',
    ];

    protected $casts = [
        'nominal' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function anggota()
    {
        return $this->belongsTo(Anggota::class, 'anggota_id', 'anggota_id');
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id', 'user_id');
    }
}
