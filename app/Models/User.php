<?php

namespace App\Models;

use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Notifications\ResetPasswordNotification;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuidPrimaryKey, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar_url',
        'timezone',
        'locale',
        'settings',
        'current_team_id',
        'mfa_secret',
        'mfa_enabled',
        'mfa_recovery_codes',
        'mfa_confirmed_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'mfa_secret',
        'mfa_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'settings' => 'array',
            'last_login_at' => 'datetime',
            'mfa_enabled' => 'boolean',
            'mfa_recovery_codes' => 'encrypted:array',
            'mfa_confirmed_at' => 'datetime',
        ];
    }

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'team_members')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function currentTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'current_team_id');
    }

    public function ownedTeams(): HasMany
    {
        return $this->hasMany(Team::class, 'owner_id');
    }

    public function hasPermission(string $permission): bool
    {
        $teamMember = $this->teams()
            ->where('teams.id', $this->current_team_id)
            ->first();

        if (!$teamMember) {
            return false;
        }

        $role = $teamMember->pivot->role;

        if ($role === 'owner') {
            return true;
        }

        $rolePermissions = config("crm.roles.{$role}.permissions", []);

        return in_array($permission, $rolePermissions) || in_array('*', $rolePermissions);
    }

    public function roleInCurrentTeam(): ?string
    {
        return $this->teams()
            ->where('teams.id', $this->current_team_id)
            ->first()
            ?->pivot
            ?->role;
    }

        /**
         * Send the password reset notification.
         */
        public function sendPasswordResetNotification($token): void
        {
            $this->notify(new ResetPasswordNotification($token));
        }
}
