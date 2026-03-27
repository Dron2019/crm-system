<?php

namespace App\Http\Requests\Pipeline;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePipelineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('pipelines.update');
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'is_default' => ['boolean'],
            'stages' => ['nullable', 'array'],
            'stages.*.id' => ['nullable', 'uuid'],
            'stages.*.name' => ['required_with:stages', 'string', 'max:255'],
            'stages.*.display_order' => ['nullable', 'integer', 'min:0'],
            'stages.*.color' => ['nullable', 'string', 'max:7'],
            'stages.*.is_won' => ['nullable', 'boolean'],
            'stages.*.is_lost' => ['nullable', 'boolean'],
        ];
    }
}
