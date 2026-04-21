<?php

namespace App\Http\Requests\Plant;

use App\Http\Requests\ApiRequest;

class StepLocationRequest extends ApiRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'location' => ['required', 'string', 'max:255'],
        ];
    }
}
