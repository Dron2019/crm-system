<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Apartment extends Model
{
    use BelongsToTeam, HasFactory, HasUuidPrimaryKey, SoftDeletes;

    protected $fillable = [
        'team_id',
        'project_id',
        'building_id',
        'section_id',
        'number',
        'floor',
        'rooms',
        'area',
        'balcony_area',
        'price',
        'price_per_sqm',
        'status_id',
        'layout_type',
        'has_balcony',
        'has_terrace',
        'has_loggia',
        'ceiling_height',
        'custom_fields',
    ];

    protected function casts(): array
    {
        return [
            'area' => 'decimal:2',
            'balcony_area' => 'decimal:2',
            'price' => 'decimal:2',
            'price_per_sqm' => 'decimal:2',
            'ceiling_height' => 'decimal:2',
            'has_balcony' => 'boolean',
            'has_terrace' => 'boolean',
            'has_loggia' => 'boolean',
            'custom_fields' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function status(): BelongsTo
    {
        return $this->belongsTo(ApartmentStatus::class, 'status_id');
    }

    public function activeReservation(): HasOne
    {
        return $this->hasOne(Reservation::class)->where('status', 'active');
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(ApartmentMedia::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(ApartmentStatusHistory::class);
    }

    public function pricingHistory(): HasMany
    {
        return $this->hasMany(ApartmentPricingHistory::class);
    }

    public function customFieldValues(): HasMany
    {
        return $this->hasMany(CustomFieldValue::class);
    }

    public function scopeAvailable($query)
    {
        return $query->whereHas('status', fn($q) => $q->where('name', 'Вільно'));
    }

    public function scopeByFloor($query, $floor)
    {
        return $query->where('floor', $floor);
    }

    public function scopeByRooms($query, $rooms)
    {
        return $query->where('rooms', $rooms);
    }

    public function scopeByStatus($query, $statusId)
    {
        return $query->where('status_id', $statusId);
    }
}
