<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\EmailAccount;
use App\Models\EmailMessage;
use App\Models\EmailTemplate;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email as SymfonyEmail;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\Transport;

class EmailController extends Controller
{
    // REST index used by both /emails/accounts and /emails/templates
    public function index(Request $request): JsonResponse
    {
        if ($request->routeIs('email-templates.*')) {
            return $this->templatesIndex($request);
        }

        $accounts = EmailAccount::where('team_id', $request->user()->current_team_id)
            ->where('user_id', $request->user()->id)
            ->get();

        return response()->json([
            'data' => $accounts->map(fn (EmailAccount $account) => $this->sanitizeAccount($account))->values(),
        ]);
    }

    // REST store used by both /emails/accounts and /emails/templates
    public function store(Request $request): JsonResponse
    {
        if ($request->routeIs('email-templates.*')) {
            return $this->storeTemplate($request);
        }

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'provider' => ['required', 'string', 'in:imap,gmail,outlook'],
            'imap_settings' => ['required_if:provider,imap', 'nullable', 'array'],
            'imap_settings.host' => ['required_with:imap_settings', 'string'],
            'imap_settings.port' => ['required_with:imap_settings', 'integer'],
            'imap_settings.username' => ['required_with:imap_settings', 'string'],
            'imap_settings.password' => ['required_with:imap_settings', 'string'],
            'imap_settings.encryption' => ['nullable', 'string', 'in:ssl,tls'],
            'smtp_settings' => ['required_if:provider,imap', 'nullable', 'array'],
            'smtp_settings.host' => ['required_with:smtp_settings', 'string'],
            'smtp_settings.port' => ['required_with:smtp_settings', 'integer'],
            'smtp_settings.username' => ['required_with:smtp_settings', 'string'],
            'smtp_settings.password' => ['required_with:smtp_settings', 'string'],
            'smtp_settings.encryption' => ['nullable', 'string', 'in:ssl,tls,starttls,none'],
            'is_active' => ['sometimes', 'boolean'],
            'test_connection' => ['sometimes', 'boolean'],
        ]);

        $imapSettings = $this->normalizeImapSettings(
            $validated['provider'],
            $validated['imap_settings'] ?? null,
            $validated['email']
        );

        $smtpSettings = $this->normalizeSmtpSettings(
            $validated['provider'],
            $validated['smtp_settings'] ?? null,
            $validated['email']
        );

        if (($validated['test_connection'] ?? false) === true) {
            $testAccount = new EmailAccount([
                'email' => $validated['email'],
                'name' => $validated['name'] ?? null,
                'provider' => $validated['provider'],
                'imap_settings' => $imapSettings,
                'smtp_settings' => $smtpSettings,
            ]);

            $tests = [
                'smtp' => $this->testSmtpConnection($testAccount),
                'imap' => $this->testImapConnection($testAccount),
            ];

            if (!$tests['smtp']['ok'] || !$tests['imap']['ok']) {
                return response()->json([
                    'message' => 'Email account connection test failed.',
                    'tests' => $tests,
                ], 422);
            }
        }

        $account = EmailAccount::create([
            'email' => $validated['email'],
            'name' => $validated['name'] ?? null,
            'provider' => $validated['provider'],
            'imap_settings' => $imapSettings,
            'smtp_settings' => $smtpSettings,
            'is_active' => $validated['is_active'] ?? true,
            'team_id' => $request->user()->current_team_id,
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->sanitizeAccount($account)], 201);
    }

    // REST update used by both /emails/accounts/{account} and /emails/templates/{template}
    public function update(Request $request): JsonResponse
    {
        if ($request->routeIs('email-templates.*')) {
            return $this->updateTemplate($request);
        }

        $account = $this->resolveOwnedAccount($request, $request->route('account'));

        $validated = $request->validate([
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'imap_settings' => ['sometimes', 'array'],
            'imap_settings.host' => ['required_with:imap_settings', 'string'],
            'imap_settings.port' => ['required_with:imap_settings', 'integer'],
            'imap_settings.username' => ['required_with:imap_settings', 'string'],
            'imap_settings.password' => ['required_with:imap_settings', 'string'],
            'imap_settings.encryption' => ['nullable', 'string', 'in:ssl,tls,none'],
            'smtp_settings' => ['sometimes', 'array'],
            'smtp_settings.host' => ['required_with:smtp_settings', 'string'],
            'smtp_settings.port' => ['required_with:smtp_settings', 'integer'],
            'smtp_settings.username' => ['required_with:smtp_settings', 'string'],
            'smtp_settings.password' => ['required_with:smtp_settings', 'string'],
            'smtp_settings.encryption' => ['nullable', 'string', 'in:ssl,tls,starttls,none'],
        ]);

        if (array_key_exists('name', $validated)) {
            $account->name = $validated['name'];
        }

        if (array_key_exists('is_active', $validated)) {
            $account->is_active = (bool) $validated['is_active'];
        }

        if (array_key_exists('imap_settings', $validated)) {
            $account->imap_settings = $this->normalizeImapSettings(
                $account->provider,
                $validated['imap_settings'],
                $account->email
            );
        }

        if (array_key_exists('smtp_settings', $validated)) {
            $account->smtp_settings = $this->normalizeSmtpSettings(
                $account->provider,
                $validated['smtp_settings'],
                $account->email
            );
        }

        $account->save();

        return response()->json(['data' => $this->sanitizeAccount($account)]);
    }

    // REST destroy used by both /emails/accounts/{account} and /emails/templates/{template}
    public function destroy(Request $request): JsonResponse
    {
        if ($request->routeIs('email-templates.*')) {
            return $this->destroyTemplate($request);
        }

        $account = $this->resolveOwnedAccount($request, $request->route('account'));
        $account->delete();

        return response()->json(null, 204);
    }

    public function testAccount(Request $request): JsonResponse
    {
        $account = $this->resolveOwnedAccount($request, $request->route('account'));

        $tests = [
            'smtp' => $this->testSmtpConnection($account),
            'imap' => $this->testImapConnection($account),
        ];

        $statusCode = ($tests['smtp']['ok'] && $tests['imap']['ok']) ? 200 : 422;

        return response()->json([
            'data' => [
                'account_id' => $account->id,
                'tests' => $tests,
            ],
        ], $statusCode);
    }

    public function syncAccount(Request $request): JsonResponse
    {
        $account = $this->resolveOwnedAccount($request, $request->route('account'));

        if (!$account->is_active) {
            return response()->json(['message' => 'Email account is inactive.'], 422);
        }

        if ($account->provider !== 'imap') {
            return response()->json(['message' => 'Sync is only available for IMAP accounts.'], 422);
        }

        if (!function_exists('imap_open')) {
            return response()->json([
                'message' => 'IMAP extension is not installed on the server. Install php-imap to enable inbox sync.',
            ], 422);
        }

        $limit = min(max((int) $request->input('limit', 25), 1), 100);
        $result = $this->syncInboundMessages($account, $limit);

        return response()->json([
            'data' => [
                'account_id' => $account->id,
                ...$result,
            ],
        ]);
    }

    // -- Messages --

    public function messages(Request $request): JsonResponse
    {
        $query = EmailMessage::where('team_id', $request->user()->current_team_id)
            ->with(['contact:id,first_name,last_name,email']);

        if ($request->filled('direction')) {
            $query->where('direction', $request->input('direction'));
        }

        if ($request->filled('is_read')) {
            $query->where('is_read', $request->boolean('is_read'));
        }

        if ($request->filled('is_starred')) {
            $query->where('is_starred', true);
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'LIKE', "%{$search}%")
                  ->orWhere('from_email', 'LIKE', "%{$search}%")
                  ->orWhere('body_text', 'LIKE', "%{$search}%");
            });
        }

        $messages = $query->orderBy('sent_at', 'desc')
            ->paginate($request->integer('per_page', 25));

        return response()->json($messages);
    }

    public function showMessage(EmailMessage $emailMessage): JsonResponse
    {
        if (!$this->isOwnedMessage($emailMessage, request())) {
            abort(404);
        }

        $emailMessage->load(['contact', 'deal', 'emailAccount:id,email,name']);

        if (!$emailMessage->is_read) {
            $emailMessage->update(['is_read' => true]);
        }

        return response()->json(['data' => $emailMessage]);
    }

    public function sendMessage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_account_id' => ['nullable', 'uuid', 'exists:email_accounts,id'],
            'to' => ['required', 'array', 'min:1'],
            'to.*' => ['required', 'email'],
            'cc' => ['nullable', 'array'],
            'cc.*' => ['email'],
            'bcc' => ['nullable', 'array'],
            'bcc.*' => ['email'],
            'subject' => ['required', 'string', 'max:998'],
            'body' => ['required', 'string'],
            'contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
            'deal_id' => ['nullable', 'uuid', 'exists:deals,id'],
        ]);

        $account = null;

        if (!empty($validated['email_account_id'])) {
            $account = $this->resolveOwnedAccount($request, $validated['email_account_id']);
        }

        if ($account === null) {
            $account = EmailAccount::where('team_id', $request->user()->current_team_id)
                ->where('user_id', $request->user()->id)
                ->where('is_active', true)
                ->orderByDesc('created_at')
                ->first();
        }

        if (!$account) {
            return response()->json([
                'message' => 'No active email account found. Connect an email account first.',
            ], 422);
        }

        if (empty($account->smtp_settings)) {
            return response()->json([
                'message' => 'SMTP settings are missing for the selected email account.',
            ], 422);
        }

        $message = EmailMessage::create([
            'team_id' => $request->user()->current_team_id,
            'email_account_id' => $account->id,
            'subject' => $validated['subject'],
            'from_email' => $account->email,
            'from_name' => $account->name ?? $request->user()->name,
            'to_recipients' => $validated['to'],
            'cc_recipients' => $validated['cc'] ?? [],
            'bcc_recipients' => $validated['bcc'] ?? [],
            'body_html' => $validated['body'],
            'body_text' => strip_tags($validated['body']),
            'direction' => 'outbound',
            'status' => 'draft',
            'is_read' => true,
            'contact_id' => $validated['contact_id'] ?? null,
            'deal_id' => $validated['deal_id'] ?? null,
            'sent_at' => now(),
        ]);

        try {
            $this->sendViaSmtp($account, $validated);
            $message->update(['status' => 'sent']);
        } catch (\Throwable $e) {
            $message->update(['status' => 'failed']);

            return response()->json([
                'message' => 'Failed to send email via SMTP.',
                'error' => $e->getMessage(),
            ], 422);
        }

        return response()->json(['data' => $message], 201);
    }

    public function starMessage(EmailMessage $emailMessage): JsonResponse
    {
        if (!$this->isOwnedMessage($emailMessage, request())) {
            abort(404);
        }

        $emailMessage->update(['is_starred' => !$emailMessage->is_starred]);

        return response()->json(['data' => $emailMessage]);
    }

    public function markRead(Request $request, EmailMessage $emailMessage): JsonResponse
    {
        if (!$this->isOwnedMessage($emailMessage, $request)) {
            abort(404);
        }

        $emailMessage->update(['is_read' => true]);

        return response()->json(['data' => $emailMessage]);
    }

    // -- Templates (shared through REST index/store/update/destroy) --

    private function templatesIndex(Request $request): JsonResponse
    {
        $templates = EmailTemplate::where('team_id', $request->user()->current_team_id)
            ->where(function ($q) use ($request) {
                $q->where('is_shared', true)
                  ->orWhere('created_by', $request->user()->id);
            })
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $templates]);
    }

    private function storeTemplate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:998'],
            'body' => ['required', 'string'],
            'variables' => ['nullable', 'array'],
            'is_shared' => ['nullable', 'boolean'],
        ]);

        $template = EmailTemplate::create([
            ...$validated,
            'team_id' => $request->user()->current_team_id,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $template], 201);
    }

    private function updateTemplate(Request $request): JsonResponse
    {
        $template = $this->resolveOwnedTemplate($request, $request->route('template'));

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'subject' => ['sometimes', 'string', 'max:998'],
            'body' => ['sometimes', 'string'],
            'variables' => ['nullable', 'array'],
            'is_shared' => ['nullable', 'boolean'],
        ]);

        $template->update($validated);

        return response()->json(['data' => $template]);
    }

    private function destroyTemplate(Request $request): JsonResponse
    {
        $template = $this->resolveOwnedTemplate($request, $request->route('template'));
        $template->delete();

        return response()->json(null, 204);
    }

    private function resolveOwnedAccount(Request $request, mixed $account): EmailAccount
    {
        $accountId = $this->resolveModelKey($account);

        $emailAccount = EmailAccount::where('id', $accountId)
            ->where('team_id', $request->user()->current_team_id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$emailAccount) {
            abort(404);
        }

        return $emailAccount;
    }

    private function resolveOwnedTemplate(Request $request, mixed $template): EmailTemplate
    {
        $templateId = $this->resolveModelKey($template);

        $emailTemplate = EmailTemplate::where('id', $templateId)
            ->where('team_id', $request->user()->current_team_id)
            ->where(function ($q) use ($request) {
                $q->where('created_by', $request->user()->id)
                  ->orWhere('is_shared', true);
            })
            ->first();

        if (!$emailTemplate) {
            abort(404);
        }

        return $emailTemplate;
    }

    private function resolveModelKey(mixed $value): string
    {
        if ($value instanceof Model) {
            return (string) $value->getKey();
        }

        return (string) $value;
    }

    private function isOwnedMessage(EmailMessage $message, Request $request): bool
    {
        return $message->team_id === $request->user()->current_team_id;
    }

    private function sanitizeAccount(EmailAccount $account): array
    {
        $data = $account->toArray();

        foreach (['imap_settings', 'smtp_settings'] as $field) {
            if (isset($data[$field]) && is_array($data[$field]) && array_key_exists('password', $data[$field])) {
                $data[$field]['password'] = '********';
            }
        }

        return $data;
    }

    private function normalizeImapSettings(string $provider, ?array $settings, string $email): ?array
    {
        if ($settings === null) {
            return $provider === 'imap' ? null : null;
        }

        $normalized = [
            'host' => $settings['host'] ?? null,
            'port' => isset($settings['port']) ? (int) $settings['port'] : null,
            'username' => $settings['username'] ?? $email,
            'password' => $settings['password'] ?? null,
            'encryption' => $settings['encryption'] ?? 'tls',
        ];

        if ($provider === 'gmail') {
            $normalized['host'] ??= 'imap.gmail.com';
            $normalized['port'] ??= 993;
            $normalized['encryption'] = $normalized['encryption'] === 'none' ? 'ssl' : $normalized['encryption'];
        }

        if ($provider === 'outlook') {
            $normalized['host'] ??= 'outlook.office365.com';
            $normalized['port'] ??= 993;
            $normalized['encryption'] = $normalized['encryption'] === 'none' ? 'ssl' : $normalized['encryption'];
        }

        return $normalized;
    }

    private function normalizeSmtpSettings(string $provider, ?array $settings, string $email): ?array
    {
        if ($settings === null) {
            return null;
        }

        $normalized = [
            'host' => $settings['host'] ?? null,
            'port' => isset($settings['port']) ? (int) $settings['port'] : null,
            'username' => $settings['username'] ?? $email,
            'password' => $settings['password'] ?? null,
            'encryption' => $settings['encryption'] ?? 'tls',
        ];

        if ($provider === 'gmail') {
            $normalized['host'] ??= 'smtp.gmail.com';
            $normalized['port'] ??= 587;
            $normalized['encryption'] = $normalized['encryption'] === 'none' ? 'starttls' : $normalized['encryption'];
        }

        if ($provider === 'outlook') {
            $normalized['host'] ??= 'smtp.office365.com';
            $normalized['port'] ??= 587;
            $normalized['encryption'] = $normalized['encryption'] === 'none' ? 'starttls' : $normalized['encryption'];
        }

        return $normalized;
    }

    private function testSmtpConnection(EmailAccount $account): array
    {
        $smtp = $account->smtp_settings ?? null;

        if (!is_array($smtp) || empty($smtp['host']) || empty($smtp['username']) || empty($smtp['password'])) {
            return [
                'ok' => false,
                'message' => 'SMTP settings are incomplete.',
            ];
        }

        try {
            $transport = Transport::fromDsn($this->smtpDsn($smtp));
            if (method_exists($transport, 'start')) {
                $transport->start();
            }

            return [
                'ok' => true,
                'message' => 'SMTP connection successful.',
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    private function testImapConnection(EmailAccount $account): array
    {
        $imap = $account->imap_settings ?? null;

        if (!is_array($imap) || empty($imap['host']) || empty($imap['username']) || empty($imap['password'])) {
            return [
                'ok' => false,
                'message' => 'IMAP settings are incomplete.',
            ];
        }

        if (!function_exists('imap_open')) {
            return [
                'ok' => false,
                'message' => 'IMAP extension is not installed on the server.',
            ];
        }

        $mailbox = $this->imapMailbox($imap);

        $stream = @imap_open($mailbox, (string) $imap['username'], (string) $imap['password'], OP_READONLY, 1);

        if ($stream === false) {
            return [
                'ok' => false,
                'message' => imap_last_error() ?: 'Unable to connect to IMAP server.',
            ];
        }

        imap_close($stream);

        return [
            'ok' => true,
            'message' => 'IMAP connection successful.',
        ];
    }

    private function sendViaSmtp(EmailAccount $account, array $validated): void
    {
        $smtp = $account->smtp_settings ?? null;
        if (!is_array($smtp)) {
            throw new \RuntimeException('SMTP settings are not configured.');
        }

        $transport = Transport::fromDsn($this->smtpDsn($smtp));
        $mailer = new Mailer($transport);

        $email = (new SymfonyEmail())
            ->from(new Address($account->email, $account->name ?? $account->email))
            ->subject($validated['subject'])
            ->html((string) $validated['body'])
            ->text(strip_tags((string) $validated['body']));

        foreach ($validated['to'] as $recipient) {
            $email->addTo($recipient);
        }

        foreach (($validated['cc'] ?? []) as $recipient) {
            $email->addCc($recipient);
        }

        foreach (($validated['bcc'] ?? []) as $recipient) {
            $email->addBcc($recipient);
        }

        $mailer->send($email);
    }

    private function smtpDsn(array $smtp): string
    {
        $encryption = strtolower((string) ($smtp['encryption'] ?? 'tls'));

        $scheme = match ($encryption) {
            'ssl' => 'smtps',
            default => 'smtp',
        };

        $options = [];
        if (in_array($encryption, ['tls', 'starttls'], true)) {
            $options[] = 'encryption=tls';
        }

        $query = empty($options) ? '' : '?' . implode('&', $options);

        return sprintf(
            '%s://%s:%s@%s:%d%s',
            $scheme,
            rawurlencode((string) $smtp['username']),
            rawurlencode((string) $smtp['password']),
            (string) $smtp['host'],
            (int) ($smtp['port'] ?? 587),
            $query,
        );
    }

    private function syncInboundMessages(EmailAccount $account, int $limit): array
    {
        $imap = $account->imap_settings ?? [];
        $stream = null;

        $imported = 0;
        $skipped = 0;

        try {
            $stream = @imap_open(
                $this->imapMailbox($imap),
                (string) ($imap['username'] ?? ''),
                (string) ($imap['password'] ?? ''),
                OP_READONLY,
                1
            );

            if ($stream === false) {
                throw new \RuntimeException(imap_last_error() ?: 'Unable to connect to IMAP server.');
            }

            $messageNumbers = imap_search($stream, 'ALL') ?: [];
            if (!is_array($messageNumbers)) {
                $messageNumbers = [];
            }

            rsort($messageNumbers);
            $messageNumbers = array_slice($messageNumbers, 0, $limit);

            foreach ($messageNumbers as $messageNo) {
                $overview = imap_fetch_overview($stream, (string) $messageNo, 0)[0] ?? null;
                if ($overview === null) {
                    $skipped++;
                    continue;
                }

                $messageId = trim((string) ($overview->message_id ?? ''));

                if ($messageId !== '') {
                    $exists = EmailMessage::where('email_account_id', $account->id)
                        ->where('message_id', $messageId)
                        ->exists();

                    if ($exists) {
                        $skipped++;
                        continue;
                    }
                }

                [$fromName, $fromEmail] = $this->parseAddress((string) ($overview->from ?? ''));
                $toRecipients = $this->parseAddressList((string) ($overview->to ?? ''));
                $subject = $this->decodeMimeHeader((string) ($overview->subject ?? '(No subject)'));
                $bodyRaw = (string) (imap_body($stream, (int) $messageNo) ?: '');

                $sentAt = null;
                if (!empty($overview->date)) {
                    try {
                        $sentAt = Carbon::parse((string) $overview->date);
                    } catch (\Throwable) {
                        $sentAt = now();
                    }
                }

                EmailMessage::create([
                    'team_id' => $account->team_id,
                    'email_account_id' => $account->id,
                    'message_id' => $messageId !== '' ? $messageId : null,
                    'thread_id' => null,
                    'subject' => $subject,
                    'from_email' => $fromEmail,
                    'from_name' => $fromName,
                    'to_recipients' => $toRecipients,
                    'cc_recipients' => [],
                    'bcc_recipients' => [],
                    'body_html' => null,
                    'body_text' => trim(strip_tags($bodyRaw)),
                    'direction' => 'inbound',
                    'status' => 'received',
                    'is_read' => isset($overview->seen),
                    'is_starred' => false,
                    'sent_at' => $sentAt,
                ]);

                $imported++;
            }

            $account->update(['last_synced_at' => now()]);

            return [
                'imported' => $imported,
                'skipped' => $skipped,
            ];
        } finally {
            if (is_resource($stream)) {
                imap_close($stream);
            }
        }
    }

    private function imapMailbox(array $imap): string
    {
        $host = (string) ($imap['host'] ?? 'localhost');
        $port = (int) ($imap['port'] ?? 993);
        $encryption = strtolower((string) ($imap['encryption'] ?? 'ssl'));

        $flags = '/imap';
        if ($encryption === 'ssl') {
            $flags .= '/ssl';
        } elseif ($encryption === 'tls') {
            $flags .= '/tls';
        } else {
            $flags .= '/notls';
        }

        return sprintf('{%s:%d%s}INBOX', $host, $port, $flags);
    }

    private function parseAddress(string $value): array
    {
        $value = trim($value);

        if (preg_match('/^(.*)<([^>]+)>$/', $value, $matches) === 1) {
            $name = trim(trim($matches[1]), '"');
            $email = trim($matches[2]);

            return [$name !== '' ? $name : null, $email];
        }

        return [null, $value];
    }

    private function parseAddressList(string $value): array
    {
        if (trim($value) === '') {
            return [];
        }

        $parts = array_map('trim', explode(',', $value));
        $emails = [];

        foreach ($parts as $part) {
            [, $email] = $this->parseAddress($part);
            if ($email !== '') {
                $emails[] = $email;
            }
        }

        return $emails;
    }

    private function decodeMimeHeader(string $value): string
    {
        if (function_exists('iconv_mime_decode')) {
            $decoded = @iconv_mime_decode($value, ICONV_MIME_DECODE_CONTINUE_ON_ERROR, 'UTF-8');
            if (is_string($decoded) && $decoded !== '') {
                return $decoded;
            }
        }

        return $value;
    }
}
