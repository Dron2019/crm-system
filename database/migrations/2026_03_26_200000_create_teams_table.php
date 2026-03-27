<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->uuid('owner_id');
            $table->json('settings')->nullable();
            $table->string('billing_plan')->default('free');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('owner_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('team_members', function (Blueprint $table) {
            $table->uuid('team_id');
            $table->uuid('user_id');
            $table->string('role')->default('member');
            $table->timestamps();

            $table->primary(['team_id', 'user_id']);
            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        // Add foreign key for current_team_id on users now that teams exists
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('current_team_id')->references('id')->on('teams')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['current_team_id']);
        });
        Schema::dropIfExists('team_members');
        Schema::dropIfExists('teams');
    }
};
