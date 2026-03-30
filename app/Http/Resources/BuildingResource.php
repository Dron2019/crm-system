<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BuildingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'name' => $this->name,
            'number' => $this->number,
            'city' => $this->city,
            'address' => $this->address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'total_floors' => $this->total_floors,
            'total_apartments' => $this->total_apartments,
            'apartments_count' => $this->when(isset($this->apartments_count), $this->apartments_count),
            'status' => $this->status,
            'construction_start' => $this->construction_start,
            'completion_date' => $this->completion_date,
            'description' => $this->description,
            'project' => new ProjectResource($this->whenLoaded('project')),
            'sections' => SectionResource::collection($this->whenLoaded('sections')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
