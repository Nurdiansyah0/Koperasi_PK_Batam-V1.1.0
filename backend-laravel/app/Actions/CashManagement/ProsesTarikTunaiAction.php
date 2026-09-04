<?php

namespace App\Actions\CashManagement;

use App\Models\Anggota;
use App\Models\TarikTunai;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Exception;

class ProsesTarikTunaiAction
{
    /**
     * Executes the pending tarik tunai processing by kasir (Approve/Reject).
     */
    public function execute(array $data, int $kasirId): array
    {
        DB::beginTransaction();
        try {
            $tarik = TarikTunai::lockForUpdate()->find($data['tarik_id']);
            if (! $tarik || $tarik->status !== 'pending') {
                throw new Exception('Tiket penarikan tidak valid atau sudah diproses.');
            }

            $anggota = Anggota::lockForUpdate()->find($tarik->anggota_id);
            if (! $anggota) {
                throw new Exception('Data anggota tidak ditemukan.');
            }

            $action = $data['action'];

            if ($action === 'reject') {
                $tarik->status = 'rejected';
                $tarik->kasir_id = $kasirId;
                $tarik->alasan_tolak = $data['alasan_tolak'] ?? 'Ditolak oleh kasir toko.';
                $tarik->save();

                DB::commit();

                return [
                    'status' => 'rejected',
                    'message' => 'Tiket penarikan tunai berhasil ditolak.'
                ];
            }

            // 1. Re-verify debt at approval time
            if ((float) $anggota->hutang > 0) {
                throw new Exception('Penarikan dibatalkan: Anggota masih memiliki saldo hutang belanja sebesar Rp '.number_format($anggota->hutang, 0, ',', '.').'.');
            }

            // 2. Deduct funds
            if ($tarik->sumber_dana === 'shu') {
                if ($anggota->shu < $tarik->nominal) {
                    throw new Exception('Saldo SHU anggota tidak mencukupi (Tersedia: Rp '.number_format($anggota->shu, 0, ',', '.').').');
                }
                $anggota->shu -= $tarik->nominal;
            } else {
                if ($anggota->saldo < $tarik->nominal) {
                    throw new Exception('Saldo E-Wallet anggota tidak mencukupi (Tersedia: Rp '.number_format($anggota->saldo, 0, ',', '.').').');
                }
                $anggota->saldo -= $tarik->nominal;
            }
            $anggota->save();

            $tarik->status = 'completed';
            $tarik->kasir_id = $kasirId;
            $tarik->approved_at = Carbon::now();
            $tarik->save();

            DB::commit();

            return [
                'status' => 'approved',
                'message' => 'Uang tunai sebesar Rp '.number_format($tarik->nominal, 0, ',', '.').' berhasil diserahkan ke '.$anggota->nama_lengkap.'.',
                'data' => [
                    'tarik_id' => $tarik->tarik_id,
                    'kode_penarikan' => $tarik->kode_penarikan,
                    'nominal' => (float) $tarik->nominal,
                    'sisa_shu' => (float) $anggota->shu,
                    'sisa_saldo' => (float) $anggota->saldo,
                    'nama_anggota' => $anggota->nama_lengkap,
                    'transaksi_id' => $tarik->transaksi_id,
                    'created_at' => $tarik->created_at,
                ]
            ];
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
