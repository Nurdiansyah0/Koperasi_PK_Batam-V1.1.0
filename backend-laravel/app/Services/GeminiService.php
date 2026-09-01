<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Barang;
use App\Models\Transaksi;
use App\Models\Anggota;

class GeminiService
{
    protected string $apiKey;
    protected string $model;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiKey = (string) config('services.gemini.api_key', env('GEMINI_API_KEY', ''));
        $this->model = (string) config('services.gemini.model', 'gemini-3.6-flash');
        $this->baseUrl = (string) config('services.gemini.base_url', 'https://generativelanguage.googleapis.com/v1beta');
    }

    /**
     * Check if Gemini API is properly configured
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey) && $this->apiKey !== 'YOUR_GEMINI_API_KEY_HERE';
    }

    /**
     * Send raw request to Google AI Studio Gemini API
     */
    public function generateContent(array $contents, ?string $systemInstruction = null, ?array $generationConfig = null): array
    {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'is_demo' => true,
                'message' => 'Google AI Studio API Key belum dikonfigurasi. Tambahkan GEMINI_API_KEY di file backend-laravel/.env.',
            ];
        }

        $url = "{$this->baseUrl}/models/{$this->model}:generateContent?key={$this->apiKey}";

        $payload = [
            'contents' => $contents,
        ];

        if ($systemInstruction) {
            $payload['systemInstruction'] = [
                'parts' => [
                    ['text' => $systemInstruction]
                ]
            ];
        }

        if ($generationConfig) {
            $payload['generationConfig'] = $generationConfig;
        }

        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->post($url, $payload);

            if (!$response->successful()) {
                Log::error('Gemini API Error: ' . $response->body());
                return [
                    'success' => false,
                    'status_code' => $response->status(),
                    'error' => $response->json('error.message') ?? 'Gagal menghubungi Google AI Studio API.',
                ];
            }

            $result = $response->json();
            $text = $result['candidates'][0]['content']['parts'][0]['text'] ?? '';

            return [
                'success' => true,
                'text' => $text,
                'raw' => $result,
            ];
        } catch (\Exception $e) {
            Log::error('Gemini Exception: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Koneksi ke Google AI Studio gagal: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Conversational Assistant with context awareness
     */
    public function chat(string $message, array $history = [], ?User $user = null): array
    {
        $role = $user ? $user->role : 'tamu';
        $username = $user ? $user->username : 'Pengguna';

        // Gather real-time context data based on user role
        $contextData = [];
        if ($user && $role === 'anggota') {
            $anggota = $user->anggota;
            if ($anggota) {
                $contextData['nama'] = $anggota->nama_lengkap ?? $username;
                $contextData['saldo'] = (float) $anggota->saldo;
                $contextData['hutang'] = (float) $anggota->hutang;
                $contextData['shu'] = (float) $anggota->shu;
            }
        } elseif ($user && ($role === 'admin' || $role === 'kasir')) {
            $stokMenipis = Barang::where('stok', '<=', 5)->count();
            $totalProduk = Barang::count();
            $contextData['stok_menipis_count'] = $stokMenipis;
            $contextData['total_produk'] = $totalProduk;
        }

        $systemInstruction = "Anda adalah 'Asisten Pintar Koperasi PK Batam' yang ramah, profesional, ringkas, dan sangat membantu. "
            . "Sistem ini merupakan aplikasi Koperasi Karyawan PK Batam (Sistem Kasir, Simpan Pinjam, Belanja Anggota, dan Manajemen Stok).\n"
            . "Pengguna saat ini: '{$username}' dengan peran '{$role}'.\n"
            . "Data konteks pengguna saat ini: " . json_encode($contextData, JSON_UNESCAPED_UNICODE) . "\n\n"
            . "Pedoman Respon:\n"
            . "1. Gunakan Bahasa Indonesia yang sopan, solutif, dan ramah.\n"
            . "2. Jika ditanya tentang saldo/hutang/SHU anggota, gunakan data konteks di atas secara akurat.\n"
            . "3. Bantu jelaskan fitur-fitur seperti cara belanja, pelunasan hutang, pembayaran QR/Cash/Saldo, serah terima kasir, opname stok, dan bagi hasil SHU (60% Anggota, 10% Cadangan, 30% Koperasi).\n"
            . "4. Jika data tidak tersedia atau fitur membutuhkan otorisasi khusus, jelaskan dengan jelas dan sarankan langkah berikutnya.\n"
            . "5. Format jawaban dengan markdown rapi (bullet points/bold bila perlu).";

        // Build contents from history
        $contents = [];
        foreach ($history as $item) {
            $speaker = ($item['role'] ?? 'user') === 'user' ? 'user' : 'model';
            $contents[] = [
                'role' => $speaker,
                'parts' => [
                    ['text' => (string) ($item['content'] ?? '')]
                ]
            ];
        }

        // Add current message
        $contents[] = [
            'role' => 'user',
            'parts' => [
                ['text' => $message]
            ]
        ];

        // If API key is not configured, provide an intelligent simulated offline response
        if (!$this->isConfigured()) {
            return $this->getMockChatResponse($message, $user);
        }

        $res = $this->generateContent($contents, $systemInstruction);
        if (!$res['success']) {
            // Fallback to offline assistant if network fails
            return $this->getMockChatResponse($message, $user, $res['error'] ?? null);
        }

        return [
            'success' => true,
            'reply' => $res['text'],
            'is_demo' => false,
        ];
    }

    /**
     * Analyze business & inventory performance for Admin
     */
    public function generateBusinessInsights(): array
    {
        // 1. Gather DB statistics
        $totalBarang = Barang::count();
        $stokKritis = Barang::where('stok', '<=', 5)->get(['barang_id', 'nama_barang', 'stok', 'harga_modal', 'harga_jual'])->toArray();
        $totalHutangAnggota = Anggota::sum('hutang');
        $totalSaldoAnggota = Anggota::sum('saldo');
        $totalSHU = Anggota::sum('shu');

        $topSales = DB::table('transaksi_detail')
            ->join('barang', 'transaksi_detail.barang_id', '=', 'barang.barang_id')
            ->select('barang.nama_barang', DB::raw('SUM(transaksi_detail.jumlah) as total_terjual'), DB::raw('SUM(transaksi_detail.subtotal) as total_omset'), DB::raw('SUM(transaksi_detail.keuntungan) as total_profit'))
            ->groupBy('barang.nama_barang')
            ->orderByDesc('total_terjual')
            ->limit(5)
            ->get()
            ->toArray();

        $recentTransactions = Transaksi::orderByDesc('created_at')->limit(10)->get(['total_harga', 'metode_pembayaran', 'status', 'created_at'])->toArray();

        $analyticsPayload = [
            'total_barang' => $totalBarang,
            'stok_kritis_count' => count($stokKritis),
            'daftar_stok_kritis' => array_slice($stokKritis, 0, 8),
            'total_hutang_anggota' => (float) $totalHutangAnggota,
            'total_saldo_anggota' => (float) $totalSaldoAnggota,
            'total_shu_tersedia' => (float) $totalSHU,
            'produk_terlaris' => $topSales,
        ];

        if (!$this->isConfigured()) {
            return [
                'success' => true,
                'is_demo' => true,
                'data' => [
                    'summary' => "Analisis Koperasi menunjukkan perputaran stok aktif dengan total " . count($topSales) . " kategori produk utama. Terdapat " . count($stokKritis) . " item stok kritis yang memerlukan restock segera untuk mencegah hilangnya potensi omset.",
                    'kpi_score' => 88,
                    'highlights' => [
                        'Produk terlaris mendominasi 40%+ dari perputaran harian.',
                        'Terdapat ' . count($stokKritis) . ' barang dengan sisa stok <= 5 unit.',
                        'Rasio piutang terhadap saldo anggota berada dalam batas aman.',
                    ],
                    'recommendations' => [
                        'Segera lakukan restock untuk barang stok kritis menggunakan menu Restock Barang.',
                        'Pertimbangkan penambahan kuantiti grosir untuk 5 produk terlaris agar mendapatkan margin modal lebih hemat.',
                        'Kirim notifikasi pengingat pelunasan bagi anggota dengan hutang mendekati limit.',
                    ],
                    'metrics' => $analyticsPayload,
                ]
            ];
        }

        $systemInstruction = "Anda adalah AI Senior Financial & Business Analyst untuk Koperasi PK Batam. "
            . "Analisis data operasional berikut dan berikan ringkasan eksekutif, highlight penting, dan rekomendasi aksi dalam format JSON terstruktur murni (valid JSON). "
            . "Format JSON yang wajib dihasilkan:\n"
            . "{\n"
            . '  "summary": "string ringkasan eksekutif 2-3 kalimat",' . "\n"
            . '  "kpi_score": 85,' . "\n"
            . '  "highlights": ["point 1", "point 2", "point 3"],' . "\n"
            . '  "recommendations": ["aksi 1", "aksi 2", "aksi 3"],' . "\n"
            . '  "stock_action_needed": ["nama barang 1", "nama barang 2"]' . "\n"
            . "}";

        $contents = [
            [
                'role' => 'user',
                'parts' => [
                    ['text' => "Berikut data operasional koperasi:\n" . json_encode($analyticsPayload, JSON_PRETTY_PRINT)]
                ]
            ]
        ];

        $res = $this->generateContent($contents, $systemInstruction, [
            'responseMimeType' => 'application/json',
            'temperature' => 0.2,
        ]);

        if (!$res['success']) {
            return [
                'success' => false,
                'error' => $res['error'] ?? 'Gagal menganalisis data bisnis.',
            ];
        }

        $parsed = json_decode($res['text'], true);
        if (!$parsed) {
            $parsed = [
                'summary' => $res['text'],
                'kpi_score' => 85,
                'highlights' => [],
                'recommendations' => [],
            ];
        }

        $parsed['metrics'] = $analyticsPayload;

        return [
            'success' => true,
            'is_demo' => false,
            'data' => $parsed,
        ];
    }

    /**
     * OCR Invoice / Struk belanja menggunakan Gemini Multimodal Vision
     */
    public function scanInvoice(string $base64Image, string $mimeType = 'image/jpeg'): array
    {
        if (str_contains($base64Image, ';base64,')) {
            $parts = explode(';base64,', $base64Image);
            $base64Image = $parts[1];
        }

        if (!$this->isConfigured()) {
            return [
                'success' => true,
                'is_demo' => true,
                'message' => 'Simulasi demo scanner OCR (Google AI Studio Key belum diaktifkan).',
                'data' => [
                    'supplier_name' => 'Distributor Sembako Batam (Demo)',
                    'tanggal_nota' => date('Y-m-d'),
                    'total_belanja' => 245000,
                    'items' => [
                        [
                            'nama_barang' => 'Minyak Goreng 2L',
                            'jumlah' => 6,
                            'harga_beli_satuan' => 28000,
                            'total_harga' => 168000,
                            'satuan' => 'Pouch',
                        ],
                        [
                            'nama_barang' => 'Gula Pasir 1kg',
                            'jumlah' => 7,
                            'harga_beli_satuan' => 11000,
                            'total_harga' => 77000,
                            'satuan' => 'Bks',
                        ],
                    ]
                ]
            ];
        }

        $systemInstruction = "Anda adalah AI OCR Akuntansi & Inventaris Koperasi. "
            . "Tugas Anda adalah membaca gambar nota/struk/faktur pembelian barang dari supplier grosir. "
            . "Ekstrak semua baris barang dan rincian harga ke dalam format JSON yang valid:\n"
            . "{\n"
            . '  "supplier_name": "Nama Toko / Distributor",' . "\n"
            . '  "tanggal_nota": "YYYY-MM-DD atau null",' . "\n"
            . '  "total_belanja": 100000,' . "\n"
            . '  "items": [' . "\n"
            . '    {' . "\n"
            . '      "nama_barang": "Nama Barang Jelas",' . "\n"
            . '      "jumlah": 10,' . "\n"
            . '      "harga_beli_satuan": 5000,' . "\n"
            . '      "total_harga": 50000,' . "\n"
            . '      "satuan": "Pcs/Bks/Dus"' . "\n"
            . '    }' . "\n"
            . '  ]' . "\n"
            . "}";

        $contents = [
            [
                'role' => 'user',
                'parts' => [
                    ['text' => 'Ekstrak data barang dan harga dari foto faktur/nota ini secara akurat ke dalam format JSON.'],
                    [
                        'inlineData' => [
                            'mimeType' => $mimeType,
                            'data' => $base64Image,
                        ]
                    ]
                ]
            ]
        ];

        $res = $this->generateContent($contents, $systemInstruction, [
            'responseMimeType' => 'application/json',
            'temperature' => 0.1,
        ]);

        if (!$res['success']) {
            return [
                'success' => false,
                'error' => $res['error'] ?? 'Gagal memproses gambar nota.',
            ];
        }

        $parsed = json_decode($res['text'], true);
        if (!$parsed) {
            return [
                'success' => false,
                'error' => 'Format hasil ekstraksi AI tidak valid.',
                'raw' => $res['text'],
            ];
        }

        return [
            'success' => true,
            'is_demo' => false,
            'data' => $parsed,
        ];
    }

    /**
     * Fallback mock assistant when offline / no key
     */
    protected function getMockChatResponse(string $message, ?User $user, ?string $apiError = null): array
    {
        $role = $user ? $user->role : 'tamu';
        $name = $user ? $user->username : 'Bapak/Ibu';
        $lower = strtolower($message);

        $reply = "";
        if (str_contains($lower, 'saldo') || str_contains($lower, 'uang')) {
            if ($role === 'anggota' && $user && $user->anggota) {
                $saldo = number_format($user->anggota->saldo, 0, ',', '.');
                $reply = "Halo {$name}, saldo simpanan anggota Anda saat ini tercatat sebesar **Rp {$saldo}**.";
            } else {
                $reply = "Fitur pengecekan saldo pribadi tersedia untuk akun Anggota.";
            }
        } elseif (str_contains($lower, 'hutang') || str_contains($lower, 'tagihan')) {
            if ($role === 'anggota' && $user && $user->anggota) {
                $hutang = number_format($user->anggota->hutang, 0, ',', '.');
                $reply = "Total tagihan hutang belanja Anda saat ini adalah **Rp {$hutang}**. Anda dapat mengajukan pembayaran via menu **Bayar Hutang**.";
            } else {
                $reply = "Data hutang anggota dapat dipantau di menu Kasir atau Admin.";
            }
        } elseif (str_contains($lower, 'stok') || str_contains($lower, 'barang')) {
            $barangCount = Barang::count();
            $kritis = Barang::where('stok', '<=', 5)->count();
            $reply = "Katalog Koperasi saat ini memiliki total **{$barangCount} item barang**, dengan **{$kritis} item** berstatus stok menipis (<= 5).";
        } elseif (str_contains($lower, 'shu') || str_contains($lower, 'bagi hasil')) {
            $reply = "SHU (Sisa Hasil Usaha) dihitung otomatis dari profit belanja Anda dengan skema pembagian: **60% untuk Anggota**, **10% Cadangan Koperasi**, dan **30% Operasional Koperasi**.";
        } else {
            $reply = "Halo {$name}! Saya adalah Asisten AI Koperasi PK Batam. "
                . "Saya dapat membantu menjawab informasi saldo anggota, panduan belanja, cek ketersediaan stok barang, prosedur serah terima kasir, hingga rekapitulasi keuangan koperasi.";
        }

        if ($apiError) {
            $reply .= "\n\n*(Catatan: Mode Offline Aktif. Google AI Studio API: {$apiError})*";
        } elseif (!$this->isConfigured()) {
            $reply .= "\n\n*(💡 Tips: Hubungkan Google AI Studio dengan mengisi `GEMINI_API_KEY` pada file `.env` untuk mengaktifkan pemrosesan AI Gemini 2.5 Flash secara penuh).*";
        }

        return [
            'success' => true,
            'reply' => $reply,
            'is_demo' => true,
        ];
    }
}
