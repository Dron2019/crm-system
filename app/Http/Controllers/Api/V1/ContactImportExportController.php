<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Contact;
use App\Services\ImportFileReader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ContactImportExportController extends Controller
{
    public function __construct(private readonly ImportFileReader $importFileReader)
    {
    }

    public function import(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermission('contacts.import')) {
            return response()->json(['message' => 'Only owner/admin can import contacts.'], 403);
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
        if (empty($mapping['first_name'])) {
            return response()->json(['message' => 'Could not map required "first_name" column.'], 422);
        }

        $teamId = $request->user()->current_team_id;

        $imported = 0;
        $skipped = 0;
        $errors = [];

        DB::beginTransaction();

        try {
            foreach ($rows as $index => $data) {
                $line = $index + 2;

                $contactData = ['team_id' => $teamId];
                foreach ($mapping as $field => $csvColumn) {
                    if (!empty($csvColumn) && isset($data[$csvColumn])) {
                        $contactData[$field] = $data[$csvColumn];
                    }
                }

                $validator = Validator::make($contactData, [
                    'first_name' => 'required|string|max:255',
                    'last_name' => 'nullable|string|max:255',
                    'email' => 'nullable|email|max:255',
                    'phone' => 'nullable|string|max:50',
                ]);

                if ($validator->fails()) {
                    $skipped++;
                    $errors[] = "Row {$line}: " . $validator->errors()->first();
                    continue;
                }

                Contact::create($contactData);
                $imported++;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Import failed: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'message' => "Import completed. {$imported} contacts imported, {$skipped} skipped.",
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => array_slice($errors, 0, 20),
            'detected_headers' => $headers,
            'mapping_used' => $mapping,
        ]);
    }

    public function template(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        if (!request()->user()?->hasPermission('contacts.import')) {
            abort(403, 'Only owner/admin can download contact import template.');
        }

        $headers = [
            'first_name', 'last_name', 'email', 'phone', 'mobile', 'job_title', 'source', 'status',
        ];

        return response()->streamDownload(function () use ($headers) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fwrite($out, "sep=,\n");
            fputcsv($out, $headers);
            fputcsv($out, ['John', 'Doe', 'john@example.com', '+38000000000', '', 'Sales Manager', 'website', 'lead']);
            fclose($out);
        }, 'contacts-import-template.csv', ['Content-Type' => 'text/csv']);
    }

    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $request->validate([
            'fields' => 'nullable|array',
            'status' => 'nullable|string',
        ]);

        $fields = $request->input('fields', [
            'first_name', 'last_name', 'email', 'phone', 'mobile',
            'job_title', 'source', 'status',
        ]);

        $query = Contact::query()
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s));

        $filename = 'contacts-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($query, $fields) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            fwrite($handle, "sep=,\n");
            fputcsv($handle, $fields);

            $query->select($fields)->chunkById(500, function ($contacts) use ($handle, $fields) {
                foreach ($contacts as $contact) {
                    $row = [];
                    foreach ($fields as $field) {
                        $row[] = $contact->{$field} ?? '';
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
            'first_name' => ['first_name', 'firstname', 'name'],
            'last_name' => ['last_name', 'lastname', 'surname'],
            'email' => ['email'],
            'phone' => ['phone', 'phone_number'],
            'mobile' => ['mobile', 'mobile_phone'],
            'job_title' => ['job_title', 'position', 'title'],
            'source' => ['source'],
            'status' => ['status'],
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
}
