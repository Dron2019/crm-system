<?php

namespace App\Http\Requests\Contact;

use Illuminate\Foundation\Http\FormRequest;

class StoreContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('contacts.create');
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'mobile' => ['nullable', 'string', 'max:50'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'source' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'in:active,inactive,lead,customer'],
            'assigned_to' => ['nullable', 'uuid', 'exists:users,id'],
            'custom_fields' => ['nullable', 'array'],
            'company_ids' => ['nullable', 'array'],
            'company_ids.*' => ['uuid', 'exists:companies,id'],
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
