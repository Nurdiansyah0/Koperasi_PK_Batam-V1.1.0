<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json(['message' => 'Koperasi PK API', 'docs' => '/api']));
