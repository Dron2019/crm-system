<?php

namespace App\Models;

use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DashboardWidget extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'dashboard_id',
        'widget_type',
        'config',
        'position',
        'size_x',
        'size_y',
        'refresh_interval',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'array',
        ];
    }

    public function dashboard(): BelongsTo
    {
        return $this->belongsTo(Dashboard::class);
    }
}
