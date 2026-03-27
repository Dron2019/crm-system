<?php

namespace App\Http\Requests\Deal;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDealRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('deals.update');
    }

    public function rules(): array
    {
        return [
            'pipeline_id' => [
                'sometimes', 'uuid',
                Rule::exists('pipelines', 'id')->where('team_id', $this->user()->current_team_id),
            ],
            'stage_id' => [
                'sometimes', 'uuid',
                Rule::exists('stages', 'id')->whereIn('pipeline_id', function ($q) {
                    $q->select('id')->from('pipelines')->where('team_id', $this->user()->current_team_id);
                }),
            ],
            'contact_id' => [
                'nullable', 'uuid',
                Rule::exists('contacts', 'id')->where('team_id', $this->user()->current_team_id),
            ],
            'company_id' => [
                'nullable', 'uuid',
                Rule::exists('companies', 'id')->where('team_id', $this->user()->current_team_id),
            ],
            'assigned_to' => [
                'nullable', 'uuid',
                Rule::exists('users', 'id')->whereIn('id', function ($q) {
                    $q->select('user_id')->from('team_members')->where('team_id', $this->user()->current_team_id);
                }),
            ],
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
