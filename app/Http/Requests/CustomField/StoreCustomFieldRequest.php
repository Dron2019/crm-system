<?php

namespace App\Http\Requests\CustomField;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomFieldRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('custom_fields.create');
    }

    public function rules(): array
    {
        return [
            'entity_type' => ['required', 'string', 'in:contact,company,deal,team'],
            'name' => ['required', 'string', 'max:255'],
            'label' => ['required', 'string', 'max:255'],
            'field_type' => ['required', 'string', 'in:text,textarea,number,date,select,multiselect,url,email,phone,boolean,currency,file'],
            'options' => ['nullable', 'array'],
            'options.*' => ['string'],
            'required' => ['boolean'],
            'is_required' => ['boolean'],
        ];
    }

    public function validated($key = null, $default = null): mixed
    {
        $data = parent::validated($key, $default);

        if ($key !== null) {
            return $data;
        }

        // Map field_type -> type (DB column)
        if (isset($data['field_type'])) {
            $data['type'] = $data['field_type'];
            unset($data['field_type']);
        }

        if (array_key_exists('required', $data) && !array_key_exists('is_required', $data)) {
            $data['is_required'] = $data['required'];
        }
        unset($data['required']);

        // Convert string options to value/label pairs
        if (!empty($data['options'])) {
            $data['options'] = array_map(fn ($opt) => is_string($opt)
                ? ['value' => $opt, 'label' => $opt]
                : $opt, $data['options']);
        }

        return $data;
    }
}
