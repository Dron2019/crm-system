<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deals', function (Blueprint $table) {
            $table->uuid('attached_by')->nullable()->after('apartment_id');
            $table->timestamp('attached_at')->nullable()->after('attached_by');
            $table->foreign('attached_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('deals', function (Blueprint $table) {
            $table->dropForeign(['attached_by']);
            $table->dropColumn(['attached_at', 'attached_by']);
        });
    }
};
