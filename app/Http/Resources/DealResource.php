<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DealResource extends JsonResource
{
    private function normalizeCustomFields(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }

        // Sequential arrays are not valid key-value custom field maps.
        if (array_is_list($value)) {
            return [];
        }

        return $value;
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'value' => $this->value,
            'currency' => $this->currency,
            'expected_close_date' => $this->expected_close_date,
            'probability' => $this->probability,
            'status' => $this->status,
            'lost_reason' => $this->lost_reason,
            'pipeline' => new PipelineResource($this->whenLoaded('pipeline')),
            'stage' => new StageResource($this->whenLoaded('stage')),
            'contact' => new ContactResource($this->whenLoaded('contact')),
            'company' => new CompanyResource($this->whenLoaded('company')),
            'assigned_to' => new UserResource($this->whenLoaded('assignedTo')),
            'apartment' => new ApartmentResource($this->whenLoaded('apartment')),
            'attached_by' => new UserResource($this->whenLoaded('attachedBy')),
            'attached_at' => $this->attached_at,
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'activities' => ActivityResource::collection($this->whenLoaded('activities')),
            'notes' => NoteResource::collection($this->whenLoaded('notes')),
            'custom_fields' => $this->normalizeCustomFields($this->custom_fields),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
