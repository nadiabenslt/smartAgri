<?php

namespace App\Http\Requests\Plant;

use App\Http\Requests\ApiRequest;

class StepSizeRequest extends ApiRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'location'  => ['required', 'string'],
            'soilType' => ['required', 'string'],
            'surface'      => ['required', 'string', 'in:small,medium,large'],
        ];
    }
}
