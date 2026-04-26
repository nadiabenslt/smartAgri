<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlanteMaladie extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'plant_name',
        'description',
        'symptoms',
        'severity',
        'confidence',
        'treatments',
        'prevention',
        'detected_at',
        'treated',
        'analysis_status',
        'follow_up_date',
    ];

    protected $casts = [
        'treatments'  => 'array',
        'prevention'  => 'array',
        'detected_at' => 'date',
        'follow_up_date' => 'date',
        'treated' => 'boolean',
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