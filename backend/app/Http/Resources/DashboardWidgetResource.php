<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DashboardWidgetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'widget_type' => $this->widget_type,
            'config' => $this->config,
            'position' => $this->position,
            'size_x' => $this->size_x,
            'size_y' => $this->size_y,
            'refresh_interval' => $this->refresh_interval,
        ];
    }
}
