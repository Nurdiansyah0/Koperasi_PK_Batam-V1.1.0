<?php

namespace App\Modules\Pos\Services;

use App\Models\Anggota;
use App\Models\Barang;
use App\Models\PembayaranHutang;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use Exception;
use Illuminate\Support\Facades\DB;

class PosCheckoutService
{
    public function processCashierCheckout(array $items, string $metodePembayaran, ?int $anggotaId, int $kasirId): Transaksi
    {
        return DB::transaction(function () use ($items, $metodePembayaran, $anggotaId, $kasirId) {
            $totalHarga = 0;
            $totalKeuntungan = 0;

            // Validate and compute totals
            foreach ($items as $item) {
                $barang = Barang::findOrFail($item['barang_id']);
                $jumlah = $item['jumlah'];

                if ($barang->stok < $jumlah) {
                    throw new Exception("Stok barang {$barang->nama_barang} tidak mencukupi (sisa {$barang->stok})");
                }

                $subtotal = $barang->harga_jual * $jumlah;
                $keuntungan = ($barang->harga_jual - $barang->harga_modal) * $jumlah;

                $totalHarga += $subtotal;
                $totalKeuntungan += $keuntungan;
            }

            // Handle Member balance / debt checks
            $anggota = null;
            if ($anggotaId) {
                $anggota = Anggota::findOrFail($anggotaId);

                if ($metodePembayaran === 'ewallet') {
                    if ($anggota->saldo < $totalHarga) {
                        throw new Exception('Saldo e-wallet anggota tidak mencukupi (Saldo: Rp '.number_format($anggota->saldo, 0, ',', '.').')');
                    }
                    $anggota->saldo -= $totalHarga;
                } elseif ($metodePembayaran === 'hutang') {
                    $limitHutang = 1000000; // Standar plafon kredit karyawan
                    if (($anggota->hutang + $totalHarga) > $limitHutang) {
                        throw new Exception('Transaksi melebihi batas limit hutang anggota');
                    }
                    $anggota->hutang += $totalHarga;
                }
            }

            // 1. Create Transaction
            $trx = Transaksi::create([
                'anggota_id' => $anggotaId,
                'kasir_id' => $kasirId,
                'total_harga' => $totalHarga,
                'total_keuntungan' => $totalKeuntungan,
                'metode_pembayaran' => $metodePembayaran,
                'status' => 'selesai',
                'created_at' => now(),
            ]);

            // 2. Reduce Stock and create detail lines
            foreach ($items as $item) {
                $barang = Barang::findOrFail($item['barang_id']);
                $jumlah = $item['jumlah'];
                $subtotal = $barang->harga_jual * $jumlah;
                $keuntungan = ($barang->harga_jual - $barang->harga_modal) * $jumlah;

                $barang->stok -= $jumlah;
                $barang->save();

                TransaksiDetail::create([
                    'transaksi_id' => $trx->transaksi_id,
                    'barang_id' => $barang->barang_id,
                    'jumlah' => $jumlah,
                    'harga_satuan' => $barang->harga_jual,
                    'subtotal' => $subtotal,
                    'keuntungan' => $keuntungan,
                ]);
            }

            // 3. Distribute SHU (60% Anggota, 30% Cadangan, 10% Pengurus)
            if ($anggota && $totalKeuntungan > 0) {
                $shu60 = $totalKeuntungan * 0.60;
                $shu10 = $totalKeuntungan * 0.10;
                $shu30 = $totalKeuntungan * 0.30;

                $anggota->shu += $shu60;
                $anggota->save();

                DB::table('shu_distribusi')->insert([
                    'anggota_id' => $anggotaId,
                    'tahun' => date('Y'),
                    'shu_60_percent' => $shu60,
                    'shu_10_percent' => $shu10,
                    'shu_30_percent' => $shu30,
                    'created_at' => now(),
                ]);
            } elseif ($anggota) {
                $anggota->save();
            }

            return $trx;
        });
    }

