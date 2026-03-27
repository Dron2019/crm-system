<?php

namespace Tests\Traits;

use App\Models\Pipeline;
use App\Models\Stage;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Str;

trait CrmTestHelpers
{
    protected User $user;
    protected Team $team;
    protected Pipeline $pipeline;

    protected function setUpCrmUser(string $role = 'owner'): void
    {
        $this->user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->team = Team::create([
            'name' => 'Test Team',
            'slug' => 'test-team-' . Str::random(6),
            'owner_id' => $this->user->id,
        ]);

        $this->team->members()->attach($this->user->id, ['role' => $role]);
        $this->user->update(['current_team_id' => $this->team->id]);

        $this->pipeline = Pipeline::create([
            'team_id' => $this->team->id,
            'name' => 'Default Pipeline',
            'is_default' => true,
        ]);

        $this->pipeline->stages()->createMany([
            ['name' => 'Lead', 'display_order' => 0, 'color' => '#94a3b8'],
            ['name' => 'Qualified', 'display_order' => 1, 'color' => '#6366f1'],
            ['name' => 'Won', 'display_order' => 2, 'color' => '#22c55e', 'is_won' => true],
            ['name' => 'Lost', 'display_order' => 3, 'color' => '#ef4444', 'is_lost' => true],
        ]);
    }

    protected function getStage(string $name = 'Lead'): Stage
    {
        return $this->pipeline->stages()->where('name', $name)->first();
    }

    protected function apiAs(?User $user = null): static
    {
        return $this->actingAs($user ?? $this->user);
    }
}
