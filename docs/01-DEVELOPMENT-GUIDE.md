# CRM System — AI-Assisted Development Guide

> **Tech Stack:** Laravel 11+ · React 18+ · Material UI (MUI) v6 · PostgreSQL · Redis · Meilisearch  
> **Target:** Modern, developer-friendly CRM with AI-powered features  
> **Date:** March 2026

---

## Table of Contents

1. [Industry Trends & Analysis (2025-2026)](#1-industry-trends--analysis)
2. [Project Philosophy](#2-project-philosophy)
3. [System Overview](#3-system-overview)
4. [Development Phases](#4-development-phases)
5. [Tech Stack Breakdown](#5-tech-stack-breakdown)
6. [Project Structure](#6-project-structure)
7. [Development Environment Setup](#7-development-environment-setup)
8. [Step-by-Step Build Order](#8-step-by-step-build-order)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment & DevOps](#10-deployment--devops)
11. [Cross-References](#11-cross-references)

---

## 1. Industry Trends & Analysis

### CRM Market Trends (2025–2026)

| Trend | Impact on Architecture |
|---|---|
| **AI-first CRM** — Predictive lead scoring, auto-summarization, smart task creation | Requires event-driven architecture, ML pipeline integration, vector DB for embeddings |
| **Composable CRM** — Modular, API-first design replacing monoliths | Domain-driven design, microservice-ready monolith, OpenAPI contracts |
| **Revenue Intelligence** — Unified pipeline + conversation intelligence | Webhook ingestion, real-time event streams, analytics warehouse |
| **Product-Led Growth (PLG)** — Self-serve onboarding, usage-based tiers | Multi-tenant SaaS architecture, feature flags, usage metering |
| **Privacy-First** — GDPR, CCPA, data residency requirements | Consent management, data encryption at rest, audit logging, soft deletes |
| **Real-Time Collaboration** — Live updates, presence indicators | WebSockets (Laravel Reverb), optimistic UI, CRDT-ready data models |
| **Low-Code Customization** — User-defined fields, workflows, dashboards | JSON Schema for dynamic fields, workflow engine, configurable UI |
| **Hyper-Personalization** — Context-aware UI, smart notifications | Event sourcing for user behavior, recommendation engine |
| **Mobile-First** — Responsive + PWA | MUI responsive grid, service workers, offline capability |
| **Integration Ecosystem** — Zapier, Make, native connectors | Webhook system, OAuth2 provider, standardized event schema |

### Competitive Landscape Analysis

| Feature | Salesforce | HubSpot | Pipedrive | **Our CRM** |
|---|---|---|---|---|
| AI Lead Scoring | ✅ (Einstein) | ✅ (Basic) | ❌ | ✅ (Open models) |
| Custom Fields | ✅ | ✅ | ✅ | ✅ (JSON Schema) |
| API-First | Partial | ✅ | ✅ | ✅ (OpenAPI 3.1) |
| Self-Hosted Option | ❌ | ❌ | ❌ | ✅ |
| Open Source | ❌ | ❌ | ❌ | ✅ (Core) |
| Developer Experience | Poor | Good | OK | **Excellent** |
| Real-Time | Partial | ❌ | ❌ | ✅ (WebSocket) |
| Price | $$$$  | $$$  | $$  | $ / Free tier |

---

## 2. Project Philosophy

### Core Principles

1. **Convention over Configuration** — Laravel conventions, predictable patterns
2. **Domain-Driven Design** — Bounded contexts, ubiquitous language
3. **API-First** — Backend is a pure API; frontend is a separate SPA
4. **Type Safety End-to-End** — TypeScript on frontend, strict PHP types + generated API types
5. **AI-Augmented, Not AI-Dependent** — AI enhances but system works fully without it
6. **Multi-Tenant by Default** — Team/organization isolation from day one
7. **Event-Driven Core** — All mutations emit domain events for extensibility
8. **Progressive Complexity** — Start simple, scale to enterprise

### Developer Experience Goals

- `git clone` → `docker compose up` → working system in < 3 minutes
- Hot reload on both frontend and backend
- Auto-generated API documentation + SDK
- Comprehensive seed data for development
- One-command test suite execution

---

## 3. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  React SPA   │  │  Mobile PWA  │  │  Third-Party Clients  │ │
│  │  (MUI v6)    │  │  (Same SPA)  │  │  (API Consumers)      │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘ │
└─────────┼─────────────────┼──────────────────────┼─────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY / PROXY                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Nginx / Caddy  — Rate Limiting, SSL, CORS, Compression │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Laravel 11+ API                        │    │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌─────────────┐   │    │
│  │  │ Auth &  │ │ CRM Core │ │  AI &  │ │ Integration │   │    │
│  │  │ Tenant  │ │ Modules  │ │  ML    │ │ Engine      │   │    │
│  │  │ Module  │ │          │ │ Module │ │             │   │    │
│  │  └────┬────┘ └────┬─────┘ └───┬────┘ └──────┬──────┘   │    │
│  │       │           │           │              │          │    │
│  │  ┌────▼───────────▼───────────▼──────────────▼──────┐   │    │
│  │  │           Domain Event Bus (Sync + Async)        │   │    │
│  │  └──────────────────────┬───────────────────────────┘   │    │
│  └─────────────────────────┼───────────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
│  ┌────────────┐ ┌───────┐ ┌───────────┐ ┌──────────────────┐   │
│  │ PostgreSQL │ │ Redis │ │Meilisearch│ │ S3 / MinIO       │   │
│  │ (Primary)  │ │(Cache)│ │ (Search)  │ │ (File Storage)   │   │
│  └────────────┘ └───────┘ └───────────┘ └──────────────────┘   │
│  ┌────────────────────────┐ ┌──────────────────────────────┐   │
│  │ pgvector (Embeddings)  │ │ ClickHouse (Analytics, opt.) │   │
│  └────────────────────────┘ └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Core CRM Modules

| Module | Description | Priority |
|---|---|---|
| **Contacts** | People, companies, relationships | P0 |
| **Deals / Pipeline** | Sales pipeline, stages, forecasting | P0 |
| **Activities** | Tasks, calls, meetings, emails | P0 |
| **Notes & Timeline** | Activity feed, rich-text notes | P0 |
| **Email Integration** | Send/receive, templates, tracking | P1 |
| **Custom Fields** | User-defined fields per entity | P1 |
| **Workflow Automation** | Trigger → Condition → Action engine | P1 |
| **Reports & Dashboards** | Charts, KPIs, custom reports | P1 |
| **AI Assistant** | Smart suggestions, summarization | P2 |
| **Document Management** | File attachments, proposals, e-sign | P2 |
| **Calendar** | Scheduling, availability, booking links | P2 |
| **Integrations** | Webhooks, Zapier, OAuth apps | P2 |
| **Admin & Settings** | Roles, permissions, tenant settings | P0 |

---

## 4. Development Phases

### Phase 1 — Foundation (Weeks 1–3)

- [ ] Project scaffolding (Laravel + React + Docker)
- [ ] Authentication system (Laravel Sanctum + SPA auth)
- [ ] Multi-tenancy architecture (team-based isolation)
- [ ] Base models, migrations, and seeders
- [ ] MUI theme setup, layout shell, routing
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] API documentation setup (Scramble or L5-Swagger)

### Phase 2 — Core CRM (Weeks 4–8)

- [ ] Contact management (CRUD, import/export, deduplication)
- [ ] Company management with contact associations
- [ ] Deal / Pipeline management (Kanban board)
- [ ] Activity management (tasks, calls, meetings)
- [ ] Notes & timeline feed
- [ ] Global search (Meilisearch integration)
- [ ] Custom fields engine
- [ ] File attachments (S3/MinIO)

### Phase 3 — Communication & Automation (Weeks 9–12)

- [ ] Email integration (IMAP/SMTP, tracking pixels)
- [ ] Email templates with variable interpolation
- [ ] Workflow automation engine
- [ ] Notification system (in-app, email, push)
- [ ] Real-time updates (Laravel Reverb + Echo)
- [ ] Calendar & scheduling module
- [ ] Bulk operations & data import/export

### Phase 4 — Intelligence & Analytics (Weeks 13–16)

- [ ] Reporting engine with chart builder
- [ ] Dashboard customization
- [ ] AI lead scoring model
- [ ] AI email draft assistant
- [ ] AI deal summarization
- [ ] Activity sentiment analysis
- [ ] Forecasting & pipeline analytics

### Phase 5 — Ecosystem & Scale (Weeks 17–20)

- [ ] Webhook system (outbound events)
- [ ] OAuth2 provider for third-party apps
- [ ] Public API with versioning
- [ ] Marketplace / integration directory
- [ ] Advanced RBAC with custom roles
- [ ] Audit log viewer
- [ ] Performance optimization & load testing
- [ ] Documentation & onboarding flows

---

## 5. Tech Stack Breakdown

### Backend

| Component | Technology | Rationale |
|---|---|---|
| Framework | **Laravel 11+** | Mature ecosystem, excellent DX, built-in auth/queue/cache |
| PHP Version | **8.3+** | Typed properties, enums, fibers, readonly classes |
| API Style | **RESTful + JSON:API** | Standardized, cacheable, well-tooled |
| Auth | **Laravel Sanctum** | SPA cookie auth + API token auth |
| Queue | **Laravel Horizon + Redis** | Job processing, retries, monitoring |
| WebSocket | **Laravel Reverb** | Native Laravel WebSocket server |
| Search | **Meilisearch** via Laravel Scout | Typo-tolerant, faceted, fast |
| File Storage | **S3 / MinIO** via Flysystem | Abstracted, swappable storage drivers |
| PDF Generation | **Laravel DomPDF / Browsershot** | Reports, invoices, proposals |
| AI/ML | **OpenAI API / Ollama** | Embeddings, completions, local LLM option |
| Testing | **Pest PHP** | Modern, expressive, parallel tests |

### Frontend

| Component | Technology | Rationale |
|---|---|---|
| Framework | **React 18+** | Component model, huge ecosystem, concurrent features |
| Language | **TypeScript 5+** | Type safety, IDE support, refactoring confidence |
| UI Library | **MUI v6** | Comprehensive components, theming, accessibility |
| State Mgmt | **TanStack Query + Zustand** | Server state + client state separation |
| Routing | **React Router v7** | File-based routing, data loaders, lazy loading |
| Forms | **React Hook Form + Zod** | Performant forms, schema validation |
| Charts | **Recharts** (MUI compatible) | Composable, responsive SVG charts |
| Rich Text | **TipTap** | Extensible, collaborative-ready editor |
| DnD | **dnd-kit** | Accessible drag-and-drop for Kanban |
| Real-Time | **Laravel Echo** | WebSocket client for Reverb |
| Testing | **Vitest + Testing Library** | Fast, component-level testing |
| Build | **Vite** | Lightning-fast HMR, optimized builds |

### Infrastructure

| Component | Technology |
|---|---|
| Containers | Docker + Docker Compose |
| Reverse Proxy | Caddy (auto HTTPS) or Nginx |
| CI/CD | GitHub Actions |
| Monitoring | Laravel Telescope (dev) + Sentry (prod) |
| Log Aggregation | stdout → ELK or Loki |
| Database | PostgreSQL 16+ with pgvector |
| Cache / Queue Broker | Redis 7+ |
| Object Storage | S3 / MinIO |
| Search Engine | Meilisearch |
| Analytics DB (optional) | ClickHouse |

---

## 6. Project Structure

### Backend (Laravel)

```
backend/
├── app/
│   ├── Console/Commands/           # Artisan commands
│   ├── Domain/                     # Domain layer (DDD)
│   │   ├── Auth/
│   │   │   ├── Models/             # User, Team, Invitation
│   │   │   ├── Policies/
│   │   │   ├── Actions/            # RegisterUser, InviteMember
│   │   │   ├── Events/
│   │   │   └── Enums/
│   │   ├── Contact/
│   │   │   ├── Models/             # Contact, Company, Tag
│   │   │   ├── Actions/            # CreateContact, MergeContacts
│   │   │   ├── DataTransferObjects/
│   │   │   ├── Events/
│   │   │   ├── Policies/
│   │   │   ├── QueryBuilders/
│   │   │   └── Enums/
│   │   ├── Deal/
│   │   │   ├── Models/             # Deal, Pipeline, Stage
│   │   │   ├── Actions/
│   │   │   ├── Events/
│   │   │   └── Enums/              # DealStatus, Priority
│   │   ├── Activity/
│   │   │   ├── Models/             # Task, Call, Meeting
│   │   │   ├── Actions/
│   │   │   └── Events/
│   │   ├── Communication/
│   │   │   ├── Models/             # Email, Template, Thread
│   │   │   ├── Actions/
│   │   │   └── Services/           # MailService, TrackingService
│   │   ├── Workflow/
│   │   │   ├── Models/             # Workflow, Trigger, Action
│   │   │   ├── Engine/             # WorkflowExecutor
│   │   │   └── Actions/
│   │   ├── AI/
│   │   │   ├── Services/           # EmbeddingService, ScoringService
│   │   │   ├── Jobs/               # GenerateEmbeddings, ScoreLeads
│   │   │   └── Prompts/            # Prompt templates
│   │   ├── Reporting/
│   │   │   ├── Models/             # Report, Dashboard, Widget
│   │   │   ├── Builders/           # QueryBuilder for reports
│   │   │   └── Exporters/
│   │   ├── Integration/
│   │   │   ├── Models/             # Webhook, OAuthClient
│   │   │   ├── Handlers/
│   │   │   └── Services/
│   │   └── Shared/
│   │       ├── Models/             # Note, Attachment, Tag, CustomField
│   │       ├── Traits/             # HasCustomFields, HasTimeline
│   │       ├── Services/           # SearchService, FileService
│   │       └── ValueObjects/       # Money, PhoneNumber, Address
│   ├── Http/
│   │   ├── Controllers/Api/V1/     # API controllers per domain
│   │   ├── Middleware/
│   │   ├── Requests/               # Form request validation
│   │   └── Resources/              # API resource transformers
│   ├── Jobs/                       # Queued jobs
│   ├── Listeners/                  # Event listeners
│   ├── Notifications/
│   └── Providers/
├── config/
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── factories/
├── routes/
│   ├── api.php                     # Versioned API routes
│   └── channels.php               # WebSocket channels
├── tests/
│   ├── Feature/
│   ├── Unit/
│   └── Integration/
├── docker/
│   ├── php/Dockerfile
│   ├── nginx/nginx.conf
│   └── scheduler/entrypoint.sh
├── composer.json
├── phpstan.neon                    # Static analysis config
└── .env.example
```

### Frontend (React + MUI)

```
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx                 # Root component
│   │   ├── routes.tsx              # Route definitions
│   │   └── providers/              # Theme, Auth, QueryClient providers
│   ├── modules/                    # Feature modules (mirror backend domains)
│   │   ├── auth/
│   │   │   ├── components/         # LoginForm, RegisterForm
│   │   │   ├── hooks/              # useAuth, usePermissions
│   │   │   ├── pages/              # LoginPage, RegisterPage
│   │   │   └── api/                # Auth API calls
│   │   ├── contacts/
│   │   │   ├── components/         # ContactCard, ContactForm, ContactList
│   │   │   ├── hooks/              # useContacts, useContactDetail
│   │   │   ├── pages/              # ContactsPage, ContactDetailPage
│   │   │   └── api/                # Contact API calls (TanStack Query)
│   │   ├── deals/
│   │   │   ├── components/         # PipelineBoard, DealCard, DealForm
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── api/
│   │   ├── activities/
│   │   ├── communications/
│   │   ├── workflows/
│   │   ├── reports/
│   │   ├── ai/
│   │   └── settings/
│   ├── shared/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── DataTable/          # Generic sortable/filterable table
│   │   │   ├── EntityTimeline/     # Activity feed component
│   │   │   ├── CustomFieldRenderer/# Dynamic form fields
│   │   │   ├── RichTextEditor/     # TipTap wrapper
│   │   │   ├── FileUpload/
│   │   │   ├── ConfirmDialog/
│   │   │   └── EmptyState/
│   │   ├── hooks/                  # useDebounce, useLocalStorage, etc.
│   │   ├── layouts/                # AppLayout, AuthLayout
│   │   ├── theme/                  # MUI theme customization
│   │   │   ├── theme.ts            # Palette, typography, shape
│   │   │   ├── components.ts       # Component overrides
│   │   │   └── darkMode.ts         # Dark mode variant
│   │   ├── lib/                    # API client, helpers, formatters
│   │   │   ├── apiClient.ts        # Axios instance with interceptors
│   │   │   ├── queryKeys.ts        # TanStack Query key factory
│   │   │   └── permissions.ts      # Permission checks
│   │   └── types/                  # Shared TypeScript types
│   │       ├── api.ts              # Auto-generated from OpenAPI
│   │       └── common.ts           # Shared interfaces
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## 7. Development Environment Setup

### Prerequisites

- Docker Desktop (with Compose v2)
- Node.js 20+ (via nvm recommended)
- PHP 8.3+ (optional, for IDE support — Docker handles runtime)
- Git

### Quick Start

```bash
# Clone and enter project
git clone <repo-url> crm-system && cd crm-system

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start everything
docker compose up -d

# Backend setup
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed

# Frontend setup
cd frontend && npm install && npm run dev

# Access
# API:      http://localhost:8000/api/v1
# Frontend: http://localhost:5173
# Mailpit:  http://localhost:8025
# Horizon:  http://localhost:8000/horizon
```

### Docker Compose Services

```yaml
# docker-compose.yml (development)
services:
  app:            # PHP-FPM + Laravel
  nginx:          # Web server / reverse proxy
  postgres:       # PostgreSQL 16
  redis:          # Cache + Queue broker
  meilisearch:    # Full-text search
  minio:          # S3-compatible storage
  mailpit:        # Email testing
  reverb:         # WebSocket server
  horizon:        # Queue worker dashboard
  scheduler:      # Laravel task scheduler
```

---

## 8. Step-by-Step Build Order

### Step 1: Scaffold Backend

```bash
composer create-project laravel/laravel backend
cd backend
composer require laravel/sanctum laravel/horizon laravel/reverb laravel/scout
composer require --dev pestphp/pest larastan/larastan
```

**Key configurations:**
- Configure PostgreSQL in `.env`
- Set up Sanctum SPA authentication (stateful domains)
- Configure Redis for cache + queue
- Set up PHPStan at level 8

### Step 2: Scaffold Frontend

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install @tanstack/react-query zustand react-router-dom
npm install react-hook-form @hookform/resolvers zod
npm install axios dayjs recharts @tiptap/react @tiptap/starter-kit @dnd-kit/core
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### Step 3: Authentication & Multi-Tenancy

1. Create `User`, `Team`, `TeamMember` models with migrations
2. Implement team-scoped global scopes (BelongsToTeam trait)
3. Build registration flow (create user + default team)
4. Build login with Sanctum SPA cookies
5. Implement invitation system (email-based)
6. Frontend: Auth provider, protected routes, login/register pages

### Step 4: Contact & Company Management

1. Create models: `Contact`, `Company`, `ContactCompany` (pivot)
2. Build API resources and controllers with filtering/sorting
3. Implement contact deduplication (fuzzy matching on email/phone)
4. Frontend: Contact list (DataTable), detail page, form (drawer)
5. Import/export via CSV (queued jobs)

### Step 5: Deal Pipeline

1. Create models: `Pipeline`, `Stage`, `Deal`
2. Build Kanban API (deals grouped by stage, drag ordering)
3. Frontend: Kanban board with dnd-kit, deal detail drawer
4. Pipeline analytics (conversion rate per stage)

### Step 6: Activities & Timeline

1. Create polymorphic `Activity` model (task, call, meeting, note)
2. Build unified timeline query for any entity
3. Frontend: Timeline component, task manager, calendar view

### Step 7: Search & Custom Fields

1. Integrate Meilisearch via Scout for Contact, Company, Deal
2. Build custom fields engine (JSON Schema storage + validation)
3. Frontend: Global search command palette (Cmd+K), dynamic field renderer

### Step 8: Communication Layer

1. Email sync service (IMAP polling via queued jobs)
2. Email send with tracking pixels + link tracking
3. Template engine with Blade/Mustache variables
4. Frontend: Email composer, thread viewer, template editor

### Step 9: Workflow Automation

1. Define workflow DSL (trigger → conditions → actions)
2. Build execution engine with step logging
3. Implement common triggers: deal stage changed, contact created, etc.
4. Frontend: Visual workflow builder (node-based or step list)

### Step 10: Reporting & Dashboards

1. Build query builder for report data aggregation
2. Implement chart types: funnel, bar, line, pie, KPI cards
3. Dashboard layout with drag-and-drop widgets
4. Export to PDF/CSV

### Step 11: AI Features

1. Integrate OpenAI/Ollama for embeddings + completions
2. Lead scoring (feature extraction → model inference)
3. Email drafting assistant
4. Deal summarization from timeline
5. Smart activity suggestions
6. Semantic search over notes and emails

---

## 9. Testing Strategy

### Backend Testing (Pest PHP)

```
tests/
├── Unit/
│   ├── Domain/Contact/Actions/CreateContactTest.php
│   ├── Domain/Deal/Models/DealTest.php
│   └── Domain/Workflow/Engine/WorkflowExecutorTest.php
├── Feature/
│   ├── Api/V1/ContactControllerTest.php
│   ├── Api/V1/DealControllerTest.php
│   └── Auth/LoginTest.php
└── Integration/
    ├── Meilisearch/ContactSearchTest.php
    └── AI/EmbeddingServiceTest.php
```

**Coverage targets:** 80%+ for domain actions, 100% for auth flows, 70%+ overall.

### Frontend Testing (Vitest + Testing Library)

```
src/modules/contacts/__tests__/
├── ContactForm.test.tsx         # Component behavior tests
├── useContacts.test.ts          # Hook tests with MSW
└── ContactsPage.test.tsx        # Page integration tests
```

**Approach:** Test user behavior, not implementation. Use MSW for API mocking.

### E2E Testing (Playwright)

```
e2e/
├── auth.spec.ts                 # Login, register, invite flows
├── contacts.spec.ts             # CRUD contact workflow
├── deals.spec.ts                # Pipeline drag-and-drop
└── helpers/
    └── fixtures.ts              # Test data factories
```

---

## 10. Deployment & DevOps

### Container Strategy

```dockerfile
# Multi-stage production Dockerfile
FROM php:8.3-fpm-alpine AS backend
# ... optimized for production (opcache, no dev dependencies)

FROM node:20-alpine AS frontend-build
# ... build React SPA, output to /dist

FROM caddy:2-alpine AS web
# ... serve SPA + proxy API to PHP-FPM
```

### CI/CD Pipeline (GitHub Actions)

```
on: [push, pull_request]

jobs:
  backend-tests:    # PHPStan + Pest
  frontend-tests:   # Vitest + type-check
  e2e-tests:        # Playwright (on staging)
  build:            # Docker build + push
  deploy:           # Deploy to staging/production
```

### Environment Tiers

| Tier | Purpose | Trigger |
|---|---|---|
| Local | Development | `docker compose up` |
| CI | Automated tests | Every push |
| Staging | QA + demos | Merge to `develop` |
| Production | Live system | Merge to `main` + manual approve |

### Monitoring Checklist

- [ ] Application errors → Sentry
- [ ] Queue health → Horizon dashboard
- [ ] API performance → Laravel Telescope (dev) / custom middleware (prod)
- [ ] Uptime → health check endpoint `/api/health`
- [ ] Database metrics → pg_stat_statements
- [ ] Frontend errors → Sentry Browser SDK

---

## 11. Cross-References

| Document | Contents |
|---|---|
| [02-ARCHITECTURE.md](02-ARCHITECTURE.md) | Database schema, entity relationships, domain events |
| [03-SECURITY.md](03-SECURITY.md) | Authentication, authorization, encryption, OWASP compliance |
| [04-API-DESIGN.md](04-API-DESIGN.md) | API conventions, versioning, error handling, rate limiting |
| [05-FRONTEND-ARCHITECTURE.md](05-FRONTEND-ARCHITECTURE.md) | Component patterns, state management, MUI theming |
| [06-AI-FEATURES.md](06-AI-FEATURES.md) | AI/ML integration, prompt engineering, model selection |

---

*This is a living document. Update as architecture decisions evolve.*
