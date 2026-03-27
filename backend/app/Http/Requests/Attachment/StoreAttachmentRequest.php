<?php

namespace App\Http\Requests\Attachment;

use Illuminate\Foundation\Http\FormRequest;

class StoreAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:20480'],
            'attachable_type' => ['required', 'string', 'in:contact,company,deal,note'],
            'attachable_id' => ['required', 'uuid'],
        ];
    }
}
