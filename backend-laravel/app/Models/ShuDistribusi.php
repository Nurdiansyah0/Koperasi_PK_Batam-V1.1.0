<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShuDistribusi extends Model
{
    protected $table = 'shu_distribusi';
    protected $primaryKey = 'shu_id';
    public $timestamps = false;

    protected $fillable = [
        'anggota_id',
        'tahun',
        'shu_60_percent',
        'shu_10_percent',
        'shu_30_percent',
        'total_shu',
        'created_at'
    ];

    public function anggota()
    {
        return $this->belongsTo(Anggota::class, 'anggota_id', 'anggota_id');
    }
}
