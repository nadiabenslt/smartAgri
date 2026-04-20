<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Planting extends Model
{
    protected $primaryKey = 'idPlanting';

    protected $fillable = [
        'soilType',
        'surface',
        'location',
        'plante',
        'user_id',
        'plante_id'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function planteModel()
    {
        return $this->belongsTo(Plante::class, 'plante_id', 'idPlante');
    }

    public function maladieAnalytics()
    {
        return $this->hasMany(MaladieAnalytic::class, 'planting_id', 'idPlanting');
    }

    public function programmes()
    {
        return $this->hasMany(Programme::class, 'planting_id', 'idPlanting');
    }
}
