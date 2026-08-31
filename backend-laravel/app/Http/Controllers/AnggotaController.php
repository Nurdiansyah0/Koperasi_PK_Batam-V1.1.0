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
        $user = $request->user();
        $anggota = $user->anggota;

        return response()->json([
            'success' => true,
            'user' => [
                'anggota_id' => $anggota->anggota_id,
                'user_id' => $user->user_id,
                'nama_lengkap' => $anggota->nama_lengkap,
                'saldo' => $anggota->saldo,
                'hutang' => $anggota->hutang,
                'shu' => $anggota->shu,
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

    public function simpanTransaksi(Request $request)
    {
        $request->validate([
            'metode_pembayaran' => 'required|string|in:cash,qr,ewallet,transfer,hutang',
            'items' => 'required|array',
            'items.*.barang_id' => 'required|integer',
            'items.*.jumlah' => 'required|integer|min:1',
        ]);

        $anggotaId = $request->user()->anggota->anggota_id;
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

            // If paying by hutang or saldo (though 'saldo' isn't explicitly in the validation, we follow procedural logic)
            if ($metode === 'hutang') {
                $limit_hutang = $anggota->saldo + 100000; // Saldo + 100k allowance
                if (($anggota->hutang + $totalHarga) > $limit_hutang) {
                    $sisa_limit = $limit_hutang - $anggota->hutang;
                    throw new \Exception("Gagal: Limit hutang Koperasi tidak mencukupi. Sisa limit Anda: Rp " . number_format($sisa_limit, 0, ',', '.'));
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
