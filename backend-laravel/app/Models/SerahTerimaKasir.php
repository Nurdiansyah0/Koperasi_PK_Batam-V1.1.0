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

    public function getHasilOpnameAttribute($value)
    {
        if (empty($value)) return null;
        if (is_array($value)) return $value;
        $decoded = json_decode($value, true);
        if (!$decoded && is_string($value)) {
            $decoded = json_decode(stripslashes($value), true);
            if (!$decoded) {
                $decoded = json_decode(trim(stripslashes($value), '"'), true);
            }
        }
        return $decoded;
    }

    public function setHasilOpnameAttribute($value)
    {
        $this->attributes['hasil_opname'] = is_array($value) ? json_encode($value) : $value;
    }

    public function kasirFrom()
    {
        return $this->belongsTo(User::class, 'kasir_from', 'user_id');
    }

    public function kasirTo()
    {
        return $this->belongsTo(User::class, 'kasir_to', 'user_id');
    }
}
