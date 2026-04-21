<?php

namespace App\Http\Requests\Plant;

use App\Http\Requests\ApiRequest;

class StepPlantRequest extends ApiRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'location'  => ['required', 'string'],
            'soilType'  => ['required', 'string'],
            'surface'   => ['required', 'string'],
            'plante'    => ['required', 'string', 'max:255'],
        ];
    }
}
