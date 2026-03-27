<?php

namespace Database\Factories;

use App\Models\CustomFieldDefinition;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class CustomFieldDefinitionFactory extends Factory
{
    protected $model = CustomFieldDefinition::class;

    public function definition(): array
    {
        $name = fake()->unique()->word() . ' Field';

        return [
            'team_id' => Team::factory(),
            'entity_type' => fake()->randomElement(['contact', 'company', 'deal']),
            'name' => Str::slug($name),
            'label' => $name,
            'type' => fake()->randomElement(['text', 'number', 'date', 'select', 'boolean']),
            'options' => null,
            'is_required' => false,
            'display_order' => fake()->numberBetween(0, 20),
        ];
    }

    public function select(): static
    {
        return $this->state(fn () => [
            'type' => 'select',
            'options' => [
                ['value' => 'option_1', 'label' => 'Option 1'],
                ['value' => 'option_2', 'label' => 'Option 2'],
                ['value' => 'option_3', 'label' => 'Option 3'],
            ],
        ]);
    }
}
