<?php

namespace App\Http\Controllers;

use App\Models\Anggota;
use App\Models\ApiKey;
use App\Models\Barang;
use App\Models\PengeluaranOperasional;
use App\Models\Transaksi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExternalApiController extends Controller
{
    /**
     * ── ADMIN MANAGEMENT OF API KEYS (Protected by auth:sanctum + admin) ──
     */
    public function listApiKeys(Request $request)
    {
        $keys = ApiKey::with('creator:user_id,username')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($k) {
                return [
                    'id' => $k->id,
                    'name' => $k->name,
                    'key' => $k->key,
                    'masked_secret' => $k->secret ? substr($k->secret, 0, 10).'...'.substr($k->secret, -6) : null,
                    'permissions' => $k->permissions ?: ['*'],
                    'allowed_origins' => $k->allowed_origins ?: '*',
                    'is_active' => (bool) $k->is_active,
                    'last_used_at' => $k->last_used_at ? $k->last_used_at->toIso8601String() : null,
                    'expires_at' => $k->expires_at ? $k->expires_at->toIso8601String() : null,
                    'is_expired' => $k->isExpired(),
                    'created_by' => $k->creator ? $k->creator->username : 'System',
                    'created_at' => $k->created_at ? $k->created_at->toIso8601String() : null,
                ];
            });

        return response()->json([
            'success' => true,
            'status' => 'SUCCESS',
            'data' => $keys,
            'total' => $keys->count(),
            'gateway_url' => url('/laravel/api/v1'),
        ]);
    }

    public function createApiKey(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'permissions' => 'nullable|array',
            'allowed_origins' => 'nullable|string',
            'expires_in_days' => 'nullable|integer|min:1|max:3650',
        ]);

        $permissions = $validated['permissions'] ?? ['*'];
        $allowedOrigins = $validated['allowed_origins'] ?? '*';
        $expiresInDays = isset($validated['expires_in_days']) ? (int) $validated['expires_in_days'] : null;

        $apiKey = ApiKey::createKey(
            name: $validated['name'],
            permissions: $permissions,
            allowedOrigins: $allowedOrigins,
            expiresInDays: $expiresInDays,
            createdBy: $request->user() ? $request->user()->user_id : null
        );

        return response()->json([
            'success' => true,
            'status' => 'CREATED',
            'message' => 'API Key berhasil dibuat. Simpan API Key ini dengan aman!',
            'data' => [
                'id' => $apiKey->id,
                'name' => $apiKey->name,
                'key' => $apiKey->key,
                'secret' => $apiKey->secret,
                'permissions' => $apiKey->permissions,
                'allowed_origins' => $apiKey->allowed_origins,
                'expires_at' => $apiKey->expires_at ? $apiKey->expires_at->toIso8601String() : null,
                'created_at' => $apiKey->created_at->toIso8601String(),
            ],
        ], 201);
    }

    public function toggleApiKey(Request $request, $id)
    {
        $apiKey = ApiKey::findOrFail($id);
        $apiKey->is_active = ! $apiKey->is_active;
        $apiKey->save();

        return response()->json([
            'success' => true,
            'status' => 'UPDATED',
            'message' => 'Status API Key berhasil diubah.',
            'data' => [
                'id' => $apiKey->id,
                'name' => $apiKey->name,
                'is_active' => $apiKey->is_active,
            ],
        ]);
    }

    public function deleteApiKey($id)
    {
        $apiKey = ApiKey::findOrFail($id);
        $apiKey->delete();

        return response()->json([
            'success' => true,
            'status' => 'DELETED',
            'message' => 'API Key berhasil dihapus secara permanen.',
        ]);
    }

    /**
     * ── EXTERNAL INTEGRATION GATEWAY (Protected by X-API-KEY Middleware) ──
     */

    /**
     * GET /api/v1/ping
     */
    public function ping(Request $request)
    {
        /** @var ApiKey $apiKey */
        $apiKey = $request->attributes->get('apiKey');

        return response()->json([
            'success' => true,
            'status' => 'ONLINE',
            'app_name' => 'Core Engine Koperasi Karyawan PKP-PK BTH',
            'version' => '2.1.0-live',
            'timestamp' => now()->toIso8601String(),
            'client_authenticated' => [
                'name' => $apiKey->name,
                'key_preview' => substr($apiKey->key, 0, 12).'...',
                'permissions' => $apiKey->permissions,
                'allowed_origins' => $apiKey->allowed_origins,
            ],
            'available_endpoints' => [
                'summary' => url('/laravel/api/v1/summary'),
                'katalog' => url('/laravel/api/v1/katalog'),
                'anggota' => url('/laravel/api/v1/anggota'),
                'laporan' => url('/laravel/api/v1/laporan'),
                'transaksi' => url('/laravel/api/v1/transaksi'),
                'assets' => url('/laravel/api/v1/assets'),
                'widget_data' => url('/laravel/api/v1/ui/widget-data'),
            ],
        ]);
    }

    /**
     * GET /api/v1/summary
     */
    public function getSummary(Request $request)
    {
        $totalAnggota = Anggota::count();
        $totalBarang = Barang::count();
        $stokMenipis = Barang::where('stok', '<=', 5)->count();

        $txAgg = Transaksi::whereNotIn('status', ['batal', 'ditolak'])
            ->selectRaw('
                COUNT(*) as total_transaksi,
                COALESCE(SUM(total_harga), 0) as total_omset,
                COALESCE(SUM(total_keuntungan), 0) as total_laba_kotor,
                COALESCE(SUM(CASE WHEN metode_pembayaran = "hutang" THEN total_harga ELSE 0 END), 0) as total_piutang_bon,
                COALESCE(SUM(CASE WHEN metode_pembayaran != "hutang" THEN total_harga ELSE 0 END), 0) as total_kas_masuk
            ')
            ->first();

        $totalOpex = (float) PengeluaranOperasional::sum('nominal');
        $netShu = max(0, ((float) $txAgg->total_laba_kotor) - $totalOpex);

        return response()->json([
            'success' => true,
            'status' => 'SUCCESS',
            'data' => [
                'koperasi' => [
                    'nama' => 'Koperasi Karyawan PKP-PK',
                    'unit' => 'Unit Kerja Bandara Hang Nadim Batam',
                    'total_anggota' => $totalAnggota,
                    'total_produk_katalog' => $totalBarang,
                    'produk_stok_kritis' => $stokMenipis,
                ],
                'finansial' => [
                    'total_transaksi' => (int) $txAgg->total_transaksi,
                    'total_omset' => (float) $txAgg->total_omset,
                    'total_laba_kotor' => (float) $txAgg->total_laba_kotor,
                    'total_pengeluaran_opex' => $totalOpex,
                    'total_net_shu' => $netShu,
                    'alokasi_shu_anggota_60' => round(0.60 * $netShu, 2),
                    'total_kas_masuk' => (float) $txAgg->total_kas_masuk,
                    'total_piutang_berjalan' => (float) $txAgg->total_piutang_bon,
                ],
                'server_time' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * GET /api/v1/katalog
     */
    public function getCatalog(Request $request)
    {
        $q = Barang::query();

        if ($request->filled('search')) {
            $s = '%'.$request->search.'%';
            $q->where('nama_barang', 'like', $s);
        }

        if ($request->boolean('in_stock_only')) {
            $q->where('stok', '>', 0);
        }

        $perPage = min(100, max(1, (int) $request->query('per_page', 30)));
        $paginator = $q->orderBy('nama_barang', 'asc')->paginate($perPage);

        $items = collect($paginator->items())->map(function ($b) {
            return [
                'barang_id' => $b->barang_id,
                'nama_barang' => $b->nama_barang,
                'harga_jual' => (float) $b->harga_jual,
                'harga_modal' => (float) ($b->harga_modal ?? 0),
                'keuntungan' => (float) ($b->keuntungan ?? 0),
                'stok' => (int) $b->stok,
                'stok_toko' => (int) ($b->stok_toko ?? $b->stok),
                'stok_gudang' => (int) ($b->stok_gudang ?? 0),
                'pkm' => (int) ($b->pkm ?? 0),
                'tgl_kadaluarsa_toko' => $b->tgl_kadaluarsa_toko,
                'status_stok' => $b->stok <= 0 ? 'HABIS' : ($b->stok <= 5 ? 'MENIPIS' : 'TERSEDIA'),
            ];
        });

        return response()->json([
            'success' => true,
            'status' => 'SUCCESS',
            'data' => $items,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * GET /api/v1/anggota
     */
    public function getMembers(Request $request)
    {
        $q = Anggota::query();

        if ($request->filled('search')) {
            $s = '%'.$request->search.'%';
            $q->where(function ($query) use ($s) {
                $query->where('nama_lengkap', 'like', $s)
                    ->orWhere('email', 'like', $s);
            });
        }

        $members = $q->orderBy('nama_lengkap', 'asc')->get()->map(function ($a) {
            return [
                'anggota_id' => $a->anggota_id,
                'user_id' => $a->user_id,
                'nama_lengkap' => $a->nama_lengkap,
                'email' => $a->email,
                'saldo_simpanan' => (float) ($a->saldo ?? 0),
                'saldo_hutang' => (float) ($a->hutang ?? 0),
                'saldo_shu' => (float) ($a->shu ?? 0),
                'status' => 'aktif',
            ];
        });

        return response()->json([
            'success' => true,
            'status' => 'SUCCESS',
            'data' => $members,
            'total' => $members->count(),
        ]);
    }

    /**
     * GET /api/v1/anggota/{id}
     */
    public function getMemberDetail(Request $request, $id)
    {
        $member = Anggota::where('anggota_id', $id)->first();

        if (! $member) {
            return response()->json([
                'success' => false,
                'status' => 'NOT_FOUND',
                'message' => 'Anggota tidak ditemukan.',
            ], 404);
        }

        $recentTx = Transaksi::where('anggota_id', $member->anggota_id)
            ->whereNotIn('status', ['batal', 'ditolak'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($t) {
                return [
                    'transaksi_id' => $t->transaksi_id,
                    'total_harga' => (float) $t->total_harga,
                    'metode_pembayaran' => $t->metode_pembayaran,
                    'status' => $t->status,
                    'created_at' => $t->created_at ? $t->created_at->toIso8601String() : null,
                ];
            });

        return response()->json([
            'success' => true,
            'status' => 'SUCCESS',
            'data' => [
                'profil' => [
                    'anggota_id' => $member->anggota_id,
                    'user_id' => $member->user_id,
                    'nama_lengkap' => $member->nama_lengkap,
                    'email' => $member->email,
                    'saldo_simpanan' => (float) ($member->saldo ?? 0),
                    'saldo_hutang' => (float) ($member->hutang ?? 0),
                    'saldo_shu' => (float) ($member->shu ?? 0),
                ],
                'transaksi_terbaru' => $recentTx,
            ],
        ]);
    }

    /**
     * GET /api/v1/laporan
     */
    public function getFinancialReport(Request $request)
    {
        $adminController = app(AdminController::class);
        $res = $adminController->getLaporanTransaksi($request);
        $data = $res->getData(true);

        return response()->json([
            'success' => true,
            'status' => 'SUCCESS',
            'data' => $data,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * GET /api/v1/transaksi
     */
    public function getTransactions(Request $request)
    {
        $q = Transaksi::with(['kasir:user_id,username', 'anggota:anggota_id,nama_lengkap', 'details.barang'])
            ->whereNotIn('status', ['batal', 'ditolak']);

        if ($request->filled('tanggal_awal')) {
            $q->whereDate('created_at', '>=', $request->tanggal_awal);
        }
        if ($request->filled('tanggal_akhir')) {
            $q->whereDate('created_at', '<=', $request->tanggal_akhir);
        }
        if ($request->filled('metode') && $request->metode !== 'all') {
            $q->where('metode_pembayaran', $request->metode);
        }

        $perPage = min(100, max(1, (int) $request->query('per_page', 20)));
        $paginator = $q->orderBy('created_at', 'desc')->paginate($perPage);

        $items = collect($paginator->items())->map(function ($t) {
            return [
                'transaksi_id' => $t->transaksi_id,
                'created_at' => $t->created_at ? $t->created_at->toIso8601String() : null,
                'anggota' => $t->anggota ? [
                    'id' => $t->anggota->anggota_id,
                    'nama' => $t->anggota->nama_lengkap,
                ] : null,
                'kasir' => $t->kasir ? $t->kasir->username : 'System',
                'metode_pembayaran' => $t->metode_pembayaran,
                'total_harga' => (float) $t->total_harga,
                'total_keuntungan' => (float) $t->total_keuntungan,
                'items_count' => $t->details->count(),
                'items' => $t->details->map(function ($d) {
                    return [
                        'barang_id' => $d->barang_id,
                        'nama_barang' => $d->barang ? $d->barang->nama_barang : 'Item #'.$d->barang_id,
                        'jumlah' => (int) $d->jumlah,
                        'harga_satuan' => (float) $d->harga_satuan,
                        'subtotal' => (float) $d->subtotal,
                    ];
                }),
            ];
        });

        return response()->json([
            'success' => true,
            'status' => 'SUCCESS',
            'data' => $items,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * GET /api/v1/assets
     */
    public function getAssets(Request $request)
    {
        $baseUrl = url('/');

        $assets = [
            'branding' => [
                'logo_svg' => $baseUrl.'/Logo.svg',
                'logo_png' => $baseUrl.'/icon-512x512.png',
                'favicon' => $baseUrl.'/favicon.ico',
            ],
            'pwa_icons' => [
                'icon_192' => $baseUrl.'/icon-192x192.png',
                'icon_512' => $baseUrl.'/icon-512x512.png',
                'manifest' => $baseUrl.'/manifest.webmanifest',
            ],
            'media_endpoints' => [
                'product_images_base' => $baseUrl.'/storage/barang/',
                'documents_base' => $baseUrl.'/storage/documents/',
            ],
            'embed_snippets' => [
                'html_logo' => '<img src="'.$baseUrl.'/Logo.svg" alt="Koperasi PKP-PK" width="120" />',
                'iframe_widget' => '<iframe src="'.$baseUrl.'/widget/koperasi" width="100%" height="400" frameborder="0"></iframe>',
            ],
        ];

        return response()->json([
            'success' => true,
            'status' => 'SUCCESS',
            'data' => $assets,
            'base_url' => $baseUrl,
        ]);
    }

    /**
     * GET /api/v1/ui/widget-data
     */
    public function getWidgetData(Request $request)
    {
        $summary = Transaksi::whereNotIn('status', ['batal', 'ditolak'])
            ->selectRaw('
                COUNT(*) as total_struk,
                COALESCE(SUM(total_harga), 0) as omset,
                COALESCE(SUM(total_keuntungan), 0) as laba
            ')
            ->first();

        $opex = (float) PengeluaranOperasional::sum('nominal');
        $netShu = max(0, ((float) $summary->laba) - $opex);

        $popularProducts = DB::table('transaksi_detail')
            ->join('barang', 'transaksi_detail.barang_id', '=', 'barang.barang_id')
            ->select('barang.barang_id', 'barang.nama_barang', 'barang.harga_jual', DB::raw('SUM(transaksi_detail.jumlah) as total_terjual'))
            ->groupBy('barang.barang_id', 'barang.nama_barang', 'barang.harga_jual')
            ->orderByDesc('total_terjual')
            ->limit(6)
            ->get()
            ->map(function ($p) {
                return [
                    'barang_id' => $p->barang_id,
                    'nama_barang' => $p->nama_barang,
                    'harga_jual' => (float) $p->harga_jual,
                    'total_terjual' => (int) $p->total_terjual,
                ];
            });

        return response()->json([
            'success' => true,
            'status' => 'SUCCESS',
            'widget' => [
                'koperasi_title' => 'Koperasi Karyawan PKP-PK Bandara Hang Nadim',
                'stats' => [
                    'total_omset_formatted' => 'Rp '.number_format((float) $summary->omset, 0, ',', '.'),
                    'total_shu_formatted' => 'Rp '.number_format($netShu, 0, ',', '.'),
                    'total_anggota' => Anggota::count(),
                    'total_produk' => Barang::count(),
                ],
                'popular_items' => $popularProducts,
                'branding' => [
                    'logo_url' => url('/Logo.svg'),
                    'primary_color' => '#2563eb',
                    'accent_color' => '#10b981',
                ],
            ],
        ]);
    }
}
