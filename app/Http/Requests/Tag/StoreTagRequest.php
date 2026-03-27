<?php

namespace App\Http\Requests\Tag;

use Illuminate\Foundation\Http\FormRequest;

class StoreTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('tags.create');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:7'],
        ];
    }
}
