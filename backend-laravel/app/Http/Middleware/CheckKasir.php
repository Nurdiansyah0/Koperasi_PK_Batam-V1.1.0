<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckKasir
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || ! $user->isKasir()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: Hanya Petugas Kasir atau Admin yang memiliki izin akses fitur ini.',
            ], 403);
        }

        return $next($request);
    }
}
