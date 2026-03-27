<?php

namespace Tests\Feature\Api\V1;

use App\Models\Workflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CrmTestHelpers;

class WorkflowControllerTest extends TestCase
{
    use RefreshDatabase, CrmTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCrmUser();
    }

    public function test_can_list_workflows(): void
    {
        Workflow::factory()->count(2)->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson('/api/v1/workflows');

        $response->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_workflow_with_actions(): void
    {
        $response = $this->apiAs()
            ->postJson('/api/v1/workflows', [
                'name' => 'New Deal Notification',
                'description' => 'Notify team when a deal is created',
                'trigger_event' => 'deal.created',
                'conditions' => [
                    ['field' => 'value', 'operator' => 'greater_than', 'value' => 10000],
                ],
                'is_active' => true,
                'actions' => [
                    ['type' => 'send_notification', 'config' => ['message' => 'Big deal created!'], 'order' => 0],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'New Deal Notification');

        $this->assertDatabaseHas('workflows', [
            'team_id' => $this->team->id,
            'name' => 'New Deal Notification',
        ]);
    }

    public function test_create_workflow_validates_required_fields(): void
    {
        $response = $this->apiAs()
            ->postJson('/api/v1/workflows', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_can_show_workflow(): void
    {
        $workflow = Workflow::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson("/api/v1/workflows/{$workflow->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $workflow->id);
    }

    public function test_can_update_workflow(): void
    {
        $workflow = Workflow::factory()->create([
            'team_id' => $this->team->id,
            'name' => 'Old Workflow',
        ]);

        $response = $this->apiAs()
            ->putJson("/api/v1/workflows/{$workflow->id}", [
                'name' => 'Updated Workflow',
                'actions' => [],
            ]);

        $response->assertOk();
    }

    public function test_can_delete_workflow(): void
    {
        $workflow = Workflow::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->deleteJson("/api/v1/workflows/{$workflow->id}");

        $response->assertStatus(204);
    }

    public function test_unauthenticated_cannot_access_workflows(): void
    {
        $response = $this->getJson('/api/v1/workflows');

        $response->assertStatus(401);
    }
}
