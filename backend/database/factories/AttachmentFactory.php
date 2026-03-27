<?php

namespace Database\Factories;

use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttachmentFactory extends Factory
{
    protected $model = Attachment::class;

    public function definition(): array
    {
        $filename = fake()->uuid() . '.pdf';

        return [
            'team_id' => Team::factory(),
            'user_id' => User::factory(),
            'attachable_type' => Contact::class,
            'attachable_id' => Contact::factory(),
            'filename' => $filename,
            'original_filename' => fake()->word() . '.pdf',
            'mime_type' => 'application/pdf',
            'size' => fake()->numberBetween(1024, 10485760),
            'disk' => 'local',
            'path' => 'attachments/' . $filename,
        ];
    }
}
