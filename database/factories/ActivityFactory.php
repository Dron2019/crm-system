<?php

namespace Database\Factories;

use App\Models\Activity;
use App\Models\Contact;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ActivityFactory extends Factory
{
    protected $model = Activity::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'user_id' => User::factory(),
            'subject_type' => Contact::class,
            'subject_id' => Contact::factory(),
            'type' => fake()->randomElement(['call', 'email', 'meeting', 'task', 'note']),
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->paragraph(),
            'scheduled_at' => fake()->dateTimeBetween('-1 week', '+2 weeks'),
            'completed_at' => null,
            'metadata' => [],
        ];
    }

    public function completed(): static
    {
        return $this->state(fn () => ['completed_at' => now()]);
    }
}
