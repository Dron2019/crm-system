<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Apartment;
use App\Models\ApartmentStatus;
use App\Models\Building;
use App\Models\Section;
use App\Services\ImportFileReader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ApartmentImportExportController extends Controller
{
    public function __construct(private readonly ImportFileReader $importFileReader)
    {
    }

    public function import(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermission('apartments.import')) {
            return response()->json(['message' => 'Only owner/admin can import apartments.'], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'mapping' => 'nullable|array',
        ]);

        [$headers, $rows] = $this->importFileReader->read($request->file('file'));

        if (empty($headers)) {
            return response()->json(['message' => 'Import file is empty or invalid.'], 422);
        }

        $mapping = $this->resolveMapping($request->input('mapping', []), $headers);

        if (empty($mapping['building_name']) || empty($mapping['number']) || empty($mapping['floor'])) {
            return response()->json([
                'message' => 'Could not map required columns: building_name, number, floor.',
            ], 422);
        }

        $teamId = $request->user()->current_team_id;
        $references = $this->loadReferences($teamId);

        $preparedRows = [];
        foreach ($rows as $index => $data) {
            $preparedRows[] = $this->buildPreviewRow($data, $mapping, $references, $index + 2);
        }

        $result = $this->commitRows($preparedRows, $teamId);

        return response()->json([
            'message' => "Import completed. {$result['imported']} apartments imported, {$result['updated']} updated, {$result['skipped']} skipped.",
            'imported' => $result['imported'],
            'updated' => $result['updated'],
            'skipped' => $result['skipped'],
            'errors' => array_slice($result['errors'], 0, 100),
            'detected_headers' => $headers,
            'mapping_used' => $mapping,
        ]);
    }

    public function preview(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermission('apartments.import')) {
            return response()->json(['message' => 'Only owner/admin can import apartments.'], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'mapping' => 'nullable|array',
        ]);

        [$headers, $rows] = $this->importFileReader->read($request->file('file'));

        if (empty($headers)) {
            return response()->json(['message' => 'Import file is empty or invalid.'], 422);
        }

        $mapping = $this->resolveMapping($request->input('mapping', []), $headers);

        if (empty($mapping['building_name']) || empty($mapping['number']) || empty($mapping['floor'])) {
            return response()->json([
                'message' => 'Could not map required columns: building_name, number, floor.',
            ], 422);
        }

        $teamId = $request->user()->current_team_id;
        $references = $this->loadReferences($teamId);

        $previewRows = [];
        foreach ($rows as $index => $data) {
            $previewRows[] = $this->buildPreviewRow($data, $mapping, $references, $index + 2);
        }

        return response()->json([
            'message' => 'Preview generated.',
            'detected_headers' => $headers,
            'mapping_used' => $mapping,
            'rows' => $previewRows,
            'options' => [
                'buildings' => $references['buildings'],
                'sections' => $references['sections_options'],
                'statuses' => $references['statuses_options'],
            ],
        ]);
    }

    public function commit(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermission('apartments.import')) {
            return response()->json(['message' => 'Only owner/admin can import apartments.'], 403);
        }

        $request->validate([
            'rows' => 'required|array|min:1',
            'rows.*.row_number' => 'required|integer|min:2',
            'rows.*.fields' => 'required|array',
            'rows.*.errors' => 'nullable|array',
        ]);

        $teamId = $request->user()->current_team_id;
        $result = $this->commitRows($request->input('rows', []), $teamId);

        return response()->json([
            'message' => "Import completed. {$result['imported']} apartments imported, {$result['updated']} updated, {$result['skipped']} skipped.",
            'imported' => $result['imported'],
            'updated' => $result['updated'],
            'skipped' => $result['skipped'],
            'errors' => array_slice($result['errors'], 0, 100),
        ]);
    }

    private function buildPreviewRow(array $row, array $mapping, array $references, int $line): array
    {
        $errors = [];

        $buildingName = $this->value($row, $mapping, 'building_name');
        $sectionName = $this->value($row, $mapping, 'section_name');
        $statusName = $this->value($row, $mapping, 'status_name');

        $building = null;
        if (!$buildingName) {
            $errors[] = 'Building name is required.';
        } else {
            $building = $references['building_by_name']->get(mb_strtolower($buildingName));
            if (!$building) {
                $errors[] = 'Building "' . $buildingName . '" does not exist.';
            }
        }

        $section = null;
        if ($sectionName && $building) {
            $section = $references['sections']
                ->first(fn ($s) => $s->building_id === $building->id && mb_strtolower((string) $s->name) === mb_strtolower($sectionName));

            if (!$section) {
                $errors[] = 'Section "' . $sectionName . '" not found in building "' . $buildingName . '".';
            }
        }

        $status = null;
        if ($statusName) {
            $status = $references['status_by_name']->get(mb_strtolower($statusName));
            if (!$status) {
                $errors[] = 'Status "' . $statusName . '" does not exist.';
            }
        }

        $number = $this->value($row, $mapping, 'number');
        if (!$number) {
            $errors[] = 'Apartment number is required.';
        }

        $floor = $this->nullableInt($this->value($row, $mapping, 'floor'));
        if ($floor === null) {
            $errors[] = 'Floor is required and must be numeric.';
        }

        $fields = [
            'building_id' => $building?->id,
            'project_id' => $building?->project_id,
            'section_id' => $section?->id,
            'status_id' => $status?->id,
            'building_name_raw' => $buildingName,
            'section_name_raw' => $sectionName,
            'status_name_raw' => $statusName,
            'number' => $number,
            'floor' => $floor,
            'rooms' => $this->nullableInt($this->value($row, $mapping, 'rooms')) ?? 1,
            'area' => $this->nullableFloat($this->value($row, $mapping, 'area')) ?? 0,
            'balcony_area' => $this->nullableFloat($this->value($row, $mapping, 'balcony_area')),
            'price' => $this->nullableFloat($this->value($row, $mapping, 'price')) ?? 0,
            'layout_type' => $this->nullableString($this->value($row, $mapping, 'layout_type')),
            'has_balcony' => $this->parseBoolean($this->value($row, $mapping, 'has_balcony')),
            'has_terrace' => $this->parseBoolean($this->value($row, $mapping, 'has_terrace')),
            'has_loggia' => $this->parseBoolean($this->value($row, $mapping, 'has_loggia')),
            'ceiling_height' => $this->nullableFloat($this->value($row, $mapping, 'ceiling_height')),
        ];

        return [
            'row_number' => $line,
            'fields' => $fields,
            'errors' => $errors,
        ];
    }

    private function commitRows(array $rows, string $teamId): array
    {
        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        DB::beginTransaction();

        try {
            foreach ($rows as $row) {
                $line = (int) ($row['row_number'] ?? 0);
                $preErrors = $row['errors'] ?? [];
                $fields = $row['fields'] ?? [];

                if (!empty($preErrors)) {
                    $skipped++;
                    foreach ($preErrors as $error) {
                        $errors[] = 'Row ' . $line . ': ' . $error;
                    }
                    continue;
                }

                $buildingId = $fields['building_id'] ?? null;
                $sectionId = $fields['section_id'] ?? null;
                $statusId = $fields['status_id'] ?? null;

                if (!$buildingId) {
                    $skipped++;
                    $errors[] = 'Row ' . $line . ': Building is required.';
                    continue;
                }

                $building = Building::query()
                    ->where('id', $buildingId)
                    ->where('team_id', $teamId)
                    ->first();

                if (!$building) {
                    $skipped++;
                    $errors[] = 'Row ' . $line . ': Selected building does not exist in current team.';
                    continue;
                }

                if ($sectionId) {
                    $sectionExists = Section::query()
                        ->where('id', $sectionId)
                        ->where('team_id', $teamId)
                        ->where('building_id', $buildingId)
                        ->exists();

                    if (!$sectionExists) {
                        $skipped++;
                        $errors[] = 'Row ' . $line . ': Selected section does not belong to selected building.';
                        continue;
                    }
                }

                if ($statusId) {
                    $statusExists = ApartmentStatus::query()
                        ->where('id', $statusId)
                        ->where('team_id', $teamId)
                        ->exists();

                    if (!$statusExists) {
                        $skipped++;
                        $errors[] = 'Row ' . $line . ': Selected status does not exist in current team.';
                        continue;
                    }
                }

                $payload = [
                    'team_id' => $teamId,
                    'project_id' => $building->project_id,
                    'building_id' => $buildingId,
                    'section_id' => $sectionId,
                    'number' => $fields['number'] ?? null,
                    'floor' => $fields['floor'] ?? null,
                    'rooms' => $fields['rooms'] ?? 1,
                    'area' => $fields['area'] ?? 0,
                    'balcony_area' => $fields['balcony_area'] ?? null,
                    'price' => $fields['price'] ?? 0,
                    'price_per_sqm' => null,
                    'status_id' => $statusId,
                    'layout_type' => $this->nullableString($fields['layout_type'] ?? null),
                    'has_balcony' => (bool) ($fields['has_balcony'] ?? false),
                    'has_terrace' => (bool) ($fields['has_terrace'] ?? false),
                    'has_loggia' => (bool) ($fields['has_loggia'] ?? false),
                    'ceiling_height' => $fields['ceiling_height'] ?? null,
                ];

                if (!empty($payload['area']) && !empty($payload['price'])) {
                    $payload['price_per_sqm'] = round((float) $payload['price'] / (float) $payload['area'], 2);
                }

                $validator = Validator::make($payload, [
                    'team_id' => ['required', 'uuid'],
                    'project_id' => [
                        'required',
                        'uuid',
                        Rule::exists('projects', 'id')->where('team_id', $teamId),
                    ],
                    'building_id' => [
                        'required',
                        'uuid',
                        Rule::exists('buildings', 'id')->where('team_id', $teamId),
                    ],
                    'section_id' => [
                        'nullable',
                        'uuid',
                        Rule::exists('sections', 'id')->where('team_id', $teamId),
                    ],
                    'number' => ['required', 'string', 'max:50'],
                    'floor' => ['required', 'integer', 'min:0', 'max:200'],
                    'rooms' => ['required', 'integer', 'min:1', 'max:20'],
                    'area' => ['required', 'numeric', 'min:1'],
                    'balcony_area' => ['nullable', 'numeric', 'min:0'],
                    'price' => ['required', 'numeric', 'min:0'],
                    'price_per_sqm' => ['nullable', 'numeric', 'min:0'],
                    'status_id' => [
                        'nullable',
                        'uuid',
                        Rule::exists('apartment_statuses', 'id')->where('team_id', $teamId),
                    ],
                    'layout_type' => ['nullable', 'in:studio,1k,2k,3k,4k,5k,penthouse,other'],
                    'has_balcony' => ['required', 'boolean'],
                    'has_terrace' => ['required', 'boolean'],
                    'has_loggia' => ['required', 'boolean'],
                    'ceiling_height' => ['nullable', 'numeric', 'min:0'],
                ]);

                if ($validator->fails()) {
                    $skipped++;
                    $errors[] = 'Row ' . $line . ': ' . $validator->errors()->first();
                    continue;
                }

                $validated = $validator->validated();

                $existing = Apartment::query()
                    ->where('team_id', $teamId)
                    ->where('building_id', $validated['building_id'])
                    ->where('number', $validated['number'])
                    ->where('floor', $validated['floor'])
                    ->first();

                if ($existing) {
                    $existing->update($validated);
                    $updated++;
                    continue;
                }

                Apartment::create($validated);
                $imported++;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            $errors[] = 'Import failed: ' . $e->getMessage();
        }

        return [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    public function template(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        if (!request()->user()?->hasPermission('apartments.import')) {
            abort(403, 'Only owner/admin can download apartment import template.');
        }

        $headers = [
            'building_name', 'section_name', 'number', 'floor', 'rooms', 'area',
            'price', 'status_name', 'layout_type', 'has_balcony', 'has_terrace',
            'has_loggia', 'balcony_area', 'ceiling_height',
        ];

        return response()->streamDownload(function () use ($headers) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fwrite($out, "sep=,\n");
            fputcsv($out, $headers);
            fputcsv($out, [
                'Building A', 'Section 1', 'A-101', '10', '2', '67.5',
                '84500', 'Вільно', '2k', '1', '0', '0', '3.2', '2.7',
            ]);
            fclose($out);
        }, 'apartments-import-template.csv', ['Content-Type' => 'text/csv']);
    }

    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        if (!$request->user()->hasPermission('apartments.export')) {
            abort(403, 'Only owner/admin can export apartments.');
        }

        $request->validate([
            'fields' => 'nullable|array',
            'project_id' => 'nullable|uuid',
            'building_id' => 'nullable|uuid',
            'status_id' => 'nullable|uuid',
        ]);

        $fields = $request->input('fields', [
            'project_name',
            'building_name',
            'section_name',
            'number',
            'floor',
            'rooms',
            'area',
            'price',
            'status_name',
            'layout_type',
        ]);

        $allowed = [
            'project_name',
            'building_name',
            'section_name',
            'number',
            'floor',
            'rooms',
            'area',
            'price',
            'status_name',
            'layout_type',
            'has_balcony',
            'has_terrace',
            'has_loggia',
            'balcony_area',
            'ceiling_height',
        ];

        $fields = array_values(array_filter($fields, fn ($field) => in_array($field, $allowed, true)));
        if (empty($fields)) {
            $fields = ['project_name', 'building_name', 'number', 'floor', 'rooms', 'area', 'price', 'status_name'];
        }

        $teamId = $request->user()->current_team_id;

        $query = Apartment::query()
            ->where('team_id', $teamId)
            ->with([
                'project:id,name',
                'building:id,name',
                'section:id,name',
                'status:id,name',
            ])
            ->when($request->input('project_id'), fn ($q, $v) => $q->where('project_id', $v))
            ->when($request->input('building_id'), fn ($q, $v) => $q->where('building_id', $v))
            ->when($request->input('status_id'), fn ($q, $v) => $q->where('status_id', $v));

        $filename = 'apartments-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($query, $fields) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            fwrite($handle, "sep=,\n");
            fputcsv($handle, $fields);

            $query->chunkById(500, function ($apartments) use ($handle, $fields) {
                foreach ($apartments as $apartment) {
                    $row = [];
                    foreach ($fields as $field) {
                        $row[] = $this->resolveExportField($apartment, $field);
                    }
                    fputcsv($handle, $row);
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function resolveMapping(array $mapping, array $headers): array
    {
        $normalized = [];
        foreach ($headers as $header) {
            $normalized[$header] = $header;
        }

        $defaults = [
            'building_name' => ['building_name', 'building'],
            'section_name' => ['section_name', 'section'],
            'number' => ['number', 'apartment_number', 'unit_number'],
            'floor' => ['floor', 'level'],
            'rooms' => ['rooms', 'room_count'],
            'area' => ['area', 'total_area'],
            'price' => ['price', 'cost'],
            'status_name' => ['status_name', 'status'],
            'layout_type' => ['layout_type', 'layout'],
            'has_balcony' => ['has_balcony', 'balcony'],
            'has_terrace' => ['has_terrace', 'terrace'],
            'has_loggia' => ['has_loggia', 'loggia'],
            'balcony_area' => ['balcony_area'],
            'ceiling_height' => ['ceiling_height'],
        ];

        foreach ($defaults as $field => $candidates) {
            if (!empty($mapping[$field])) {
                continue;
            }
            foreach ($candidates as $candidate) {
                if (isset($normalized[$candidate])) {
                    $mapping[$field] = $candidate;
                    break;
                }
            }
        }

        return $mapping;
    }

    private function loadReferences(string $teamId): array
    {
        $buildings = Building::query()
            ->where('team_id', $teamId)
            ->with('project:id,name')
            ->select(['id', 'project_id', 'name'])
            ->get();

        $sections = Section::query()
            ->where('team_id', $teamId)
            ->select(['id', 'building_id', 'name'])
            ->get();

        $statuses = ApartmentStatus::query()
            ->where('team_id', $teamId)
            ->select(['id', 'name'])
            ->get();

        return [
            'buildings' => $buildings->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'project_id' => $b->project_id,
                'project_name' => $b->project?->name,
            ])->values(),
            'building_by_name' => $buildings->keyBy(fn ($b) => mb_strtolower((string) $b->name)),
            'sections_options' => $sections->map(fn ($s) => [
                'id' => $s->id,
                'building_id' => $s->building_id,
                'name' => $s->name,
            ])->values(),
            'sections' => $sections,
            'statuses_options' => $statuses->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
            ])->values(),
            'status_by_name' => $statuses->keyBy(fn ($s) => mb_strtolower((string) $s->name)),
        ];
    }

    private function value(array $row, array $mapping, string $field): ?string
    {
        $column = $mapping[$field] ?? null;
        if (!$column || !array_key_exists($column, $row)) {
            return null;
        }

        $value = trim((string) $row[$column]);

        return $value === '' ? null : $value;
    }

    private function parseBoolean(?string $value): bool
    {
        if ($value === null) {
            return false;
        }

        $normalized = mb_strtolower(trim($value));

        return in_array($normalized, ['1', 'true', 'yes', 'y', 'так', 'да'], true);
    }

    private function nullableFloat(?string $value): ?float
    {
        if ($value === null) {
            return null;
        }

        $normalized = str_replace(',', '.', $value);

        return is_numeric($normalized) ? (float) $normalized : null;
    }

    private function nullableString(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim($value);

        return $normalized === '' ? null : $normalized;
    }

    private function nullableInt(?string $value): ?int
    {
        if ($value === null) {
            return null;
        }

        return is_numeric($value) ? (int) $value : null;
    }

    private function resolveExportField(Apartment $apartment, string $field): mixed
    {
        return match ($field) {
            'project_name' => $apartment->project?->name,
            'building_name' => $apartment->building?->name,
            'section_name' => $apartment->section?->name,
            'status_name' => $apartment->status?->name,
            default => $apartment->{$field} ?? null,
        };
    }
}
