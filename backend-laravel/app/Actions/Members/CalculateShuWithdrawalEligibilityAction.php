<?php

namespace App\Actions\Members;

use App\Models\Anggota;

class CalculateShuWithdrawalEligibilityAction
{
    /**
     * Authoritative calculation for SHU cash withdrawal eligibility and limits.
     *
     * @param  Anggota  $anggota  Already-locked or authoritative member instance
     * @param  float  $totalBelanja  Current qualifying purchase amount
     * @return array Structured eligibility results
     */
    public function execute(Anggota $anggota, float $totalBelanja): array
    {
        $shu = (float) $anggota->shu;
        $hutang = (float) $anggota->hutang;

        // 1. Eligible SHU: max(0, SHU - Hutang)
        $eligibleShu = max(0.0, round($shu - $hutang, 2));

        // 2. Withdrawal percentage: 50% of eligible SHU
        $rawLimit = round($eligibleShu * 0.50, 2);

        // 3. Absolute ceiling: Rp 100.000, floored to nearest Rp 1.000 (multiples of Rp 1.000)
        $flooredLimit = floor($rawLimit / 1000.0) * 1000.0;
        $finalLimit = min(100000.0, max(0.0, $flooredLimit));

        // 4. Purchase qualification: strictly > Rp 25.000
        $purchaseQualified = $totalBelanja > 25000.0;

        // 5. Overall eligibility
        $isEligible = $purchaseQualified && $finalLimit > 0.0;

        $reasons = [];
        if (! $purchaseQualified) {
            $reasons[] = 'Total belanja harus lebih dari Rp 25.000 (Belanja saat ini: Rp '.number_format($totalBelanja, 0, ',', '.').').';
        }
        if ($finalLimit <= 0.0) {
            if ($shu <= 0.0) {
                $reasons[] = 'Saldo SHU Anda saat ini Rp 0.';
            } elseif ($shu <= $hutang) {
                $reasons[] = 'Saldo SHU habis terbebani oleh tagihan hutang berjalan (SHU: Rp '.number_format($shu, 0, ',', '.').', Hutang: Rp '.number_format($hutang, 0, ',', '.').').';
            } else {
                $reasons[] = 'Hak penarikan SHU setelah pembulatan ke kelipatan Rp 1.000 adalah Rp 0.';
            }
        }

        $reason = ! empty($reasons) ? implode(' ', $reasons) : 'Eligible untuk tarik tunai SHU.';

        return [
            'is_eligible' => $isEligible,
            'eligible' => $isEligible,
            'purchase_qualified' => $purchaseQualified,
            'saldo_shu' => $shu,
            'hutang' => $hutang,
            'eligible_shu' => $eligibleShu,
            'raw_limit' => $rawLimit,
            'raw_withdrawal_limit' => $rawLimit,
            'pre_round_limit' => min(100000.0, $rawLimit),
            'max_shu_withdrawal' => $finalLimit,
            'final_withdrawal_limit' => $finalLimit,
            'total_belanja' => $totalBelanja,
            'reason' => $reason,
            'ineligible_reasons' => $reasons,
        ];
    }
}
