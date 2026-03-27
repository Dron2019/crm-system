# CRM System — API Design & Conventions

> Companion to [01-DEVELOPMENT-GUIDE.md](01-DEVELOPMENT-GUIDE.md)

---

## Table of Contents

1. [API Design Principles](#1-api-design-principles)
2. [URL Structure & Versioning](#2-url-structure--versioning)
3. [Request & Response Format](#3-request--response-format)
4. [Filtering, Sorting & Pagination](#4-filtering-sorting--pagination)
5. [Error Handling](#5-error-handling)
6. [Endpoint Reference](#6-endpoint-reference)
7. [Real-Time Events (WebSocket)](#7-real-time-events-websocket)
8. [API Client Generation](#8-api-client-generation)

---

## 1. API Design Principles

1. **RESTful** — Resource-oriented URLs, standard HTTP methods
2. **Consistent** — Same patterns for every endpoint
3. **Predictable** — Developers can guess the URL for any resource
4. **Documented** — Auto-generated OpenAPI 3.1 spec
5. **Versioned** — Breaking changes require new version
6. **Idempotent** — PUT/DELETE are safe to retry
7. **HATEOAS-lite** — Include useful links in responses (not full hypermedia)

---

## 2. URL Structure & Versioning

### Base URL

```
Production:   https://api.yourcrm.com/v1
Development:  http://localhost:8000/api/v1
```

### Versioning Strategy

- **URL-based versioning**: `/api/v1/`, `/api/v2/`
- Only increment on breaking changes
- Support previous version for 12 months after new version release
- Non-breaking additions (new fields, endpoints) don't require version bump

### URL Patterns

```
GET     /api/v1/contacts                    # List contacts
POST    /api/v1/contacts                    # Create contact
GET     /api/v1/contacts/{id}               # Get contact
PUT     /api/v1/contacts/{id}               # Update contact (full)
PATCH   /api/v1/contacts/{id}               # Update contact (partial)
DELETE  /api/v1/contacts/{id}               # Delete contact

# Nested resources
GET     /api/v1/contacts/{id}/activities    # Contact's activities
GET     /api/v1/contacts/{id}/deals         # Contact's deals
GET     /api/v1/contacts/{id}/notes         # Contact's notes
POST    /api/v1/contacts/{id}/notes         # Create note on contact

# Actions (non-CRUD operations)
POST    /api/v1/contacts/{id}/merge         # Merge duplicate contacts
POST    /api/v1/contacts/import             # Bulk import
POST    /api/v1/contacts/export             # Export contacts
POST    /api/v1/deals/{id}/move             # Move deal to stage
POST    /api/v1/deals/{id}/won              # Mark deal as won
POST    /api/v1/deals/{id}/lost             # Mark deal as lost

# Search
GET     /api/v1/search?q=john&type=contact,deal

# Current user
GET     /api/v1/me                          # Current user profile
PUT     /api/v1/me                          # Update profile
GET     /api/v1/me/notifications            # My notifications
```

---

## 3. Request & Response Format

### Content Type

```
Request:   Content-Type: application/json
Response:  Content-Type: application/json
```

### Successful Response (Single Resource)

```json
{
    "data": {
        "id": "01HZ4X2K...",
        "type": "contact",
        "attributes": {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone": "+1-555-0100",
            "job_title": "CTO",
            "source": "referral",
            "status": "active",
            "lead_score": 85,
            "custom_fields": {
                "linkedin_url": "https://linkedin.com/in/johndoe",
                "preferred_channel": "email"
            },
            "last_contacted_at": "2026-03-20T14:30:00Z",
            "created_at": "2026-01-15T09:00:00Z",
            "updated_at": "2026-03-25T10:45:00Z"
        },
        "relationships": {
            "owner": {
                "data": { "id": "01HZ...", "type": "user" }
            },
            "company": {
                "data": { "id": "01HZ...", "type": "company" }
            },
            "tags": {
                "data": [
                    { "id": "01HZ...", "type": "tag" }
                ]
            }
        },
        "links": {
            "self": "/api/v1/contacts/01HZ4X2K...",
            "activities": "/api/v1/contacts/01HZ4X2K.../activities",
            "deals": "/api/v1/contacts/01HZ4X2K.../deals"
        }
    },
    "included": [
        {
            "id": "01HZ...",
            "type": "user",
            "attributes": { "name": "Jane Smith", "avatar_url": "..." }
        },
        {
            "id": "01HZ...",
            "type": "company",
            "attributes": { "name": "Acme Corp", "domain": "acme.com" }
        }
    ]
}
```

### Successful Response (Collection)

```json
{
    "data": [
        { "id": "...", "type": "contact", "attributes": { ... } },
        { "id": "...", "type": "contact", "attributes": { ... } }
    ],
    "meta": {
        "current_page": 1,
        "per_page": 25,
        "total": 1250,
        "total_pages": 50,
        "has_more": true
    },
    "links": {
        "self": "/api/v1/contacts?page=1&per_page=25",
        "first": "/api/v1/contacts?page=1&per_page=25",
        "prev": null,
        "next": "/api/v1/contacts?page=2&per_page=25",
        "last": "/api/v1/contacts?page=50&per_page=25"
    }
}
```

### Request Body (Create)

```json
POST /api/v1/contacts
{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1-555-0100",
    "company_id": "01HZ...",
    "source": "referral",
    "tag_ids": ["01HZ...", "01HZ..."],
    "custom_fields": {
        "linkedin_url": "https://linkedin.com/in/johndoe"
    }
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|---|---|---|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST (resource created) |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Malformed JSON, invalid parameters |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Authenticated but not authorized |
| `404` | Not Found | Resource doesn't exist (or not in team scope) |
| `409` | Conflict | Duplicate resource (e.g., duplicate email) |
| `422` | Unprocessable Entity | Validation errors |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |

---

## 4. Filtering, Sorting & Pagination

### Filtering

```
GET /api/v1/contacts?filter[status]=active
GET /api/v1/contacts?filter[source]=referral,web
GET /api/v1/contacts?filter[created_at_from]=2026-01-01&filter[created_at_to]=2026-03-31
GET /api/v1/contacts?filter[owner_id]=01HZ...
GET /api/v1/contacts?filter[tag]=vip,enterprise
GET /api/v1/contacts?filter[lead_score_min]=70
GET /api/v1/contacts?filter[custom_fields.preferred_channel]=email
GET /api/v1/contacts?filter[search]=john doe

# Deals specific
GET /api/v1/deals?filter[pipeline_id]=01HZ...&filter[status]=open
GET /api/v1/deals?filter[value_min]=10000&filter[value_max]=100000
GET /api/v1/deals?filter[expected_close_before]=2026-04-30
```

### Sorting

```
GET /api/v1/contacts?sort=last_name                    # ASC
GET /api/v1/contacts?sort=-created_at                  # DESC
GET /api/v1/contacts?sort=-lead_score,last_name        # Multi-sort

# Allowed sort fields per resource (whitelist enforced)
contacts:  first_name, last_name, email, lead_score, created_at, updated_at, last_contacted_at
deals:     title, value, expected_close_date, created_at, updated_at
activities: due_date, created_at, subject
```

### Pagination

```
GET /api/v1/contacts?page=2&per_page=25

# per_page limits:
# - Default: 25
# - Minimum: 1
# - Maximum: 100
```

### Including Related Resources

```
GET /api/v1/contacts?include=company,tags,owner
GET /api/v1/deals?include=contact,company,stage,owner
GET /api/v1/contacts/{id}?include=company,deals,activities

# Prevents N+1 problems — eager loads specified relations
# Only whitelisted includes are allowed (prevent DoS via deep nesting)
```

### Field Selection (Sparse Fieldsets)

```
GET /api/v1/contacts?fields[contact]=first_name,last_name,email,lead_score
GET /api/v1/contacts?fields[contact]=first_name,email&fields[company]=name

# Reduces payload size for list views
```

### Laravel Implementation

```php
// app/Http/Controllers/Api/V1/ContactController.php
class ContactController extends Controller
{
    public function index(ListContactsRequest $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Contact::class);

        $contacts = Contact::query()
            ->with($request->validated('include', []))
            ->when($request->filter('status'), fn ($q, $v) => $q->where('status', $v))
            ->when($request->filter('source'), fn ($q, $v) => $q->whereIn('source', explode(',', $v)))
            ->when($request->filter('owner_id'), fn ($q, $v) => $q->where('owner_id', $v))
            ->when($request->filter('search'), fn ($q, $v) => $q->search($v))
            ->when($request->filter('tag'), fn ($q, $v) => $q->withAnyTags(explode(',', $v)))
            ->when($request->filter('lead_score_min'), fn ($q, $v) => $q->where('lead_score', '>=', (int) $v))
            ->when($request->filter('created_at_from'), fn ($q, $v) => $q->where('created_at', '>=', $v))
            ->when($request->filter('created_at_to'), fn ($q, $v) => $q->where('created_at', '<=', $v))
            ->applySorting($request->validated('sort', '-created_at'))
            ->paginate($request->validated('per_page', 25));

        return ContactResource::collection($contacts);
    }
}
```

---

## 5. Error Handling

### Error Response Format

```json
{
    "error": {
        "status": 422,
        "code": "VALIDATION_ERROR",
        "message": "The given data was invalid.",
        "details": [
            {
                "field": "email",
                "rule": "email",
                "message": "The email field must be a valid email address."
            },
            {
                "field": "first_name",
                "rule": "required",
                "message": "The first name field is required."
            }
        ]
    }
}
```

### Error Codes

```
# Authentication
AUTH_REQUIRED            — No authentication provided
AUTH_INVALID             — Invalid credentials
AUTH_EXPIRED             — Token/session expired
MFA_REQUIRED             — MFA verification needed
ACCOUNT_LOCKED           — Too many failed attempts
ACCOUNT_DISABLED         — Account deactivated

# Authorization  
FORBIDDEN                — Not authorized for this action
INSUFFICIENT_PERMISSIONS — Missing specific permission
TEAM_ACCESS_DENIED       — Not a member of this team

# Validation
VALIDATION_ERROR         — Input validation failed
INVALID_FORMAT           — Malformed request body
FIELD_TOO_LONG           — Field exceeds maximum length
INVALID_ENUM             — Value not in allowed list

# Resource
NOT_FOUND                — Resource not found
ALREADY_EXISTS           — Duplicate resource (conflict)
RESOURCE_LOCKED          — Resource is being edited by another user
GONE                     — Resource was permanently deleted

# Rate Limit
RATE_LIMITED             — Too many requests

# Server
INTERNAL_ERROR           — Unexpected server error
SERVICE_UNAVAILABLE      — Dependent service unavailable
```

### Laravel Exception Handler

```php
// app/Exceptions/Handler.php
class Handler extends ExceptionHandler
{
    public function render($request, Throwable $e): Response
    {
        if ($request->expectsJson()) {
            return match (true) {
                $e instanceof ValidationException => response()->json([
                    'error' => [
                        'status' => 422,
                        'code' => 'VALIDATION_ERROR',
                        'message' => 'The given data was invalid.',
                        'details' => collect($e->errors())->map(fn ($messages, $field) => [
                            'field' => $field,
                            'message' => $messages[0],
                        ])->values(),
                    ],
                ], 422),

                $e instanceof AuthenticationException => response()->json([
                    'error' => [
                        'status' => 401,
                        'code' => 'AUTH_REQUIRED',
                        'message' => 'Authentication required.',
                    ],
                ], 401),

                $e instanceof ModelNotFoundException => response()->json([
                    'error' => [
                        'status' => 404,
                        'code' => 'NOT_FOUND',
                        'message' => 'Resource not found.',
                    ],
                ], 404),

                $e instanceof ThrottleRequestsException => response()->json([
                    'error' => [
                        'status' => 429,
                        'code' => 'RATE_LIMITED',
                        'message' => 'Too many requests. Try again later.',
                    ],
                ], 429),

                default => response()->json([
                    'error' => [
                        'status' => 500,
                        'code' => 'INTERNAL_ERROR',
                        'message' => app()->isProduction()
                            ? 'An unexpected error occurred.'
                            : $e->getMessage(),
                    ],
                ], 500),
            };
        }

        return parent::render($request, $e);
    }
}
```

---

## 6. Endpoint Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register + create team |
| `POST` | `/auth/login` | Login (session) |
| `POST` | `/auth/logout` | Logout |
| `POST` | `/auth/forgot-password` | Send reset email |
| `POST` | `/auth/reset-password` | Reset with token |
| `POST` | `/auth/mfa/verify` | Verify MFA code |
| `GET` | `/me` | Current user |
| `PUT` | `/me` | Update profile |
| `PUT` | `/me/password` | Change password |

### Team Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/teams` | List user's teams |
| `POST` | `/teams` | Create team |
| `GET` | `/teams/{id}` | Get team details |
| `PUT` | `/teams/{id}` | Update team settings |
| `GET` | `/teams/{id}/members` | List members |
| `POST` | `/teams/{id}/invitations` | Invite member |
| `DELETE` | `/teams/{id}/members/{userId}` | Remove member |
| `PUT` | `/teams/{id}/members/{userId}/role` | Change role |

### Contacts

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/contacts` | List (filterable, sortable, paginated) |
| `POST` | `/contacts` | Create |
| `GET` | `/contacts/{id}` | Get with optional includes |
| `PUT` | `/contacts/{id}` | Full update |
| `PATCH` | `/contacts/{id}` | Partial update |
| `DELETE` | `/contacts/{id}` | Soft delete |
| `POST` | `/contacts/{id}/restore` | Restore deleted |
| `POST` | `/contacts/{id}/merge` | Merge with another contact |
| `GET` | `/contacts/{id}/activities` | Contact's activities |
| `GET` | `/contacts/{id}/deals` | Contact's deals |
| `GET` | `/contacts/{id}/notes` | Contact's notes |
| `GET` | `/contacts/{id}/emails` | Contact's emails |
| `GET` | `/contacts/{id}/timeline` | Unified timeline |
| `POST` | `/contacts/import` | Bulk import (CSV) |
| `POST` | `/contacts/export` | Export (CSV/JSON) |

### Companies

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/companies` | List |
| `POST` | `/companies` | Create |
| `GET` | `/companies/{id}` | Get |
| `PUT` | `/companies/{id}` | Update |
| `DELETE` | `/companies/{id}` | Delete |
| `GET` | `/companies/{id}/contacts` | Company's contacts |
| `GET` | `/companies/{id}/deals` | Company's deals |

### Deals / Pipeline

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pipelines` | List pipelines |
| `POST` | `/pipelines` | Create pipeline |
| `PUT` | `/pipelines/{id}` | Update pipeline |
| `GET` | `/pipelines/{id}/stages` | List stages |
| `GET` | `/pipelines/{id}/board` | Kanban board data |
| `GET` | `/deals` | List deals |
| `POST` | `/deals` | Create deal |
| `GET` | `/deals/{id}` | Get deal |
| `PUT` | `/deals/{id}` | Update deal |
| `DELETE` | `/deals/{id}` | Delete deal |
| `POST` | `/deals/{id}/move` | Move to stage |
| `POST` | `/deals/{id}/won` | Mark as won |
| `POST` | `/deals/{id}/lost` | Mark as lost |
| `POST` | `/deals/reorder` | Reorder within stage |
| `GET` | `/deals/{id}/timeline` | Deal timeline |

### Activities

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/activities` | List (filterable by type, date, owner) |
| `POST` | `/activities` | Create |
| `GET` | `/activities/{id}` | Get |
| `PUT` | `/activities/{id}` | Update |
| `DELETE` | `/activities/{id}` | Delete |
| `POST` | `/activities/{id}/complete` | Mark complete |

### Notes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/notes` | Create (specify noteable_type + noteable_id) |
| `PUT` | `/notes/{id}` | Update |
| `DELETE` | `/notes/{id}` | Delete |
| `POST` | `/notes/{id}/pin` | Toggle pin |

### Search

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/search?q=X&type=...` | Global search across entities |

### Tags

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tags` | List team tags |
| `POST` | `/tags` | Create tag |
| `PUT` | `/tags/{id}` | Update tag |
| `DELETE` | `/tags/{id}` | Delete tag |

### Custom Fields

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/custom-fields?entity=contact` | List definitions |
| `POST` | `/custom-fields` | Create definition |
| `PUT` | `/custom-fields/{id}` | Update definition |
| `DELETE` | `/custom-fields/{id}` | Delete definition |

### Email

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/emails` | List emails |
| `GET` | `/emails/{id}` | Get email |
| `POST` | `/emails/send` | Send email |
| `GET` | `/email-templates` | List templates |
| `POST` | `/email-templates` | Create template |
| `PUT` | `/email-templates/{id}` | Update template |

### Workflows

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/workflows` | List workflows |
| `POST` | `/workflows` | Create workflow |
| `PUT` | `/workflows/{id}` | Update workflow |
| `POST` | `/workflows/{id}/activate` | Activate |
| `POST` | `/workflows/{id}/deactivate` | Deactivate |
| `GET` | `/workflows/{id}/runs` | Execution history |

### Reports & Dashboards

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboards` | List dashboards |
| `POST` | `/dashboards` | Create dashboard |
| `PUT` | `/dashboards/{id}` | Update layout |
| `GET` | `/reports/pipeline` | Pipeline report |
| `GET` | `/reports/activities` | Activity report |
| `GET` | `/reports/revenue` | Revenue report |
| `POST` | `/reports/custom` | Run custom report query |

### AI

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ai/score-lead` | Score a contact |
| `POST` | `/ai/draft-email` | Draft email for context |
| `POST` | `/ai/summarize` | Summarize deal/contact |
| `POST` | `/ai/suggest-actions` | Suggest next actions |
| `GET` | `/ai/search?q=X` | Semantic search |

### Webhooks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/webhooks` | List webhooks |
| `POST` | `/webhooks` | Create webhook |
| `PUT` | `/webhooks/{id}` | Update webhook |
| `DELETE` | `/webhooks/{id}` | Delete webhook |
| `GET` | `/webhooks/{id}/deliveries` | Delivery log |

---

## 7. Real-Time Events (WebSocket)

### Channel Structure

```
Private channels (require auth):
  team.{teamId}                          — Team-wide events
  team.{teamId}.contacts                 — Contact updates
  team.{teamId}.deals                    — Deal updates
  team.{teamId}.pipeline.{pipelineId}    — Pipeline board updates
  user.{userId}                          — User-specific notifications
```

### Event Types

```json
// Contact updated
{
    "event": "ContactUpdated",
    "channel": "team.01HZ...",
    "data": {
        "id": "01HZ...",
        "changes": ["lead_score", "status"],
        "updated_by": "01HZ..."
    }
}

// Deal moved
{
    "event": "DealMoved",
    "channel": "team.01HZ....pipeline.01HZ...",
    "data": {
        "deal_id": "01HZ...",
        "from_stage_id": "01HZ...",
        "to_stage_id": "01HZ...",
        "moved_by": "01HZ..."
    }
}

// Notification
{
    "event": "NewNotification",
    "channel": "user.01HZ...",
    "data": {
        "id": "01HZ...",
        "type": "deal_assigned",
        "title": "New deal assigned to you",
        "body": "Enterprise Plan - Acme Corp ($50,000)",
        "action_url": "/deals/01HZ..."
    }
}
```

### Frontend Integration

```typescript
// src/shared/lib/echo.ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
});

// Usage in React hook
function usePipelineUpdates(pipelineId: string) {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = echo.private(`team.${teamId}.pipeline.${pipelineId}`);
        
        channel.listen('DealMoved', (event) => {
            queryClient.invalidateQueries({ queryKey: ['pipeline', pipelineId] });
        });

        return () => channel.stopListening('DealMoved');
    }, [pipelineId]);
}
```

---

## 8. API Client Generation

### Auto-Generated TypeScript SDK

```bash
# Generate OpenAPI spec from Laravel routes
php artisan api:docs > openapi.json

# Generate TypeScript client
npx openapi-typescript openapi.json -o src/shared/types/api.ts

# Or use full client generation
npx @hey-api/openapi-ts -i http://localhost:8000/api/docs/openapi.json -o src/shared/api/generated
```

### Generated Types Example

```typescript
// Auto-generated from OpenAPI — do not edit
export interface Contact {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    source: ContactSource | null;
    status: ContactStatus;
    lead_score: number;
    custom_fields: Record<string, unknown>;
    last_contacted_at: string | null;
    created_at: string;
    updated_at: string;
}

export type ContactSource = 'web' | 'referral' | 'cold' | 'event' | 'partner' | 'other';
export type ContactStatus = 'active' | 'inactive' | 'archived';

export interface CreateContactRequest {
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company_id?: string;
    source?: ContactSource;
    tag_ids?: string[];
    custom_fields?: Record<string, unknown>;
}
```

### TanStack Query Integration

```typescript
// src/modules/contacts/api/contacts.ts
import { apiClient } from '@/shared/lib/apiClient';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Contact, CreateContactRequest } from '@/shared/types/api';

export const contactKeys = {
    all: ['contacts'] as const,
    lists: () => [...contactKeys.all, 'list'] as const,
    list: (filters: Record<string, string>) => [...contactKeys.lists(), filters] as const,
    details: () => [...contactKeys.all, 'detail'] as const,
    detail: (id: string) => [...contactKeys.details(), id] as const,
};

export function contactListOptions(filters: Record<string, string> = {}) {
    return queryOptions({
        queryKey: contactKeys.list(filters),
        queryFn: () => apiClient.get<PaginatedResponse<Contact>>('/contacts', { params: filters }),
    });
}

export function contactDetailOptions(id: string) {
    return queryOptions({
        queryKey: contactKeys.detail(id),
        queryFn: () => apiClient.get<{ data: Contact }>(`/contacts/${id}?include=company,tags,owner`),
    });
}

export function useCreateContact() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (data: CreateContactRequest) => apiClient.post<{ data: Contact }>('/contacts', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
        },
    });
}
```

---

*Next: [05-FRONTEND-ARCHITECTURE.md](05-FRONTEND-ARCHITECTURE.md) — React component patterns, MUI theming, state management*
