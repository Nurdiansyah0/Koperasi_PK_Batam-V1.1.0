<?php

namespace App\Actions\CashManagement;

use App\Models\Anggota;
use App\Models\TarikTunai;
use App\Models\Transaksi;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Exception;

class TarikTunaiAction
{
    /**
     * Executes the direct tarik tunai process by kasir.
     */
    public function execute(array $data, int $kasirId): array
    {
        DB::beginTransaction();
        try {
            $anggota = Anggota::lockForUpdate()->find($data['anggota_id']);
            if (! $anggota) {
                throw new Exception('Anggota tidak ditemukan');
            }

            $persetujuanShu = $data['persetujuan_shu'] ?? false;
            if (! $anggota->persetujuan_shu_master_at && ! $persetujuanShu) {
                throw new Exception('Penarikan tunai gagal: Anggota wajib menyetujui ketentuan pemotongan SHU Hari Besar (Master Consent) secara sadar.', 422);
            }

            if (! $anggota->persetujuan_shu_master_at && $persetujuanShu) {
                $anggota->persetujuan_shu_master_at = Carbon::now();
                $anggota->persetujuan_shu_version = 'v1.0';
                $anggota->save();
            }

            if ((float) $anggota->hutang > 0) {
                throw new Exception('Penarikan tunai ditolak: Anggota masih memiliki tagihan hutang berjalan sebesar Rp '.number_format($anggota->hutang, 0, ',', '.').'. Wajib melunasi hutang terlebih dahulu.');
            }

            $transaksiId = $data['transaksi_id'] ?? null;
            if ($transaksiId) {
                $trx = Transaksi::where('transaksi_id', $transaksiId)
                    ->where('anggota_id', $anggota->anggota_id)
                    ->where('status', 'selesai')
                    ->first();
                if (! $trx || $trx->total_harga < 25000) {
                    throw new Exception('Transaksi belanja yang ditautkan tidak memenuhi syarat minimal Rp 25.000 (Nilai: Rp '.number_format($trx ? $trx->total_harga : 0, 0, ',', '.').')');
                }
            } else {
                $validTrx = Transaksi::where('anggota_id', $anggota->anggota_id)
                    ->where('status', 'selesai')
                    ->where('created_at', '>=', Carbon::today())
                    ->where('total_harga', '>=', 25000)
                    ->orderBy('created_at', 'desc')
                    ->first();

                if (! $validTrx) {
                    throw new Exception('Syarat penarikan tunai belum terpenuhi: Wajib disertai transaksi belanja produk koperasi minimal Rp 25.000 hari ini.');
                }
                $transaksiId = $validTrx->transaksi_id;
            }

            $totalBelanjaHariIni = (float) Transaksi::where('anggota_id', $anggota->anggota_id)
                ->where('status', 'selesai')
                ->where('created_at', '>=', Carbon::today())
                ->where('total_harga', '>=', 25000)
                ->sum('total_harga');

            $maxPlafon = min(100000, $totalBelanjaHariIni * 2);

            $nominal = (float) $data['nominal'];
            if ($nominal > $maxPlafon) {
                throw new Exception('Nominal penarikan (Rp '.number_format($nominal, 0, ',', '.').') melebihi kuota proporsional maksimal Rp '.number_format($maxPlafon, 0, ',', '.').' (Maks. 2x Belanja Toko, Plafon Rp 100.000/hari).');
            }

            $sumber = $data['sumber_dana'];
            if ($sumber === 'shu') {
                if ($anggota->shu < $nominal) {
                    throw new Exception('Saldo SHU tidak mencukupi. Saldo SHU saat ini: Rp '.number_format($anggota->shu, 0, ',', '.'));
                }
                $anggota->shu -= $nominal;
            } else {
                if ($anggota->saldo < $nominal) {
                    throw new Exception('Saldo E-Wallet tidak mencukupi. Saldo saat ini: Rp '.number_format($anggota->saldo, 0, ',', '.'));
                }
                $anggota->saldo -= $nominal;
            }
            $anggota->save();

            $kodePenarikan = 'TRK-'.date('ymd').'-'.rand(1000, 9999);

            $keterangan = $data['keterangan'] ?? "Tarik Tunai dari {$sumber} (Disertai Belanja Trx #{$transaksiId})";

            $tarik = TarikTunai::create([
                'kode_penarikan' => $kodePenarikan,
                'kasir_id' => $kasirId,
                'anggota_id' => $anggota->anggota_id,
                'nominal' => $nominal,
                'status' => 'completed',
                'sumber_dana' => $sumber,
                'transaksi_id' => $transaksiId,
                'persetujuan_shu' => true,
                'approved_at' => Carbon::now(),
                'keterangan' => $keterangan,
                'created_at' => Carbon::now(),
            ]);

            DB::commit();

            return [
                'tarik_id' => $tarik->tarik_id,
                'kode_penarikan' => $tarik->kode_penarikan,
                'nominal' => (float) $tarik->nominal,
                'sisa_shu' => (float) $anggota->shu,
                'sisa_saldo' => (float) $anggota->saldo,
                'nama_anggota' => $anggota->nama_lengkap,
                'transaksi_id' => $tarik->transaksi_id,
                'created_at' => $tarik->created_at,
            ];
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
