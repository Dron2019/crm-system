# CRM System — Security Guidelines

> Companion to [01-DEVELOPMENT-GUIDE.md](01-DEVELOPMENT-GUIDE.md)  
> OWASP Top 10 (2021) aligned

---

## Table of Contents

1. [Security Architecture Overview](#1-security-architecture-overview)
2. [Authentication](#2-authentication)
3. [Authorization (RBAC)](#3-authorization-rbac)
4. [OWASP Top 10 Mitigations](#4-owasp-top-10-mitigations)
5. [Data Protection & Encryption](#5-data-protection--encryption)
6. [API Security](#6-api-security)
7. [Infrastructure Security](#7-infrastructure-security)
8. [Compliance & Privacy](#8-compliance--privacy)
9. [Security Checklist](#9-security-checklist)
10. [Incident Response](#10-incident-response)

---

## 1. Security Architecture Overview

### Defense-in-Depth Layers

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1 — NETWORK / INFRASTRUCTURE                    │
│  Firewall, DDoS protection, private subnets,           │
│  TLS 1.3, WAF rules                                    │
├─────────────────────────────────────────────────────────┤
│  LAYER 2 — API GATEWAY / REVERSE PROXY                 │
│  Rate limiting, CORS, request size limits,             │
│  IP allowlists, header validation                      │
├─────────────────────────────────────────────────────────┤
│  LAYER 3 — APPLICATION                                 │
│  Authentication, authorization, input validation,      │
│  CSRF protection, output encoding, session mgmt        │
├─────────────────────────────────────────────────────────┤
│  LAYER 4 — DATA                                        │
│  Encryption at rest (AES-256), encrypted columns,      │
│  team-scoped queries, row-level security               │
├─────────────────────────────────────────────────────────┤
│  LAYER 5 — MONITORING & RESPONSE                       │
│  Audit logging, intrusion detection, alerting,         │
│  automated blocking                                    │
└─────────────────────────────────────────────────────────┘
```

### Security Principles

1. **Least Privilege** — Users and services get minimum required permissions
2. **Defense in Depth** — Multiple independent security layers
3. **Fail Secure** — Errors default to denying access
4. **Zero Trust** — Verify every request, don't trust internal traffic implicitly
5. **Separation of Concerns** — Auth, business logic, and data access are isolated

---

## 2. Authentication

### Strategy: Laravel Sanctum (Dual Mode)

| Client Type | Auth Method | Token Storage |
|---|---|---|
| SPA (React app) | Cookie-based session | HttpOnly secure cookie |
| Mobile / Third-party API | Bearer token | Database (hashed) |

### SPA Authentication Flow

```
1. POST /login          — Validate credentials, create session
2. GET  /api/user       — Return authenticated user (cookie sent automatically)
3. POST /logout         — Destroy session, clear cookie
```

### Implementation Requirements

```php
// config/sanctum.php
'stateful' => [
    'localhost:5173',          // Development
    'app.yourcrm.com',        // Production
],

// config/cors.php
'supports_credentials' => true,

// config/session.php
'same_site' => 'lax',
'secure' => true,             // HTTPS only in production
'http_only' => true,          // Not accessible via JavaScript
```

### Password Policy

```php
// Validation rules for password
use Illuminate\Validation\Rules\Password;

Password::min(10)
    ->mixedCase()
    ->numbers()
    ->symbols()
    ->uncompromised();          // Checks against Have I Been Pwned API
```

| Policy | Requirement |
|---|---|
| Minimum length | 10 characters |
| Complexity | Upper + lower + digit + symbol |
| Breach check | Checked against HIBP database |
| Hashing | bcrypt (cost 12) or Argon2id |
| Rate limit on login | 5 attempts / minute per IP+email |
| Session timeout | Configurable (default: 8 hours of inactivity) |
| Token expiry (API) | Configurable per token, max 1 year |

### Multi-Factor Authentication (MFA)

```
Phase 1:  TOTP (Google Authenticator, Authy)
Phase 2:  WebAuthn / Passkeys (hardware keys)
Phase 3:  SMS fallback (optional, less secure)
```

```php
// MFA enforcement flow
1. User logs in with email + password
2. If MFA enabled → redirect to MFA challenge
3. Verify TOTP code → create session
4. Admins can enforce MFA for all team members
```

### Session Security

- Sessions stored in Redis (not filesystem)
- Session ID regenerated on login (`session()->regenerate()`)
- CSRF token on every state-changing request
- Concurrent session limit (optional: max 3 devices)
- Session revocation from settings page

---

## 3. Authorization (RBAC)

### Permission Model

```
Team
 └── Members
       └── Roles (1 per team member)
             └── Permissions (array of permission strings)
```

### Default Roles

| Role | Description | Key Permissions |
|---|---|---|
| **Owner** | Team creator, full access | `*` (all permissions) |
| **Admin** | Manage team settings, members | Everything except delete team, transfer ownership |
| **Manager** | View all data, manage assignments | View all contacts/deals, reassign, reports |
| **Member** | Standard CRM user | CRUD own contacts/deals, view shared data |
| **Viewer** | Read-only access | View contacts/deals/reports, no modifications |

### Permission Strings

```
contacts.view
contacts.view_all          — view all contacts (not just owned)
contacts.create
contacts.update
contacts.update_all
contacts.delete
contacts.delete_all
contacts.export
contacts.import

deals.view
deals.view_all
deals.create
deals.update
deals.update_all
deals.delete
deals.delete_all

activities.view
activities.create
activities.update
activities.delete

reports.view
reports.create
reports.manage

workflows.view
workflows.create
workflows.manage

settings.view
settings.manage
settings.members.manage
settings.roles.manage
settings.billing.manage

integrations.view
integrations.manage

ai.use                     — access AI features
```

### Laravel Policy Implementation

```php
// app/Domain/Contact/Policies/ContactPolicy.php
class ContactPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('contacts.view');
    }

    public function view(User $user, Contact $contact): bool
    {
        if (!$user->hasPermission('contacts.view')) return false;
        
        // Owner can always view their own
        if ($contact->owner_id === $user->id) return true;
        
        // "view_all" allows viewing any team contact
        return $user->hasPermission('contacts.view_all');
    }

    public function update(User $user, Contact $contact): bool
    {
        if ($contact->owner_id === $user->id) {
            return $user->hasPermission('contacts.update');
        }
        return $user->hasPermission('contacts.update_all');
    }

    public function delete(User $user, Contact $contact): bool
    {
        if ($contact->owner_id === $user->id) {
            return $user->hasPermission('contacts.delete');
        }
        return $user->hasPermission('contacts.delete_all');
    }
}
```

### Middleware Stack

```php
// routes/api.php
Route::middleware(['auth:sanctum', 'verified', 'team.context'])->group(function () {
    Route::apiResource('contacts', ContactController::class);
    // ...
});

// Custom middleware
'team.context'   → Ensure user has an active team selected
'permission:X'   → Check specific permission
'throttle:api'   → Rate limiting
```

---

## 4. OWASP Top 10 Mitigations

### A01: Broken Access Control

| Attack | Mitigation |
|---|---|
| IDOR (accessing other team's data) | `BelongsToTeam` global scope on all models |
| Privilege escalation | Policy checks on every controller action |
| Direct object reference | UUID primary keys (non-sequential) |
| Missing access control | `$this->authorize()` in every controller method |
| Force browsing | Only API routes exposed; no admin panels without auth |

```php
// Every controller action MUST authorize
public function show(Contact $contact): ContactResource
{
    $this->authorize('view', $contact);  // Throws 403 if denied
    return new ContactResource($contact);
}
```

### A02: Cryptographic Failures

| Requirement | Implementation |
|---|---|
| Passwords | bcrypt (cost 12) or Argon2id |
| API tokens | SHA-256 hashed before storage |
| Sensitive columns (email credentials) | `encrypted` cast in Laravel models |
| Data in transit | TLS 1.3 enforced |
| Data at rest | PostgreSQL with encrypted tablespace / disk encryption |
| Webhook secrets | HMAC-SHA256 signing |
| Invitation tokens | `Str::random(64)` — cryptographically secure |

```php
// Model attribute encryption
class EmailAccount extends Model
{
    protected $casts = [
        'credentials' => 'encrypted:array',
    ];
}
```

### A03: Injection

| Attack Vector | Mitigation |
|---|---|
| SQL Injection | Eloquent ORM (parameterized queries), never raw user input |
| XSS (stored) | All output escaped via API Resources; HTML sanitized with HTMLPurifier |
| XSS (reflected) | React auto-escapes; CSP headers |
| Command Injection | Never use `shell_exec()` / `exec()` with user input |
| LDAP Injection | N/A (no LDAP) |
| NoSQL Injection | N/A (PostgreSQL only) |

```php
// NEVER do this:
DB::select("SELECT * FROM contacts WHERE email = '{$request->email}'");

// ALWAYS do this:
Contact::where('email', $request->email)->first();
// or
DB::select("SELECT * FROM contacts WHERE email = ?", [$request->email]);
```

### A04: Insecure Design

| Principle | Implementation |
|---|---|
| Threat modeling | Document threat model per feature before building |
| Rate limiting | Per-endpoint throttling (Laravel RateLimiter) |
| Business logic abuse prevention | Server-side validation for all state transitions |
| Account enumeration prevention | Same response for valid/invalid login attempts |
| Separation of duties | Different roles for admin, manager, member |

### A05: Security Misconfiguration

```php
// .env (production)
APP_DEBUG=false
APP_ENV=production
LOG_LEVEL=warning

// Remove X-Powered-By, Server headers
// Disable directory listing
// Set proper CORS origins (not *)
```

| Check | Configuration |
|---|---|
| Debug mode | `APP_DEBUG=false` in production |
| Error details | Generic error messages to users; detailed logs server-side |
| Default credentials | No default admin accounts; force setup on first run |
| Unnecessary features | Telescope disabled in production |
| Security headers | Helmet-style headers via middleware |

### A06: Vulnerable & Outdated Components

```bash
# Regular dependency auditing
composer audit                    # PHP vulnerabilities
npm audit                        # JavaScript vulnerabilities

# Automated via CI
# .github/workflows/security.yml
- name: Check PHP dependencies
  run: composer audit --format=json

- name: Check JS dependencies
  run: npm audit --audit-level=moderate
```

- Dependabot or Renovate for automated dependency updates
- Monthly manual audit of critical dependencies

### A07: Identification & Authentication Failures

| Vulnerability | Protection |
|---|---|
| Credential stuffing | Rate limiting + HIBP password check |
| Brute force | Progressive delays, account lockout after 10 failures |
| Session fixation | `session()->regenerate()` on login |
| Weak passwords | Password complexity rules enforced |
| Missing MFA | MFA available, admin can enforce for team |

### A08: Software & Data Integrity Failures

| Risk | Mitigation |
|---|---|
| CI/CD pipeline compromise | Signed commits, protected branches, required reviews |
| Dependency tampering | Lock files committed (`composer.lock`, `package-lock.json`) |
| Unsafe deserialization | Never unserialize user input; use JSON |
| Update integrity | Verify package checksums |

### A09: Security Logging & Monitoring Failures

```php
// What to log
- All authentication attempts (success + failure)
- Authorization failures (403s)
- Input validation failures (422s)
- Data exports
- Admin actions (role changes, member management)
- API token creation/revocation
- Password changes
- MFA enable/disable
- Data deletion events

// Audit log entry structure
AuditLog::create([
    'team_id'          => $teamId,
    'user_id'          => $userId,
    'action'           => 'deleted',
    'auditable_type'   => 'contact',
    'auditable_id'     => $contactId,
    'old_values'       => $oldValues,
    'new_values'       => null,
    'ip_address'       => $request->ip(),
    'user_agent'       => $request->userAgent(),
]);
```

### A10: Server-Side Request Forgery (SSRF)

| Vector | Protection |
|---|---|
| Webhook URLs | Validate against SSRF: block private IPs, localhost, metadata endpoints |
| Email account connections | Allowlist IMAP/SMTP ports, validate hostnames |
| URL previews | Sanitize and validate URLs, use allowlists |
| File imports (URL-based) | Block internal network ranges |

```php
// Webhook URL validation
class WebhookUrlRule implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $parsed = parse_url($value);
        
        if (!in_array($parsed['scheme'] ?? '', ['https'], true)) {
            $fail('Webhook URL must use HTTPS.');
            return;
        }

        $ip = gethostbyname($parsed['host'] ?? '');
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            $fail('Webhook URL must not point to a private or reserved IP.');
        }
    }
}
```

---

## 5. Data Protection & Encryption

### Encryption Strategy

| Data | At Rest | In Transit | Method |
|---|---|---|---|
| Database | Disk encryption (LUKS/EBS) | TLS 1.3 to PostgreSQL | AES-256 |
| Sensitive columns | Laravel `encrypted` cast | TLS | AES-256-GCM |
| File attachments | S3 server-side encryption | HTTPS | AES-256 (SSE-S3) |
| Redis | Optional (if contains PII) | TLS | — |
| Backups | Encrypted before transfer | TLS | AES-256 + GPG |

### Encrypted Model Attributes

```php
// Fields that MUST be encrypted:
- EmailAccount::credentials       (IMAP/SMTP passwords)
- Webhook::secret                 (signing secret)
- OAuthClient::client_secret
- User::two_factor_secret        (TOTP seed)
- User::two_factor_recovery_codes
```

### Data Retention

| Data Type | Retention | Action |
|---|---|---|
| Active CRM data | Unlimited (while subscribed) | — |
| Audit logs | 2 years | Archive to cold storage |
| Webhook delivery logs | 30 days | Auto-delete |
| AI interaction logs | 90 days | Auto-delete |
| Deleted records (soft) | 30 days | Permanent delete |
| Session data | Until expiry | Auto-purge |
| File attachments | Until user deletes | Soft delete + 30 day purge |

### Backup Strategy

```
Daily:   Full PostgreSQL backup (pg_dump, encrypted, stored in separate region)
Hourly:  WAL archiving for point-in-time recovery
Weekly:  Backup verification (restore test to staging)
```

---

## 6. API Security

### Rate Limiting

```php
// app/Providers/AppServiceProvider.php
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});

RateLimiter::for('auth', function (Request $request) {
    return Limit::perMinute(5)->by($request->input('email') . '|' . $request->ip());
});

RateLimiter::for('export', function (Request $request) {
    return Limit::perHour(10)->by($request->user()->id);
});

RateLimiter::for('ai', function (Request $request) {
    return Limit::perMinute(20)->by($request->user()->id);
});
```

### Request Validation

```php
// Every request MUST be validated via Form Request
class StoreContactRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'first_name'  => ['required', 'string', 'max:255'],
            'last_name'   => ['nullable', 'string', 'max:255'],
            'email'       => ['nullable', 'email:rfc,dns', 'max:255'],
            'phone'       => ['nullable', 'string', 'max:50', 'regex:/^[\d\s\+\-\(\)\.]+$/'],
            'source'      => ['nullable', 'string', Rule::in(ContactSource::values())],
            'custom_fields' => ['nullable', 'array'],
            // Custom field values are validated dynamically against definitions
        ];
    }
}
```

### Security Headers

```php
// Middleware: SecurityHeaders
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '0');  // CSP supersedes this
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        $response->headers->set('Content-Security-Policy', implode('; ', [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",  // Required for MUI
            "img-src 'self' data: https:",
            "connect-src 'self' wss:",
            "font-src 'self'",
            "frame-ancestors 'none'",
        ]));
        
        // Remove revealing headers
        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');
        
        return $response;
    }
}
```

### Webhook Security (Outbound)

```php
// Sign webhook payloads with HMAC-SHA256
class WebhookDispatcher
{
    public function dispatch(Webhook $webhook, string $event, array $data): void
    {
        $payload = json_encode([
            'id' => Str::uuid(),
            'type' => $event,
            'data' => $data,
            'occurred_at' => now()->toIso8601String(),
        ]);

        $signature = hash_hmac('sha256', $payload, $webhook->secret);

        Http::timeout(10)
            ->withHeaders([
                'Content-Type' => 'application/json',
                'X-Webhook-Signature' => $signature,
                'X-Webhook-ID' => $webhook->id,
            ])
            ->post($webhook->url, json_decode($payload, true));
    }
}
```

---

## 7. Infrastructure Security

### Docker Security

```dockerfile
# Run as non-root user
RUN addgroup -g 1000 -S app && adduser -u 1000 -S app -G app
USER app

