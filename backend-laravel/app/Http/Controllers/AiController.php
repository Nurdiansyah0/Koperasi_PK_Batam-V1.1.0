<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\GeminiService;

class AiController extends Controller
{
    protected GeminiService $geminiService;

    public function __construct(GeminiService $geminiService)
    {
        $this->geminiService = $geminiService;
    }

    /**
     * Check AI integration configuration status
     */
    public function status()
    {
        return response()->json([
            'success' => true,
            'is_configured' => $this->geminiService->isConfigured(),
            'model' => config('services.gemini.model', 'gemini-2.5-flash'),
        ]);
    }

    /**
     * Conversational Chat Assistant endpoint
     */
    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:1000',
            'history' => 'nullable|array',
        ]);

        $user = $request->user();
        $message = $request->input('message');
        $history = $request->input('history', []);

        $result = $this->geminiService->chat($message, $history, $user);

        return response()->json($result);
    }

    /**
     * AI Business Insights for Admin Dashboard
     */
    public function getInsights(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Admin yang dapat mengakses analitik bisnis AI'
            ], 403);
        }

        $result = $this->geminiService->generateBusinessInsights();
        return response()->json($result);
    }

    /**
     * AI Multimodal Receipt / Invoice OCR Scanner
     */
    public function scanInvoice(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'kasir'])) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Admin dan Kasir yang dapat memproses faktur restock'
            ], 403);
        }

        $request->validate([
            'image' => 'nullable|image|max:10240', // 10MB
            'image_base64' => 'nullable|string',
            'mime_type' => 'nullable|string',
        ]);

        $base64 = '';
        $mime = 'image/jpeg';

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $mime = $file->getMimeType();
            $base64 = base64_encode(file_get_contents($file->getRealPath()));
        } elseif ($request->filled('image_base64')) {
            $base64 = $request->input('image_base64');
            $mime = $request->input('mime_type', 'image/jpeg');
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Wajib menyertakan file foto nota (image) atau base64 gambar.'
            ], 422);
        }

        $result = $this->geminiService->scanInvoice($base64, $mime);
        return response()->json($result);
    }
}
