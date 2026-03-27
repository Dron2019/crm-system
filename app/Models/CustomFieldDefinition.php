<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class CustomFieldDefinition extends Model
{
    use BelongsToTeam, HasFactory, HasUuidPrimaryKey;

    protected $fillable = [
        'team_id',
        'entity_type',
        'name',
        'label',
        'type',
        'options',
        'is_required',
        'display_order',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'is_required' => 'boolean',
            'display_order' => 'integer',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
