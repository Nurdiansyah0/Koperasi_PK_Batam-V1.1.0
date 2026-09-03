<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JabatanAnggota extends Model
{
    protected $table = 'jabatan_anggota';

    protected $primaryKey = 'jabatan_id';

    protected $fillable = [
        'user_id',
        'role',
        'status',
        'ditugaskan_oleh',
        'catatan',
        'assigned_at',
        'revoked_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function ditugaskanOlehUser()
    {
        return $this->belongsTo(User::class, 'ditugaskan_oleh', 'user_id');
    }

    public function scopeAktif($query)
    {
        return $query->where('status', 'aktif');
    }
}
