<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('project_id');
            $table->enum('category', ['permit', 'license', 'ownership', 'technical', 'declaration', 'contract', 'other'])
                ->default('other');
            $table->string('title');
            $table->text('file_url');
            $table->bigInteger('file_size')->nullable()->unsigned();
            $table->string('mime_type')->nullable();
            $table->date('issued_at')->nullable();
            $table->date('expires_at')->nullable();
            $table->boolean('is_public')->default(false);
            $table->uuid('uploaded_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['team_id', 'project_id']);
            $table->index('category');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_documents');
    }
};
