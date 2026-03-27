<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    private function normalizeCustomFields(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }

        if (array_is_list($value)) {
            return [];
        }

        return $value;
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'domain' => $this->domain,
            'industry' => $this->industry,
            'size' => $this->size,
            'annual_revenue' => $this->annual_revenue,
            'phone' => $this->phone,
            'website' => $this->website,
            'address_line_1' => $this->address_line_1,
            'address_line_2' => $this->address_line_2,
            'city' => $this->city,
            'state' => $this->state,
            'postal_code' => $this->postal_code,
            'country' => $this->country,
            'logo_url' => $this->logo_url,
            'contacts' => ContactResource::collection($this->whenLoaded('contacts')),
            'deals' => DealResource::collection($this->whenLoaded('deals')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'activities' => ActivityResource::collection($this->whenLoaded('activities')),
            'notes' => NoteResource::collection($this->whenLoaded('notes')),
            'custom_fields' => $this->normalizeCustomFields($this->custom_fields),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
