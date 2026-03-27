<?php

namespace App\Http\Requests\CustomField;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomFieldRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('custom_fields.update');
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'label' => ['sometimes', 'string', 'max:255'],
            'field_type' => ['sometimes', 'string', 'in:text,textarea,number,date,select,multiselect,url,email,phone,boolean,currency,file'],
            'entity_type' => ['sometimes', 'string', 'in:contact,company,deal,team'],
            'options' => ['nullable', 'array'],
            'options.*' => ['string'],
            'required' => ['boolean'],
            'is_required' => ['boolean'],
            'display_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function validated($key = null, $default = null): mixed
    {
        $data = parent::validated($key, $default);

        if ($key !== null) {
            return $data;
        }

        if (isset($data['field_type'])) {
            $data['type'] = $data['field_type'];
            unset($data['field_type']);
        }

        if (array_key_exists('required', $data) && !array_key_exists('is_required', $data)) {
            $data['is_required'] = $data['required'];
        }
        unset($data['required']);

        if (!empty($data['options'])) {
            $data['options'] = array_map(fn ($opt) => is_string($opt)
                ? ['value' => $opt, 'label' => $opt]
                : $opt, $data['options']);
        }

        return $data;
    }
}
