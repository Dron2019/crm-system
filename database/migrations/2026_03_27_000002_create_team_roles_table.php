<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->string('name');
            $table->string('slug');
            $table->string('description')->nullable();
            $table->string('color', 20)->default('#6366f1');
            $table->json('permissions');
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->unique(['team_id', 'slug']);
        });

        Schema::table('team_members', function (Blueprint $table) {
            $table->uuid('custom_role_id')->nullable()->after('role');
            $table->foreign('custom_role_id')->references('id')->on('team_roles')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->dropForeign(['custom_role_id']);
            $table->dropColumn('custom_role_id');
        });

        Schema::dropIfExists('team_roles');
    }
};
