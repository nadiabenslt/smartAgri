<?php

namespace App\Http\Requests\Plant;

use App\Http\Requests\ApiRequest;

class StepSoilRequest extends ApiRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'soilType' => ['required', 'string', 'in:sandy,clay,loamy,silty,peaty,chalky'],
        ];
    }
}