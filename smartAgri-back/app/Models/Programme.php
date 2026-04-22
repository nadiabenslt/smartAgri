<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Programme extends Model
{
    protected $fillable = [
        'programmable_id',
        'programmable_type',
        'day_number',
        'date',
        'recommendations',
        'status',
    ];

    protected $casts = [
        'recommendations' => 'array',
        'date'            => 'date',
    ];

    // Polymorphic relation
    public function programmable()
    {
        return $this->morphTo();
    }
}