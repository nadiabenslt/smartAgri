<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plante extends Model
{
    protected $primaryKey = 'idPlante';

    protected $fillable = [
        'name',
        'image',
        'scientific_name'
    ];

    public function plantings()
    {
        return $this->hasMany(Planting::class, 'plante_id', 'idPlante');
    }
}
