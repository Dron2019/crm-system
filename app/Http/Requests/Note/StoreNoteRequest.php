<?php

namespace App\Http\Requests\Note;

use Illuminate\Foundation\Http\FormRequest;

class StoreNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('notes.create');
    }

    public function rules(): array
    {
        return [
            'notable_type' => ['required', 'string', 'in:contact,company,deal,activity'],
            'notable_id' => ['required', 'uuid'],
            'body' => ['required', 'string'],
            'is_pinned' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'team_id' => $this->user()->current_team_id,
        ]);
    }
}
