<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SerahTerimaKasir extends Model
{
    protected $table = 'serah_terima_kasir';
    protected $primaryKey = 'serah_id';
    public $timestamps = false;

    protected $fillable = [
        'kasir_from',
        'kasir_to',
        'hasil_opname',
        'status',
        'alasan_penolakan',
        'created_at'
    ];

    protected $casts = [
        'hasil_opname' => 'array',
    ];

    public function kasirFrom()
    {
        return $this->belongsTo(User::class, 'kasir_from', 'user_id');
    }

    public function kasirTo()
    {
        return $this->belongsTo(User::class, 'kasir_to', 'user_id');
    }
}
