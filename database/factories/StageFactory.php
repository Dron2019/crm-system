<?php

namespace Database\Factories;

use App\Models\Pipeline;
use App\Models\Stage;
use Illuminate\Database\Eloquent\Factories\Factory;

class StageFactory extends Factory
{
    protected $model = Stage::class;

    public function definition(): array
    {
        return [
            'pipeline_id' => Pipeline::factory(),
            'name' => fake()->randomElement(['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']),
            'display_order' => fake()->numberBetween(0, 10),
            'color' => fake()->hexColor(),
            'is_won' => false,
            'is_lost' => false,
        ];
    }

    public function won(): static
    {
        return $this->state(fn () => ['is_won' => true, 'name' => 'Closed Won']);
    }

    public function lost(): static
    {
        return $this->state(fn () => ['is_lost' => true, 'name' => 'Closed Lost']);
    }
}
