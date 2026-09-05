<?php

namespace App\Actions\Finance;

use App\Models\Anggota;
use App\Models\KonversiShu;
use Illuminate\Support\Facades\DB;
use Exception;

class ProsesKonversiShuAction
{
    /**
     * Execute the SHU conversion workflow across supported modes.
     *
     * @param array $data Validated request data
     * @param int $adminId ID of the acting admin
     * @return string Success message
     * @throws Exception
     */
    public function execute(array $data, int $adminId): string
    {
        DB::beginTransaction();
        try {
            $mode = $data['mode'];

            if ($mode === 'individual' || $mode === 'ke_saldo_belanja') {
                $message = $this->convertKeSaldoBelanja(
                    (int) ($data['anggota_id'] ?? 0),
                    (float) ($data['nominal'] ?? 0),
                    $data['keterangan'] ?? null,
                    $adminId
                );
            } elseif ($mode === 'pelunasan_hutang') {
                $nominal = isset($data['nominal']) && $data['nominal'] !== null ? (float) $data['nominal'] : null;
                $message = $this->convertPelunasanHutang(
                    (int) ($data['anggota_id'] ?? 0),
                    $nominal,
                    $data['keterangan'] ?? null,
                    $adminId
                );
            } elseif ($mode === 'massal_ke_saldo') {
                $persentase = isset($data['persentase']) && $data['persentase'] !== null ? (float) $data['persentase'] : null;
                $message = $this->convertMassalKeSaldo(
                    $persentase,
                    $data['keterangan'] ?? null,
                    $adminId
                );
            } else {
                throw new Exception('Mode konversi tidak valid.');
            }

            DB::commit();

            return $message;
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Converts member SHU to e-wallet shopping balance.
     */
    private function convertKeSaldoBelanja(int $anggotaId, float $nominal, ?string $keterangan, int $adminId): string
    {
        $anggota = Anggota::lockForUpdate()->find($anggotaId);
        if (! $anggota) {
            throw new Exception('Data anggota tidak ditemukan.');
        }

        if ($nominal <= 0 || $nominal > $anggota->shu) {
            throw new Exception('Nominal konversi tidak valid atau melebihi saldo SHU (Tersedia: Rp '.number_format($anggota->shu, 0, ',', '.').').');
        }

        $anggota->shu -= $nominal;
        $anggota->saldo += $nominal;
        $anggota->save();

        KonversiShu::create([
            'anggota_id' => $anggota->anggota_id,
            'admin_id' => $adminId,
            'nominal' => $nominal,
            'tipe_konversi' => 'ke_saldo_belanja',
            'keterangan' => $keterangan ?: 'Konversi SHU ke Saldo Belanja E-Wallet',
        ]);

        return 'Berhasil memindahkan SHU sebesar Rp '.number_format($nominal, 0, ',', '.').' ke Saldo Belanja '.$anggota->nama_lengkap.'.';
    }

    /**
     * Offsets outstanding member debt using available SHU.
     */
    private function convertPelunasanHutang(int $anggotaId, ?float $requestedNominal, ?string $keterangan, int $adminId): string
    {
        $anggota = Anggota::lockForUpdate()->find($anggotaId);
        if (! $anggota) {
            throw new Exception('Data anggota tidak ditemukan.');
        }

        if ($anggota->hutang <= 0) {
            throw new Exception('Anggota tidak memiliki tunggakan hutang.');
        }

        $maxPotong = min($anggota->shu, $anggota->hutang);
        $nominal = $requestedNominal !== null ? min($requestedNominal, $maxPotong) : $maxPotong;

        if ($nominal <= 0) {
            throw new Exception('Saldo SHU tidak mencukupi untuk memotong hutang.');
        }

        $anggota->shu -= $nominal;
        $anggota->hutang -= $nominal;
        $anggota->save();

        KonversiShu::create([
            'anggota_id' => $anggota->anggota_id,
            'admin_id' => $adminId,
            'nominal' => $nominal,
            'tipe_konversi' => 'pelunasan_hutang',
            'keterangan' => $keterangan ?: 'Kompensasi Pelunasan Hutang dari Saldo SHU',
        ]);

        return 'Berhasil memotong SHU sebesar Rp '.number_format($nominal, 0, ',', '.').' untuk pelunasan hutang '.$anggota->nama_lengkap.'.';
    }

    /**
     * Mass converts a percentage of SHU to shopping balance for all members with positive SHU.
     */
    private function convertMassalKeSaldo(?float $persentaseInput, ?string $keterangan, int $adminId): string
    {
        $persentase = $persentaseInput ?: 100.0;
        $ratio = $persentase / 100.0;
        $totalConverted = 0;
        $countMembers = 0;

        $anggotas = Anggota::lockForUpdate()->where('shu', '>', 0)->get();
        foreach ($anggotas as $a) {
            $nominalToConvert = round($a->shu * $ratio, 2);
            if ($nominalToConvert > 0) {
                $a->shu -= $nominalToConvert;
                $a->saldo += $nominalToConvert;
                $a->save();

                KonversiShu::create([
                    'anggota_id' => $a->anggota_id,
                    'admin_id' => $adminId,
                    'nominal' => $nominalToConvert,
                    'tipe_konversi' => 'distribusi_hari_raya',
                    'keterangan' => $keterangan ?: "Distribusi Massal SHU ({$persentase}%) ke Saldo Belanja Hari Raya",
                ]);

                $totalConverted += $nominalToConvert;
                $countMembers++;
            }
        }

        return 'Distribusi massal berhasil! Rp '.number_format($totalConverted, 0, ',', '.')." dipindahkan ke saldo belanja {$countMembers} anggota.";
    }
}
