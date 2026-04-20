<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Programme extends Model
{
    protected $primaryKey = 'idProgramme';

    protected $fillable = [
        'numJour',
        'date',
        'recommandation',
        'planting_id'
    ];

    public function planting()
    {
        return $this->belongsTo(Planting::class, 'planting_id', 'idPlanting');
    }
}
