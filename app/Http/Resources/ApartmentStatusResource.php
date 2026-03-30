<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApartmentStatusResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'color' => $this->color,
            'is_active' => $this->is_active,
            'is_default' => $this->is_default,
            'can_reserve' => $this->can_reserve,
            'can_sell' => $this->can_sell,
            'sort_order' => $this->sort_order,
        ];
    }
}
