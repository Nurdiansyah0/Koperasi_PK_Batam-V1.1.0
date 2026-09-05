<?php

namespace App\Actions\Members;

use App\Models\Anggota;
use Exception;

class ApplyPosMemberBalanceChangesAction
{
    /**
     * Executes member balance mutations for POS checkout payments within an ambient transaction.
     *
     * @param  Anggota  $anggota  Already-locked member model instance
     * @param  string  $metodePembayaran  Payment mode ('ewallet', 'hutang', 'cash', etc.)
     * @param  float  $totalHarga  Authoritative transaction total
     * @return Anggota Updated member instance
     *
     * @throws Exception
     */
    public function execute(Anggota $anggota, string $metodePembayaran, float $totalHarga): Anggota
    {
        if ($metodePembayaran === 'ewallet') {
            if ($anggota->hutang > 0) {
                throw new Exception('Gagal: Anggota ini masih memiliki tunggakan hutang. Harap lunasi terlebih dahulu.');
            }
            if ($anggota->saldo < $totalHarga) {
                throw new Exception('Gagal: Saldo tidak mencukupi. Saldo tersedia: Rp '.number_format($anggota->saldo, 0, ',', '.'));
            }
            $anggota->saldo -= $totalHarga;
            $anggota->save();
        }

        if ($metodePembayaran === 'hutang') {
            $sisa_limit = (float) $anggota->sisa_limit_hutang;
            if ($totalHarga > $sisa_limit) {
                throw new Exception('Gagal: Total belanja Rp '.number_format($totalHarga, 0, ',', '.').' melebihi sisa limit hutang Rp '.number_format($sisa_limit, 0, ',', '.'));
            }
            $anggota->hutang += $totalHarga;
            $anggota->save();
        }

        return $anggota;
    }

    /**
     * Credits the member's runtime SHU balance with their distributed share of transaction profits.
     *
     * @param  Anggota  $anggota  Already-locked member model instance
     * @param  float  $shuAmount  Authoritative member SHU share
     * @return Anggota Updated member instance
     */
    public function creditShu(Anggota $anggota, float $shuAmount): Anggota
    {
        $anggota->shu += $shuAmount;
        $anggota->save();

        return $anggota;
    }

    /**
     * Deducts member balance for integrated Tarik Tunai during checkout.
     *
     * @param  Anggota  $anggota  Already-locked member model instance
     * @param  float  $nominal  Withdrawal amount
     * @param  string  $sumberDana  Balance source ('shu' or 'saldo')
     * @return Anggota Updated member instance
     */
    public function deductTarikTunai(Anggota $anggota, float $nominal, string $sumberDana = 'shu'): Anggota
    {
        if ($sumberDana === 'shu') {
            $anggota->shu -= $nominal;
        } else {
            $anggota->saldo -= $nominal;
        }
        $anggota->save();

        return $anggota;
    }
}
