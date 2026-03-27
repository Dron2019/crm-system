<?php

namespace App\Http\Requests\Pipeline;

use Illuminate\Foundation\Http\FormRequest;

class StorePipelineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('pipelines.create');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'is_default' => ['boolean'],
            'stages' => ['nullable', 'array'],
            'stages.*.name' => ['required_with:stages', 'string', 'max:255'],
            'stages.*.display_order' => ['nullable', 'integer', 'min:0'],
            'stages.*.color' => ['nullable', 'string', 'max:7'],
            'stages.*.is_won' => ['nullable', 'boolean'],
            'stages.*.is_lost' => ['nullable', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'team_id' => $this->user()->current_team_id,
        ]);
    }
}
