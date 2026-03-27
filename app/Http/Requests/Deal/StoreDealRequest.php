<?php

namespace App\Http\Requests\Deal;

use Illuminate\Foundation\Http\FormRequest;

class StoreDealRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('deals.create');
    }

    public function rules(): array
    {
        return [
            'pipeline_id' => ['required', 'uuid', 'exists:pipelines,id'],
            'stage_id' => ['required', 'uuid', 'exists:stages,id'],
            'contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
            'company_id' => ['nullable', 'uuid', 'exists:companies,id'],
            'assigned_to' => ['nullable', 'uuid', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'value' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'expected_close_date' => ['nullable', 'date'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'status' => ['nullable', 'string', 'in:open,won,lost'],
            'custom_fields' => ['nullable', 'array'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['uuid', 'exists:tags,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'team_id' => $this->user()->current_team_id,
        ]);
    }
}
