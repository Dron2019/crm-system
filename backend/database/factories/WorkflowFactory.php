<?php

namespace Database\Factories;

use App\Models\Team;
use App\Models\Workflow;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkflowFactory extends Factory
{
    protected $model = Workflow::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'name' => fake()->sentence(3),
            'description' => fake()->optional()->sentence(),
            'trigger_event' => fake()->randomElement([
                'contact.created', 'contact.updated',
                'deal.created', 'deal.stage_changed', 'deal.won', 'deal.lost',
            ]),
            'conditions' => [],
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
