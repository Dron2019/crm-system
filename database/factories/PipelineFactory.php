<?php

namespace Database\Factories;

use App\Models\Pipeline;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

class PipelineFactory extends Factory
{
    protected $model = Pipeline::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'name' => fake()->randomElement(['Sales', 'Enterprise', 'Partnerships', 'Inbound', 'Outbound']),
            'is_default' => false,
        ];
    }

    public function default(): static
    {
        return $this->state(fn () => ['is_default' => true]);
    }
}
