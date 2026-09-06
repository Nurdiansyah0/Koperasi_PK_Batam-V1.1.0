<?php

namespace App\Actions\CashManagement;

use App\Actions\Members\CalculateShuWithdrawalEligibilityAction;
use App\Models\Anggota;
use App\Models\TarikTunai;
use App\Models\Transaksi;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;

class TarikTunaiAction
{
    public function __construct(
        protected ?CalculateShuWithdrawalEligibilityAction $calculateShuWithdrawalEligibilityAction = null
    ) {
        $this->calculateShuWithdrawalEligibilityAction = $calculateShuWithdrawalEligibilityAction ?? app(CalculateShuWithdrawalEligibilityAction::class);
    }

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

            $transaksiId = $data['transaksi_id'] ?? null;
            if ($transaksiId) {
                $trx = Transaksi::where('transaksi_id', $transaksiId)
                    ->where('anggota_id', $anggota->anggota_id)
                    ->where('status', 'selesai')
                    ->first();
                if (! $trx || $trx->total_harga <= 25000) {
                    throw new Exception('Transaksi belanja yang ditautkan tidak memenuhi syarat minimal lebih dari Rp 25.000 (Nilai: Rp '.number_format($trx ? $trx->total_harga : 0, 0, ',', '.').')');
                }
                $qualifyingBelanja = (float) $trx->total_harga;
            } else {
                $validTrx = Transaksi::where('anggota_id', $anggota->anggota_id)
                    ->where('status', 'selesai')
                    ->where('created_at', '>=', Carbon::today())
                    ->where('total_harga', '>', 25000)
                    ->orderBy('created_at', 'desc')
                    ->first();

                if (! $validTrx) {
                    throw new Exception('Syarat penarikan tunai belum terpenuhi: Wajib disertai transaksi belanja produk koperasi lebih dari Rp 25.000 hari ini.');
                }
                $transaksiId = $validTrx->transaksi_id;
                $qualifyingBelanja = (float) $validTrx->total_harga;
            }

            $nominal = (float) $data['nominal'];
            $sumber = $data['sumber_dana'];

            if ($sumber === 'shu') {
                $eligibility = $this->calculateShuWithdrawalEligibilityAction->execute($anggota, $qualifyingBelanja);
                if (! $eligibility['purchase_qualified']) {
                    throw new Exception('Syarat penarikan tunai belum terpenuhi: Total belanja harus lebih dari Rp 25.000.');
                }
                if ($nominal > $eligibility['final_withdrawal_limit']) {
                    throw new Exception('Nominal penarikan (Rp '.number_format($nominal, 0, ',', '.').') melebihi batas maksimal penarikan SHU Rp '.number_format($eligibility['final_withdrawal_limit'], 0, ',', '.').'.');
                }
                if ($anggota->shu < $nominal) {
                    throw new Exception('Saldo SHU tidak mencukupi. Saldo SHU saat ini: Rp '.number_format($anggota->shu, 0, ',', '.'));
                }
                $anggota->shu -= $nominal;
            } else {
                $maxPlafon = 100000.0;
                if ($nominal > $maxPlafon) {
                    throw new Exception('Nominal penarikan (Rp '.number_format($nominal, 0, ',', '.').') melebihi batas maksimal Rp '.number_format($maxPlafon, 0, ',', '.').'.');
                }
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
