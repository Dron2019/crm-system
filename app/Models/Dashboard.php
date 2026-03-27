<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dashboard extends Model
{
    use BelongsToTeam, HasUuidPrimaryKey;

    protected $fillable = [
        'team_id',
        'name',
        'description',
        'is_default',
        'layout',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'layout' => 'array',
        ];
    }

    public function widgets(): HasMany
    {
        return $this->hasMany(DashboardWidget::class)->orderBy('position');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
