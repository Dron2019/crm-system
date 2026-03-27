<?php

namespace App\Services;

use App\Models\Webhook;
use App\Models\WebhookLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookDispatcher
{
    public function dispatch(string $event, Model $entity, ?string $teamId = null): void
    {
        $teamId ??= $entity->team_id ?? null;

        if (!$teamId) return;

        $webhooks = Webhook::where('team_id', $teamId)
            ->where('is_active', true)
            ->get()
            ->filter(fn (Webhook $w) => in_array($event, $w->events));

        foreach ($webhooks as $webhook) {
            $this->send($webhook, $event, $entity);
        }
    }

    protected function send(Webhook $webhook, string $event, Model $entity): void
    {
        $payload = [
            'event' => $event,
            'timestamp' => now()->toIso8601String(),
            'data' => $entity->toArray(),
        ];

        $signature = hash_hmac('sha256', json_encode($payload), $webhook->secret);

        $log = WebhookLog::create([
            'webhook_id' => $webhook->id,
            'event' => $event,
            'payload' => $payload,
            'status' => 'pending',
        ]);

        try {
            $startTime = microtime(true);

            $response = Http::timeout(10)
                ->withHeaders([
                    'X-Webhook-Signature' => $signature,
                    'X-Webhook-Event' => $event,
                    'Content-Type' => 'application/json',
                ])
                ->post($webhook->url, $payload);

            $durationMs = (int) ((microtime(true) - $startTime) * 1000);

            $log->update([
                'response_status' => $response->status(),
                'response_body' => mb_substr($response->body(), 0, 2000),
                'duration_ms' => $durationMs,
                'status' => $response->successful() ? 'success' : 'failed',
            ]);

            if ($response->successful()) {
                $webhook->update([
                    'last_triggered_at' => now(),
                    'failure_count' => 0,
                ]);
            } else {
                $webhook->increment('failure_count');

                // Auto-disable after 10 consecutive failures
                if ($webhook->failure_count >= 10) {
                    $webhook->update(['is_active' => false]);
                    Log::warning('Webhook auto-disabled due to failures', ['webhook_id' => $webhook->id]);
                }
            }
        } catch (\Throwable $e) {
            $log->update([
                'status' => 'failed',
                'response_body' => $e->getMessage(),
            ]);

            $webhook->increment('failure_count');

            Log::error('Webhook delivery failed', [
                'webhook_id' => $webhook->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
