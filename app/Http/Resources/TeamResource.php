<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'owner_id' => $this->owner_id,
            'billing_plan' => $this->billing_plan,
            'role' => $this->whenPivotLoaded('team_members', fn () => $this->pivot->role),
            'created_at' => $this->created_at,
        ];
    }
}
