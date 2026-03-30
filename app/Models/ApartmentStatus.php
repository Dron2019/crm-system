<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class ApartmentStatus extends Model
{
    use BelongsToTeam, HasFactory, HasUuidPrimaryKey;

    public $timestamps = false;

    protected $fillable = [
        'team_id',
        'name',
        'color',
        'is_active',
        'is_default',
        'can_reserve',
        'can_sell',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'can_reserve' => 'boolean',
            'can_sell' => 'boolean',
        ];
    }

    public function apartments(): HasMany
    {
        return $this->hasMany(Apartment::class, 'status_id');
    }

    public function transitionsFrom(): HasMany
    {
        return $this->hasMany(ApartmentStatusTransition::class, 'from_status_id');
    }

    public function transitionsTo(): HasMany
    {
        return $this->hasMany(ApartmentStatusTransition::class, 'to_status_id');
    }

    public function canTransitionTo(ApartmentStatus $status): bool
    {
        return $this->transitionsFrom()
            ->where('to_status_id', $status->id)
            ->where('is_active', true)
            ->exists();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
