<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartment_statuses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->string('name');
            $table->string('color')->default('#cccccc');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->smallInteger('sort_order')->default(0);
            $table->boolean('can_reserve')->default(true);
            $table->boolean('can_sell')->default(true);
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->index(['team_id', 'sort_order']);
        });

        // Insert default statuses for existing teams
        $this->insertDefaultStatuses();
    }

    private function insertDefaultStatuses(): void
    {
        // Get all existing teams
        $teams = DB::table('teams')->pluck('id');

        $statuses = [
            ['name' => 'Продано', 'color' => '#4CAF50', 'is_default' => false, 'sort_order' => 1, 'can_reserve' => false, 'can_sell' => false],
            ['name' => 'Вільно', 'color' => '#2196F3', 'is_default' => true, 'sort_order' => 0, 'can_reserve' => true, 'can_sell' => true],
            ['name' => 'Резерв', 'color' => '#FFC107', 'is_default' => false, 'sort_order' => 2, 'can_reserve' => false, 'can_sell' => true],
            ['name' => 'Забронировано', 'color' => '#FF9800', 'is_default' => false, 'sort_order' => 3, 'can_reserve' => false, 'can_sell' => true],
            ['name' => 'Недоступно', 'color' => '#9E9E9E', 'is_default' => false, 'sort_order' => 4, 'can_reserve' => false, 'can_sell' => false],
            ['name' => 'Заблокировано', 'color' => '#F44336', 'is_default' => false, 'sort_order' => 5, 'can_reserve' => false, 'can_sell' => false],
            ['name' => 'Перестуокча', 'color' => '#9C27B0', 'is_default' => false, 'sort_order' => 6, 'can_reserve' => false, 'can_sell' => false],
            ['name' => 'Бартер', 'color' => '#673AB7', 'is_default' => false, 'sort_order' => 7, 'can_reserve' => false, 'can_sell' => false],
        ];

        foreach ($teams as $teamId) {
            foreach ($statuses as $status) {
                DB::table('apartment_statuses')->insert([
                    'id' => \Illuminate\Support\Str::uuid(),
                    'team_id' => $teamId,
                    'name' => $status['name'],
                    'color' => $status['color'],
                    'is_active' => true,
                    'is_default' => $status['is_default'],
                    'sort_order' => $status['sort_order'],
                    'can_reserve' => $status['can_reserve'],
                    'can_sell' => $status['can_sell'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('apartment_statuses');
    }
};
