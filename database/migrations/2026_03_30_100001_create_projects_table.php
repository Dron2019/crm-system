<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->string('name');
            $table->string('brand')->nullable();
            $table->string('slug')->unique()->nullable();
            $table->string('country')->default('Ukraine');
            $table->string('city')->nullable();
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->enum('status', ['planning', 'sales', 'construction', 'completed', 'frozen'])
                ->default('sales');
            $table->date('start_date')->nullable();
            $table->date('delivery_date')->nullable();
            $table->uuid('manager_id')->nullable();
            $table->text('description')->nullable();
            $table->text('logo_url')->nullable();
            $table->string('site_url')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('manager_id')->references('id')->on('users')->nullOnDelete();
            $table->index('status');
            $table->index(['team_id', 'city']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
