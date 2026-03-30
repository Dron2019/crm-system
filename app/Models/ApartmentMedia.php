<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class ApartmentMedia extends Model
{
    use BelongsToTeam, HasFactory, HasUuidPrimaryKey, SoftDeletes;

    protected $fillable = [
        'team_id',
        'apartment_id',
        'type',
        'file_url',
        'title',
        'description',
        'file_size',
        'mime_type',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function apartment(): BelongsTo
    {
        return $this->belongsTo(Apartment::class);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopePhotos($query)
    {
        return $query->where('type', 'photo');
    }

    public function scopeFloorPlans($query)
    {
        return $query->where('type', 'floor_plan');
    }
}
