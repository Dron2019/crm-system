<?php

namespace Tests\Feature\Api\V1;

use App\Models\Pipeline;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CrmTestHelpers;

class PipelineControllerTest extends TestCase
{
    use RefreshDatabase, CrmTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCrmUser();
    }

    public function test_can_list_pipelines(): void
    {
        $response = $this->apiAs()
            ->getJson('/api/v1/pipelines');

        $response->assertOk()
            ->assertJsonCount(1, 'data'); // default pipeline from setUp
    }

    public function test_can_create_pipeline_with_stages(): void
    {
        $response = $this->apiAs()
            ->postJson('/api/v1/pipelines', [
                'name' => 'Partner Pipeline',
                'is_default' => false,
                'stages' => [
                    ['name' => 'Inquiry', 'display_order' => 0, 'color' => '#94a3b8'],
                    ['name' => 'Evaluation', 'display_order' => 1, 'color' => '#6366f1'],
                    ['name' => 'Active', 'display_order' => 2, 'color' => '#22c55e', 'is_won' => true],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Partner Pipeline');

        $this->assertDatabaseHas('pipelines', [
            'team_id' => $this->team->id,
            'name' => 'Partner Pipeline',
        ]);
    }

    public function test_create_pipeline_validates_name(): void
    {
        $response = $this->apiAs()
            ->postJson('/api/v1/pipelines', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_can_show_pipeline_with_stages(): void
    {
        $response = $this->apiAs()
            ->getJson("/api/v1/pipelines/{$this->pipeline->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $this->pipeline->id)
            ->assertJsonStructure(['data' => ['stages']]);
    }

    public function test_can_update_pipeline(): void
    {
        $response = $this->apiAs()
            ->putJson("/api/v1/pipelines/{$this->pipeline->id}", [
                'name' => 'Renamed Pipeline',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Renamed Pipeline');
    }

    public function test_can_delete_pipeline(): void
    {
        $extra = Pipeline::create([
            'team_id' => $this->team->id,
            'name' => 'Delete Me',
            'is_default' => false,
        ]);

        $response = $this->apiAs()
            ->deleteJson("/api/v1/pipelines/{$extra->id}");

        $response->assertStatus(204);
    }

    public function test_unauthenticated_cannot_access_pipelines(): void
    {
        $response = $this->getJson('/api/v1/pipelines');

        $response->assertStatus(401);
    }
}
