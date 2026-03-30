<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class ProjectDocument extends Model
{
    use BelongsToTeam, HasFactory, HasUuidPrimaryKey, SoftDeletes;

    protected $fillable = [
        'team_id',
        'project_id',
        'category',
        'title',
        'file_url',
        'file_size',
        'mime_type',
        'issued_at',
        'expires_at',
        'is_public',
        'uploaded_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'date',
            'expires_at' => 'date',
            'is_public' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function scopeExpired($query)
    {
        return $query->whereDate('expires_at', '<', now());
    }

    public function scopeExpiring($query, $daysAhead = 30)
    {
        return $query->whereBetween('expires_at', [now(), now()->addDays($daysAhead)]);
    }

    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }
}
