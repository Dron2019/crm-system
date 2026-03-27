<?php

namespace Tests\Feature\Api\V1;

use App\Models\Activity;
use App\Models\Contact;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CrmTestHelpers;

class ActivityControllerTest extends TestCase
{
    use RefreshDatabase, CrmTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCrmUser();
    }

    public function test_can_list_activities(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);
        Activity::factory()->count(3)->create([
            'team_id' => $this->team->id,
            'user_id' => $this->user->id,
            'subject_type' => Contact::class,
            'subject_id' => $contact->id,
        ]);

        $response = $this->apiAs()
            ->getJson('/api/v1/activities');

        $response->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_can_create_activity(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->postJson('/api/v1/activities', [
                'type' => 'call',
                'title' => 'Follow-up call',
                'description' => 'Discuss proposal details',
                'subject_type' => 'contact',
                'subject_id' => $contact->id,
                'scheduled_at' => now()->addDay()->toISOString(),
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Follow-up call')
            ->assertJsonPath('data.type', 'call');
    }

    public function test_create_activity_validates_required_fields(): void
    {
        $response = $this->apiAs()
            ->postJson('/api/v1/activities', []);

        $response->assertStatus(422);
    }

    public function test_can_show_activity(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);
        $activity = Activity::factory()->create([
            'team_id' => $this->team->id,
            'user_id' => $this->user->id,
            'subject_type' => Contact::class,
            'subject_id' => $contact->id,
        ]);

        $response = $this->apiAs()
            ->getJson("/api/v1/activities/{$activity->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $activity->id);
    }

    public function test_can_update_activity(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);
        $activity = Activity::factory()->create([
            'team_id' => $this->team->id,
            'user_id' => $this->user->id,
            'subject_type' => Contact::class,
            'subject_id' => $contact->id,
            'title' => 'Old Title',
        ]);

        $response = $this->apiAs()
            ->putJson("/api/v1/activities/{$activity->id}", [
                'title' => 'Updated Title',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.title', 'Updated Title');
    }

    public function test_can_delete_activity(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);
        $activity = Activity::factory()->create([
            'team_id' => $this->team->id,
            'user_id' => $this->user->id,
            'subject_type' => Contact::class,
            'subject_id' => $contact->id,
        ]);

        $response = $this->apiAs()
            ->deleteJson("/api/v1/activities/{$activity->id}");

        $response->assertStatus(204);
    }

    public function test_can_complete_activity(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);
        $activity = Activity::factory()->create([
            'team_id' => $this->team->id,
            'user_id' => $this->user->id,
            'subject_type' => Contact::class,
            'subject_id' => $contact->id,
            'completed_at' => null,
        ]);

        $response = $this->apiAs()
            ->postJson("/api/v1/activities/{$activity->id}/complete");

        $response->assertOk();
        $activity->refresh();
        $this->assertNotNull($activity->completed_at);
    }

    public function test_activities_only_show_own_team(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);
        Activity::factory()->count(2)->create([
            'team_id' => $this->team->id,
            'user_id' => $this->user->id,
            'subject_type' => Contact::class,
            'subject_id' => $contact->id,
        ]);
        Activity::factory()->count(3)->create(); // different team

        $response = $this->apiAs()
            ->getJson('/api/v1/activities');

        $response->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_unauthenticated_cannot_access_activities(): void
    {
        $response = $this->getJson('/api/v1/activities');

        $response->assertStatus(401);
    }
}
