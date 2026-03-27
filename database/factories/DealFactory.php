<?php

namespace Database\Factories;

use App\Models\Deal;
use App\Models\Pipeline;
use App\Models\Stage;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

class DealFactory extends Factory
{
    protected $model = Deal::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'pipeline_id' => Pipeline::factory(),
            'stage_id' => Stage::factory(),
            'title' => fake()->catchPhrase(),
            'value' => fake()->randomFloat(2, 1000, 500000),
            'currency' => 'USD',
            'expected_close_date' => fake()->dateTimeBetween('+1 week', '+6 months'),
            'probability' => fake()->numberBetween(10, 90),
            'status' => 'open',
            'custom_fields' => [],
        ];
    }

    public function won(): static
    {
        return $this->state(fn () => ['status' => 'won', 'probability' => 100]);
    }

    public function lost(): static
    {
        return $this->state(fn () => ['status' => 'lost', 'probability' => 0]);
    }
}
