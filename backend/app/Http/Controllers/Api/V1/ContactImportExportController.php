<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ContactResource;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ContactImportExportController extends Controller
{
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
            'mapping' => 'required|array',
            'mapping.first_name' => 'required|string',
        ]);

        $file = $request->file('file');
        $mapping = $request->input('mapping');
        $teamId = $request->user()->current_team_id;

        $handle = fopen($file->getPathname(), 'r');
        $headers = fgetcsv($handle);

        if (!$headers) {
            fclose($handle);
            return response()->json(['message' => 'Invalid CSV file.'], 422);
        }

        $imported = 0;
        $skipped = 0;
        $errors = [];

        DB::beginTransaction();

        try {
            $rowNum = 1;
            while (($row = fgetcsv($handle)) !== false) {
                $rowNum++;
                $data = array_combine($headers, $row);

                if ($data === false) {
                    $skipped++;
                    continue;
                }

                $contactData = ['team_id' => $teamId];
                foreach ($mapping as $field => $csvColumn) {
                    if (isset($data[$csvColumn])) {
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
                    $errors[] = "Row {$rowNum}: " . $validator->errors()->first();
                    continue;
                }

                Contact::create($contactData);
                $imported++;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            fclose($handle);
            return response()->json(['message' => 'Import failed: ' . $e->getMessage()], 500);
        }

        fclose($handle);

        return response()->json([
            'message' => "Import completed. {$imported} contacts imported, {$skipped} skipped.",
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => array_slice($errors, 0, 20),
        ]);
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
}
