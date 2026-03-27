<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Note;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class NoteFactory extends Factory
{
    protected $model = Note::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'user_id' => User::factory(),
            'notable_type' => Contact::class,
            'notable_id' => Contact::factory(),
            'body' => fake()->paragraphs(2, true),
            'is_pinned' => false,
        ];
    }

    public function pinned(): static
    {
        return $this->state(fn () => ['is_pinned' => true]);
    }
}
