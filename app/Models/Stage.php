<?php

namespace App\Models;

use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class Stage extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    protected $fillable = [
        'pipeline_id',
        'name',
        'display_order',
        'color',
        'is_won',
        'is_lost',
    ];

    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
            'is_won' => 'boolean',
            'is_lost' => 'boolean',
        ];
    }

    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }
}
