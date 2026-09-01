<?php

namespace App\Modules\Ai\Controllers;

use App\Http\Controllers\Controller;
use App\Services\GeminiService;
use Illuminate\Http\Request;

class AiController extends Controller
{
    protected GeminiService $geminiService;

    public function __construct(GeminiService $geminiService)
    {
        $this->geminiService = $geminiService;
    }

    public function status()
    {
        return response()->json([
            'success'       => true,
            'is_configured' => $this->geminiService->isConfigured(),
            'model'         => config('services.gemini.model', 'gemini-3.6-flash'),
        ]);
    }

    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:1000',
            'history' => 'nullable|array',
        ]);

        $result = $this->geminiService->chat(
            $request->input('message'),
            $request->input('history', []),
            $request->user()
        );

        return response()->json($result);
    }

    public function getInsights(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Admin yang dapat mengakses analitik bisnis AI',
            ], 403);
        }

        $result = $this->geminiService->generateDashboardInsights();
        return response()->json($result);
    }

    public function scanInvoice(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Admin yang dapat memindai faktur restock AI',
            ], 403);
        }

        $request->validate([
            'image_base64' => 'required|string',
            'mime_type'    => 'nullable|string',
        ]);

        $result = $this->geminiService->scanRestockInvoice(
            $request->input('image_base64'),
            $request->input('mime_type', 'image/jpeg')
        );

        return response()->json($result);
    }
}
