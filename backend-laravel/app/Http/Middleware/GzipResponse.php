<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class GzipResponse
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only compress text and JSON responses
        $contentType = $response->headers->get('Content-Type', '');
        $isJsonOrText = str_contains($contentType, 'application/json') || str_contains($contentType, 'text/');

        if (
            $isJsonOrText &&
            function_exists('gzencode') &&
            !headers_sent() &&
            str_contains($request->header('Accept-Encoding', ''), 'gzip') &&
            $response->getContent() &&
            strlen($response->getContent()) > 1024
        ) {
            $compressed = gzencode($response->getContent(), 6);
            if ($compressed !== false) {
                $response->setContent($compressed);
                $response->headers->set('Content-Encoding', 'gzip');
                $response->headers->set('Vary', 'Accept-Encoding');
                $response->headers->set('Content-Length', (string) strlen($compressed));
            }
        }

        return $response;
    }
}
