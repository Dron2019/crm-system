<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'apartment_id' => $this->apartment_id,
            'client_id' => $this->client_id,
            'deal_id' => $this->deal_id,
            'manager_id' => $this->manager_id,
            'status' => $this->status,
            'expires_at' => $this->expires_at,
            'notes' => $this->notes,
            'manager' => new UserResource($this->whenLoaded('manager')),
            'client' => new ContactResource($this->whenLoaded('client')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
