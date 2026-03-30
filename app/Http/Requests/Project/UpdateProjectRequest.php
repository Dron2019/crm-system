<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('projects.update');
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'status' => ['nullable', 'in:planning,construction,sales,completed,archived'],
            'start_date' => ['nullable', 'date'],
            'delivery_date' => ['nullable', 'date'],
            'manager_id' => ['nullable', 'uuid', 'exists:users,id'],
            'description' => ['nullable', 'string'],
            'logo_url' => ['nullable', 'url', 'max:500'],
            'site_url' => ['nullable', 'url', 'max:500'],
        ];
    }
}
