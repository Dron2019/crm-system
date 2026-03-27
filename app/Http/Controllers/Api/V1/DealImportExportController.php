<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Contact;
use App\Models\Company;
use App\Models\Deal;
use App\Models\Pipeline;
use App\Models\Stage;
use App\Services\ImportFileReader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class DealImportExportController extends Controller
{
    public function __construct(private readonly ImportFileReader $importFileReader)
    {
    }

    public function preview(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermission('deals.import')) {
            return response()->json(['message' => 'Only owner/admin can import deals.'], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'mapping' => 'nullable|array',
        ]);

        $teamId = $request->user()->current_team_id;

        [$headers, $rows] = $this->importFileReader->read($request->file('file'));

        if (empty($headers)) {
            return response()->json(['message' => 'Import file is empty or invalid.'], 422);
        }

        $mapping = $this->resolveMapping($request->input('mapping', []), $headers);
        if (empty($mapping['title'])) {
            return response()->json(['message' => 'Could not map required "title" column.'], 422);
        }

        $references = $this->loadReferences($teamId);
        $previewRows = [];

        foreach ($rows as $index => $row) {
            $previewRows[] = $this->buildPreviewRow($row, $mapping, $references, $index + 2);
        }

        return response()->json([
            'message' => 'Preview generated.',
            'detected_headers' => $headers,
            'mapping_used' => $mapping,
            'rows' => $previewRows,
            'options' => [
                'pipelines' => $references['pipelines'],
                'companies' => $references['companies'],
                'contacts' => $references['contacts'],
            ],
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermission('deals.import')) {
            return response()->json(['message' => 'Only owner/admin can import deals.'], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'mapping' => 'nullable|array',
        ]);

        $teamId = $request->user()->current_team_id;

        [$headers, $rows] = $this->importFileReader->read($request->file('file'));

        if (empty($headers)) {
            return response()->json(['message' => 'Import file is empty or invalid.'], 422);
        }

        $mapping = $this->resolveMapping($request->input('mapping', []), $headers);
        if (empty($mapping['title'])) {
            return response()->json(['message' => 'Could not map required "title" column.'], 422);
        }

        $references = $this->loadReferences($teamId);
        $preparedRows = [];

        foreach ($rows as $index => $row) {
            $preparedRows[] = $this->buildPreviewRow($row, $mapping, $references, $index + 2);
        }

        $result = $this->commitRows($preparedRows, $teamId);

        return response()->json([
            'message' => 'Import completed. ' . $result['imported'] . ' deals imported, ' . $result['skipped'] . ' skipped.',
            'imported' => $result['imported'],
            'skipped' => $result['skipped'],
            'errors' => array_slice($result['errors'], 0, 50),
            'detected_headers' => $headers,
            'mapping_used' => $mapping,
        ]);
    }

    public function commit(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermission('deals.import')) {
            return response()->json(['message' => 'Only owner/admin can import deals.'], 403);
        }

        $request->validate([
            'rows' => 'required|array|min:1',
            'rows.*.row_number' => 'required|integer|min:2',
            'rows.*.fields' => 'required|array',
            'rows.*.errors' => 'nullable|array',
        ]);

        $teamId = $request->user()->current_team_id;
        $rows = $request->input('rows');

        $result = $this->commitRows($rows, $teamId);

        return response()->json([
            'message' => 'Import completed. ' . $result['imported'] . ' deals imported, ' . $result['skipped'] . ' skipped.',
            'imported' => $result['imported'],
            'skipped' => $result['skipped'],
            'errors' => array_slice($result['errors'], 0, 100),
        ]);
    }

    public function template(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        if (!request()->user()?->hasPermission('deals.import')) {
            abort(403, 'Only owner/admin can download deal import template.');
        }

        $headers = [
            'title', 'value', 'currency', 'status', 'probability', 'expected_close_date',
            'pipeline_name', 'stage_name', 'contact_email', 'company_name',
        ];

        return response()->streamDownload(function () use ($headers) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fwrite($out, "sep=,\n");
            fputcsv($out, $headers);
            fputcsv($out, ['Enterprise Renewal', '25000', 'USD', 'open', '60', '2026-04-30', 'Sales Pipeline', 'Negotiation', 'buyer@example.com', 'Acme Inc']);
            fclose($out);
        }, 'deals-import-template.csv', ['Content-Type' => 'text/csv']);
    }

    private function resolveMapping(array $mapping, array $headers): array
    {
        $normalized = [];
        foreach ($headers as $header) {
            $normalized[$header] = $header;
        }

        $defaults = [
            'title' => ['title', 'deal_title', 'name'],
            'value' => ['value', 'amount', 'deal_value'],
            'currency' => ['currency'],
            'status' => ['status'],
            'probability' => ['probability'],
            'expected_close_date' => ['expected_close_date', 'close_date'],
            'pipeline_name' => ['pipeline_name', 'pipeline'],
            'stage_name' => ['stage_name', 'stage'],
            'contact_email' => ['contact_email', 'email', 'contact'],
            'company_name' => ['company_name', 'company'],
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
        $pipelines = Pipeline::where('team_id', $teamId)
            ->with(['stages' => fn ($q) => $q->orderBy('display_order')])
            ->orderBy('name')
            ->get();

        $companies = Company::where('team_id', $teamId)
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get();

        $contacts = Contact::where('team_id', $teamId)
            ->select(['id', 'email', 'first_name', 'last_name'])
            ->whereNotNull('email')
            ->orderBy('first_name')
            ->get();

        return [
            'pipelines' => $pipelines->map(fn ($pipeline) => [
                'id' => $pipeline->id,
                'name' => $pipeline->name,
                'stages' => $pipeline->stages->map(fn ($stage) => [
                    'id' => $stage->id,
                    'name' => $stage->name,
                ])->values(),
            ])->values(),
            'pipeline_by_name' => $pipelines->keyBy(fn ($p) => strtolower($p->name)),
            'stage_by_pipeline_and_name' => $pipelines->mapWithKeys(function ($pipeline) {
                return [$pipeline->id => $pipeline->stages->keyBy(fn ($stage) => strtolower($stage->name))];
            }),
            'companies' => $companies->values(),
            'company_by_name' => $companies->keyBy(fn ($c) => strtolower($c->name)),
            'contacts' => $contacts->map(fn ($c) => [
                'id' => $c->id,
                'email' => $c->email,
                'full_name' => trim(($c->first_name ?? '') . ' ' . ($c->last_name ?? '')),
            ])->values(),
            'contact_by_email' => $contacts->keyBy(fn ($c) => strtolower((string) $c->email)),
        ];
    }

    private function buildPreviewRow(array $row, array $mapping, array $references, int $line): array
    {
        $fields = [
            'title' => $this->value($row, $mapping, 'title'),
            'value' => $this->value($row, $mapping, 'value') ?: '0',
            'currency' => strtoupper($this->value($row, $mapping, 'currency') ?: 'USD'),
            'status' => strtolower($this->value($row, $mapping, 'status') ?: 'open'),
            'probability' => $this->value($row, $mapping, 'probability') ?: '0',
            'expected_close_date' => $this->value($row, $mapping, 'expected_close_date') ?: null,
            'pipeline_id' => null,
            'stage_id' => null,
            'contact_id' => null,
            'company_id' => null,
        ];

        $errors = [];

        $pipelineName = $this->value($row, $mapping, 'pipeline_name');
        $stageName = $this->value($row, $mapping, 'stage_name');

        if (!$pipelineName) {
            $errors[] = 'Pipeline is required.';
        } else {
            $pipeline = $references['pipeline_by_name']->get(strtolower($pipelineName));
            if (!$pipeline) {
                $errors[] = 'Pipeline "' . $pipelineName . '" does not exist.';
            } else {
                $fields['pipeline_id'] = $pipeline->id;

                if (!$stageName) {
                    $errors[] = 'Stage is required.';
                } else {
                    $stage = $references['stage_by_pipeline_and_name']->get($pipeline->id)?->get(strtolower($stageName));
                    if (!$stage) {
                        $errors[] = 'Stage "' . $stageName . '" does not exist in pipeline "' . $pipeline->name . '".';
                    } else {
                        $fields['stage_id'] = $stage->id;
                    }
                }
            }
        }

        $contactEmail = $this->value($row, $mapping, 'contact_email');
        if ($contactEmail) {
            $contact = $references['contact_by_email']->get(strtolower($contactEmail));
            if (!$contact) {
                $errors[] = 'Contact with email "' . $contactEmail . '" does not exist.';
            } else {
                $fields['contact_id'] = $contact->id;
            }
        }

        $companyName = $this->value($row, $mapping, 'company_name');
        if ($companyName) {
            $company = $references['company_by_name']->get(strtolower($companyName));
            if (!$company) {
                $errors[] = 'Company "' . $companyName . '" does not exist.';
            } else {
                $fields['company_id'] = $company->id;
            }
        }

        return [
            'row_number' => $line,
            'fields' => $fields,
            'errors' => $errors,
        ];
    }

    private function commitRows(array $rows, string $teamId): array
    {
        $imported = 0;
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

                $payload = [
                    'team_id' => $teamId,
                    'pipeline_id' => $fields['pipeline_id'] ?? null,
                    'stage_id' => $fields['stage_id'] ?? null,
                    'contact_id' => $fields['contact_id'] ?? null,
                    'company_id' => $fields['company_id'] ?? null,
                    'title' => $fields['title'] ?? null,
                    'value' => $fields['value'] ?? 0,
                    'currency' => strtoupper((string) ($fields['currency'] ?? 'USD')),
                    'status' => strtolower((string) ($fields['status'] ?? 'open')),
                    'probability' => $fields['probability'] ?? 0,
                    'expected_close_date' => $fields['expected_close_date'] ?? null,
                ];

                $validator = Validator::make($payload, [
                    'team_id' => ['required', 'uuid'],
                    'pipeline_id' => [
                        'required',
                        'uuid',
                        Rule::exists('pipelines', 'id')->where('team_id', $teamId),
                    ],
                    'stage_id' => [
                        'required',
                        'uuid',
                        Rule::exists('stages', 'id'),
                    ],
                    'contact_id' => [
                        'nullable',
                        'uuid',
                        Rule::exists('contacts', 'id')->where('team_id', $teamId),
                    ],
                    'company_id' => [
                        'nullable',
                        'uuid',
                        Rule::exists('companies', 'id')->where('team_id', $teamId),
                    ],
                    'title' => ['required', 'string', 'max:255'],
                    'value' => ['nullable', 'numeric', 'min:0'],
                    'currency' => ['nullable', 'string', 'size:3'],
                    'status' => ['nullable', 'in:open,won,lost'],
                    'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
                    'expected_close_date' => ['nullable', 'date'],
                ]);

                if ($validator->fails()) {
                    $skipped++;
                    $errors[] = 'Row ' . $line . ': ' . $validator->errors()->first();
                    continue;
                }

                $validated = $validator->validated();
                $stageBelongsToPipeline = Stage::where('id', $validated['stage_id'])
                    ->where('pipeline_id', $validated['pipeline_id'])
                    ->exists();

                if (!$stageBelongsToPipeline) {
                    $skipped++;
                    $errors[] = 'Row ' . $line . ': Selected stage does not belong to selected pipeline.';
                    continue;
                }

                Deal::create($validated);
                $imported++;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            $errors[] = 'Import failed: ' . $e->getMessage();
        }

        return [
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    private function value(array $row, array $mapping, string $field): ?string
    {
        $column = $mapping[$field] ?? null;
        if (!$column) {
            return null;
        }

        $value = $row[$column] ?? null;
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);
        return $value === '' ? null : $value;
    }
}
