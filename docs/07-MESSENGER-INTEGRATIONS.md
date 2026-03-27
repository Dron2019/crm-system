# CRM System - Messenger Integrations Guide

This document describes how to implement messenger channel integrations (WhatsApp, Telegram, Facebook Messenger, Instagram DM) in the CRM.

---

## 1. Goals

- Send outbound messages from CRM workflows and contact timelines.
- Receive inbound messages via provider webhooks.
- Store conversations in CRM with contact linkage and auditability.
- Keep provider-specific details isolated behind adapters.

---

## 2. Architecture

### Core Components

1. `MessagingChannel` model
- Provider (`whatsapp`, `telegram`, `messenger`, `instagram`)
- Team-scoped credentials and settings (encrypted)
- Active/inactive state and webhook verification data

2. `Conversation` model
- Team, contact, channel, external conversation id
- Last message timestamp, unread counters

3. `ConversationMessage` model
- Conversation id, direction (`inbound`/`outbound`)
- Message body, attachments metadata
- Provider message id, delivery state, error details

4. `MessagingProviderInterface`
- `sendMessage(...)`
- `verifyWebhook(...)`
- `parseWebhookPayload(...)`
- `normalizeContactIdentifier(...)`

5. Provider adapters
- `WhatsAppCloudAdapter`
- `TelegramBotAdapter`
- `MetaMessengerAdapter`

6. Queue jobs
- `DispatchOutboundMessageJob`
- `ProcessInboundWebhookJob`
- `SyncDeliveryStatusJob`

### Data Flow

1. User sends message from CRM.
2. API stores pending outbound record.
3. Queue job calls provider adapter.
4. Provider response updates delivery status and external ids.
5. Inbound webhooks hit provider endpoint.
6. Webhook payload normalized and stored in conversation timeline.

---

## 3. Database Design (Recommended)

### `messaging_channels`

- `id` uuid PK
- `team_id` uuid FK
- `provider` string
- `name` string
- `credentials` json (encrypted cast)
- `settings` json nullable
- `is_active` boolean
- `webhook_secret` string nullable
- `webhook_verified_at` timestamp nullable
- `created_at`, `updated_at`

Indexes:
- `(team_id, provider, is_active)`

### `conversations`

- `id` uuid PK
- `team_id` uuid FK
- `messaging_channel_id` uuid FK
- `contact_id` uuid nullable FK
- `external_conversation_id` string nullable
- `external_participant_id` string
- `subject` string nullable
- `last_message_at` timestamp nullable
- `unread_count` unsigned int default 0
- `created_at`, `updated_at`

Indexes:
- `(team_id, messaging_channel_id)`
- `(external_participant_id)`

### `conversation_messages`

- `id` uuid PK
- `conversation_id` uuid FK
- `direction` string (`inbound`, `outbound`)
- `provider_message_id` string nullable
- `body` longText nullable
- `attachments` json nullable
- `status` string (`pending`, `sent`, `delivered`, `read`, `failed`)
- `error` text nullable
- `sent_at` timestamp nullable
- `received_at` timestamp nullable
- `created_at`, `updated_at`

Indexes:
- `(conversation_id, created_at)`
- `(provider_message_id)`

---

## 4. API Endpoints (Recommended)

### Channel management

- `GET /api/v1/messaging/channels`
- `POST /api/v1/messaging/channels`
- `PUT /api/v1/messaging/channels/{channel}`
- `DELETE /api/v1/messaging/channels/{channel}`
- `POST /api/v1/messaging/channels/{channel}/test`

### Conversations

- `GET /api/v1/messaging/conversations`
- `GET /api/v1/messaging/conversations/{conversation}`
- `POST /api/v1/messaging/conversations/{conversation}/messages`
- `POST /api/v1/messaging/conversations/{conversation}/read`

### Webhooks

- `GET /api/v1/messaging/webhooks/{provider}` (verification challenge)
- `POST /api/v1/messaging/webhooks/{provider}` (events)

Notes:
- Keep webhook routes outside Sanctum auth.
- Use provider signature verification and timestamp tolerance checks.

---

## 5. Security Requirements

1. Encrypt credentials at rest
- Use Eloquent `encrypted:array` casts for API tokens/secrets.

2. Verify webhook signatures
- Meta: `X-Hub-Signature-256`
- Telegram: validate secret token header and source

3. Idempotency
- Deduplicate by provider event/message id.
- Reject already processed webhook ids.

4. Least privilege
- Separate outbound send token from admin config token where provider supports it.

5. Redaction
- Never return plaintext secrets from API.
- Return masked placeholders in responses.

---

## 6. Workflow Integration

Add workflow action type:

- `send_messenger_message`

Action config:

- `channel_id`
- `template` or `message`
- `recipient_source` (`contact.phone`, `contact.custom_fields.telegram_id`, etc.)

Execution strategy:

1. Resolve recipient from trigger context.
2. Render template placeholders.
3. Persist outbound message as `pending`.
4. Dispatch job via adapter.
5. Persist provider response and status.

---

## 7. Frontend UX Recommendations

1. Integrations settings
- Add connect/test controls per provider.
- Show verification and health status.

2. Conversation inbox
- Unified list with provider badges.
- Conversation pane with message status indicators.

3. Contact timeline
- Include messenger events beside activities and emails.

4. Failures and retries
- Surface failed outbound messages and allow retry.

---

## 8. Implementation Plan

1. Create migrations/models for channels, conversations, messages.
2. Build provider interface + one adapter first (recommended: WhatsApp Cloud API).
3. Add channel CRUD + connection test endpoint.
4. Add webhook verification + ingestion with idempotency.
5. Add outbound send pipeline with queued delivery.
6. Add conversation read APIs and frontend inbox.
7. Add workflow action integration.
8. Add test coverage for signature validation, mapping, retries.

---

## 9. Testing Checklist

- Unit tests:
  - Signature verification
  - Payload normalization
  - Recipient normalization

- Feature tests:
  - Channel connect/test
  - Outbound send success/failure
  - Webhook ingestion idempotency
  - Conversation fetch and read

- Operational tests:
  - Queue retry behavior
  - Provider downtime handling
  - Alerting on webhook verification failures

---

## 10. Provider Notes

### WhatsApp (Meta Cloud API)

- Requires Meta app, phone number id, permanent token.
- Webhook verification challenge and signature validation required.
- Supports templates for business-initiated messages.

### Telegram Bot API

- Bot token based auth.
- Webhook secret token support for verification.
- Chat id is the recipient identifier.

### Facebook Messenger / Instagram DM (Meta)

- App review and permissions required.
- Webhooks include delivery/read receipts; map to message status transitions.

---

Use this guide as the implementation baseline; adapt endpoint naming and model fields to your domain conventions in `docs/02-ARCHITECTURE.md` and `docs/04-API-DESIGN.md`.