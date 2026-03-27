<?php

namespace Tests\Feature\Api\V1;

use App\Models\Contact;
use App\Models\Deal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CrmTestHelpers;

class AiControllerTest extends TestCase
{
    use RefreshDatabase, CrmTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCrmUser();
    }

    public function test_can_score_contact(): void
    {
        $contact = Contact::factory()->create([
            'team_id' => $this->team->id,
            'email' => 'test@example.com',
            'phone' => '+1-555-0100',
            'job_title' => 'CTO',
            'source' => 'referral',
        ]);

        $response = $this->apiAs()
            ->getJson("/api/v1/ai/contacts/{$contact->id}/score");

        $response->assertOk()
            ->assertJsonStructure(['score', 'grade', 'factors']);

        $this->assertGreaterThanOrEqual(0, $response->json('score'));
        $this->assertLessThanOrEqual(100, $response->json('score'));
    }

    public function test_can_draft_email_for_contact(): void
    {
        $contact = Contact::factory()->create([
            'team_id' => $this->team->id,
            'first_name' => 'Jane',
        ]);

        $response = $this->apiAs()
            ->postJson("/api/v1/ai/contacts/{$contact->id}/draft-email", [
                'purpose' => 'follow_up',
            ]);

        $response->assertOk()
            ->assertJsonStructure(['subject', 'body', 'purpose'])
            ->assertJsonPath('purpose', 'follow_up');

        $this->assertStringContains('Jane', $response->json('body'));
    }

    public function test_can_draft_email_with_default_purpose(): void
    {
        $contact = Contact::factory()->create([
            'team_id' => $this->team->id,
        ]);

        $response = $this->apiAs()
            ->postJson("/api/v1/ai/contacts/{$contact->id}/draft-email");

        $response->assertOk()
            ->assertJsonPath('purpose', 'follow_up');
    }

    public function test_can_get_contact_suggestions(): void
    {
        $contact = Contact::factory()->create([
            'team_id' => $this->team->id,
        ]);

        $response = $this->apiAs()
            ->getJson("/api/v1/ai/contacts/{$contact->id}/suggestions");

        $response->assertOk()
            ->assertJsonStructure(['suggestions']);
    }

    public function test_can_summarize_deal(): void
    {
        $stage = $this->getStage();
        $deal = Deal::factory()->create([
            'team_id' => $this->team->id,
            'pipeline_id' => $this->pipeline->id,
            'stage_id' => $stage->id,
        ]);

        $response = $this->apiAs()
            ->getJson("/api/v1/ai/deals/{$deal->id}/summary");

        $response->assertOk()
            ->assertJsonStructure([
                'deal', 'value', 'stage', 'probability',
                'days_in_pipeline', 'health',
            ]);
    }

    public function test_unauthenticated_cannot_access_ai_features(): void
    {
        $contact = Contact::factory()->create();

        $response = $this->getJson("/api/v1/ai/contacts/{$contact->id}/score");

        $response->assertStatus(401);
    }

    /**
     * Custom assertion for string contains.
     */
    protected static function assertStringContains(string $needle, string $haystack): void
    {
        static::assertStringContainsString($needle, $haystack);
    }
}
