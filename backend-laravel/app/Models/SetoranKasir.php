<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SetoranKasir extends Model
{
    protected $table = 'setoran_kasir';
    protected $primaryKey = 'setoran_id';
    public $timestamps = false; // Only created_at exists, we will let DB handle or manually set it

    protected $fillable = [
        'kasir_id',
        'nominal',
        'status',
        'approved_by',
        'created_at'
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function kasir()
    {
        return $this->belongsTo(User::class, 'kasir_id', 'user_id');
    }
}
