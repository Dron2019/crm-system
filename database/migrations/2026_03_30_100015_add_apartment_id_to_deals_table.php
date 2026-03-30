<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deals', function (Blueprint $table) {
            $table->uuid('apartment_id')->nullable()->after('company_id');
            $table->foreign('apartment_id')->references('id')->on('apartments')->nullOnDelete();
            $table->index('apartment_id');
        });
    }

    public function down(): void
    {
        Schema::table('deals', function (Blueprint $table) {
            $table->dropForeign(['apartment_id']);
            $table->dropIndex(['apartment_id']);
            $table->dropColumn('apartment_id');
        });
    }
};
