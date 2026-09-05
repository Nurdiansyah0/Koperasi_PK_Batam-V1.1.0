<?php

namespace App\Actions\Finance;

use App\Models\ShuDistribusi;
use DateTimeInterface;
use InvalidArgumentException;

class RecordPosShuDistributionAction
{
    /**
     * Records an authoritative POS SHU distribution entry within the ambient parent transaction.
     *
     * @param  int  $anggotaId  Member identifier
     * @param  float  $shu60  60% member share
     * @param  float  $shu10  10% management share
     * @param  float  $shu30  30% cooperative reserve share
     * @param  string|null  $tahun  Fiscal year (defaults to current year)
     * @param  DateTimeInterface|string|null  $createdAt  Timestamp (defaults to current time)
     * @return ShuDistribusi Created distribution record
     *
     * @throws InvalidArgumentException
     */
    public function execute(
        int $anggotaId,
        float $shu60,
        float $shu10,
        float $shu30,
        ?string $tahun = null,
        mixed $createdAt = null
    ): ShuDistribusi {
        if ($anggotaId <= 0) {
            throw new InvalidArgumentException('Anggota ID must be a positive integer.');
        }

        if ($shu60 < 0 || $shu10 < 0 || $shu30 < 0) {
            throw new InvalidArgumentException('SHU distribution amounts cannot be negative.');
        }

        return ShuDistribusi::create([
            'anggota_id' => $anggotaId,
            'tahun' => $tahun ?? date('Y'),
            'shu_60_percent' => $shu60,
            'shu_10_percent' => $shu10,
            'shu_30_percent' => $shu30,
            'created_at' => $createdAt ?? now(),
        ]);
    }
}
