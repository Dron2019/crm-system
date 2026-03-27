<?php

namespace App\Services;

use App\Models\Pipeline;
use Illuminate\Database\Eloquent\Collection;

class PipelineService
{
    public function list(): Collection
    {
        return Pipeline::with('stages')->orderBy('name')->get();
    }

    public function create(array $validated, ?array $stages = null): Pipeline
    {
        $pipeline = Pipeline::create($validated);

        if ($stages) {
            foreach ($stages as $order => $stageData) {
                $pipeline->stages()->create([
                    'name' => $stageData['name'],
                    'display_order' => $stageData['display_order'] ?? $order,
                    'color' => $stageData['color'] ?? '#6366f1',
                    'is_won' => $stageData['is_won'] ?? false,
                    'is_lost' => $stageData['is_lost'] ?? false,
                ]);
            }
        }

        return $pipeline->load('stages');
    }

    public function update(Pipeline $pipeline, array $validated, ?array $stages = null): Pipeline
    {
        $pipeline->update($validated);

        if ($stages !== null) {
            $existingIds = $pipeline->stages()->pluck('id')->toArray();
            $incomingIds = array_filter(array_column($stages, 'id'));

            // Delete stages that were removed
            $toDelete = array_diff($existingIds, $incomingIds);
            if ($toDelete) {
                $pipeline->stages()->whereIn('id', $toDelete)->delete();
            }

            // Upsert stages
            foreach ($stages as $order => $stageData) {
                $attrs = [
                    'name' => $stageData['name'],
                    'display_order' => $stageData['display_order'] ?? $order,
                    'color' => $stageData['color'] ?? '#6366f1',
                    'is_won' => $stageData['is_won'] ?? false,
                    'is_lost' => $stageData['is_lost'] ?? false,
                ];

                if (!empty($stageData['id'])) {
                    $pipeline->stages()->where('id', $stageData['id'])->update($attrs);
                } else {
                    $pipeline->stages()->create($attrs);
                }
            }
        }

        return $pipeline->load('stages');
    }

    public function delete(Pipeline $pipeline): void
    {
        $pipeline->delete();
    }
}