    public function processMemberOrder(array $items, string $metodePembayaran, int $anggotaId): Transaksi
    {
        return DB::transaction(function () use ($items, $metodePembayaran, $anggotaId) {
            $anggota = Anggota::findOrFail($anggotaId);
            $totalHarga = 0;
            $totalKeuntungan = 0;

            foreach ($items as $item) {
                $barang = Barang::findOrFail($item['barang_id']);
                $jumlah = $item['jumlah'];

                if ($barang->stok < $jumlah) {
                    throw new Exception("Stok barang {$barang->nama_barang} tidak mencukupi");
                }

                $totalHarga += ($barang->harga_jual * $jumlah);
                $totalKeuntungan += (($barang->harga_jual - $barang->harga_modal) * $jumlah);
            }

            if ($metodePembayaran === 'ewallet') {
                if ($anggota->saldo < $totalHarga) {
                    throw new Exception('Saldo e-wallet tidak mencukupi');
                }
                $anggota->saldo -= $totalHarga;
                $anggota->save();
            } elseif ($metodePembayaran === 'hutang') {
                $limitHutang = 1000000;
                if (($anggota->hutang + $totalHarga) > $limitHutang) {
                    throw new Exception('Plafon hutang tidak mencukupi');
                }
                $anggota->hutang += $totalHarga;
                $anggota->save();
            }

            // Deduct stock temporarily
            foreach ($items as $item) {
                $barang = Barang::findOrFail($item['barang_id']);
                $barang->stok -= $item['jumlah'];
                $barang->save();
            }

            $trx = Transaksi::create([
                'anggota_id' => $anggotaId,
                'kasir_id' => null,
                'total_harga' => $totalHarga,
                'total_keuntungan' => $totalKeuntungan,
                'metode_pembayaran' => $metodePembayaran,
                'status' => 'pending',
                'created_at' => now(),
            ]);

            foreach ($items as $item) {
                $barang = Barang::findOrFail($item['barang_id']);
                $jumlah = $item['jumlah'];
                $subtotal = $barang->harga_jual * $jumlah;
                $keuntungan = ($barang->harga_jual - $barang->harga_modal) * $jumlah;

                TransaksiDetail::create([
                    'transaksi_id' => $trx->transaksi_id,
                    'barang_id' => $barang->barang_id,
                    'jumlah' => $jumlah,
                    'harga_satuan' => $barang->harga_jual,
                    'subtotal' => $subtotal,
                    'keuntungan' => $keuntungan,
                ]);
            }

            return $trx;
        });
    }

    public function approveMemberOrders(array $transaksiList, int $kasirId): void
    {
        DB::transaction(function () use ($transaksiList, $kasirId) {
            foreach ($transaksiList as $t) {
                $trxId = is_array($t) ? $t['transaksi_id'] : $t;
                $trx = Transaksi::where('transaksi_id', $trxId)->where('status', 'pending')->first();
                if ($trx) {
                    $trx->status = 'selesai';
                    $trx->kasir_id = $kasirId;
                    $trx->save();

                    // Distribute SHU on final approval
                    if ($trx->anggota_id && $trx->total_keuntungan > 0) {
                        $anggota = Anggota::find($trx->anggota_id);
                        if ($anggota) {
                            $shu60 = $trx->total_keuntungan * 0.60;
                            $shu10 = $trx->total_keuntungan * 0.10;
                            $shu30 = $trx->total_keuntungan * 0.30;

                            $anggota->shu += $shu60;
                            $anggota->save();

                            DB::table('shu_distribusi')->insert([
                                'anggota_id' => $trx->anggota_id,
                                'tahun' => date('Y'),
                                'shu_60_percent' => $shu60,
                                'shu_10_percent' => $shu10,
                                'shu_30_percent' => $shu30,
                                'created_at' => now(),
                            ]);
                        }
                    }
                }
            }
        });
    }

    public function rejectMemberOrders(array $transaksiList, int $kasirId, ?string $alasan = null): void
    {
        DB::transaction(function () use ($transaksiList, $kasirId, $alasan) {
            foreach ($transaksiList as $t) {
                $trxId = is_array($t) ? $t['transaksi_id'] : $t;
                $trx = Transaksi::where('transaksi_id', $trxId)->where('status', 'pending')->first();
                if ($trx) {
                    $trx->status = 'batal';
                    $trx->kasir_id = $kasirId;
                    $trx->keterangan = $alasan ?? 'Dibatalkan oleh kasir';
                    $trx->save();

                    // Refund balance / debt
                    $anggota = Anggota::find($trx->anggota_id);
                    if ($anggota) {
                        if ($trx->metode_pembayaran === 'ewallet') {
                            $anggota->saldo += $trx->total_harga;
                            $anggota->save();
                        } elseif ($trx->metode_pembayaran === 'hutang') {
                            $anggota->hutang -= $trx->total_harga;
                            if ($anggota->hutang < 0) {
                                $anggota->hutang = 0;
                            }
                            $anggota->save();
                        }
                    }

                    // Restore stock
                    $details = TransaksiDetail::where('transaksi_id', $trxId)->get();
                    foreach ($details as $d) {
                        $barang = Barang::find($d->barang_id);
                        if ($barang) {
                            $barang->stok += $d->jumlah;
                            $barang->save();
                        }
                    }
                }
            }
        });
    }

    public function approveDebtPayment(int $pembayaranId, int $kasirId): void
    {
        DB::transaction(function () use ($pembayaranId, $kasirId) {
            $pembayaran = PembayaranHutang::findOrFail($pembayaranId);
            $anggota = Anggota::findOrFail($pembayaran->anggota_id);

            $anggota->hutang -= $pembayaran->nominal;
            if ($anggota->hutang < 0) {
                $anggota->hutang = 0;
            }
            $anggota->save();

            $pembayaran->status = 'approved';
            $pembayaran->kasir_id = $kasirId;
            $pembayaran->save();
        });
    }

    public function rejectDebtPayment(int $pembayaranId, int $kasirId, ?string $alasan = null): void
    {
        $pembayaran = PembayaranHutang::findOrFail($pembayaranId);
        $pembayaran->status = 'rejected';
        $pembayaran->kasir_id = $kasirId;
        $pembayaran->keterangan = $alasan;
        $pembayaran->save();
    }
}
