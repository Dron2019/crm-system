<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContactFactory extends Factory
{
    protected $model = Contact::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'mobile' => fake()->optional()->phoneNumber(),
            'job_title' => fake()->jobTitle(),
            'source' => fake()->randomElement(['website', 'referral', 'linkedin', 'cold_call', 'event']),
            'status' => fake()->randomElement(['active', 'inactive', 'lead', 'customer']),
            'assigned_to' => null,
            'custom_fields' => [],
        ];
    }

    public function assignedTo(User $user): static
    {
        return $this->state(fn () => ['assigned_to' => $user->id]);
    }
}
