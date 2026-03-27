<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('last_login_at');
            $table->string('deactivation_reason')->nullable()->after('is_active');
            $table->uuid('deactivated_by')->nullable()->after('deactivation_reason');
            $table->timestamp('deactivated_at')->nullable()->after('deactivated_by');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_active', 'deactivation_reason', 'deactivated_by', 'deactivated_at']);
        });
    }
};
