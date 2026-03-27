<?php

namespace Tests\Feature\Api\V1;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Deal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CrmTestHelpers;

class DealControllerTest extends TestCase
{
    use RefreshDatabase, CrmTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCrmUser();
    }

    public function test_can_list_deals(): void
    {
        $stage = $this->getStage();
        Deal::factory()->count(3)->create([
            'team_id' => $this->team->id,
            'pipeline_id' => $this->pipeline->id,
            'stage_id' => $stage->id,
        ]);

        $response = $this->apiAs()
            ->getJson('/api/v1/deals');

        $response->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_list_deals_only_shows_own_team(): void
    {
        $stage = $this->getStage();
        Deal::factory()->count(2)->create([
            'team_id' => $this->team->id,
            'pipeline_id' => $this->pipeline->id,
            'stage_id' => $stage->id,
        ]);
        Deal::factory()->count(3)->create(); // different team

        $response = $this->apiAs()
            ->getJson('/api/v1/deals');

        $response->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_deal(): void
    {
        $stage = $this->getStage();
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->postJson('/api/v1/deals', [
                'title' => 'Big Deal',
                'value' => 50000,
                'currency' => 'USD',
                'pipeline_id' => $this->pipeline->id,
                'stage_id' => $stage->id,
                'contact_id' => $contact->id,
                'probability' => 50,
                'expected_close_date' => now()->addMonth()->format('Y-m-d'),
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Big Deal');

        $this->assertDatabaseHas('deals', [
            'team_id' => $this->team->id,
            'title' => 'Big Deal',
        ]);
    }

    public function test_create_deal_validates_required_fields(): void
    {
        $response = $this->apiAs()
            ->postJson('/api/v1/deals', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_can_create_deal_with_company(): void
    {
        $stage = $this->getStage();
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);
        $company = Company::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->postJson('/api/v1/deals', [
                'title' => 'Company Deal',
                'value' => 25000,
                'pipeline_id' => $this->pipeline->id,
                'stage_id' => $stage->id,
                'contact_id' => $contact->id,
                'company_id' => $company->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Company Deal');
    }

    public function test_can_show_deal(): void
    {
        $stage = $this->getStage();
        $deal = Deal::factory()->create([
            'team_id' => $this->team->id,
            'pipeline_id' => $this->pipeline->id,
            'stage_id' => $stage->id,
        ]);

        $response = $this->apiAs()
            ->getJson("/api/v1/deals/{$deal->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $deal->id);
    }

    public function test_can_update_deal(): void
    {
        $stage = $this->getStage();
        $deal = Deal::factory()->create([
            'team_id' => $this->team->id,
            'pipeline_id' => $this->pipeline->id,
            'stage_id' => $stage->id,
            'title' => 'Old Title',
        ]);

        $response = $this->apiAs()
            ->putJson("/api/v1/deals/{$deal->id}", [
                'title' => 'Updated Title',
                'value' => 99999,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.title', 'Updated Title');
    }

    public function test_can_delete_deal(): void
    {
        $stage = $this->getStage();
        $deal = Deal::factory()->create([
            'team_id' => $this->team->id,
            'pipeline_id' => $this->pipeline->id,
            'stage_id' => $stage->id,
        ]);

        $response = $this->apiAs()
            ->deleteJson("/api/v1/deals/{$deal->id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('deals', ['id' => $deal->id]);
    }

    public function test_can_move_deal_to_stage(): void
    {
        $stage = $this->getStage('Lead');
        $qualified = $this->getStage('Qualified');
        $deal = Deal::factory()->create([
            'team_id' => $this->team->id,
            'pipeline_id' => $this->pipeline->id,
            'stage_id' => $stage->id,
        ]);

        $response = $this->apiAs()
            ->postJson("/api/v1/deals/{$deal->id}/move", [
                'stage_id' => $qualified->id,
            ]);

        $response->assertOk();
        $deal->refresh();
        $this->assertEquals($qualified->id, $deal->stage_id);
    }

    public function test_can_mark_deal_as_won(): void
    {
        $stage = $this->getStage();
        $deal = Deal::factory()->create([
            'team_id' => $this->team->id,
            'pipeline_id' => $this->pipeline->id,
            'stage_id' => $stage->id,
            'status' => 'open',
        ]);

        $response = $this->apiAs()
            ->postJson("/api/v1/deals/{$deal->id}/won");

        $response->assertOk();
        $deal->refresh();
        $this->assertEquals('won', $deal->status);
    }

    public function test_can_mark_deal_as_lost(): void
    {
        $stage = $this->getStage();
        $deal = Deal::factory()->create([
            'team_id' => $this->team->id,
            'pipeline_id' => $this->pipeline->id,
            'stage_id' => $stage->id,
            'status' => 'open',
        ]);

        $response = $this->apiAs()
            ->postJson("/api/v1/deals/{$deal->id}/lost", [
                'lost_reason' => 'Price too high',
            ]);

        $response->assertOk();
        $deal->refresh();
        $this->assertEquals('lost', $deal->status);
    }

    public function test_can_get_deal_timeline(): void
    {
        $stage = $this->getStage();
        $deal = Deal::factory()->create([
            'team_id' => $this->team->id,
            'pipeline_id' => $this->pipeline->id,
            'stage_id' => $stage->id,
        ]);

        $response = $this->apiAs()
            ->getJson("/api/v1/deals/{$deal->id}/timeline");

        $response->assertOk();
    }

    public function test_unauthenticated_cannot_access_deals(): void
    {
        $response = $this->getJson('/api/v1/deals');

        $response->assertStatus(401);
    }
}
