<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailAccount extends Model
{
    use BelongsToTeam, HasUuidPrimaryKey;

    protected $fillable = [
        'team_id',
        'user_id',
        'email',
        'name',
        'provider',
        'imap_settings',
        'smtp_settings',
        'is_active',
        'last_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'imap_settings' => 'encrypted:array',
            'smtp_settings' => 'encrypted:array',
            'is_active' => 'boolean',
            'last_synced_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(EmailMessage::class);
    }
}
