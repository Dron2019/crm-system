<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContactResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'mobile' => $this->mobile,
            'job_title' => $this->job_title,
            'avatar_url' => $this->avatar_url,
            'source' => $this->source,
            'status' => $this->status,
            'assigned_to' => new UserResource($this->whenLoaded('assignedTo')),
            'companies' => CompanyResource::collection($this->whenLoaded('companies')),
            'deals' => DealResource::collection($this->whenLoaded('deals')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'activities' => ActivityResource::collection($this->whenLoaded('activities')),
            'notes' => NoteResource::collection($this->whenLoaded('notes')),
            'custom_fields' => $this->custom_fields,
            'last_contacted_at' => $this->last_contacted_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
