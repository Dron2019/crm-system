<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Guard against partial prior run
        Schema::dropIfExists('invitations');
        Schema::dropIfExists('dashboard_widgets');
        Schema::dropIfExists('dashboards');
        Schema::dropIfExists('reports');

        Schema::create('reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('report_type', 50); // pipeline, activities, revenue, forecast, custom
            $table->json('config');
            $table->uuid('created_by');
            $table->boolean('is_shared')->default(false);
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users');
        });

        Schema::create('dashboards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_default')->default(false);
            $table->json('layout')->nullable();
            $table->uuid('created_by');
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users');
        });

        Schema::create('dashboard_widgets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('dashboard_id');
            $table->string('widget_type', 50); // kpi, chart, list, miniReport
            $table->json('config');
            $table->integer('position')->default(0);
            $table->integer('size_x')->default(6);
            $table->integer('size_y')->default(4);
            $table->integer('refresh_interval')->nullable();
            $table->timestamps();

            $table->foreign('dashboard_id')->references('id')->on('dashboards')->cascadeOnDelete();
        });

        Schema::create('invitations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->string('email');
            $table->string('role', 50)->default('member');
            $table->string('token', 64)->unique();
            $table->uuid('invited_by');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('invited_by')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboard_widgets');
        Schema::dropIfExists('dashboards');
        Schema::dropIfExists('reports');
        Schema::dropIfExists('invitations');
    }
};
