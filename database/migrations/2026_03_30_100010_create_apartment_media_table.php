<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartment_media', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('apartment_id');
            $table->enum('type', ['photo', 'floor_plan', 'blueprint', 'video', 'virtual_tour', 'document'])
                ->default('photo');
            $table->string('file_url');
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->bigInteger('file_size')->nullable()->unsigned();
            $table->string('mime_type')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('apartment_id')->references('id')->on('apartments')->cascadeOnDelete();
            $table->index(['apartment_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartment_media');
    }
};
