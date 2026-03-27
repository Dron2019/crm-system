<?php

use App\Http\Controllers\Api\V1\ActivityController;
use App\Http\Controllers\Api\V1\AttachmentController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\CompanyNestedController;
use App\Http\Controllers\Api\V1\ContactController;
use App\Http\Controllers\Api\V1\ContactImportExportController;
use App\Http\Controllers\Api\V1\ContactNestedController;
use App\Http\Controllers\Api\V1\DealImportExportController;
use App\Http\Controllers\Api\V1\CustomFieldController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DealActionController;
use App\Http\Controllers\Api\V1\DealController;
use App\Http\Controllers\Api\V1\NoteController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PipelineController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\SearchController;
use App\Http\Controllers\Api\V1\TagController;
use App\Http\Controllers\Api\V1\TeamMemberController;
use App\Http\Controllers\Api\V1\TeamRoleController;
use App\Http\Controllers\Api\V1\UserManagementController;
use App\Http\Controllers\Api\V1\WebhookController;
use App\Http\Controllers\Api\V1\MfaController;
use App\Http\Controllers\Api\V1\EmailController;
use App\Http\Controllers\Api\V1\WorkflowController;
use App\Http\Controllers\Api\V1\AiController;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/auth/invitation/{token}', [AuthController::class, 'acceptInvitation']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'user']);

    // MFA
    Route::prefix('auth/mfa')->group(function () {
        Route::get('/status', [MfaController::class, 'status']);
        Route::post('/enable', [MfaController::class, 'enable']);
        Route::post('/confirm', [MfaController::class, 'confirm']);
        Route::post('/disable', [MfaController::class, 'disable']);
        Route::post('/verify', [MfaController::class, 'verify']);
    });

    // Team-scoped routes
    Route::middleware('team.context')->group(function () {
        // Global search
        Route::get('search', SearchController::class);

        // Contacts
        Route::post('contacts/import', [ContactImportExportController::class, 'import']);
        Route::get('contacts/import-template', [ContactImportExportController::class, 'template']);
        Route::post('contacts/export', [ContactImportExportController::class, 'export']);
        Route::apiResource('contacts', ContactController::class);
        Route::get('contacts/{contact}/activities', [ContactNestedController::class, 'activities']);
        Route::get('contacts/{contact}/deals', [ContactNestedController::class, 'deals']);
        Route::get('contacts/{contact}/notes', [ContactNestedController::class, 'notes']);
        Route::get('contacts/{contact}/timeline', [ContactNestedController::class, 'timeline']);
        Route::post('contacts/{contact}/restore', [ContactNestedController::class, 'restore'])->withTrashed();

        // Companies
        Route::apiResource('companies', CompanyController::class);
        Route::get('companies/{company}/contacts', [CompanyNestedController::class, 'contacts']);
        Route::get('companies/{company}/deals', [CompanyNestedController::class, 'deals']);
        Route::get('companies/{company}/activities', [CompanyNestedController::class, 'activities']);
        Route::get('companies/{company}/notes', [CompanyNestedController::class, 'notes']);
        Route::get('companies/{company}/timeline', [CompanyNestedController::class, 'timeline']);

        // Deals
        Route::post('deals/import-preview', [DealImportExportController::class, 'preview'])->name('deals.import.preview');
        Route::post('deals/import-commit', [DealImportExportController::class, 'commit'])->name('deals.import.commit');
        Route::post('deals/import', [DealImportExportController::class, 'import']);
        Route::get('deals/import-template', [DealImportExportController::class, 'template']);
        Route::post('deals/reorder', [DealActionController::class, 'reorder']);
        Route::apiResource('deals', DealController::class);
        Route::post('deals/{deal}/move', [DealActionController::class, 'move']);
        Route::post('deals/{deal}/won', [DealActionController::class, 'won']);
        Route::post('deals/{deal}/lost', [DealActionController::class, 'lost']);
        Route::get('deals/{deal}/timeline', [DealActionController::class, 'timeline']);
        Route::get('deals/{deal}/activities', [DealActionController::class, 'activities']);
        Route::get('deals/{deal}/notes', [DealActionController::class, 'notes']);

        // Pipelines
        Route::apiResource('pipelines', PipelineController::class);

        // Activities
        Route::apiResource('activities', ActivityController::class);
        Route::post('activities/{activity}/complete', [ActivityController::class, 'complete']);

        // Notes
        Route::apiResource('notes', NoteController::class)->except(['show']);
        Route::post('notes/{note}/pin', [NoteController::class, 'pin']);

        // Tags
        Route::apiResource('tags', TagController::class)->except(['show']);

        // Audit logs (read-only)
        Route::get('audit-logs', [AuditLogController::class, 'index']);

        // Reports
        Route::prefix('reports')->group(function () {
            Route::get('overview', [ReportController::class, 'overview']);
            Route::get('pipeline', [ReportController::class, 'pipeline']);
            Route::get('activities', [ReportController::class, 'activities']);
            Route::get('revenue', [ReportController::class, 'revenue']);
        });

        // Custom fields
        Route::apiResource('custom-fields', CustomFieldController::class);

        // Team members & invitations
        Route::prefix('team')->group(function () {
            Route::get('members', [TeamMemberController::class, 'index']);
            Route::put('members/{user}/role', [TeamMemberController::class, 'updateRole']);
            Route::post('members/{user}/verify', [TeamMemberController::class, 'verify']);
            Route::post('members/{user}/deactivate', [TeamMemberController::class, 'deactivate']);
            Route::post('members/{user}/activate', [TeamMemberController::class, 'activate']);
            Route::delete('members/{user}', [TeamMemberController::class, 'remove']);
            Route::get('invitations', [TeamMemberController::class, 'pendingInvitations']);
            Route::post('invitations', [TeamMemberController::class, 'invite']);
            Route::delete('invitations/{invitation}', [TeamMemberController::class, 'cancelInvitation']);
            Route::get('roles', [TeamRoleController::class, 'index']);
            Route::post('roles', [TeamRoleController::class, 'store']);
            Route::put('roles/{teamRole}', [TeamRoleController::class, 'update']);
            Route::delete('roles/{teamRole}', [TeamRoleController::class, 'destroy']);
        });

        // Users Management (System-wide)
        Route::get('users', [UserManagementController::class, 'index']);
        Route::post('users/{user}/reset-password', [UserManagementController::class, 'resetPassword']);
        Route::post('users/{user}/deactivate', [UserManagementController::class, 'deactivate']);
        Route::post('users/{user}/activate', [UserManagementController::class, 'activate']);
        Route::put('users/{user}/role', [UserManagementController::class, 'updateRole']);
        Route::get('admin/teams', [UserManagementController::class, 'teams']);

        // Attachments
        Route::get('attachments', [AttachmentController::class, 'index']);
        Route::post('attachments', [AttachmentController::class, 'store']);
        Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download']);
        Route::delete('attachments/{attachment}', [AttachmentController::class, 'destroy']);

        // Notifications
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
            Route::post('/{notification}/read', [NotificationController::class, 'markAsRead']);
            Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
        });

        // Dashboards
        Route::apiResource('dashboards', DashboardController::class);
        Route::post('dashboards/{dashboard}/widgets', [DashboardController::class, 'addWidget']);
        Route::put('dashboards/{dashboard}/widgets/{widget}', [DashboardController::class, 'updateWidget']);
        Route::delete('dashboards/{dashboard}/widgets/{widget}', [DashboardController::class, 'removeWidget']);

        // Webhooks
        Route::apiResource('webhooks', WebhookController::class);

        // Emails
        Route::prefix('emails')->group(function () {
            Route::apiResource('accounts', EmailController::class)->only(['index', 'store', 'update', 'destroy']);
            Route::post('accounts/{account}/test', [EmailController::class, 'testAccount']);
            Route::post('accounts/{account}/sync', [EmailController::class, 'syncAccount']);
            Route::get('messages', [EmailController::class, 'messages']);
            Route::get('messages/{emailMessage}', [EmailController::class, 'showMessage']);
            Route::post('messages', [EmailController::class, 'sendMessage']);
            Route::post('messages/{emailMessage}/star', [EmailController::class, 'starMessage']);
            Route::post('messages/{emailMessage}/read', [EmailController::class, 'markRead']);
            Route::apiResource('templates', EmailController::class)->only(['index', 'store', 'update', 'destroy'])->names('email-templates');
        });

        // Workflows
        Route::apiResource('workflows', WorkflowController::class);

        // AI features
        Route::prefix('ai')->group(function () {
            Route::get('contacts/{contact}/score', [AiController::class, 'scoreContact']);
            Route::post('contacts/{contact}/draft-email', [AiController::class, 'draftEmail']);
            Route::get('contacts/{contact}/suggestions', [AiController::class, 'suggestActions']);
            Route::get('deals/{deal}/summary', [AiController::class, 'summarizeDeal']);
        });
    });
});
