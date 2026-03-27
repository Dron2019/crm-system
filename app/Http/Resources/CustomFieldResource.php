<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomFieldResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $options = $this->options;
        // Normalize [{value,label}] to string[] for frontend
        if (is_array($options) && !empty($options) && isset($options[0]['value'])) {
            $options = array_map(fn ($o) => $o['value'], $options);
        }

        return [
            'id' => $this->id,
            'entity_type' => $this->entity_type,
            'name' => $this->name,
            'label' => $this->label,
            'field_type' => $this->type,
            'options' => $options,
            'required' => $this->is_required,
            'display_order' => $this->display_order,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
