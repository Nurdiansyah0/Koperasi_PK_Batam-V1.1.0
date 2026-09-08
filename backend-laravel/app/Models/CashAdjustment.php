<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashAdjustment extends Model
{
    use HasFactory;

    protected $table = 'cash_adjustments';
    protected $primaryKey = 'adjustment_id';

    protected $fillable = [
        'adjustment_date',
        'type',
        'amount',
        'direction',
        'source',
        'reason',
        'reference',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'adjustment_date' => 'date',
        'amount' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by', 'user_id');
    }
}
