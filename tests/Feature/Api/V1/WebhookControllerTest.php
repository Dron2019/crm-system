<?php

namespace Tests\Feature\Api\V1;

use App\Models\Webhook;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CrmTestHelpers;

class WebhookControllerTest extends TestCase
{
    use RefreshDatabase, CrmTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCrmUser();
    }

    public function test_can_list_webhooks(): void
    {
        Webhook::factory()->count(2)->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson('/api/v1/webhooks');

        $response->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_webhook(): void
    {
        $response = $this->apiAs()
            ->postJson('/api/v1/webhooks', [
                'url' => 'https://example.com/webhook',
                'events' => ['contact.created', 'deal.won'],
                'is_active' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.url', 'https://example.com/webhook');

        $this->assertDatabaseHas('webhooks', [
            'team_id' => $this->team->id,
            'url' => 'https://example.com/webhook',
        ]);
    }

    public function test_create_webhook_validates_url(): void
    {
        $response = $this->apiAs()
            ->postJson('/api/v1/webhooks', [
                'url' => 'not-a-url',
                'events' => ['contact.created'],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['url']);
    }

    public function test_can_update_webhook(): void
    {
        $webhook = Webhook::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->putJson("/api/v1/webhooks/{$webhook->id}", [
                'url' => 'https://updated.com/hook',
                'events' => ['deal.created'],
                'is_active' => false,
            ]);

        $response->assertOk();
    }

    public function test_can_delete_webhook(): void
    {
        $webhook = Webhook::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->deleteJson("/api/v1/webhooks/{$webhook->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('webhooks', ['id' => $webhook->id]);
    }

    public function test_unauthenticated_cannot_access_webhooks(): void
    {
        $response = $this->getJson('/api/v1/webhooks');

        $response->assertStatus(401);
    }
}