# Read-only filesystem where possible
# No SSH access in containers
# Minimal base images (Alpine)
# No secrets in Dockerfile or image layers
```

### Network Architecture

```
Internet
    │
    ▼
┌─────────────────┐
│ Load Balancer    │  ← TLS termination, DDoS protection
│ (Cloudflare/ALB) │
└────────┬────────┘
         │
    ┌────▼────┐
    │   DMZ   │     ← Caddy/Nginx (public subnet)
    └────┬────┘
         │
    ┌────▼─────────────────────────┐
    │      PRIVATE SUBNET          │
    │  ┌─────┐ ┌─────┐ ┌────────┐ │
    │  │ App │ │Queue│ │Reverb  │ │
    │  │ PHP │ │Workr│ │WebSock │ │
    │  └──┬──┘ └──┬──┘ └───┬────┘ │
    │     │       │         │      │
    │  ┌──▼───────▼─────────▼──┐   │
    │  │   DATA SUBNET          │   │
    │  │ PostgreSQL  Redis     │   │
    │  │ Meilisearch MinIO     │   │
    │  └────────────────────────┘   │
    └──────────────────────────────┘
```

### Environment Variables

```bash
# NEVER commit these to version control
APP_KEY=                    # Laravel encryption key
DB_PASSWORD=                # Database password
REDIS_PASSWORD=             # Redis password
MAIL_PASSWORD=              # SMTP password
AWS_SECRET_ACCESS_KEY=      # S3 credentials
OPENAI_API_KEY=             # AI service key
MEILISEARCH_KEY=            # Search admin key
SENTRY_DSN=                 # Error reporting

