<?php

namespace App\Http\Requests\Surface;

use App\Http\Requests\ApiRequest;

class SurfaceRequest extends ApiRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'location'  => ['required', 'string', 'max:255'],
            'width'     => ['required', 'numeric', 'min:0'],
            'length'    => ['required', 'numeric', 'min:0'],
            'soil_type' => ['required', 'string', 'in:sandy,clay,loamy,silty,peaty,chalky,other'],
        ];
    }
}
