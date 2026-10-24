<?php

namespace App\Http\Controllers;

use App\Actions\Members\CalculateShuWithdrawalEligibilityAction;
use App\Models\Anggota;
use App\Models\Barang;
use App\Models\PembayaranHutang;
use App\Models\TarikTunai;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\User;
use App\Notifications\PesananBaruNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

class AnggotaController extends Controller
{
    // Ensure only members can access
    public function __construct()
    {
        // We can add middleware logic in routes, but let's ensure the user is 'anggota'
    }

    private function getAnggotaId(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->anggota) {
            abort(403, 'Akses ditolak. Akun Anda tidak memiliki profil data anggota terdaftar.');
        }

        return $user->anggota->anggota_id;
    }

    public function getProfil(Request $request)
    {
        $anggotaId = $this->getAnggotaId($request);
        $user = $request->user();
        $anggota = $user->anggota;

        return response()->json([
            'success' => true,
            'user' => [
                'anggota_id' => $anggota->anggota_id,
                'user_id' => $user->user_id,
                'nama_lengkap' => $anggota->nama_lengkap,
                'saldo' => (float) $anggota->saldo,
                'hutang' => (float) $anggota->hutang,
                'shu' => (float) $anggota->shu,
                'simpanan_pokok' => (float) $anggota->simpanan_pokok,
                'allowance_hutang' => (float) $anggota->allowance_hutang,
                'limit_hutang' => (float) $anggota->limit_hutang,
                'sisa_limit_hutang' => (float) $anggota->sisa_limit_hutang,
            ],
        ]);
    }

    public function getDataBarangBelanja(Request $request)
    {
        $barang = Barang::select('barang_id', 'nama_barang', 'stok_toko as stok', 'harga_jual')
            ->where('stok_toko', '>', 0)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $barang,
        ]);
    }

    public function getPaketBelanja(Request $request)
    {
        $user = $request->user();
        $anggotaId = ($user && $user->anggota) ? $user->anggota->anggota_id : null;

        // 1. Load active products indexed by ID
        $allBarang = Barang::where('stok_toko', '>', 0)->get()->keyBy('barang_id');

        // Helper to build a package
        $makePackage = function ($id, $nama, $deskripsi, $tag, $icon, $itemDefs) use ($allBarang) {
            $items = [];
            $totalHarga = 0;
            $isAvailable = true;

            foreach ($itemDefs as $def) {
                $barangId = $def['barang_id'];
                $qty = $def['jumlah'];
                $barang = $allBarang->get($barangId);

                if (! $barang || $barang->stok < $qty) {
                    $isAvailable = false;
                }

                $hargaSatuan = $barang ? (float) $barang->harga_jual : (float) $def['fallback_harga'];
                $namaBarang = $barang ? $barang->nama_barang : $def['fallback_nama'];
                $subtotal = $hargaSatuan * $qty;
                $totalHarga += $subtotal;

                $items[] = [
                    'barang_id' => $barangId,
                    'nama_barang' => $namaBarang,
                    'jumlah' => $qty,
                    'qty' => $qty,
                    'harga_satuan' => $hargaSatuan,
                    'subtotal' => $subtotal,
                    'stok_tersedia' => $barang ? $barang->stok : 0,
                ];
            }

            return [
                'id' => $id,
                'nama_paket' => $nama,
                'deskripsi' => $deskripsi,
                'tag' => $tag,
                'icon' => $icon,
                'total_harga' => $totalHarga,
                'items' => $items,
                'is_available' => $isAvailable,
            ];
        };

        // Standard smart curated bundles (eliminating 500s into round numbers)
        $paketList = [];

        // Paket 1: Ngopi Manis Genap (Rp 4.000)
        $paketList[] = $makePackage(
            'ngopi_manis',
            'Paket Ngopi Manis Pas',
            'Kopi seduh hitam + gula sachet takaran pas tanpa pecahan 500.',
            'Genap Pas Rp 4.000',
            '☕',
            [
                ['barang_id' => 53, 'jumlah' => 1, 'fallback_nama' => 'Kopi', 'fallback_harga' => 3500],
                ['barang_id' => 57, 'jumlah' => 1, 'fallback_nama' => 'Gula sachet', 'fallback_harga' => 500],
            ]
        );

        // Paket 2: Kopi Susu Mantap (Rp 6.000)
        $paketList[] = $makePackage(
            'kopi_susu',
            'Paket Kopi Susu Mantap',
            'Racikan kopi hitam + gula sachet + susu kental manis legit komplit.',
            'Paling Laris Rp 6.000',
            '🥛',
            [
                ['barang_id' => 53, 'jumlah' => 1, 'fallback_nama' => 'Kopi', 'fallback_harga' => 3500],
                ['barang_id' => 57, 'jumlah' => 1, 'fallback_nama' => 'Gula sachet', 'fallback_harga' => 500],
                ['barang_id' => 46, 'jumlah' => 1, 'fallback_nama' => 'Susu Sachet', 'fallback_harga' => 2000],
            ]
        );

        // Paket 3: Sarapan Indomie + Telur (Rp 7.000)
        $paketList[] = $makePackage(
            'sarapan_indomie',
            'Paket Sarapan Indomie Telur',
            'Indomie goreng gurih lezat dipadukan telur ayam segar bergizi.',
            'Favorit Karyawan Rp 7.000',
            '🍳',
            [
                ['barang_id' => 40, 'jumlah' => 1, 'fallback_nama' => 'Indomie Goreng', 'fallback_harga' => 4000],
                ['barang_id' => 38, 'jumlah' => 1, 'fallback_nama' => 'Telur', 'fallback_harga' => 3000],
            ]
        );

        // Paket 4: Sarapan Komplit + Teh (Rp 12.000)
        $paketList[] = $makePackage(
            'sarapan_komplit',
            'Paket Sarapan Komplit + Teh',
            'Indomie goreng + telur ayam segar + teh botol sosro dingin segar.',
            'Kenyang Mantap Rp 12.000',
            '🥤',
            [
                ['barang_id' => 40, 'jumlah' => 1, 'fallback_nama' => 'Indomie Goreng', 'fallback_harga' => 4000],
                ['barang_id' => 38, 'jumlah' => 1, 'fallback_nama' => 'Telur', 'fallback_harga' => 3000],
                ['barang_id' => 20, 'jumlah' => 1, 'fallback_nama' => 'Teh Botol', 'fallback_harga' => 5000],
            ]
        );

        // Paket 5: Lembur Cup Mie + Telur (Rp 9.000)
        $paketList[] = $makePackage(
            'lembur_cup',
            'Paket Lembur Cup Soto Telur',
            'Cup mie sedap kuah soto hangat praktis + telur ayam siap seduh.',
            'Hangat Praktis Rp 9.000',
            '🍜',
            [
                ['barang_id' => 85, 'jumlah' => 1, 'fallback_nama' => 'Cup sedap soto', 'fallback_harga' => 6000],
                ['barang_id' => 38, 'jumlah' => 1, 'fallback_nama' => 'Telur', 'fallback_harga' => 3000],
            ]
        );

        // Paket 6: Lembur Komplit + Teh Botol (Rp 14.000)
        $paketList[] = $makePackage(
            'lembur_komplit',
            'Paket Lembur Shift Malam Komplit',
            'Cup mie soto hangat + telur ayam + teh botol segar amunisi kerja.',
            'Shift Malam Rp 14.000',
            '🌙',
            [
                ['barang_id' => 85, 'jumlah' => 1, 'fallback_nama' => 'Cup sedap soto', 'fallback_harga' => 6000],
                ['barang_id' => 38, 'jumlah' => 1, 'fallback_nama' => 'Telur', 'fallback_harga' => 3000],
                ['barang_id' => 20, 'jumlah' => 1, 'fallback_nama' => 'Teh Botol', 'fallback_harga' => 5000],
            ]
        );

        // Paket 7: Snack Sore Santai (Rp 5.000)
        $paketList[] = $makePackage(
            'snack_sore',
            'Paket Snack Cokelat Sore',
            'Kombinasi Beng-Beng wafer cokelat renyah dan biskuit Goodtime manis.',
            'Cemilan Pas Rp 5.000',
            '🍪',
            [
                ['barang_id' => 44, 'jumlah' => 1, 'fallback_nama' => 'Beng-Beng', 'fallback_harga' => 2500],
                ['barang_id' => 45, 'jumlah' => 1, 'fallback_nama' => 'Goodtime', 'fallback_harga' => 2500],
            ]
        );

        // 2. Paket Berdasarkan Barang yang Paling Sering Dibeli Anggota
        $seringDibeli = null;
        if ($anggotaId) {
            $topHistory = DB::table('transaksi_detail')
                ->join('transaksi', 'transaksi_detail.transaksi_id', '=', 'transaksi.transaksi_id')
                ->where('transaksi.anggota_id', $anggotaId)
                ->select('transaksi_detail.barang_id', DB::raw('COUNT(*) as freq'), DB::raw('SUM(transaksi_detail.jumlah) as total_qty'))
                ->groupBy('transaksi_detail.barang_id')
                ->orderBy('freq', 'desc')
                ->limit(3)
                ->get();

            if ($topHistory->isNotEmpty()) {
                $itemDefs = [];
                foreach ($topHistory as $th) {
                    $b = $allBarang->get($th->barang_id);
                    if ($b) {
                        $itemDefs[] = [
                            'barang_id' => $b->barang_id,
                            'jumlah' => 1,
                            'fallback_nama' => $b->nama_barang,
                            'fallback_harga' => (float) $b->harga_jual,
                        ];
                    }
                }

                if (! empty($itemDefs)) {
                    $seringDibeli = $makePackage(
                        'sering_dibeli',
                        'Yang Sering Anda Beli',
                        'Kombinasi barang yang paling sering Anda beli dari histori transaksi Anda.',
                        'Sering Anda Beli',
                        '⭐',
                        $itemDefs
                    );
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => $paketList,
            'sering_dibeli' => $seringDibeli,
        ]);
    }

    public function simpanTransaksi(Request $request)
    {
        $request->validate([
            'metode_pembayaran' => 'required|string|in:cash,qr,ewallet,saldo,transfer,hutang,potong_tarik_tunai',
            'items' => 'required|array',
            'items.*.barang_id' => 'required|integer',
            'items.*.jumlah' => 'required|integer|min:1',
            'sertakan_tarik_tunai' => 'nullable|boolean',
            'tarik_tunai_nominal' => 'nullable|numeric|min:1000',
            'tarik_tunai_sumber' => 'nullable|in:shu,saldo',
            'persetujuan_shu' => 'nullable|boolean',
        ]);

        $anggotaId = $this->getAnggotaId($request);
        $metode = $request->metode_pembayaran === 'saldo' ? 'ewallet' : $request->metode_pembayaran;
        $items = $request->items;

        DB::beginTransaction();
        try {
            // 1. Canonical Lock Hierarchy Step 1: Deterministic ascending Barang pre-locking
            $uniqueBarangIds = array_values(array_unique(array_column($items, 'barang_id')));
            sort($uniqueBarangIds);

            $lockedBarangs = [];
            foreach ($uniqueBarangIds as $bId) {
                $b = Barang::where('barang_id', $bId)->lockForUpdate()->first();
                if (! $b) {
                    throw new \Exception('Stok etalase tidak mencukupi untuk barang ID: '.$bId);
                }
                $lockedBarangs[$bId] = $b;
            }

            $totalHarga = 0;
            $totalKeuntungan = 0;
            $transaksiItems = [];

            foreach ($items as $item) {
                $barang = $lockedBarangs[$item['barang_id']] ?? null;

                if (! $barang || $barang->stok_toko < $item['jumlah']) {
                    throw new \Exception('Stok etalase tidak mencukupi untuk barang ID: '.$item['barang_id']);
                }

                $subtotal = $barang->harga_jual * $item['jumlah'];
                $keuntungan = ($barang->harga_jual - $barang->harga_modal) * $item['jumlah'];

                $totalHarga += $subtotal;
                $totalKeuntungan += $keuntungan;

                $transaksiItems[] = [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => $item['jumlah'],
                    'harga_satuan' => $barang->harga_jual,
                    'subtotal' => $subtotal,
                    'keuntungan' => $keuntungan,
                ];

                $barang->stok_toko -= $item['jumlah'];
                $barang->save();
            }

            // 2. Canonical Lock Hierarchy Step 2: Lock the Anggota row
            $anggota = Anggota::where('anggota_id', $anggotaId)->lockForUpdate()->first();
            if (! $anggota) {
                throw new \Exception('Data Anggota tidak ditemukan.');
            }

            $tarikTunaiData = null;
            if (! empty($request->sertakan_tarik_tunai) && (float) $request->tarik_tunai_nominal > 0) {
                // Minimum purchase check (strictly > Rp 25.000)
                if ($totalHarga <= 25000) {
                    throw new \Exception('Syarat tarik tunai saat belanja: Total pesanan belanja harus lebih dari Rp 25.000 (Pesanan saat ini: Rp '.number_format($totalHarga, 0, ',', '.').').');
                }

                $nominalTarik = (float) $request->tarik_tunai_nominal;
                $sumberTarik = $request->tarik_tunai_sumber ?: 'shu';

                if ($sumberTarik === 'shu') {
                    $eligibility = app(CalculateShuWithdrawalEligibilityAction::class)->execute($anggota, $totalHarga);
                    if ($nominalTarik > $eligibility['final_withdrawal_limit']) {
                        throw new \Exception('Nominal tarik tunai (Rp '.number_format($nominalTarik, 0, ',', '.').') melebihi batas maksimal penarikan SHU Rp '.number_format($eligibility['final_withdrawal_limit'], 0, ',', '.').'.');
                    }
                    if ($nominalTarik > (float) $anggota->shu) {
                        throw new \Exception('Saldo SHU Anda tidak mencukupi (Tersedia: Rp '.number_format((float) $anggota->shu, 0, ',', '.').').');
                    }
                } else {
                    $maxPlafon = 100000.0;
                    if ($nominalTarik > $maxPlafon) {
                        throw new \Exception('Nominal tarik tunai (Rp '.number_format($nominalTarik, 0, ',', '.').') melebihi batas maksimal Rp '.number_format($maxPlafon, 0, ',', '.').'.');
                    }
                    if ($nominalTarik > (float) $anggota->saldo) {
                        throw new \Exception('Saldo E-Wallet Anda tidak mencukupi (Tersedia: Rp '.number_format((float) $anggota->saldo, 0, ',', '.').').');
                    }
                }

                // Master consent check
                if (! $anggota->persetujuan_shu_master_at && ! $request->persetujuan_shu) {
                    throw new \Exception('Wajib menyetujui ketentuan pemotongan SHU Hari Besar (Master Consent).');
                }

                if (! $anggota->persetujuan_shu_master_at) {
                    $anggota->persetujuan_shu_master_at = Carbon::now();
                    $anggota->persetujuan_shu_version = 'v1.0';
                }

                // Deduct balance
                if ($sumberTarik === 'shu') {
                    $anggota->shu -= $nominalTarik;
                } else {
                    $anggota->saldo -= $nominalTarik;
                }
                $anggota->save();

                $uangBersihDiserahkan = max(0, $nominalTarik - $totalHarga);
                $kodePenarikan = 'TRK-'.date('ymd').'-'.rand(1000, 9999);

                $tarik = TarikTunai::create([
                    'kode_penarikan' => $kodePenarikan,
                    'kasir_id' => null,
                    'anggota_id' => $anggota->anggota_id,
                    'nominal' => $nominalTarik,
                    'status' => 'pending',
                    'sumber_dana' => $sumberTarik,
                    'persetujuan_shu' => true,
                    'keterangan' => 'Tarik Tunai Belanja App (Potong Belanja Rp '.number_format($totalHarga, 0, ',', '.').', Kas Rp '.number_format($uangBersihDiserahkan, 0, ',', '.').')',
                    'created_at' => Carbon::now(),
                ]);

                $tarikTunaiData = [
                    'tarik_id' => $tarik->tarik_id,
                    'kode_penarikan' => $tarik->kode_penarikan,
                    'nominal_tarik' => $nominalTarik,
                    'potong_belanja' => $totalHarga,
                    'uang_bersih_diserahkan' => $uangBersihDiserahkan,
                    'sumber_dana' => $sumberTarik,
                    'sisa_shu' => (float) $anggota->shu,
                    'sisa_saldo' => (float) $anggota->saldo,
                ];

                $metode = 'potong_tarik_tunai';
            } else {
                // If paying by hutang or ewallet
                if ($metode === 'hutang') {
                    $sisa_limit = (float) $anggota->sisa_limit_hutang;
                    if ($sisa_limit <= 0 || $totalHarga > $sisa_limit) {
                        throw new \Exception('Gagal: Limit hutang Koperasi tidak mencukupi. Sisa limit Anda: Rp '.number_format($sisa_limit > 0 ? $sisa_limit : 0, 0, ',', '.'));
                    }

                    $anggota->hutang += $totalHarga;
                    $anggota->save();
                } elseif ($metode === 'ewallet' || $metode === 'saldo') {
                    if ($anggota->saldo < $totalHarga) {
                        throw new \Exception('Saldo tidak mencukupi');
                    }
                    $anggota->saldo -= $totalHarga;
                    $anggota->save();
                }
            }

            $transaksi = Transaksi::create([
                'anggota_id' => $anggota->anggota_id,
                'kasir_id' => null,
                'total_harga' => $totalHarga,
                'total_keuntungan' => $totalKeuntungan,
                'metode_pembayaran' => $metode,
                'status' => 'pending',
            ]);

            if ($tarikTunaiData && isset($tarik)) {
                $tarik->transaksi_id = $transaksi->transaksi_id;
                $tarik->save();
            }

            foreach ($transaksiItems as $tItem) {
                $tItem['transaksi_id'] = $transaksi->transaksi_id;
                TransaksiDetail::create($tItem);
            }

            DB::commit();

            // Broadcast real-time order event to Cache for 0-latency SSE & Push Notification
            try {
                $itemNames = Barang::whereIn('barang_id', array_column($transaksiItems, 'barang_id'))
                    ->pluck('nama_barang', 'barang_id');
                $itemsSummary = collect($transaksiItems)->map(function ($it) use ($itemNames) {
                    return $it['jumlah'].'x '.($itemNames[$it['barang_id']] ?? 'Item');
                })->implode(', ');

                $orderEvent = [
                    'transaksi_id' => $transaksi->transaksi_id,
                    'anggota_id' => $anggota->anggota_id,
                    'nama_anggota' => $anggota->nama_lengkap,
                    'username' => $anggota->username ?? '',
                    'total_harga' => (float) $totalHarga,
                    'metode_pembayaran' => $metode,
                    'items_count' => count($transaksiItems),
                    'items_summary' => $itemsSummary,
                    'items' => collect($transaksiItems)->map(function ($it) use ($itemNames) {
                        return [
                            'barang_id' => $it['barang_id'],
                            'nama_barang' => $itemNames[$it['barang_id']] ?? 'Item #'.$it['barang_id'],
                            'jumlah' => $it['jumlah'],
                            'harga_satuan' => (float) $it['harga_satuan'],
                            'subtotal' => (float) $it['subtotal'],
                        ];
                    })->values()->all(),
                    'created_at' => now()->toIso8601String(),
                    'timestamp' => microtime(true),
                ];

                Cache::put('koperasi_latest_order_event', $orderEvent, 120);
                Cache::put('koperasi_latest_order_timestamp', microtime(true), 120);

                // Dispatch Web Push Notification
                try {
                    $kasirs = User::where('role', 'kasir')->get();
                    Notification::send($kasirs, new PesananBaruNotification($orderEvent));
                } catch (\Throwable $ex) {
                    // Non-blocking
                }
            } catch (\Throwable $e) {
                // Non-blocking
            }

            return response()->json([
                'success' => true,
                'message' => $tarikTunaiData
                    ? 'Pesanan belanja & tiket tarik tunai #'.$tarikTunaiData['kode_penarikan'].' berhasil dibuat! Ambil kas bersih sebesar Rp '.number_format($tarikTunaiData['uang_bersih_diserahkan'], 0, ',', '.').' di kasir.'
                    : 'Pesanan berhasil dibuat, silakan ke kasir.',
                'transaksi_id' => $transaksi->transaksi_id,
                'tarik_tunai' => $tarikTunaiData,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function getHistoriTransaksi(Request $request)
    {
        $anggotaId = $this->getAnggotaId($request);

        $paginator = Transaksi::with(['details.barang', 'kasir'])
            ->where('anggota_id', $anggotaId)
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        $paginator->getCollection()->transform(function ($t) {
            return [
                'transaksi_id' => $t->transaksi_id,
                'anggota_id' => $t->anggota_id,
                'kasir_id' => $t->kasir_id,
                'total_harga' => (float) $t->total_harga,
                'total_keuntungan' => (float) $t->total_keuntungan,
                'metode_pembayaran' => $t->metode_pembayaran,
                'status' => $t->status,
                'created_at' => $t->created_at ? $t->created_at->toIso8601String() : null,
                'nama_kasir' => $t->kasir ? $t->kasir->username : null,
                'items' => $t->details->map(function ($d) {
                    return [
                        'transaksi_detail_id' => $d->transaksi_detail_id,
                        'barang_id' => $d->barang_id,
                        'nama_barang' => $d->barang ? $d->barang->nama_barang : 'Barang Terhapus',
                        'jumlah' => $d->jumlah,
                        'harga_satuan' => (float) $d->harga_satuan,
                        'subtotal' => (float) $d->subtotal,
                        'keuntungan' => (float) $d->keuntungan,
                    ];
                }),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $paginator,
        ]);
    }

    public function bayarHutang(Request $request)
    {
        $request->validate([
            'jumlah' => 'required|numeric|min:1',
        ]);

        $anggotaId = $this->getAnggotaId($request);

        $pembayaran = PembayaranHutang::create([
            'anggota_id' => $anggotaId,
            'nominal' => $request->jumlah,
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan pembayaran hutang berhasil dibuat, silakan bayar ke kasir.',
            'pembayaran_id' => $pembayaran->pembayaran_id,
        ]);
    }

    public function getHistoriBayarHutang(Request $request)
    {
        $anggotaId = $this->getAnggotaId($request);

        $history = PembayaranHutang::where('anggota_id', $anggotaId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $history,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'username' => 'required|string|unique:users,username,'.$request->user()->user_id.',user_id',
        ]);

        $user = $request->user();
        $user->username = $request->username;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diupdate',
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Password saat ini salah',
            ], 400);
        }

        $user->password_hash = Hash::make($request->new_password);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diubah',
        ]);
    }

    public function setujuiMasterConsentShu(Request $request)
    {
        $anggotaId = $this->getAnggotaId($request);
        $anggota = Anggota::findOrFail($anggotaId);

        $anggota->persetujuan_shu_master_at = Carbon::now();
        $anggota->persetujuan_shu_version = 'v1.0';
        $anggota->save();

        return response()->json([
            'success' => true,
            'message' => 'Persetujuan Sadar Penarikan SHU (Master Consent) berhasil disimpan.',
            'data' => [
                'has_master_consent' => true,
                'persetujuan_shu_master_at' => $anggota->persetujuan_shu_master_at,
            ],
        ]);
    }

    public function cekKelayakanTarikTunai(Request $request)
    {
        $anggotaId = $this->getAnggotaId($request);
        $anggota = Anggota::findOrFail($anggotaId);

        // Today's completed transactions strictly > 25k
        $todayPurchases = Transaksi::where('anggota_id', $anggotaId)
            ->where('status', 'selesai')
            ->where('created_at', '>=', Carbon::today())
            ->where('total_harga', '>', 25000)
            ->orderBy('created_at', 'desc')
            ->get(['transaksi_id', 'total_harga', 'metode_pembayaran', 'created_at']);

        $totalBelanjaHariIni = (float) $todayPurchases->sum('total_harga');
        $hasQualifyingPurchase = $todayPurchases->isNotEmpty();
        $qualifyingBelanja = $hasQualifyingPurchase ? (float) $todayPurchases->max('total_harga') : 0.0;

        $eligibility = app(CalculateShuWithdrawalEligibilityAction::class)->execute($anggota, $qualifyingBelanja);

        // Check any ongoing pending withdrawal
        $pendingWithdrawal = TarikTunai::where('anggota_id', $anggotaId)
            ->where('status', 'pending')
            ->first();

        $ineligibleReasons = $eligibility['ineligible_reasons'];
        if ($pendingWithdrawal) {
            $ineligibleReasons[] = "Anda memiliki tiket penarikan aktif #{$pendingWithdrawal->kode_penarikan} yang belum diproses kasir.";
        }

        $isEligible = $eligibility['is_eligible'] && ! $pendingWithdrawal;

        return response()->json([
            'success' => true,
            'data' => [
                'anggota_id' => $anggota->anggota_id,
                'nama_lengkap' => $anggota->nama_lengkap,
                'saldo_shu' => (float) $anggota->shu,
                'saldo_ewallet' => (float) $anggota->saldo,
                'hutang' => (float) $anggota->hutang,
                'has_debt' => (float) $anggota->hutang > 0,
                'has_master_consent' => ! is_null($anggota->persetujuan_shu_master_at),
                'master_consent_at' => $anggota->persetujuan_shu_master_at,
                'total_belanja_hari_ini' => $totalBelanjaHariIni,
                'has_qualifying_purchase' => $hasQualifyingPurchase,
                'transaksi_valid_hari_ini' => $todayPurchases,
                'eligible_shu' => (float) $eligibility['eligible_shu'],
                'raw_withdrawal_limit' => (float) $eligibility['raw_withdrawal_limit'],
                'pre_round_limit' => (float) $eligibility['pre_round_limit'],
                'final_withdrawal_limit' => (float) $eligibility['final_withdrawal_limit'],
                'max_kuota_tarik_tunai' => (float) $eligibility['final_withdrawal_limit'],
                'max_shu_withdrawal' => (float) $eligibility['final_withdrawal_limit'],
                'is_eligible' => $isEligible,
                'ineligible_reasons' => $ineligibleReasons,
                'pending_ticket' => $pendingWithdrawal ? [
                    'tarik_id' => $pendingWithdrawal->tarik_id,
                    'kode_penarikan' => $pendingWithdrawal->kode_penarikan,
                    'nominal' => (float) $pendingWithdrawal->nominal,
                    'sumber_dana' => $pendingWithdrawal->sumber_dana,
                    'created_at' => $pendingWithdrawal->created_at,
                ] : null,
            ],
        ]);
    }

    public function ajukanTarikTunai(Request $request)
    {
        $anggotaId = $this->getAnggotaId($request);
        $request->validate([
            'nominal' => 'required|numeric|min:1000',
            'sumber_dana' => 'required|in:shu,saldo',
            'persetujuan_shu' => 'nullable|boolean',
            'transaksi_id' => 'nullable|integer',
            'keterangan' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $anggota = Anggota::lockForUpdate()->find($anggotaId);
            if (! $anggota) {
                throw new \Exception('Data anggota tidak ditemukan');
            }

            // Consent check (Master Consent or Explicit Checkbox)
            if (! $anggota->persetujuan_shu_master_at && ! $request->persetujuan_shu) {
                return response()->json([
                    'success' => false,
                    'message' => 'Pengajuan gagal: Anda wajib menyetujui ketentuan pemotongan SHU Hari Besar (Master Consent) secara sadar.',
                ], 422);
            }

            if (! $anggota->persetujuan_shu_master_at && $request->persetujuan_shu) {
                $anggota->persetujuan_shu_master_at = Carbon::now();
                $anggota->persetujuan_shu_version = 'v1.0';
                $anggota->save();
            }

            // Check if there's already an active pending ticket
            $existingPending = TarikTunai::where('anggota_id', $anggotaId)
                ->where('status', 'pending')
                ->first();
            if ($existingPending) {
                throw new \Exception("Anda sudah memiliki tiket penarikan aktif dengan kode #{$existingPending->kode_penarikan} yang belum diproses kasir.");
            }

            // Qualifying purchase check (strictly > Rp 25.000)
            $transaksiId = $request->transaksi_id;
            if ($transaksiId) {
                $trx = Transaksi::where('transaksi_id', $transaksiId)
                    ->where('anggota_id', $anggotaId)
                    ->where('status', 'selesai')
                    ->first();
                if (! $trx || $trx->total_harga <= 25000) {
                    throw new \Exception('Transaksi belanja penyerta tidak memenuhi syarat minimal lebih dari Rp 25.000.');
                }
                $qualifyingBelanja = (float) $trx->total_harga;
            } else {
                $validTrx = Transaksi::where('anggota_id', $anggotaId)
                    ->where('status', 'selesai')
                    ->where('created_at', '>=', Carbon::today())
                    ->where('total_harga', '>', 25000)
                    ->orderBy('created_at', 'desc')
                    ->first();
                if (! $validTrx) {
                    throw new \Exception('Syarat belum terpenuhi: Wajib berbelanja produk koperasi lebih dari Rp 25.000 hari ini.');
                }
                $transaksiId = $validTrx->transaksi_id;
                $qualifyingBelanja = (float) $validTrx->total_harga;
            }

            $nominal = (float) $request->nominal;
            $sumber = $request->sumber_dana;

            if ($sumber === 'shu') {
                $eligibility = app(CalculateShuWithdrawalEligibilityAction::class)->execute($anggota, $qualifyingBelanja);
                if (! $eligibility['purchase_qualified']) {
                    throw new \Exception('Syarat penarikan tunai belum terpenuhi: Total belanja harus lebih dari Rp 25.000.');
                }
                if ($nominal > $eligibility['final_withdrawal_limit']) {
                    throw new \Exception('Nominal penarikan (Rp '.number_format($nominal, 0, ',', '.').') melebihi batas maksimal penarikan SHU Rp '.number_format($eligibility['final_withdrawal_limit'], 0, ',', '.').'.');
                }
                if ($anggota->shu < $nominal) {
                    throw new \Exception('Saldo SHU tidak mencukupi (Tersedia: Rp '.number_format($anggota->shu, 0, ',', '.').').');
                }
            } else {
                $maxPlafon = 100000.0;
                if ($nominal > $maxPlafon) {
                    throw new \Exception('Nominal penarikan (Rp '.number_format($nominal, 0, ',', '.').') melebihi batas maksimal Rp '.number_format($maxPlafon, 0, ',', '.').'.');
                }
                if ($anggota->saldo < $nominal) {
                    throw new \Exception('Saldo E-Wallet tidak mencukupi (Tersedia: Rp '.number_format($anggota->saldo, 0, ',', '.').').');
                }
            }

            $kodePenarikan = 'TRK-'.date('ymd').'-'.rand(1000, 9999);

            $tarik = TarikTunai::create([
                'kode_penarikan' => $kodePenarikan,
                'anggota_id' => $anggota->anggota_id,
                'kasir_id' => null, // Pending cashier pick-up
                'nominal' => $request->nominal,
                'status' => 'pending',
                'sumber_dana' => $sumber,
                'transaksi_id' => $transaksiId,
                'persetujuan_shu' => true,
                'keterangan' => $request->keterangan ?: "Pengajuan mandiri dari {$sumber} (Trx Belanja #{$transaksiId})",
                'created_at' => Carbon::now(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tiket penarikan tunai berhasil dibuat! Silakan tunjukkan kode tiket ini ke kasir toko.',
                'data' => [
                    'tarik_id' => $tarik->tarik_id,
                    'kode_penarikan' => $tarik->kode_penarikan,
                    'nominal' => (float) $tarik->nominal,
                    'sumber_dana' => $tarik->sumber_dana,
                    'status' => 'pending',
                    'nama_anggota' => $anggota->nama_lengkap,
                    'created_at' => $tarik->created_at,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            // Record failed attempt in tarik_tunai as rejected for audit logging
            try {
                if ($anggotaId && (float) $request->nominal > 0) {
                    TarikTunai::create([
                        'kode_penarikan' => 'TRK-REJ-'.date('ymd').'-'.rand(1000, 9999),
                        'anggota_id' => $anggotaId,
                        'kasir_id' => null,
                        'nominal' => (float) $request->nominal,
                        'status' => 'rejected',
                        'sumber_dana' => $request->sumber_dana ?: 'shu',
                        'transaksi_id' => $request->transaksi_id ?: null,
                        'persetujuan_shu' => ! empty($request->persetujuan_shu),
                        'alasan_tolak' => 'Ditolak Otomatis Sistem: '.$e->getMessage(),
                        'keterangan' => 'Gagal Verifikasi Otomatis Sistem',
                        'created_at' => Carbon::now(),
                    ]);
                }
            } catch (\Exception $logEx) {
                // Ignore audit logger error
            }

            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function getRiwayatTarikTunai(Request $request)
    {
        $anggotaId = $this->getAnggotaId($request);
        $data = TarikTunai::with(['kasir', 'transaksi'])
            ->where('anggota_id', $anggotaId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($t) {
                return [
                    'tarik_id' => $t->tarik_id,
                    'kode_penarikan' => $t->kode_penarikan,
                    'status' => $t->status,
                    'nominal' => (float) $t->nominal,
                    'sumber_dana' => $t->sumber_dana,
                    'transaksi_id' => $t->transaksi_id,
                    'belanja_nominal' => $t->transaksi ? (float) $t->transaksi->total_harga : 0,
                    'alasan_tolak' => $t->alasan_tolak,
                    'approved_at' => $t->approved_at,
                    'keterangan' => $t->keterangan,
                    'kasir_name' => $t->kasir ? $t->kasir->username : ($t->status === 'rejected' ? 'Verifikasi Sistem' : 'Kasir'),
                    'created_at' => $t->created_at,
                ];
            });

        return response()->json(['success' => true, 'data' => $data]);
    }
}
