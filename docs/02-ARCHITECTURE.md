# CRM System — Architecture & Database Schema

> Companion to [01-DEVELOPMENT-GUIDE.md](01-DEVELOPMENT-GUIDE.md)

---

## Table of Contents

1. [Domain Model Overview](#1-domain-model-overview)
2. [Database Schema](#2-database-schema)
3. [Entity Relationship Diagram](#3-entity-relationship-diagram)
4. [Multi-Tenancy Design](#4-multi-tenancy-design)
5. [Custom Fields Architecture](#5-custom-fields-architecture)
6. [Event System](#6-event-system)
7. [Caching Strategy](#7-caching-strategy)
8. [Scalability Patterns](#8-scalability-patterns)

---

## 1. Domain Model Overview

### Bounded Contexts

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│    IDENTITY &    │   │    CRM CORE      │   │  COMMUNICATION   │
│    ACCESS        │   │                  │   │                  │
│ ─────────────── │   │ ─────────────── │   │ ─────────────── │
│ User             │   │ Contact          │   │ Email            │
│ Team             │   │ Company          │   │ EmailTemplate    │
│ TeamMember       │──▶│ Deal             │◀──│ EmailThread      │
│ Role             │   │ Pipeline/Stage   │   │ EmailTracking    │
│ Permission       │   │ Activity         │   │ Notification     │
│ Invitation       │   │ Note             │   │                  │
└──────────────────┘   │ Tag              │   └──────────────────┘
                       │ CustomField      │
                       └──────────────────┘
                              │  ▲
                              ▼  │
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  WORKFLOW &      │   │   ANALYTICS &    │   │  INTEGRATION     │
│  AUTOMATION      │   │   REPORTING      │   │                  │
│ ─────────────── │   │ ─────────────── │   │ ─────────────── │
│ Workflow         │   │ Report           │   │ Webhook          │
│ WorkflowTrigger  │   │ Dashboard        │   │ WebhookEvent     │
│ WorkflowAction   │   │ DashboardWidget  │   │ OAuthClient      │
│ WorkflowRun      │   │ AuditLog         │   │ OAuthToken       │
│ WorkflowStep     │   │                  │   │ Integration      │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

---

## 2. Database Schema

### Identity & Access

```sql
-- Teams (tenants)
CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    owner_id        UUID NOT NULL,
    settings        JSONB DEFAULT '{}',
    plan            VARCHAR(50) DEFAULT 'free',
    trial_ends_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMPTZ,
    password        VARCHAR(255) NOT NULL,
    avatar_url      VARCHAR(500),
    timezone        VARCHAR(100) DEFAULT 'UTC',
    locale          VARCHAR(10) DEFAULT 'en',
    settings        JSONB DEFAULT '{}',
    remember_token  VARCHAR(100),
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- Team membership (pivot)
CREATE TABLE team_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (team_id, user_id)
);

-- Roles & Permissions
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    is_system       BOOLEAN DEFAULT FALSE,     -- owner, admin, member
    permissions     JSONB DEFAULT '[]',         -- array of permission strings
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (team_id, slug)
);

-- Invitations
CREATE TABLE invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    role            VARCHAR(50) DEFAULT 'member',
    token           VARCHAR(64) UNIQUE NOT NULL,
    invited_by      UUID NOT NULL REFERENCES users(id),
    accepted_at     TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_invitations_token ON invitations(token);
```

### CRM Core

```sql
-- Contacts (people)
CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name      VARCHAR(255) NOT NULL,
    last_name       VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    mobile          VARCHAR(50),
    job_title       VARCHAR(255),
    department      VARCHAR(255),
    source          VARCHAR(100),                -- web, referral, cold, etc.
    status          VARCHAR(50) DEFAULT 'active', -- active, inactive, archived
    avatar_url      VARCHAR(500),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(255),
    state           VARCHAR(255),
    postal_code     VARCHAR(20),
    country         VARCHAR(2),                   -- ISO 3166-1 alpha-2
    custom_fields   JSONB DEFAULT '{}',
    lead_score      INTEGER DEFAULT 0,
    last_contacted_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_contacts_team ON contacts(team_id);
CREATE INDEX idx_contacts_email ON contacts(team_id, email);
CREATE INDEX idx_contacts_owner ON contacts(owner_id);
CREATE INDEX idx_contacts_search ON contacts USING gin(
    to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, ''))
);
CREATE INDEX idx_contacts_custom ON contacts USING gin(custom_fields);

-- Companies
CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,
    domain          VARCHAR(255),
    industry        VARCHAR(255),
    size            VARCHAR(50),                  -- 1-10, 11-50, etc.
    annual_revenue  BIGINT,                       -- stored in cents
    phone           VARCHAR(50),
    website         VARCHAR(500),
    description     TEXT,
    logo_url        VARCHAR(500),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(255),
    state           VARCHAR(255),
    postal_code     VARCHAR(20),
    country         VARCHAR(2),
    custom_fields   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_companies_team ON companies(team_id);
CREATE INDEX idx_companies_domain ON companies(team_id, domain);

-- Contact-Company relationship
CREATE TABLE contact_company (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_title       VARCHAR(255),
    is_primary      BOOLEAN DEFAULT FALSE,
    started_at      DATE,
    ended_at        DATE,
    UNIQUE (contact_id, company_id)
);

-- Pipelines
CREATE TABLE pipelines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    is_default      BOOLEAN DEFAULT FALSE,
    currency        VARCHAR(3) DEFAULT 'USD',
    position        INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- Pipeline Stages
CREATE TABLE stages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id     UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    color           VARCHAR(7),                   -- hex color
    position        INTEGER NOT NULL DEFAULT 0,
    win_probability INTEGER DEFAULT 0,            -- 0-100
    is_won          BOOLEAN DEFAULT FALSE,
    is_lost         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_stages_pipeline ON stages(pipeline_id, position);

-- Deals
CREATE TABLE deals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    pipeline_id     UUID NOT NULL REFERENCES pipelines(id),
    stage_id        UUID NOT NULL REFERENCES stages(id),
    owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
    company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    value           BIGINT DEFAULT 0,             -- stored in cents
    currency        VARCHAR(3) DEFAULT 'USD',
    expected_close_date DATE,
    actual_close_date   DATE,
    probability     INTEGER DEFAULT 0,
    status          VARCHAR(50) DEFAULT 'open',   -- open, won, lost
    lost_reason     VARCHAR(500),
    position        INTEGER DEFAULT 0,            -- position within stage
    custom_fields   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_deals_team ON deals(team_id);
CREATE INDEX idx_deals_stage ON deals(stage_id, position);
CREATE INDEX idx_deals_pipeline ON deals(pipeline_id);
CREATE INDEX idx_deals_owner ON deals(owner_id);
CREATE INDEX idx_deals_contact ON deals(contact_id);
CREATE INDEX idx_deals_status ON deals(team_id, status);

-- Activities (polymorphic — task, call, meeting)
CREATE TABLE activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    type            VARCHAR(50) NOT NULL,         -- task, call, meeting, email, note
    subject         VARCHAR(500) NOT NULL,
    description     TEXT,
    
    -- Polymorphic relation to parent entity
    activitable_type VARCHAR(100),                -- contact, deal, company
    activitable_id   UUID,
    
    -- Task-specific
    due_date        TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    priority        VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    
    -- Call/Meeting-specific
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    outcome         VARCHAR(100),                 -- completed, no_answer, left_voicemail
    duration_minutes INTEGER,
    
    -- Metadata
    custom_fields   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_activities_team ON activities(team_id);
CREATE INDEX idx_activities_parent ON activities(activitable_type, activitable_id);
CREATE INDEX idx_activities_owner ON activities(owner_id);
CREATE INDEX idx_activities_due ON activities(due_date) WHERE completed_at IS NULL;
CREATE INDEX idx_activities_type ON activities(team_id, type);

-- Notes (polymorphic)
CREATE TABLE notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES users(id),
    noteable_type   VARCHAR(100) NOT NULL,        -- contact, deal, company
    noteable_id     UUID NOT NULL,
    body            TEXT NOT NULL,
    body_html       TEXT,                         -- rendered HTML
    is_pinned       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_notes_parent ON notes(noteable_type, noteable_id);

-- Tags
CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    color           VARCHAR(7),
    UNIQUE (team_id, name)
);

-- Taggables (polymorphic pivot)
CREATE TABLE taggables (
    tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    taggable_type   VARCHAR(100) NOT NULL,
    taggable_id     UUID NOT NULL,
    PRIMARY KEY (tag_id, taggable_type, taggable_id)
);

-- File Attachments (polymorphic)
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    attachable_type VARCHAR(100) NOT NULL,
    attachable_id   UUID NOT NULL,
    filename        VARCHAR(255) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    size            BIGINT NOT NULL,              -- bytes
    disk            VARCHAR(50) DEFAULT 's3',
    path            VARCHAR(500) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_attachments_parent ON attachments(attachable_type, attachable_id);
```

### Custom Fields System

```sql
-- Custom field definitions
CREATE TABLE custom_field_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    entity_type     VARCHAR(100) NOT NULL,        -- contact, deal, company
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    field_type      VARCHAR(50) NOT NULL,          -- text, number, date, select, multiselect, url, email, phone, boolean, currency
    options         JSONB,                         -- for select/multiselect: [{value, label, color}]
    validation      JSONB,                         -- {required, min, max, pattern}
    default_value   TEXT,
    position        INTEGER DEFAULT 0,
    group_name      VARCHAR(255),                  -- field grouping
    is_required     BOOLEAN DEFAULT FALSE,
    is_filterable   BOOLEAN DEFAULT TRUE,
    is_visible      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (team_id, entity_type, slug)
);
```

### Communication

```sql
-- Email accounts (connected IMAP/SMTP)
CREATE TABLE email_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    email_address   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(255),
    provider        VARCHAR(50),                  -- gmail, outlook, smtp
    imap_host       VARCHAR(255),
    imap_port       INTEGER,
    smtp_host       VARCHAR(255),
    smtp_port       INTEGER,
    credentials     TEXT NOT NULL,                 -- encrypted JSON
    last_sync_at    TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Email messages
CREATE TABLE emails (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    thread_id       UUID,                         -- email thread grouping
    message_id      VARCHAR(500),                 -- RFC 5322 Message-ID
    in_reply_to     VARCHAR(500),
    direction       VARCHAR(10) NOT NULL,          -- inbound, outbound
    from_address    VARCHAR(255) NOT NULL,
    to_addresses    JSONB NOT NULL,               -- [{email, name}]
    cc_addresses    JSONB DEFAULT '[]',
    bcc_addresses   JSONB DEFAULT '[]',
    subject         VARCHAR(500),
    body_text       TEXT,
    body_html       TEXT,
    
    -- Tracking
    opened_at       TIMESTAMPTZ,
    open_count      INTEGER DEFAULT 0,
    clicked_at      TIMESTAMPTZ,
    click_count     INTEGER DEFAULT 0,
    
    -- Relations
    contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
    deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
    
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_emails_thread ON emails(thread_id);
CREATE INDEX idx_emails_contact ON emails(contact_id);
CREATE INDEX idx_emails_team ON emails(team_id, direction);

-- Email templates
CREATE TABLE email_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    subject         VARCHAR(500) NOT NULL,
    body_html       TEXT NOT NULL,
    variables       JSONB DEFAULT '[]',            -- [{name, description, default}]
    category        VARCHAR(100),
    is_shared       BOOLEAN DEFAULT TRUE,
    created_by      UUID NOT NULL REFERENCES users(id),
    usage_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Workflow Automation

```sql
-- Workflows
CREATE TABLE workflows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    trigger_type    VARCHAR(100) NOT NULL,         -- record_created, record_updated, field_changed, date_based, manual
    trigger_entity  VARCHAR(100) NOT NULL,         -- contact, deal, activity
    trigger_config  JSONB DEFAULT '{}',            -- trigger-specific configuration
    conditions      JSONB DEFAULT '[]',            -- [{field, operator, value}]
    is_active       BOOLEAN DEFAULT FALSE,
    last_run_at     TIMESTAMPTZ,
    run_count       INTEGER DEFAULT 0,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow steps (ordered actions)
CREATE TABLE workflow_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    type            VARCHAR(100) NOT NULL,         -- send_email, update_field, create_activity, wait, condition, notify
    config          JSONB NOT NULL DEFAULT '{}',   -- step-specific configuration
    position        INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_wf_steps ON workflow_steps(workflow_id, position);

-- Workflow execution log
CREATE TABLE workflow_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID NOT NULL,
    status          VARCHAR(50) NOT NULL,          -- running, completed, failed, paused
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    error_message   TEXT,
    step_results    JSONB DEFAULT '[]'             -- [{step_id, status, output, executed_at}]
);
CREATE INDEX idx_wf_runs ON workflow_runs(workflow_id, status);
```

### Analytics & Audit

```sql
-- Audit log (immutable)
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL,
    user_id         UUID,
    action          VARCHAR(50) NOT NULL,          -- created, updated, deleted, restored, exported, logged_in
    auditable_type  VARCHAR(100) NOT NULL,
    auditable_id    UUID NOT NULL,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_team ON audit_logs(team_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(auditable_type, auditable_id);
-- Partition by month for performance
-- CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Dashboards
CREATE TABLE dashboards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    is_default      BOOLEAN DEFAULT FALSE,
    is_shared       BOOLEAN DEFAULT TRUE,
    created_by      UUID NOT NULL REFERENCES users(id),
    layout          JSONB DEFAULT '[]',            -- [{widget_id, x, y, w, h}]
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard widgets
CREATE TABLE dashboard_widgets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id    UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,          -- kpi, chart, funnel, list, leaderboard
    title           VARCHAR(255),
    config          JSONB NOT NULL DEFAULT '{}',   -- {entity, metric, filters, groupBy, chartType}
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### AI & Embeddings

```sql
-- Vector embeddings (requires pgvector extension)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    embeddable_type VARCHAR(100) NOT NULL,         -- contact, note, email, deal
    embeddable_id   UUID NOT NULL,
    content_hash    VARCHAR(64) NOT NULL,          -- SHA-256 of source text
    embedding       vector(1536) NOT NULL,         -- OpenAI ada-002 / compatible
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (embeddable_type, embeddable_id)
);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- AI interaction log
CREATE TABLE ai_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL,
    user_id         UUID NOT NULL,
    feature         VARCHAR(100) NOT NULL,         -- lead_scoring, email_draft, summarize, search
    model           VARCHAR(100) NOT NULL,
    prompt_tokens   INTEGER,
    completion_tokens INTEGER,
    latency_ms      INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Integration

```sql
-- Webhooks (outbound)
CREATE TABLE webhooks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    url             VARCHAR(2000) NOT NULL,
    secret          VARCHAR(255) NOT NULL,         -- for HMAC signing
    events          JSONB NOT NULL,                -- ["contact.created", "deal.updated"]
    is_active       BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    failure_count   INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery log
CREATE TABLE webhook_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id      UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event           VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,
    response_status INTEGER,
    response_body   TEXT,
    duration_ms     INTEGER,
    delivered_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_webhook_del ON webhook_deliveries(webhook_id, delivered_at DESC);
```

---

## 3. Entity Relationship Diagram

```
                    ┌──────────┐
                    │  TEAMS   │
                    └────┬─────┘
                         │ 1:N
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │  USERS   │  │PIPELINES │  │   TAGS   │
    │(members) │  │          │  │          │
    └────┬─────┘  └────┬─────┘  └──────────┘
         │             │ 1:N         │ M:N (polymorphic)
         │        ┌────▼─────┐      │
         │        │  STAGES  │      │
         │        └────┬─────┘      │
         │             │ 1:N        │
    ┌────▼─────────────▼────────────▼──────┐
    │              DEALS                    │
    │  owner_id → users                     │
    │  stage_id → stages                    │
    │  contact_id → contacts                │
    │  company_id → companies               │
    └────┬──────────┬───────────┬───────────┘
         │          │           │
         │     ┌────▼─────┐    │
         │     │ACTIVITIES │    │
         │     │(polymorph)│    │
         │     └──────────┘    │
         │                     │
    ┌────▼─────┐         ┌────▼─────┐
    │ CONTACTS │◄───M:N──│COMPANIES │
    │          │         │          │
    └────┬─────┘         └────┬─────┘
         │                    │
    ┌────▼────────────────────▼────┐
    │  NOTES / ATTACHMENTS / EMAILS│
    │  (polymorphic relations)     │
    └──────────────────────────────┘
```

---

## 4. Multi-Tenancy Design

### Approach: **Shared Database, Team-Scoped Rows**

Every table with tenant data includes `team_id`. Isolation is enforced at the application layer.

### Laravel Implementation

```php
// app/Domain/Shared/Traits/BelongsToTeam.php
trait BelongsToTeam
{
    protected static function bootBelongsToTeam(): void
    {
        // Always scope queries to current team
        static::addGlobalScope('team', function (Builder $builder) {
            if ($team = auth()->user()?->currentTeam) {
                $builder->where($builder->getModel()->getTable() . '.team_id', $team->id);
            }
        });

        // Automatically set team_id on creation
        static::creating(function (Model $model) {
            if (!$model->team_id && auth()->user()?->currentTeam) {
                $model->team_id = auth()->user()->currentTeam->id;
            }
        });
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
```

### Protection Layers

1. **Global Scope** — queries always filtered by team
2. **Policy Checks** — authorization verifies team membership
3. **Middleware** — validates team context exists on every request
4. **Database Indexes** — `team_id` is always part of composite indexes
5. **Row-Level Security (optional)** — PostgreSQL RLS as defense-in-depth

---

## 5. Custom Fields Architecture

### Storage: JSONB Column + Definitions Table

```php
// Creating a custom field definition
$definition = CustomFieldDefinition::create([
    'entity_type' => 'contact',
    'name' => 'LinkedIn URL',
    'slug' => 'linkedin_url',
    'field_type' => 'url',
    'validation' => ['pattern' => 'https://linkedin.com/.*'],
    'is_required' => false,
    'position' => 1,
]);

// Using custom fields on a contact
$contact->custom_fields = [
    'linkedin_url' => 'https://linkedin.com/in/johndoe',
    'preferred_channel' => 'email',
];

// Querying by custom field
Contact::where('custom_fields->linkedin_url', 'LIKE', '%johndoe%')->get();

// Filtering with GIN index
Contact::whereRaw("custom_fields @> ?", [json_encode(['preferred_channel' => 'email'])])->get();
```

### Validation Pipeline

```
Client Input → Field Definition Lookup → Type Coercion → Schema Validation → Persist
```

---

## 6. Event System

### Domain Events

Every mutation in the system emits a domain event:

```php
// Event naming convention: {Entity}{PastTenseVerb}
ContactCreated::class
ContactUpdated::class
DealStageChanged::class
DealWon::class
DealLost::class
ActivityCompleted::class
NoteCreated::class
EmailSent::class
EmailOpened::class
WorkflowTriggered::class
```

### Event Flow

```
User Action
    └──▶ Controller
            └──▶ Action Class (domain logic)
                    └──▶ Model::save()
                            └──▶ Domain Event Dispatched
                                    ├──▶ Sync Listeners
                                    │     ├── Update search index
                                    │     ├── Clear related cache
                                    │     └── Update computed fields
                                    └──▶ Async Listeners (queued jobs)
                                          ├── Send notifications
                                          ├── Trigger workflows
                                          ├── Dispatch webhooks
                                          ├── Generate embeddings
                                          └── Write audit log
```

### Event Schema (for webhooks & integrations)

```json
{
    "id": "evt_01HZ...",
    "type": "contact.created",
    "team_id": "team_01HZ...",
    "actor": {
        "id": "user_01HZ...",
        "type": "user"
    },
    "data": {
        "id": "contact_01HZ...",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
    },
    "occurred_at": "2026-03-26T10:30:00Z"
}
```

---

## 7. Caching Strategy

### Cache Layers

| Layer | Store | TTL | Invalidation |
|---|---|---|---|
| Route / Response | Nginx | 0 (API not cached at route level) | — |
| Query Results | Redis | 5–60 min | Event-driven tag invalidation |
| Computed Values | Redis | 1 hr | On data change |
| User Session | Redis | Session lifetime | On logout |
| Search Index | Meilisearch | Real-time sync | Scout observer |
| Static Config | APCu | Until deploy | Deploy hook |

### Cache Key Conventions

```
crm:{team_id}:{entity}:{id}             → single record
crm:{team_id}:{entity}:list:{hash}      → filtered list (hash of query params)
crm:{team_id}:pipeline:{id}:stats       → computed pipeline statistics
crm:{team_id}:dashboard:{id}:data       → dashboard widget data
```

### Invalidation via Cache Tags

```php
// On ContactUpdated event:
Cache::tags(["team:{$teamId}", "contacts"])->flush();
Cache::tags(["team:{$teamId}", "search"])->flush();
```

---

## 8. Scalability Patterns

### Database Scaling

1. **Read Replicas** — Route read queries to replicas via Laravel's `read`/`write` database config
2. **Table Partitioning** — Partition `audit_logs`, `emails`, `webhook_deliveries` by month
3. **Connection Pooling** — PgBouncer in front of PostgreSQL
4. **Archival** — Move old closed deals and activities to archive tables

### Application Scaling

1. **Horizontal** — Stateless app servers behind load balancer
2. **Queue Workers** — Scale Horizon workers independently
3. **WebSocket** — Reverb supports horizontal scaling with Redis

### Search Scaling

1. **Meilisearch** — Sharding by team for large datasets
2. **Separate Indexes** — Per-entity indexes with filterable attributes

### Data Growth Estimates

| Entity | Rows per team (yr 1) | Growth rate |
|---|---|---|
| Contacts | 5,000 – 50,000 | Medium |
| Companies | 1,000 – 10,000 | Low |
| Deals | 500 – 5,000 | Medium |
| Activities | 10,000 – 100,000 | High |
| Emails | 20,000 – 200,000 | Very High |
| Audit Logs | 50,000 – 500,000 | Very High → Partition |
| Embeddings | 30,000 – 300,000 | Correlated |

---

*Next: [03-SECURITY.md](03-SECURITY.md) — Security architecture, OWASP compliance, data protection*
