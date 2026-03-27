<?php

namespace App\Models;

use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamRole extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'team_id',
        'name',
        'slug',
        'description',
        'color',
        'permissions',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
