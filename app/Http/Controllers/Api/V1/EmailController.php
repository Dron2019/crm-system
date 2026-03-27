<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\EmailAccount;
use App\Models\EmailMessage;
use App\Models\EmailTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EmailController extends Controller
{
    // -- Accounts --

    public function accounts(Request $request): JsonResponse
    {
        $accounts = EmailAccount::where('team_id', $request->user()->current_team_id)
            ->where('user_id', $request->user()->id)
            ->get();

        return response()->json(['data' => $accounts]);
    }

    public function createAccount(Request $request): JsonResponse
    {
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
            'smtp_settings.encryption' => ['nullable', 'string', 'in:ssl,tls'],
        ]);

        $account = EmailAccount::create([
            ...$validated,
            'team_id' => $request->user()->current_team_id,
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $account], 201);
    }

    public function deleteAccount(EmailAccount $emailAccount): JsonResponse
    {
        $emailAccount->delete();

        return response()->json(null, 204);
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
        $emailMessage->load(['contact', 'deal', 'emailAccount:id,email,name']);

        if (!$emailMessage->is_read) {
            $emailMessage->update(['is_read' => true]);
        }

        return response()->json(['data' => $emailMessage]);
    }

    public function sendMessage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_account_id' => ['required', 'uuid', 'exists:email_accounts,id'],
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

        $account = EmailAccount::findOrFail($validated['email_account_id']);

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
            'status' => 'sent',
            'is_read' => true,
            'contact_id' => $validated['contact_id'] ?? null,
            'deal_id' => $validated['deal_id'] ?? null,
            'sent_at' => now(),
        ]);

        // TODO: Dispatch actual SMTP send job
        // dispatch(new SendEmailJob($message));

        return response()->json(['data' => $message], 201);
    }

    public function toggleStar(EmailMessage $emailMessage): JsonResponse
    {
        $emailMessage->update(['is_starred' => !$emailMessage->is_starred]);

        return response()->json(['data' => $emailMessage]);
    }

    public function markRead(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['uuid'],
        ]);

        EmailMessage::whereIn('id', $request->input('ids'))
            ->where('team_id', $request->user()->current_team_id)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'Messages marked as read.']);
    }

    // -- Templates --

    public function templates(Request $request): JsonResponse
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

    public function storeTemplate(Request $request): JsonResponse
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

    public function updateTemplate(Request $request, EmailTemplate $emailTemplate): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'subject' => ['sometimes', 'string', 'max:998'],
            'body' => ['sometimes', 'string'],
            'variables' => ['nullable', 'array'],
            'is_shared' => ['nullable', 'boolean'],
        ]);

        $emailTemplate->update($validated);

        return response()->json(['data' => $emailTemplate]);
    }

    public function destroyTemplate(EmailTemplate $emailTemplate): JsonResponse
    {
        $emailTemplate->delete();

        return response()->json(null, 204);
    }
}
