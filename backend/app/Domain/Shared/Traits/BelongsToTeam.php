<?php

namespace App\Domain\Shared\Traits;

use App\Models\Team;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToTeam
{
    protected static function bootBelongsToTeam(): void
    {
        static::addGlobalScope('team', function (Builder $builder) {
            if ($team = auth()->user()?->currentTeam) {
                $builder->where($builder->getModel()->getTable() . '.team_id', $team->id);
            }
        });

        static::creating(function (Model $model) {
            if (!$model->team_id && auth()->user()?->currentTeam) {
                $model->team_id = auth()->user()->currentTeam->id;
            }
        });
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
