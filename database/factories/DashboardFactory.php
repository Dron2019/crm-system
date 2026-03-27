<?php

namespace Database\Factories;

use App\Models\Dashboard;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DashboardFactory extends Factory
{
    protected $model = Dashboard::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'name' => fake()->words(2, true) . ' Dashboard',
            'description' => fake()->optional()->sentence(),
            'is_default' => false,
            'layout' => [],
            'created_by' => User::factory(),
        ];
    }

    public function default(): static
    {
        return $this->state(fn () => ['is_default' => true]);
    }
}
