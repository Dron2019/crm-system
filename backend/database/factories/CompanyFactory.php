<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompanyFactory extends Factory
{
    protected $model = Company::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'name' => fake()->company(),
            'domain' => fake()->domainName(),
            'industry' => fake()->randomElement(['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education']),
            'size' => fake()->randomElement(['1-10', '11-50', '51-200', '201-500', '500+']),
            'annual_revenue' => fake()->optional()->randomFloat(2, 10000, 10000000),
            'phone' => fake()->phoneNumber(),
            'website' => fake()->url(),
            'address_line_1' => fake()->streetAddress(),
            'city' => fake()->city(),
            'state' => fake()->state(),
            'postal_code' => fake()->postcode(),
            'country' => fake()->country(),
            'custom_fields' => [],
        ];
    }
}
