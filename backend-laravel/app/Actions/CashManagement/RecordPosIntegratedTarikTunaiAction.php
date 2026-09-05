<?php

namespace App\Actions\CashManagement;

use App\Models\TarikTunai;
use Carbon\Carbon;
use InvalidArgumentException;

class RecordPosIntegratedTarikTunaiAction
{
    /**
     * Persists an integrated Tarik Tunai ticket associated with POS checkout within an ambient transaction.
     *
     * @param  int  $anggotaId  Member ID
     * @param  int  $kasirId  Cashier user ID
     * @param  float  $nominal  Total withdrawal amount
     * @param  float  $totalBelanja  Purchase total to be covered
     * @param  float  $uangBersihDiserahkan  Net cash given to customer (nominal - totalBelanja)
     * @param  string  $sumberDana  Fund source ('shu' or 'saldo')
     * @param  int|null  $transaksiId  Associated POS transaction ID if already available
     * @param  string|null  $kodePenarikan  Optional withdrawal code override
     * @return TarikTunai Created TarikTunai instance
     *
     * @throws InvalidArgumentException
     */
    public function execute(
        int $anggotaId,
        int $kasirId,
        float $nominal,
        float $totalBelanja,
        float $uangBersihDiserahkan,
        string $sumberDana = 'shu',
        ?int $transaksiId = null,
        ?string $kodePenarikan = null
    ): TarikTunai {
        if ($anggotaId <= 0) {
            throw new InvalidArgumentException('Anggota ID must be a positive integer.');
        }

        if ($kasirId <= 0) {
            throw new InvalidArgumentException('Kasir ID must be a positive integer.');
        }

        if ($nominal <= 0) {
            throw new InvalidArgumentException('Nominal penarikan must be greater than zero.');
        }

        if ($totalBelanja < 0) {
            throw new InvalidArgumentException('Total belanja cannot be negative.');
        }

        if ($nominal < $totalBelanja) {
            throw new InvalidArgumentException('Nominal penarikan tunai tidak mencukupi untuk menutup total belanja.');
        }

        if ($uangBersihDiserahkan < 0) {
            throw new InvalidArgumentException('Uang bersih diserahkan cannot be negative.');
        }

        $code = $kodePenarikan ?: 'TRK-'.date('ymd').'-'.rand(1000, 9999);

        return TarikTunai::create([
            'kode_penarikan' => $code,
            'kasir_id' => $kasirId,
            'anggota_id' => $anggotaId,
            'nominal' => $nominal,
            'status' => 'completed',
            'sumber_dana' => $sumberDana,
            'transaksi_id' => $transaksiId,
            'persetujuan_shu' => true,
            'approved_at' => Carbon::now(),
            'keterangan' => 'Tarik Tunai saat Belanja (Potong Belanja Rp '.number_format($totalBelanja, 0, ',', '.').', Kas Diserahkan Rp '.number_format($uangBersihDiserahkan, 0, ',', '.').')',
            'created_at' => Carbon::now(),
        ]);
    }

    /**
     * Links an existing TarikTunai ticket to a persisted POS transaction.
     *
     * @param  TarikTunai  $tarik  Existing TarikTunai model instance
     * @param  int  $transaksiId  Persisted Transaksi ID
     * @return TarikTunai Updated TarikTunai instance
     *
     * @throws InvalidArgumentException
     */
    public function linkTransaction(TarikTunai $tarik, int $transaksiId): TarikTunai
    {
        if ($transaksiId <= 0) {
            throw new InvalidArgumentException('Transaksi ID must be a positive integer.');
        }

        $tarik->transaksi_id = $transaksiId;
        $tarik->save();

        return $tarik;
    }
}
