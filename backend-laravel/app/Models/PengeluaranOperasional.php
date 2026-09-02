<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PengeluaranOperasional extends Model
{
    protected $table = 'pengeluaran_operasional';
    protected $primaryKey = 'pengeluaran_id';

    protected $fillable = [
        'nama_pengeluaran',
        'nominal',
        'kategori',
        'tanggal',
        'keterangan',
        'created_by',
    ];

    protected $casts = [
        'nominal' => 'float',
        'tanggal' => 'date:Y-m-d',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }
}
