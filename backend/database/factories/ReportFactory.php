<?php

namespace Database\Factories;

use App\Models\Report;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReportFactory extends Factory
{
    protected $model = Report::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'name' => fake()->sentence(3),
            'description' => fake()->optional()->sentence(),
            'report_type' => fake()->randomElement(['pipeline', 'activity', 'revenue', 'overview']),
            'config' => [],
            'created_by' => User::factory(),
            'is_shared' => false,
        ];
    }

    public function shared(): static
    {
        return $this->state(fn () => ['is_shared' => true]);
    }
}
