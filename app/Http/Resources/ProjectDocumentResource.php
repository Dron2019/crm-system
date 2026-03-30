<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'category' => $this->category,
            'title' => $this->title,
            'file_url' => $this->file_url,
            'file_size' => $this->file_size,
            'mime_type' => $this->mime_type,
            'issued_at' => $this->issued_at,
            'expires_at' => $this->expires_at,
            'is_public' => $this->is_public,
            'uploaded_by' => $this->uploaded_by,
            'uploader' => new UserResource($this->whenLoaded('uploadedBy')),
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
