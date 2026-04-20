<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaladieAnalytic extends Model
{
    protected $primaryKey = 'idAnalytic';

    protected $fillable = [
        'image',
        'maladieDisease',
        'confidence',
        'traitement',
        'user_id',
        'planting_id'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function planting()
    {
        return $this->belongsTo(Planting::class, 'planting_id', 'idPlanting');
    }
}
