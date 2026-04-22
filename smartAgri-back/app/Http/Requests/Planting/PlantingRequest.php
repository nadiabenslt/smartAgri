<?php

namespace App\Http\Requests\Planting;

use App\Http\Requests\ApiRequest;

class PlantingRequest extends ApiRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'surface_id' => ['required', 'integer', 'exists:surfaces,id'],
            'plante_id'  => ['required', 'integer', 'exists:plantes,id'],
            'quantity'   => ['required', 'integer', 'min:1'],
            'start_date' => ['required', 'date'],
        ];
    }
}
