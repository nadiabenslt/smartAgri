<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlanteMaladie extends Model
{
    protected $fillable = [
        'user_id',
        'programme_id',
        'name',
        'description',
        'detected_at',
        'treated',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Polymorphic — get all programmes for this disease
    public function programmes()
    {
        return $this->morphMany(Programme::class, 'programmable');
    }
}