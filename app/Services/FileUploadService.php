<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileUploadService
{
    private const MORPH_MAP = [
        'contact' => \App\Models\Contact::class,
        'company' => \App\Models\Company::class,
        'deal' => \App\Models\Deal::class,
        'note' => \App\Models\Note::class,
        'activity' => \App\Models\Activity::class,
    ];

    public function upload(
        UploadedFile $file,
        string $attachableType,
        string $attachableId,
        User $user,
    ): Attachment {
        $teamId = $user->current_team_id;
        $disk = config('filesystems.default', 'local');
        $directory = "teams/{$teamId}/{$attachableType}/{$attachableId}";
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();

        $path = $file->storeAs($directory, $filename, $disk);

        return Attachment::create([
            'team_id' => $teamId,
            'user_id' => $user->id,
            'attachable_type' => self::MORPH_MAP[$attachableType] ?? $attachableType,
            'attachable_id' => $attachableId,
            'filename' => $filename,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'disk' => $disk,
            'path' => $path,
        ]);
    }

    public function delete(Attachment $attachment): void
    {
        Storage::disk($attachment->disk)->delete($attachment->path);
        $attachment->delete();
    }

    public function getDownloadUrl(Attachment $attachment): string
    {
        $disk = Storage::disk($attachment->disk);

        if (method_exists($disk, 'temporaryUrl')) {
            return $disk->temporaryUrl($attachment->path, now()->addMinutes(30));
        }

        return $disk->url($attachment->path);
    }
}
