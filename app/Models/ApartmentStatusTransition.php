<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class ApartmentStatusTransition extends Model
{
    use BelongsToTeam, HasFactory, HasUuidPrimaryKey;

    protected $fillable = [
        'team_id',
        'from_status_id',
        'to_status_id',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function fromStatus(): BelongsTo
    {
        return $this->belongsTo(ApartmentStatus::class, 'from_status_id');
    }

    public function toStatus(): BelongsTo
    {
        return $this->belongsTo(ApartmentStatus::class, 'to_status_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
