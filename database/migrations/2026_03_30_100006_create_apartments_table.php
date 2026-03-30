<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('project_id');
            $table->uuid('building_id');
            $table->uuid('section_id')->nullable();
            $table->string('number');
            $table->smallInteger('floor');
            $table->integer('rooms')->default(1);
            $table->decimal('area', 8, 2);
            $table->decimal('balcony_area', 8, 2)->nullable()->default(0);
            $table->decimal('price', 15, 2);
            $table->decimal('price_per_sqm', 10, 2)->nullable();
            $table->uuid('status_id')->nullable();
            $table->enum('layout_type', ['studio', '1k', '2k', '3k', '4k', '5k', 'penthouse', 'other'])->nullable();
            $table->boolean('has_balcony')->default(false);
            $table->boolean('has_terrace')->default(false);
            $table->boolean('has_loggia')->default(false);
            $table->decimal('ceiling_height', 4, 2)->nullable();
            $table->json('custom_fields')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $table->foreign('building_id')->references('id')->on('buildings')->cascadeOnDelete();
            $table->foreign('section_id')->references('id')->on('sections')->nullOnDelete();
            // status_id FK added after apartment_statuses table is created
            $table->index(['team_id', 'project_id', 'building_id']);
            $table->index(['floor', 'number']);
            $table->index('status_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartments');
    }
};
