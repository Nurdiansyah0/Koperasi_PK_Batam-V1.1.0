<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiKeyMiddleware
{
    public function handle(Request $request, Closure $next, ?string $permission = null): Response
    {
        // Handle preflight OPTIONS requests gracefully
        if ($request->isMethod('OPTIONS')) {
            return response('', 200)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY, x-api-key, X-Requested-With');
        }

        // Extract key from Header, Bearer, or Query
        $key = $request->header('X-API-KEY')
            ?? $request->header('x-api-key')
            ?? $request->query('api_key')
            ?? $request->query('apiKey');

        if (! $key && $request->bearerToken() && str_starts_with($request->bearerToken(), 'kop_live_')) {
            $key = $request->bearerToken();
        }

        if (! $key) {
            return response()->json([
                'success' => false,
                'status' => 'UNAUTHORIZED',
                'message' => 'API Key diperlukan. Sertakan via header X-API-KEY atau parameter query ?api_key=...',
                'docs' => url('/api/v1/ping'),
            ], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $apiKey = ApiKey::where('key', $key)->first();

        if (! $apiKey) {
            return response()->json([
                'success' => false,
                'status' => 'INVALID_KEY',
                'message' => 'API Key tidak valid atau tidak terdaftar di sistem Koperasi PKP-PK.',
            ], 401)
                ->header('Access-Control-Allow-Origin', '*');
        }

        if (! $apiKey->is_active) {
            return response()->json([
                'success' => false,
                'status' => 'KEY_DEACTIVATED',
                'message' => 'API Key ini sedang dinonaktifkan oleh administrator.',
            ], 403)
                ->header('Access-Control-Allow-Origin', '*');
        }

        if ($apiKey->isExpired()) {
            return response()->json([
                'success' => false,
                'status' => 'KEY_EXPIRED',
                'message' => 'API Key ini telah kedaluwarsa.',
            ], 403)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check required permission if passed
        if ($permission && ! $apiKey->hasPermission($permission)) {
            return response()->json([
                'success' => false,
                'status' => 'FORBIDDEN',
                'message' => "API Key tidak memiliki izin yang diperlukan: '{$permission}'.",
            ], 403)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Update last used asynchronously / quietly
        try {
            $apiKey->timestamps = false;
            $apiKey->last_used_at = now();
            $apiKey->save();
        } catch (\Throwable $e) {
            // ignore
        }

        // Store model in request attributes
        $request->attributes->set('apiKey', $apiKey);

        $response = $next($request);

        // Append CORS headers for seamless integration with personal websites
        $origin = $request->header('Origin') ?: '*';
        $allowed = $apiKey->allowed_origins ?: '*';

        if ($allowed === '*' || str_contains($allowed, $origin)) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
        } else {
            $response->headers->set('Access-Control-Allow-Origin', '*');
        }

        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY, x-api-key, X-Requested-With');
        $response->headers->set('X-Koperasi-PK-Gateway', 'v2.1-live');

        return $response;
    }
}
