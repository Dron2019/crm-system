<?php

namespace App\Http\Requests\Note;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('notes.update');
    }

    public function rules(): array
    {
        return [
            'body' => ['sometimes', 'string'],
            'is_pinned' => ['boolean'],
        ];
    }
}
