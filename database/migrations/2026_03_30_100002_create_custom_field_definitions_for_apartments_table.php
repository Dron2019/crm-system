<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Check if table exists before modifying
        if (Schema::hasTable('custom_field_definitions')) {
            // Get current values to see what we're working with
            $currentValues = DB::select("SELECT DISTINCT entity_type FROM custom_field_definitions");
            
            // Update existing custom_field_definitions enum to include apartment
            DB::statement("ALTER TABLE custom_field_definitions MODIFY entity_type ENUM('project','building','apartment','contact','company','deal') NOT NULL");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('custom_field_definitions')) {
            DB::statement("ALTER TABLE custom_field_definitions MODIFY entity_type ENUM('project','building','contact','company','deal') NOT NULL");
        }
    }
};
