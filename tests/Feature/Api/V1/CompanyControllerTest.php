<?php

namespace Tests\Feature\Api\V1;

use App\Models\Company;
use App\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CrmTestHelpers;

class CompanyControllerTest extends TestCase
{
    use RefreshDatabase, CrmTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpCrmUser();
    }

    public function test_can_list_companies(): void
    {
        Company::factory()->count(3)->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson('/api/v1/companies');

        $response->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_list_companies_only_shows_own_team(): void
    {
        Company::factory()->count(2)->create(['team_id' => $this->team->id]);
        Company::factory()->count(4)->create(); // different team

        $response = $this->apiAs()
            ->getJson('/api/v1/companies');

        $response->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_company(): void
    {
        $response = $this->apiAs()
            ->postJson('/api/v1/companies', [
                'name' => 'Acme Corp',
                'domain' => 'acme.com',
                'industry' => 'Technology',
                'size' => '50-200',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Acme Corp')
            ->assertJsonPath('data.domain', 'acme.com');

        $this->assertDatabaseHas('companies', [
            'team_id' => $this->team->id,
            'name' => 'Acme Corp',
        ]);
    }

    public function test_create_company_validates_required_fields(): void
    {
        $response = $this->apiAs()
            ->postJson('/api/v1/companies', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_can_create_company_with_tags(): void
    {
        $tag = Tag::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->postJson('/api/v1/companies', [
                'name' => 'Tagged Company',
                'tag_ids' => [$tag->id],
            ]);

        $response->assertStatus(201);

        $company = Company::where('name', 'Tagged Company')->first();
        $this->assertTrue($company->tags->contains($tag));
    }

    public function test_can_show_company(): void
    {
        $company = Company::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson("/api/v1/companies/{$company->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $company->id);
    }

    public function test_can_update_company(): void
    {
        $company = Company::factory()->create([
            'team_id' => $this->team->id,
            'name' => 'Old Name',
        ]);

        $response = $this->apiAs()
            ->putJson("/api/v1/companies/{$company->id}", [
                'name' => 'New Name',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'New Name');
    }

    public function test_can_delete_company(): void
    {
        $company = Company::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->deleteJson("/api/v1/companies/{$company->id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('companies', ['id' => $company->id]);
    }

    public function test_can_get_company_contacts(): void
    {
        $company = Company::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson("/api/v1/companies/{$company->id}/contacts");

        $response->assertOk();
    }

    public function test_can_get_company_deals(): void
    {
        $company = Company::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson("/api/v1/companies/{$company->id}/deals");

        $response->assertOk();
    }

    public function test_can_get_company_timeline(): void
    {
        $company = Company::factory()->create(['team_id' => $this->team->id]);

        $response = $this->apiAs()
            ->getJson("/api/v1/companies/{$company->id}/timeline");

        $response->assertOk();
    }

    public function test_unauthenticated_cannot_access_companies(): void
    {
        $response = $this->getJson('/api/v1/companies');

        $response->assertStatus(401);
    }
}
