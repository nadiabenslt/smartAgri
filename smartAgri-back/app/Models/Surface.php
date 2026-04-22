<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Surface extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'location',
        'width',
        'length',
        'soil_type',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function plantings()
    {
        return $this->hasMany(Planting::class);
    }
}
