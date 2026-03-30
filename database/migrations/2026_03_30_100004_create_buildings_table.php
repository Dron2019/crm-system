<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buildings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('project_id');
            $table->string('name');
            $table->string('number')->nullable();
            $table->string('city')->nullable();
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->smallInteger('total_floors')->default(0);
            $table->smallInteger('total_apartments')->default(0);
            $table->enum('status', ['planning', 'construction', 'ready', 'populated', 'archived'])
                ->default('planning');
            $table->date('construction_start')->nullable();
            $table->date('completion_date')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $table->index(['team_id', 'project_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buildings');
    }
};