# Use secret management:
# - Docker Secrets
# - AWS Secrets Manager / SSM Parameter Store
# - HashiCorp Vault
# - Doppler / Infisical
```

---

## 8. Compliance & Privacy

### GDPR Compliance

| Requirement | Implementation |
|---|---|
| Right to access | Data export endpoint (`GET /api/v1/me/data-export`) |
| Right to erasure | Account deletion + cascade data cleanup |
| Right to portability | Export all user data in JSON/CSV |
| Consent management | Consent tracking table, opt-in workflows |
| Data minimization | Only collect required fields |
| Breach notification | Incident response plan, 72-hour notification |
| DPO designation | Document in privacy policy |

### Data Export for GDPR

```php
class DataExportAction
{
    public function execute(User $user): string
    {
        $data = [
            'user' => $user->only(['name', 'email', 'timezone', 'locale', 'created_at']),
            'contacts' => $user->ownedContacts()->get()->toArray(),
            'deals' => $user->ownedDeals()->get()->toArray(),
            'activities' => $user->activities()->get()->toArray(),
            'notes' => $user->notes()->get()->toArray(),
        ];

        // Generate encrypted ZIP, store temporarily, email download link
        return ExportService::createEncryptedArchive($data, $user);
    }
}
```

### Account Deletion

```php
class DeleteAccountAction
{
    public function execute(User $user): void
    {
        // 1. Reassign or anonymize owned records
        Contact::where('owner_id', $user->id)->update(['owner_id' => null]);
        Deal::where('owner_id', $user->id)->update(['owner_id' => null]);
        
        // 2. Anonymize audit logs (keep for compliance, remove PII)
        AuditLog::where('user_id', $user->id)->update([
            'user_id' => null,
            // IP and user-agent are kept for security audit purposes
        ]);
        
        // 3. Delete user data
        $user->notes()->delete();
        $user->emailAccounts()->delete();
        $user->teamMemberships()->delete();
        
        // 4. Soft delete user (hard delete after 30 days)
        $user->delete();
        
        // 5. Dispatch cleanup job
        CleanupUserDataJob::dispatch($user->id)->delay(now()->addDays(30));
    }
}
```

---

## 9. Security Checklist

### Pre-Launch

- [ ] All passwords hashed with bcrypt/Argon2id
- [ ] HTTPS enforced everywhere (HSTS header)
- [ ] CSRF protection enabled for all state-changing routes
- [ ] Rate limiting on auth, API, and export endpoints
- [ ] Input validation on every endpoint (Form Requests)
- [ ] Output encoding in all API responses
- [ ] SQL injection prevention verified (no raw queries with user input)
- [ ] XSS prevention verified (no `{!! !!}` with user input, React escaping)
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] Sensitive data encrypted at rest
- [ ] API tokens hashed before storage
- [ ] File upload validation (MIME type, size, extension)
- [ ] File uploads stored outside webroot (S3/MinIO)
- [ ] No sensitive data in URL parameters or logs
- [ ] Error messages don't leak implementation details
- [ ] `APP_DEBUG=false` in production
- [ ] Default credentials removed
- [ ] Dependency audit passing (`composer audit`, `npm audit`)
- [ ] Audit logging operational
- [ ] Backup system tested

### Ongoing

- [ ] Monthly dependency updates & audit
- [ ] Quarterly penetration testing
- [ ] Annual security review of architecture
- [ ] Monitor CVE databases for used packages
- [ ] Review access logs for anomalies
- [ ] Test backup restoration quarterly
- [ ] Update threat model when adding features

---

## 10. Incident Response

### Severity Levels

| Level | Description | Response Time | Example |
|---|---|---|---|
| **P1 — Critical** | Active data breach, total service outage | < 1 hour | Database compromised |
| **P2 — High** | Security vulnerability exploited, partial outage | < 4 hours | Auth bypass discovered |
| **P3 — Medium** | Potential vulnerability, degraded service | < 24 hours | Dependency CVE published |
| **P4 — Low** | Minor security improvement, hardening | < 1 week | Header misconfiguration |

### Response Playbook

```
1. IDENTIFY    — Detect the incident (monitoring, user report, audit log)
2. CONTAIN     — Limit the blast radius (revoke tokens, block IPs, disable feature)
3. ERADICATE   — Fix the root cause (patch, deploy)
4. RECOVER     — Restore normal operations (verify, monitor)
5. REVIEW      — Post-mortem, update procedures, notify affected users
```

### Breach Notification Template

```
Subject: Security Incident Notification — [CRM Name]

We are writing to inform you of a security incident that occurred on [date].

What happened: [Brief description]
What data was affected: [Types of data]
What we've done: [Remediation steps]
What you should do: [User actions — change password, review access, etc.]

We take the security of your data seriously and are committed to transparency.
For questions, contact: security@yourcrm.com
```

---

*Next: [04-API-DESIGN.md](04-API-DESIGN.md) — API conventions, versioning, error handling*
