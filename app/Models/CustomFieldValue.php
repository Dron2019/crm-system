<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class CustomFieldValue extends Model
{
    use BelongsToTeam, HasFactory, HasUuidPrimaryKey, SoftDeletes;

    protected $fillable = [
        'team_id',
        'definition_id',
        'project_id',
        'building_id',
        'apartment_id',
        'value_text',
        'value_number',
        'value_boolean',
        'value_date',
        'value_json',
    ];

    protected function casts(): array
    {
        return [
            'value_number' => 'decimal:6',
            'value_boolean' => 'boolean',
            'value_date' => 'date',
            'value_json' => 'array',
        ];
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(CustomFieldDefinition::class, 'definition_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    public function apartment(): BelongsTo
    {
        return $this->belongsTo(Apartment::class);
    }

    public function getValue()
    {
        return match ($this->definition?->field_type) {
            'text' => $this->value_text,
            'number' => $this->value_number,
            'boolean' => $this->value_boolean,
            'date' => $this->value_date,
            'select', 'multiselect', 'url' => $this->value_json,
            default => null,
        };
    }

    public function scopeForProject($query, $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    public function scopeForBuilding($query, $buildingId)
    {
        return $query->where('building_id', $buildingId);
    }

    public function scopeForApartment($query, $apartmentId)
    {
        return $query->where('apartment_id', $apartmentId);
    }
}
