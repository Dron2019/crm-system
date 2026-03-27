<?php

namespace Database\Factories;

use App\Models\Team;
use App\Models\Webhook;
use Illuminate\Database\Eloquent\Factories\Factory;

class WebhookFactory extends Factory
{
    protected $model = Webhook::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'url' => fake()->url(),
            'events' => fake()->randomElements(
                ['contact.created', 'contact.updated', 'deal.created', 'deal.won', 'deal.lost'],
                rand(1, 3)
            ),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
