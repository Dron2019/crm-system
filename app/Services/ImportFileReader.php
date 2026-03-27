<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;

class ImportFileReader
{
    public function read(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: '');

        return match ($extension) {
            'csv', 'txt' => $this->readCsv($file),
            'xlsx', 'xls' => $this->readSpreadsheet($file),
            default => throw new \RuntimeException('Unsupported file type. Use CSV or Excel files.'),
        };
    }

    private function readCsv(UploadedFile $file): array
    {
        $handle = fopen($file->getPathname(), 'r');
        if ($handle === false) {
            throw new \RuntimeException('Unable to open uploaded CSV file.');
        }

        $firstLine = fgets($handle);
        if ($firstLine === false) {
            fclose($handle);
            return [[], []];
        }

        $delimiter = $this->detectDelimiter($firstLine);
        rewind($handle);

        $headers = fgetcsv($handle, 0, $delimiter) ?: [];

        // Support Excel-style separator hint line: sep=,
        if (count($headers) === 1 && is_string($headers[0]) && str_starts_with(strtolower(trim($headers[0])), 'sep=')) {
            $sep = substr(trim($headers[0]), 4, 1);
            if (in_array($sep, [',', ';', "\t", '|'], true)) {
                $delimiter = $sep;
            }
            $headers = fgetcsv($handle, 0, $delimiter) ?: [];
        }

        $headers = array_map([$this, 'sanitizeHeader'], $headers);

        $rows = [];
        while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            if (count(array_filter($row, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $rows[] = $this->mapRow($headers, $row);
        }

        fclose($handle);

        return [$headers, $rows];
    }

    private function readSpreadsheet(UploadedFile $file): array
    {
        if (!class_exists(\PhpOffice\PhpSpreadsheet\IOFactory::class)) {
            throw new \RuntimeException('Excel import requires phpoffice/phpspreadsheet package.');
        }

        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, false);

        if (empty($rows)) {
            return [[], []];
        }

        $headers = array_map([$this, 'sanitizeHeader'], array_values($rows[0]));
        $dataRows = [];

        foreach (array_slice($rows, 1) as $row) {
            $values = array_values($row);
            if (count(array_filter($values, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $dataRows[] = $this->mapRow($headers, $values);
        }

        return [$headers, $dataRows];
    }

    private function mapRow(array $headers, array $row): array
    {
        $result = [];
        foreach ($headers as $index => $header) {
            if ($header === '') {
                continue;
            }
            $result[$header] = isset($row[$index]) ? trim((string) $row[$index]) : null;
        }

        return $result;
    }

    private function sanitizeHeader(string $header): string
    {
        $header = trim($header);
        $header = preg_replace('/^\xEF\xBB\xBF/', '', $header) ?? $header;
        $header = str_replace([' ', '-', '.'], '_', $header);

        return strtolower($header);
    }

    private function detectDelimiter(string $line): string
    {
        $line = preg_replace('/^\xEF\xBB\xBF/', '', $line) ?? $line;

        $candidates = [',', ';', "\t", '|'];
        $bestDelimiter = ',';
        $bestCount = -1;

        foreach ($candidates as $candidate) {
            $count = substr_count($line, $candidate);
            if ($count > $bestCount) {
                $bestCount = $count;
                $bestDelimiter = $candidate;
            }
        }

        return $bestDelimiter;
    }
}
