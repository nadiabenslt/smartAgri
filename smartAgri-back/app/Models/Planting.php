<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Planting extends Model
{
    protected $fillable = [
        'user_id',
        'surface_id',
        'plante_id',
        'quantity',
        'start_date',
        'end_date',
        'status',
    ];

    public function surface()
    {
        return $this->belongsTo(Surface::class);
    }

    public function plante()
    {
        return $this->belongsTo(Plante::class);
    }


    // Polymorphic — get all programmes for this planting
    public function programmes()
    {
        return $this->morphMany(Programme::class, 'programmable');
    }
}