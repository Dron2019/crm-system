<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Company;
use App\Models\Contact;
use App\Models\CustomFieldDefinition;
use App\Models\Dashboard;
use App\Models\Deal;
use App\Models\Note;
use App\Models\Pipeline;
use App\Models\Tag;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(CurrencySeeder::class);

        // Create demo user
        $user = User::firstOrCreate(
            ['email' => 'demo@crm.test'],
            [
                'name' => 'Demo User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'timezone' => 'America/New_York',
            ]
        );

        // Create team
        $team = Team::firstOrCreate(
            ['slug' => 'acme-corp'],
            [
                'name' => 'Acme Corp',
                'owner_id' => $user->id,
            ]
        );

        $team->members()->syncWithoutDetaching([$user->id => ['role' => 'owner']]);
        $user->update(['current_team_id' => $team->id]);

        // Create a second team member
        $member = User::firstOrCreate(
            ['email' => 'jane@crm.test'],
            [
                'name' => 'Jane Smith',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'current_team_id' => $team->id,
            ]
        );
        $team->members()->syncWithoutDetaching([$member->id => ['role' => 'member']]);

        // Create an admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@crm.test'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'current_team_id' => $team->id,
            ]
        );
        $team->members()->syncWithoutDetaching([$admin->id => ['role' => 'admin']]);

        $teamUsers = [$user, $member, $admin];

        // Create tags
        $tags = collect([
            ['name' => 'VIP', 'color' => '#ef4444'],
            ['name' => 'Hot Lead', 'color' => '#f97316'],
            ['name' => 'Partner', 'color' => '#22c55e'],
            ['name' => 'Enterprise', 'color' => '#6366f1'],
            ['name' => 'Follow Up', 'color' => '#eab308'],
            ['name' => 'Nurture', 'color' => '#06b6d4'],
            ['name' => 'Churned', 'color' => '#64748b'],
        ])->map(fn ($data) => Tag::firstOrCreate(['team_id' => $team->id, 'name' => $data['name']], $data));

        // Create pipeline with stages
        $pipeline = Pipeline::firstOrCreate(
            ['team_id' => $team->id, 'name' => 'Sales Pipeline'],
            ['is_default' => true]
        );

        $stages = collect([
            ['name' => 'Lead', 'display_order' => 0, 'color' => '#94a3b8'],
            ['name' => 'Qualified', 'display_order' => 1, 'color' => '#6366f1'],
            ['name' => 'Proposal', 'display_order' => 2, 'color' => '#f59e0b'],
            ['name' => 'Negotiation', 'display_order' => 3, 'color' => '#f97316'],
            ['name' => 'Won', 'display_order' => 4, 'color' => '#22c55e', 'is_won' => true],
            ['name' => 'Lost', 'display_order' => 5, 'color' => '#ef4444', 'is_lost' => true],
        ])->map(fn ($data) => $pipeline->stages()->firstOrCreate(['pipeline_id' => $pipeline->id, 'name' => $data['name']], $data));

        // Create second pipeline
        $partnerPipeline = Pipeline::firstOrCreate(
            ['team_id' => $team->id, 'name' => 'Partner Pipeline'],
            ['is_default' => false]
        );

        collect([
            ['name' => 'Inquiry', 'display_order' => 0, 'color' => '#94a3b8'],
            ['name' => 'Evaluation', 'display_order' => 1, 'color' => '#8b5cf6'],
            ['name' => 'Agreement', 'display_order' => 2, 'color' => '#f59e0b'],
            ['name' => 'Active', 'display_order' => 3, 'color' => '#22c55e', 'is_won' => true],
        ])->each(fn ($data) => $partnerPipeline->stages()->firstOrCreate(['pipeline_id' => $partnerPipeline->id, 'name' => $data['name']], $data));

        // Create companies
        $companies = collect([
            ['name' => 'TechStart Inc', 'domain' => 'techstart.io', 'industry' => 'Technology', 'size' => '50-200', 'annual_revenue' => 5000000],
            ['name' => 'Global Solutions Ltd', 'domain' => 'globalsolutions.com', 'industry' => 'Consulting', 'size' => '200-500', 'annual_revenue' => 25000000],
            ['name' => 'Bright Future LLC', 'domain' => 'brightfuture.co', 'industry' => 'Education', 'size' => '10-50', 'annual_revenue' => 1500000],
            ['name' => 'Green Energy Corp', 'domain' => 'greenenergy.com', 'industry' => 'Energy', 'size' => '500-1000', 'annual_revenue' => 100000000],
            ['name' => 'Cloud Nine Systems', 'domain' => 'cloudnine.dev', 'industry' => 'Technology', 'size' => '10-50', 'annual_revenue' => 3000000],
            ['name' => 'FinTech Innovations', 'domain' => 'fintechinno.com', 'industry' => 'Finance', 'size' => '50-200', 'annual_revenue' => 12000000],
            ['name' => 'MedPro Health', 'domain' => 'medprohealth.com', 'industry' => 'Healthcare', 'size' => '200-500', 'annual_revenue' => 45000000],
            ['name' => 'RetailMax', 'domain' => 'retailmax.co', 'industry' => 'Retail', 'size' => '500-1000', 'annual_revenue' => 80000000],
        ])->map(fn ($data) => Company::firstOrCreate(['team_id' => $team->id, 'domain' => $data['domain']], $data));

        // Create contacts
        $contacts = collect([
            ['first_name' => 'John', 'last_name' => 'Doe', 'email' => 'john@techstart.io', 'phone' => '+1-555-0101', 'job_title' => 'CTO', 'source' => 'website', 'status' => 'customer'],
            ['first_name' => 'Sarah', 'last_name' => 'Connor', 'email' => 'sarah@globalsolutions.com', 'phone' => '+1-555-0102', 'job_title' => 'VP Sales', 'source' => 'referral', 'status' => 'active'],
            ['first_name' => 'Mike', 'last_name' => 'Johnson', 'email' => 'mike@brightfuture.co', 'phone' => '+1-555-0103', 'job_title' => 'CEO', 'source' => 'linkedin', 'status' => 'lead'],
            ['first_name' => 'Emily', 'last_name' => 'Chen', 'email' => 'emily@greenenergy.com', 'phone' => '+1-555-0104', 'job_title' => 'Procurement Manager', 'source' => 'conference', 'status' => 'active'],
            ['first_name' => 'Alex', 'last_name' => 'Rivera', 'email' => 'alex@cloudnine.dev', 'phone' => '+1-555-0105', 'job_title' => 'Founder', 'source' => 'cold_email', 'status' => 'lead'],
            ['first_name' => 'Lisa', 'last_name' => 'Wang', 'email' => 'lisa.wang@example.com', 'phone' => '+1-555-0106', 'job_title' => 'Director of Engineering', 'source' => 'website', 'status' => 'active'],
            ['first_name' => 'Tom', 'last_name' => 'Baker', 'email' => 'tom.baker@example.com', 'phone' => '+1-555-0107', 'job_title' => 'Product Manager', 'source' => 'referral', 'status' => 'lead'],
            ['first_name' => 'Nina', 'last_name' => 'Patel', 'email' => 'nina@techstart.io', 'phone' => '+1-555-0108', 'job_title' => 'Engineering Lead', 'source' => 'website', 'status' => 'customer'],
            ['first_name' => 'David', 'last_name' => 'Kim', 'email' => 'david@fintechinno.com', 'phone' => '+1-555-0109', 'job_title' => 'CFO', 'source' => 'conference', 'status' => 'active'],
            ['first_name' => 'Rachel', 'last_name' => 'Green', 'email' => 'rachel@medprohealth.com', 'phone' => '+1-555-0110', 'job_title' => 'COO', 'source' => 'referral', 'status' => 'customer'],
            ['first_name' => 'Carlos', 'last_name' => 'Mendez', 'email' => 'carlos@retailmax.co', 'phone' => '+1-555-0111', 'job_title' => 'VP Operations', 'source' => 'linkedin', 'status' => 'lead'],
            ['first_name' => 'Sophie', 'last_name' => 'Turner', 'email' => 'sophie@cloudnine.dev', 'phone' => '+1-555-0112', 'job_title' => 'Head of Sales', 'source' => 'cold_email', 'status' => 'active'],
        ])->map(fn ($data) => Contact::firstOrCreate(
            ['team_id' => $team->id, 'email' => $data['email']],
            [...$data, 'assigned_to' => collect($teamUsers)->random()->id]
        ));

        // Attach contacts to companies
        $contacts[0]->companies()->syncWithoutDetaching([$companies[0]->id => ['job_title' => 'CTO', 'is_primary' => true]]);
        $contacts[1]->companies()->syncWithoutDetaching([$companies[1]->id => ['job_title' => 'VP Sales', 'is_primary' => true]]);
        $contacts[2]->companies()->syncWithoutDetaching([$companies[2]->id => ['job_title' => 'CEO', 'is_primary' => true]]);
        $contacts[3]->companies()->syncWithoutDetaching([$companies[3]->id => ['job_title' => 'Procurement Manager', 'is_primary' => true]]);
        $contacts[4]->companies()->syncWithoutDetaching([$companies[4]->id => ['job_title' => 'Founder', 'is_primary' => true]]);
        $contacts[7]->companies()->syncWithoutDetaching([$companies[0]->id => ['job_title' => 'Engineering Lead', 'is_primary' => false]]);
        $contacts[8]->companies()->syncWithoutDetaching([$companies[5]->id => ['job_title' => 'CFO', 'is_primary' => true]]);
        $contacts[9]->companies()->syncWithoutDetaching([$companies[6]->id => ['job_title' => 'COO', 'is_primary' => true]]);
        $contacts[10]->companies()->syncWithoutDetaching([$companies[7]->id => ['job_title' => 'VP Operations', 'is_primary' => true]]);
        $contacts[11]->companies()->syncWithoutDetaching([$companies[4]->id => ['job_title' => 'Head of Sales', 'is_primary' => false]]);

        // Tag contacts
        $contacts[0]->tags()->syncWithoutDetaching([$tags[3]->id, $tags[0]->id]); // Enterprise + VIP
        $contacts[1]->tags()->syncWithoutDetaching([$tags[1]->id]); // Hot Lead
        $contacts[3]->tags()->syncWithoutDetaching([$tags[2]->id]); // Partner
        $contacts[4]->tags()->syncWithoutDetaching([$tags[1]->id]); // Hot Lead
        $contacts[8]->tags()->syncWithoutDetaching([$tags[3]->id, $tags[0]->id]); // Enterprise + VIP
        $contacts[9]->tags()->syncWithoutDetaching([$tags[0]->id]); // VIP
        $contacts[10]->tags()->syncWithoutDetaching([$tags[4]->id]); // Follow Up

        // Create deals
        $deals = collect([
            ['title' => 'TechStart Platform License', 'value' => 45000, 'contact_id' => $contacts[0]->id, 'company_id' => $companies[0]->id, 'stage_id' => $stages[2]->id, 'probability' => 60],
            ['title' => 'Global Solutions Consulting Package', 'value' => 120000, 'contact_id' => $contacts[1]->id, 'company_id' => $companies[1]->id, 'stage_id' => $stages[3]->id, 'probability' => 75],
            ['title' => 'Bright Future LMS Integration', 'value' => 18000, 'contact_id' => $contacts[2]->id, 'company_id' => $companies[2]->id, 'stage_id' => $stages[0]->id, 'probability' => 20],
            ['title' => 'Green Energy Data Platform', 'value' => 250000, 'contact_id' => $contacts[3]->id, 'company_id' => $companies[3]->id, 'stage_id' => $stages[1]->id, 'probability' => 40],
            ['title' => 'Cloud Nine Infrastructure Deal', 'value' => 35000, 'contact_id' => $contacts[4]->id, 'company_id' => $companies[4]->id, 'stage_id' => $stages[4]->id, 'probability' => 100, 'status' => 'won'],
            ['title' => 'FinTech Analytics Platform', 'value' => 85000, 'contact_id' => $contacts[8]->id, 'company_id' => $companies[5]->id, 'stage_id' => $stages[2]->id, 'probability' => 55],
            ['title' => 'MedPro EHR Integration', 'value' => 175000, 'contact_id' => $contacts[9]->id, 'company_id' => $companies[6]->id, 'stage_id' => $stages[3]->id, 'probability' => 70],
            ['title' => 'RetailMax Inventory System', 'value' => 95000, 'contact_id' => $contacts[10]->id, 'company_id' => $companies[7]->id, 'stage_id' => $stages[0]->id, 'probability' => 15],
        ])->map(fn ($data) => Deal::firstOrCreate(
            ['team_id' => $team->id, 'title' => $data['title']],
            [
                ...$data,
                'pipeline_id' => $pipeline->id,
                'assigned_to' => collect($teamUsers)->random()->id,
                'status' => $data['status'] ?? 'open',
                'expected_close_date' => now()->addDays(rand(7, 90)),
            ]
        ));

        // Create activities for contacts and deals
        $activityTypes = ['call', 'email', 'meeting', 'task'];
        foreach ($contacts->take(8) as $contact) {
            foreach (range(1, rand(2, 5)) as $i) {
                Activity::create([
                    'team_id' => $team->id,
                    'user_id' => collect($teamUsers)->random()->id,
                    'subject_type' => Contact::class,
                    'subject_id' => $contact->id,
                    'type' => $activityTypes[array_rand($activityTypes)],
                    'title' => fake()->sentence(4),
                    'description' => fake()->optional(0.7)->paragraph(),
                    'scheduled_at' => fake()->dateTimeBetween('-2 weeks', '+3 weeks'),
                    'completed_at' => fake()->boolean(40) ? now()->subDays(rand(0, 14)) : null,
                ]);
            }
        }

        foreach ($deals->take(5) as $deal) {
            foreach (range(1, rand(1, 3)) as $i) {
                Activity::create([
                    'team_id' => $team->id,
                    'user_id' => collect($teamUsers)->random()->id,
                    'subject_type' => Deal::class,
                    'subject_id' => $deal->id,
                    'type' => $activityTypes[array_rand($activityTypes)],
                    'title' => fake()->sentence(4),
                    'scheduled_at' => fake()->dateTimeBetween('-1 week', '+2 weeks'),
                    'completed_at' => fake()->boolean(30) ? now()->subDays(rand(0, 7)) : null,
                ]);
            }
        }

        // Create notes
        foreach ($contacts->take(6) as $contact) {
            foreach (range(1, rand(1, 3)) as $i) {
                Note::create([
                    'team_id' => $team->id,
                    'user_id' => collect($teamUsers)->random()->id,
                    'notable_type' => Contact::class,
                    'notable_id' => $contact->id,
                    'body' => fake()->paragraphs(rand(1, 3), true),
                    'is_pinned' => fake()->boolean(15),
                ]);
            }
        }

        foreach ($deals->take(4) as $deal) {
            Note::create([
                'team_id' => $team->id,
                'user_id' => collect($teamUsers)->random()->id,
                'notable_type' => Deal::class,
                'notable_id' => $deal->id,
                'body' => fake()->paragraphs(2, true),
                'is_pinned' => false,
            ]);
        }

        // Create custom field definitions
        CustomFieldDefinition::firstOrCreate(
            ['team_id' => $team->id, 'entity_type' => 'contact', 'name' => 'linkedin_url'],
            ['label' => 'LinkedIn URL', 'type' => 'url', 'is_required' => false, 'display_order' => 0]
        );

        CustomFieldDefinition::firstOrCreate(
            ['team_id' => $team->id, 'entity_type' => 'contact', 'name' => 'preferred_language'],
            [
                'label' => 'Preferred Language',
                'type' => 'select',
                'options' => [
                    ['value' => 'en', 'label' => 'English'],
                    ['value' => 'es', 'label' => 'Spanish'],
                    ['value' => 'fr', 'label' => 'French'],
                    ['value' => 'de', 'label' => 'German'],
                ],
                'is_required' => false,
                'display_order' => 1,
            ]
        );

        CustomFieldDefinition::firstOrCreate(
            ['team_id' => $team->id, 'entity_type' => 'deal', 'name' => 'contract_type'],
            [
                'label' => 'Contract Type',
                'type' => 'select',
                'options' => [
                    ['value' => 'monthly', 'label' => 'Monthly'],
                    ['value' => 'annual', 'label' => 'Annual'],
                    ['value' => 'multi_year', 'label' => 'Multi-Year'],
                ],
                'is_required' => false,
                'display_order' => 0,
            ]
        );

        CustomFieldDefinition::firstOrCreate(
            ['team_id' => $team->id, 'entity_type' => 'company', 'name' => 'employee_count'],
            ['label' => 'Employee Count', 'type' => 'number', 'is_required' => false, 'display_order' => 0]
        );

        // Create default dashboard
        $dashboard = Dashboard::firstOrCreate(
            ['team_id' => $team->id, 'name' => 'Sales Overview'],
            [
                'description' => 'Main sales dashboard with pipeline and activity metrics',
                'is_default' => true,
                'layout' => null,
                'created_by' => $user->id,
            ]
        );

        if ($dashboard->widgets()->count() === 0) {
            $dashboard->widgets()->createMany([
                ['widget_type' => 'kpi', 'config' => ['metric' => 'total_revenue', 'title' => 'Total Revenue'], 'position' => 0, 'size_x' => 3, 'size_y' => 1],
                ['widget_type' => 'kpi', 'config' => ['metric' => 'open_deals_count', 'title' => 'Open Deals'], 'position' => 1, 'size_x' => 3, 'size_y' => 1],
                ['widget_type' => 'kpi', 'config' => ['metric' => 'win_rate', 'title' => 'Win Rate'], 'position' => 2, 'size_x' => 3, 'size_y' => 1],
                ['widget_type' => 'chart', 'config' => ['chart_type' => 'funnel', 'data_source' => 'pipeline', 'title' => 'Pipeline Funnel'], 'position' => 3, 'size_x' => 6, 'size_y' => 3],
                ['widget_type' => 'chart', 'config' => ['chart_type' => 'line', 'data_source' => 'activities', 'period' => '30d', 'title' => 'Activity Trend'], 'position' => 4, 'size_x' => 6, 'size_y' => 3],
            ]);
        }
    }
}
