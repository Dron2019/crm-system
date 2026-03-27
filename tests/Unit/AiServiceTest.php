<?php

namespace Tests\Unit;

use App\Models\Contact;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CrmTestHelpers;

class AiServiceTest extends TestCase
{
    use RefreshDatabase, CrmTestHelpers;

    private AiService $aiService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCrmUser();
        $this->aiService = new AiService();
    }

    public function test_score_contact_returns_valid_structure(): void
    {
        $contact = Contact::factory()->create([
            'team_id' => $this->team->id,
            'email' => 'test@example.com',
            'phone' => '+1-555-0100',
            'job_title' => 'CTO',
            'source' => 'referral',
        ]);

        $result = $this->aiService->scoreContact($contact);

        $this->assertArrayHasKey('score', $result);
        $this->assertArrayHasKey('grade', $result);
        $this->assertArrayHasKey('factors', $result);
        $this->assertIsInt($result['score']);
        $this->assertGreaterThanOrEqual(0, $result['score']);
        $this->assertLessThanOrEqual(100, $result['score']);
        $this->assertContains($result['grade'], ['A', 'B', 'C', 'D', 'F']);
    }

    public function test_score_contact_with_full_profile_scores_higher(): void
    {
        $fullContact = Contact::factory()->create([
            'team_id' => $this->team->id,
            'email' => 'full@example.com',
            'phone' => '+1-555-0100',
            'job_title' => 'CEO',
            'source' => 'website',
        ]);

        $emptyContact = Contact::factory()->create([
            'team_id' => $this->team->id,
            'email' => null,
            'phone' => null,
            'job_title' => null,
            'source' => null,
        ]);

        $fullScore = $this->aiService->scoreContact($fullContact);
        $emptyScore = $this->aiService->scoreContact($emptyContact);

        $this->assertGreaterThan($emptyScore['score'], $fullScore['score']);
    }

    public function test_draft_email_uses_correct_purpose(): void
    {
        $contact = Contact::factory()->create([
            'team_id' => $this->team->id,
            'first_name' => 'Alice',
        ]);

        $followUp = $this->aiService->draftEmail($contact, 'follow_up');
        $intro = $this->aiService->draftEmail($contact, 'introduction');

        $this->assertEquals('follow_up', $followUp['purpose']);
        $this->assertEquals('introduction', $intro['purpose']);
        $this->assertStringContainsString('Alice', $followUp['body']);
        $this->assertStringContainsString('Alice', $intro['body']);
    }

    public function test_draft_email_defaults_to_follow_up(): void
    {
        $contact = Contact::factory()->create(['team_id' => $this->team->id]);

        $result = $this->aiService->draftEmail($contact, 'unknown_purpose');

        $this->assertEquals('follow_up', $result['purpose']);
    }

    public function test_suggest_actions_returns_array(): void
    {
        $contact = Contact::factory()->create([
            'team_id' => $this->team->id,
            'email' => null,
            'last_contacted_at' => null,
        ]);

        $suggestions = $this->aiService->suggestActions($contact);

        $this->assertIsArray($suggestions);
        $this->assertNotEmpty($suggestions);

        // Should suggest adding email
        $actions = array_column($suggestions, 'action');
        $this->assertContains('complete_profile', $actions);
        $this->assertContains('follow_up', $actions);
    }

    public function test_suggest_actions_for_complete_contact(): void
    {
        $contact = Contact::factory()->create([
            'team_id' => $this->team->id,
            'email' => 'complete@example.com',
            'last_contacted_at' => now(),
        ]);

        $suggestions = $this->aiService->suggestActions($contact);

        // Should not suggest completing profile or follow-up
        $actions = array_column($suggestions, 'action');
        $this->assertNotContains('complete_profile', $actions);
        $this->assertNotContains('follow_up', $actions);
    }
}
