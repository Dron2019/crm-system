<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable;

class Company extends Model
{
    use BelongsToTeam, HasFactory, HasUuidPrimaryKey, Searchable, SoftDeletes;

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'domain' => $this->domain,
            'industry' => $this->industry,
            'phone' => $this->phone,
            'website' => $this->website,
            'city' => $this->city,
            'country' => $this->country,
            'team_id' => $this->team_id,
        ];
    }

    protected $fillable = [
        'team_id',
        'name',
        'domain',
        'industry',
        'size',
        'annual_revenue',
        'phone',
        'website',
        'address_line_1',
        'address_line_2',
        'city',
        'state',
        'postal_code',
        'country',
        'logo_url',
        'custom_fields',
    ];

    protected function casts(): array
    {
        return [
            'annual_revenue' => 'decimal:2',
            'custom_fields' => 'array',
        ];
    }

    public function contacts(): BelongsToMany
    {
        return $this->belongsToMany(Contact::class, 'contact_company')
            ->withPivot('job_title', 'is_primary')
            ->withTimestamps();
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function activities(): MorphMany
    {
        return $this->morphMany(Activity::class, 'subject');
    }

    public function notes(): MorphMany
    {
        return $this->morphMany(Note::class, 'notable');
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
