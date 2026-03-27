<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('pipeline_id');
            $table->uuid('stage_id');
            $table->uuid('contact_id')->nullable();
            $table->uuid('company_id')->nullable();
            $table->uuid('assigned_to')->nullable();
            $table->string('title');
            $table->decimal('value', 15, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->date('expected_close_date')->nullable();
            $table->integer('probability')->default(0);
            $table->string('status')->default('open');
            $table->text('lost_reason')->nullable();
            $table->json('custom_fields')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('pipeline_id')->references('id')->on('pipelines')->cascadeOnDelete();
            $table->foreign('stage_id')->references('id')->on('stages')->cascadeOnDelete();
            $table->foreign('contact_id')->references('id')->on('contacts')->nullOnDelete();
            $table->foreign('company_id')->references('id')->on('companies')->nullOnDelete();
            $table->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
            $table->index(['team_id', 'status']);
            $table->index(['team_id', 'pipeline_id', 'stage_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deals');
    }
};
