<?php

namespace App\Http\Requests\Activity;

use Illuminate\Foundation\Http\FormRequest;

class StoreActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('activities.create');
    }

    public function rules(): array
    {
        return [
            'subject_type' => ['required', 'string', 'in:contact,company,deal'],
            'subject_id' => ['required', 'uuid'],
            'type' => ['required', 'string', 'in:call,email,meeting,task,note'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'scheduled_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'team_id' => $this->user()->current_team_id,
        ]);
    }
}
