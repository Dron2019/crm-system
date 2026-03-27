<?php

use Illuminate\Support\Facades\Route;

Route::get('/{any?}', function () {
    $spaIndex = public_path('spa/index.html');

    if (file_exists($spaIndex)) {
        return response()->file($spaIndex);
    }

    return view('welcome');
})->where('any', '^(?!api|sanctum).*$');
