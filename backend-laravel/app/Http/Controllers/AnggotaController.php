<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Barang;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use App\Models\PembayaranHutang;
use App\Models\Anggota;

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
        if ($user->role !== 'anggota') {
            abort(403, 'Akses ditolak. Anda bukan anggota.');
        }
        return $user->anggota->anggota_id;
    }

    public function getProfil(Request $request)
    {
        $anggotaId = $this->getAnggotaId($request); // Ensure user is anggota
        $user = $request->user();
        $anggota = $user->anggota;

        return response()->json([
            'success' => true,
            'user' => [
                'anggota_id'        => $anggota->anggota_id,
                'user_id'           => $user->user_id,
                'nama_lengkap'      => $anggota->nama_lengkap,
                'saldo'             => (float) $anggota->saldo,
                'hutang'            => (float) $anggota->hutang,
                'shu'               => (float) $anggota->shu,
                'simpanan_pokok'    => (float) $anggota->simpanan_pokok,
                'limit_hutang'      => (float) $anggota->limit_hutang,
                'sisa_limit_hutang' => (float) $anggota->sisa_limit_hutang,
            ]
        ]);
    }

    public function getDataBarangBelanja(Request $request)
    {
        $barang = Barang::select('barang_id', 'nama_barang', 'stok', 'harga_jual')
                        ->where('stok', '>', 0)
                        ->get();

        return response()->json([
            'success' => true,
            'data' => $barang
        ]);
    }

    public function getPaketBelanja(Request $request)
    {
        $anggotaId = $this->getAnggotaId($request);
        $user = $request->user();

        // 1. Load active products indexed by ID
        $allBarang = Barang::where('stok', '>', 0)->get()->keyBy('barang_id');

        // Helper to build a package
        $makePackage = function ($id, $nama, $deskripsi, $tag, $icon, $itemDefs) use ($allBarang) {
            $items = [];
            $totalHarga = 0;
            $isAvailable = true;

            foreach ($itemDefs as $def) {
                $barangId = $def['barang_id'];
                $qty = $def['jumlah'];
                $barang = $allBarang->get($barangId);

                if (!$barang || $barang->stok < $qty) {
                    $isAvailable = false;
                }

                $hargaSatuan = $barang ? (float) $barang->harga_jual : (float) $def['fallback_harga'];
                $namaBarang = $barang ? $barang->nama_barang : $def['fallback_nama'];
                $subtotal = $hargaSatuan * $qty;
                $totalHarga += $subtotal;

                $items[] = [
                    'barang_id'     => $barangId,
                    'nama_barang'   => $namaBarang,
                    'jumlah'        => $qty,
                    'qty'           => $qty,
                    'harga_satuan'  => $hargaSatuan,
                    'subtotal'      => $subtotal,
                    'stok_tersedia' => $barang ? $barang->stok : 0,
                ];
            }

            return [
                'id'           => $id,
                'nama_paket'   => $nama,
                'deskripsi'    => $deskripsi,
                'tag'          => $tag,
                'icon'         => $icon,
                'total_harga'  => $totalHarga,
                'items'        => $items,
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
                        'barang_id'      => $b->barang_id,
                        'jumlah'         => 1,
                        'fallback_nama'  => $b->nama_barang,
                        'fallback_harga' => (float)$b->harga_jual,
                    ];
                }
            }

            if (!empty($itemDefs)) {
                $seringDibeli = $makePackage(
                    'sering_dibeli',
                    "Yang Sering Anda Beli",
                    "Kombinasi barang yang paling sering Anda beli dari histori transaksi Anda.",
                    "Sering Anda Beli",
                    "⭐",
                    $itemDefs
                );
            }
        }

        return response()->json([
            'success'        => true,
            'data'           => $paketList,
            'sering_dibeli'  => $seringDibeli,
        ]);
    }

    public function simpanTransaksi(Request $request)
    {
        $request->validate([
            'metode_pembayaran' => 'required|string|in:cash,qr,ewallet,transfer,hutang',
            'items' => 'required|array',
            'items.*.barang_id' => 'required|integer',
            'items.*.jumlah' => 'required|integer|min:1',
        ]);

        $anggotaId = $this->getAnggotaId($request);
        $metode = $request->metode_pembayaran;
        $items = $request->items;

        DB::beginTransaction();
        try {
            // LOCK THE ANGGOTA ROW TO PREVENT DOUBLE CHECKOUT RACE CONDITIONS
            $anggota = \App\Models\Anggota::where('anggota_id', $anggotaId)->lockForUpdate()->first();
            $totalHarga = 0;
            $totalKeuntungan = 0;
            $transaksiItems = [];

            foreach ($items as $item) {
                $barang = Barang::where('barang_id', $item['barang_id'])->lockForUpdate()->first();
                
                if (!$barang || $barang->stok < $item['jumlah']) {
                    throw new \Exception("Stok tidak mencukupi untuk barang ID: " . $item['barang_id']);
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

                $barang->stok -= $item['jumlah'];
                $barang->save();
            }

            // If paying by hutang or ewallet
            if ($metode === 'hutang') {
                $limit_hutang = 600000; // Plafon batas hutang belanja anggota Rp 600.000
                if (($anggota->hutang + $totalHarga) > $limit_hutang) {
                    $sisa_limit = $limit_hutang - $anggota->hutang;
                    throw new \Exception("Gagal: Limit hutang Koperasi tidak mencukupi. Sisa limit Anda: Rp " . number_format($sisa_limit > 0 ? $sisa_limit : 0, 0, ',', '.'));
                }

                $anggota->hutang += $totalHarga;
                $anggota->save();
            } elseif ($metode === 'ewallet') { // If you eventually support 'saldo' directly
                if ($anggota->saldo < $totalHarga) {
                    throw new \Exception("Saldo tidak mencukupi");
                }
                $anggota->saldo -= $totalHarga;
                $anggota->save();
            }

            $transaksi = Transaksi::create([
                'anggota_id' => $anggota->anggota_id,
                'kasir_id' => null, // Processed by member themselves
                'total_harga' => $totalHarga,
                'total_keuntungan' => $totalKeuntungan,
                'metode_pembayaran' => $metode,
                'status' => 'pending', // Awaiting kasir confirmation
            ]);

            foreach ($transaksiItems as $tItem) {
                $tItem['transaksi_id'] = $transaksi->transaksi_id;
                TransaksiDetail::create($tItem);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Pesanan berhasil dibuat, silakan ke kasir.',
                'transaksi_id' => $transaksi->transaksi_id
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
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
                })
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $paginator
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
            'status' => 'pending'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan pembayaran hutang berhasil dibuat, silakan bayar ke kasir.',
            'pembayaran_id' => $pembayaran->pembayaran_id
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
            'data' => $history
        ]);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'username' => 'required|string|unique:users,username,' . $request->user()->user_id . ',user_id'
        ]);

        $user = $request->user();
        $user->username = $request->username;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diupdate'
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6'
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Password saat ini salah'
            ], 400);
        }

        $user->password_hash = Hash::make($request->new_password);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diubah'
        ]);
    }
}
