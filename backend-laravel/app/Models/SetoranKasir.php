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
        'approved_at',
        'created_at'
    ];

    public function kasir()
    {
        return $this->belongsTo(User::class, 'kasir_id', 'user_id');
    }
}
