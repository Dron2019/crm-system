<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\Model;

class Tag extends Model
{
    use BelongsToTeam, HasFactory, HasUuidPrimaryKey;

    protected $fillable = [
        'team_id',
        'name',
        'color',
    ];

    public function contacts(): MorphToMany
    {
        return $this->morphedByMany(Contact::class, 'taggable');
    }

    public function companies(): MorphToMany
    {
        return $this->morphedByMany(Company::class, 'taggable');
    }

    public function deals(): MorphToMany
    {
        return $this->morphedByMany(Deal::class, 'taggable');
    }
}
