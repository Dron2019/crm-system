<?php

namespace App\Models;

use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use App\Models\TeamRole;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

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
        'display_currency',
        'current_team_id',
        'mfa_secret',
        'mfa_enabled',
        'mfa_recovery_codes',
        'mfa_confirmed_at',
        'is_active',
        'deactivation_reason',
        'deactivated_by',
        'deactivated_at',
        'is_system_admin',
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
            'is_active' => 'boolean',
            'deactivated_at' => 'datetime',
            'is_system_admin' => 'boolean',
        ];
    }

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'team_members')
            ->withPivot('role', 'custom_role_id')
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
        $team = $this->teams()
            ->where('teams.id', $this->current_team_id)
            ->first();

        if (!$team) {
            return false;
        }

        // Team owner has all permissions
        if ($team->owner_id === $this->id) {
            return true;
        }

        $role = $team->pivot->role;

        if ($role === 'owner') {
            return true;
        }

        // Check custom role permissions first
        $customRoleId = $team->pivot->custom_role_id ?? null;
        if ($customRoleId) {
            $customRole = TeamRole::find($customRoleId);
            if ($customRole) {
                $perms = $customRole->permissions ?? [];
                return in_array($permission, $perms) || in_array('*', $perms);
            }
        }

        // Fall back to built-in config role
        $rolePermissions = config("crm.roles.{$role}.permissions", []);

        return in_array($permission, $rolePermissions) || in_array('*', $rolePermissions);
    }

    public function roleInCurrentTeam(): ?string
    {
        // System admins without a team still have elevated access
        if ($this->is_system_admin && !$this->current_team_id) {
            return 'admin';
        }

        $team = $this->teams()
            ->where('teams.id', $this->current_team_id)
            ->first();

        if (!$team) {
            return null;
        }

        // Team owner is always considered owner role
        if ($team->owner_id === $this->id) {
            return 'owner';
        }

        return $team->pivot->role;
    }

        /**
         * Send the password reset notification.
         */
        public function sendPasswordResetNotification($token): void
        {
            $this->notify(new ResetPasswordNotification($token));
        }
}
