<?php

namespace App\Http\Requests\Deal;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDealRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('deals.update');
    }

    public function rules(): array
    {
        return [
            'pipeline_id' => ['sometimes', 'uuid', 'exists:pipelines,id'],
            'stage_id' => ['sometimes', 'uuid', 'exists:stages,id'],
            'contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
            'company_id' => ['nullable', 'uuid', 'exists:companies,id'],
            'assigned_to' => ['nullable', 'uuid', 'exists:users,id'],
            'title' => ['sometimes', 'string', 'max:255'],
            'value' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'expected_close_date' => ['nullable', 'date'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'status' => ['nullable', 'string', 'in:open,won,lost'],
            'lost_reason' => ['nullable', 'string', 'max:1000'],
            'custom_fields' => ['nullable', 'array'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['uuid', 'exists:tags,id'],
        ];
    }
}
