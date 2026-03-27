<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Pipeline extends Model
{
    use BelongsToTeam, HasFactory, HasUuidPrimaryKey, SoftDeletes;

    protected $fillable = [
        'team_id',
        'name',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    public function stages(): HasMany
    {
        return $this->hasMany(Stage::class)->orderBy('display_order');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
