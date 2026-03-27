<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Webhooks
        Schema::create('webhooks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->string('url', 2048);
            $table->json('events');
            $table->string('secret', 64);
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_triggered_at')->nullable();
            $table->unsignedInteger('failure_count')->default(0);
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->index(['team_id', 'is_active']);
        });

        Schema::create('webhook_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('webhook_id');
            $table->string('event');
            $table->json('payload');
            $table->unsignedSmallInteger('response_status')->nullable();
            $table->text('response_body')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->string('status', 20)->default('pending'); // pending, success, failed
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('webhook_id')->references('id')->on('webhooks')->cascadeOnDelete();
        });

        // MFA
        Schema::table('users', function (Blueprint $table) {
            $table->string('mfa_secret')->nullable()->after('password');
            $table->boolean('mfa_enabled')->default(false)->after('mfa_secret');
            $table->json('mfa_recovery_codes')->nullable()->after('mfa_enabled');
            $table->timestamp('mfa_confirmed_at')->nullable()->after('mfa_recovery_codes');
        });

        // Email integration
        Schema::create('email_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('user_id');
            $table->string('email');
            $table->string('name')->nullable();
            $table->string('provider')->default('imap'); // imap, gmail, outlook
            $table->json('imap_settings')->nullable();
            $table->json('smtp_settings')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['team_id', 'user_id']);
        });

        Schema::create('email_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('email_account_id');
            $table->string('message_id')->nullable()->index();
            $table->string('thread_id')->nullable()->index();
            $table->string('subject');
            $table->string('from_email');
            $table->string('from_name')->nullable();
            $table->json('to_recipients');
            $table->json('cc_recipients')->nullable();
            $table->json('bcc_recipients')->nullable();
            $table->longText('body_html')->nullable();
            $table->longText('body_text')->nullable();
            $table->string('direction', 10); // inbound, outbound
            $table->string('status', 20)->default('received'); // received, sent, draft, failed
            $table->boolean('is_read')->default(false);
            $table->boolean('is_starred')->default(false);
            $table->uuid('contact_id')->nullable();
            $table->uuid('deal_id')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('email_account_id')->references('id')->on('email_accounts')->cascadeOnDelete();
            $table->foreign('contact_id')->references('id')->on('contacts')->nullOnDelete();
            $table->foreign('deal_id')->references('id')->on('deals')->nullOnDelete();
            $table->index(['team_id', 'direction', 'is_read']);
        });

        Schema::create('email_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->string('name');
            $table->string('subject');
            $table->longText('body');
            $table->json('variables')->nullable();
            $table->boolean('is_shared')->default(false);
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        // Workflows
        Schema::create('workflows', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('trigger_type'); // contact.created, deal.stage_changed, etc.
            $table->json('trigger_conditions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('execution_count')->default(0);
            $table->timestamp('last_executed_at')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['team_id', 'is_active', 'trigger_type']);
        });

        Schema::create('workflow_actions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workflow_id');
            $table->string('type'); // send_email, update_field, create_activity, send_notification, wait, webhook
            $table->json('config');
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->foreign('workflow_id')->references('id')->on('workflows')->cascadeOnDelete();
            $table->index(['workflow_id', 'order']);
        });

        Schema::create('workflow_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workflow_id');
            $table->uuid('trigger_entity_id')->nullable();
            $table->string('trigger_entity_type')->nullable();
            $table->string('status', 20)->default('running'); // running, completed, failed
            $table->json('action_results')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->foreign('workflow_id')->references('id')->on('workflows')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_logs');
        Schema::dropIfExists('workflow_actions');
        Schema::dropIfExists('workflows');
        Schema::dropIfExists('email_templates');
        Schema::dropIfExists('email_messages');
        Schema::dropIfExists('email_accounts');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['mfa_secret', 'mfa_enabled', 'mfa_recovery_codes', 'mfa_confirmed_at']);
        });

        Schema::dropIfExists('webhook_logs');
        Schema::dropIfExists('webhooks');
    }
};
