<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Set default status for all existing apartments
        DB::statement('
            UPDATE apartments a
            SET a.status_id = (
                SELECT s.id FROM apartment_statuses s
                WHERE s.team_id = a.team_id AND s.is_default = 1
                LIMIT 1
            )
            WHERE a.status_id IS NULL
        ');

        // Add foreign key constraint
        Schema::table('apartments', function (Blueprint $table) {
            $table->foreign('status_id')->references('id')->on('apartment_statuses')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->dropForeign(['status_id']);
        });
    }
};
