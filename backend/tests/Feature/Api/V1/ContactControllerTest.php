<?php

namespace Tests\Feature\Api\V1;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CrmTestHelpers;

class ContactControllerTest extends TestCase
{
    use RefreshDatabase, CrmTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCrmUser();
    }

    public function test_can_list_contacts(): void
    {
        Contact::factory()->count(3)->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson('/api/v1/contacts');

        $response->assertOk()
            ->assertJsonStructure(['data'])
            ->assertJsonCount(3, 'data');
    }

    public function test_list_contacts_only_shows_own_team(): void
    {
        Contact::factory()->count(2)->create(['team_id' => $this->team->id]);
        Contact::factory()->count(3)->create(); // different team

        $response = $this->apiAs()
            ->getJson('/api/v1/contacts');

        $response->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_contact(): void
    {
        $response = $this->apiAs()
            ->postJson('/api/v1/contacts', [
                'first_name' => 'Jane',
                'last_name' => 'Doe',
                'email' => 'jane@example.com',
                'phone' => '+1-555-0199',
                'job_title' => 'CEO',
                'source' => 'website',
                'status' => 'lead',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.first_name', 'Jane')
            ->assertJsonPath('data.last_name', 'Doe')
            ->assertJsonPath('data.email', 'jane@example.com');

        $this->assertDatabaseHas('contacts', [
            'team_id' => $this->team->id,
            'email' => 'jane@example.com',
        ]);
    }

    public function test_create_contact_validates_required_fields(): void
    {
        $response = $this->apiAs()
            ->postJson('/api/v1/contacts', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['first_name']);
    }

    public function test_can_create_contact_with_companies(): void
    {
        $company = Company::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->postJson('/api/v1/contacts', [
                'first_name' => 'Bob',
                'last_name' => 'Smith',
                'email' => 'bob@example.com',
                'company_ids' => [$company->id],
            ]);

        $response->assertStatus(201);

        $contact = Contact::where('email', 'bob@example.com')->first();
        $this->assertTrue($contact->companies->contains($company));
    }

    public function test_can_create_contact_with_tags(): void
    {
        $tag = Tag::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->postJson('/api/v1/contacts', [
                'first_name' => 'Tagged',
                'last_name' => 'Contact',
                'tag_ids' => [$tag->id],
            ]);

        $response->assertStatus(201);

        $contact = Contact::where('first_name', 'Tagged')->first();
        $this->assertTrue($contact->tags->contains($tag));
    }

    public function test_can_show_contact(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson("/api/v1/contacts/{$contact->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $contact->id);
    }

    public function test_can_update_contact(): void
    {
        $contact = Contact::factory()->create([
            'team_id' => $this->team->id,
            'first_name' => 'Old',
        ]);

        $response = $this->apiAs()
            ->putJson("/api/v1/contacts/{$contact->id}", [
                'first_name' => 'Updated',
                'last_name' => 'Name',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.first_name', 'Updated');

        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'first_name' => 'Updated',
        ]);
    }

    public function test_can_delete_contact(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->deleteJson("/api/v1/contacts/{$contact->id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('contacts', ['id' => $contact->id]);
    }

    public function test_unauthenticated_cannot_access_contacts(): void
    {
        $response = $this->getJson('/api/v1/contacts');

        $response->assertStatus(401);
    }

    public function test_can_search_contacts(): void
    {
        Contact::factory()->create([
            'team_id' => $this->team->id,
            'first_name' => 'FindMe',
        ]);
        Contact::factory()->create([
            'team_id' => $this->team->id,
            'first_name' => 'Other',
        ]);

        $response = $this->apiAs()
            ->getJson('/api/v1/contacts?search=FindMe');

        $response->assertOk();
    }

    public function test_can_filter_contacts_by_status(): void
    {
        Contact::factory()->create([
            'team_id' => $this->team->id,
            'status' => 'lead',
        ]);
        Contact::factory()->create([
            'team_id' => $this->team->id,
            'status' => 'customer',
        ]);

        $response = $this->apiAs()
            ->getJson('/api/v1/contacts?status=lead');

        $response->assertOk();
    }

    public function test_contacts_are_paginated(): void
    {
        Contact::factory()->count(25)->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson('/api/v1/contacts?per_page=10');

        $response->assertOk()
            ->assertJsonStructure(['data', 'meta', 'links']);
    }

    public function test_can_get_contact_activities(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson("/api/v1/contacts/{$contact->id}/activities");

        $response->assertOk();
    }

    public function test_can_get_contact_deals(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson("/api/v1/contacts/{$contact->id}/deals");

        $response->assertOk();
    }

    public function test_can_get_contact_notes(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson("/api/v1/contacts/{$contact->id}/notes");

        $response->assertOk();
    }

    public function test_can_get_contact_timeline(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson("/api/v1/contacts/{$contact->id}/timeline");

        $response->assertOk();
    }
}
