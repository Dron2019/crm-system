<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'building_id' => $this->building_id,
            'section_id' => $this->section_id,
            'number' => $this->number,
            'floor' => $this->floor,
            'rooms' => $this->rooms,
            'area' => (float) $this->area,
            'balcony_area' => $this->balcony_area ? (float) $this->balcony_area : null,
            'price' => (float) $this->price,
            'price_per_sqm' => $this->price_per_sqm ? (float) $this->price_per_sqm : null,
            'status_id' => $this->status_id,
            'status' => new ApartmentStatusResource($this->whenLoaded('status')),
            'layout_type' => $this->layout_type,
            'has_balcony' => $this->has_balcony,
            'has_terrace' => $this->has_terrace,
            'has_loggia' => $this->has_loggia,
            'ceiling_height' => $this->ceiling_height ? (float) $this->ceiling_height : null,
            'custom_fields' => $this->custom_fields,
            'active_reservation' => new ReservationResource($this->whenLoaded('activeReservation')),
            'media' => ApartmentMediaResource::collection($this->whenLoaded('media')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
