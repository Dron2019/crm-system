<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('building_id');
            $table->string('name');
            $table->string('number')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('building_id')->references('id')->on('buildings')->cascadeOnDelete();
            $table->index(['team_id', 'building_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};
