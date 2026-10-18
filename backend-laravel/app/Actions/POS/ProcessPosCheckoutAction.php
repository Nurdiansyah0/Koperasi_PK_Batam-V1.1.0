<?php

namespace App\Actions\POS;

use App\Actions\CashManagement\RecordPosIntegratedTarikTunaiAction;
use App\Actions\Finance\RecordPosShuDistributionAction;
use App\Actions\Inventory\DeductSaleStockAction;
use App\Actions\Members\ApplyPosMemberBalanceChangesAction;
use App\Actions\Members\CalculateShuWithdrawalEligibilityAction;
use App\Models\Anggota;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;

class ProcessPosCheckoutAction
{
    public function __construct(
        protected ?DeductSaleStockAction $deductSaleStockAction = null,
        protected ?ApplyPosMemberBalanceChangesAction $applyPosMemberBalanceChangesAction = null,
        protected ?RecordPosShuDistributionAction $recordPosShuDistributionAction = null,
        protected ?RecordPosIntegratedTarikTunaiAction $recordPosIntegratedTarikTunaiAction = null,
        protected ?CalculateShuWithdrawalEligibilityAction $calculateShuWithdrawalEligibilityAction = null
    ) {
        $this->deductSaleStockAction = $deductSaleStockAction ?? app(DeductSaleStockAction::class);
        $this->applyPosMemberBalanceChangesAction = $applyPosMemberBalanceChangesAction ?? app(ApplyPosMemberBalanceChangesAction::class);
        $this->recordPosShuDistributionAction = $recordPosShuDistributionAction ?? app(RecordPosShuDistributionAction::class);
        $this->recordPosIntegratedTarikTunaiAction = $recordPosIntegratedTarikTunaiAction ?? app(RecordPosIntegratedTarikTunaiAction::class);
        $this->calculateShuWithdrawalEligibilityAction = $calculateShuWithdrawalEligibilityAction ?? app(CalculateShuWithdrawalEligibilityAction::class);
    }

    /**
     * Executes the POS checkout transaction workflow.
     *
     * @param  array  $data  Validated checkout payload
     * @param  int  $kasirId  Authenticated cashier user ID
     * @return array Resulting transaction summary
     *
     * @throws Exception
     */
    public function execute(array $data, int $kasirId): array
    {
        DB::beginTransaction();
        try {
            // Normalize cart lines: consolidate duplicate barang_id entries by summing quantities,
            // while preserving first-occurrence line ordering.
            $normalizedItems = [];
            foreach ($data['items'] as $item) {
                $bId = (int) $item['barang_id'];
                $qty = (int) $item['jumlah'];

                if (isset($normalizedItems[$bId])) {
                    $normalizedItems[$bId]['jumlah'] += $qty;
                } else {
                    $normalizedItems[$bId] = [
                        'barang_id' => $bId,
                        'jumlah' => $qty,
                    ];
                }
            }
            $normalizedItems = array_values($normalizedItems);

            // 1. Canonical Lock Hierarchy Step 1: Deduct sale stock via Inventory Action
            // Enforces deterministic ascending Barang pre-locking, stock validation, and stock deduction
            $stockResult = $this->deductSaleStockAction->execute($normalizedItems);
            $transaksiItems = $stockResult['items'];
            $totalHarga = $stockResult['total_harga'];
            $totalKeuntungan = $stockResult['total_keuntungan'];

            // 2. Canonical Lock Hierarchy Step 2: Validate and lock Member
            $anggota_id = ($data['anggota_id'] ?? null) ?: null;
            if (! $anggota_id) {
                throw new Exception('Transaksi belanja wajib memilih Anggota Koperasi (semua transaksi khusus anggota).');
            }
            $anggota = Anggota::lockForUpdate()->find($anggota_id);
            if (! $anggota) {
                throw new Exception('Data Anggota Koperasi tidak ditemukan.');
            }

            $metodePembayaran = $data['metode_pembayaran'] ?? 'cash';

            // 3. Payment Mode Execution via Members Action
            $this->applyPosMemberBalanceChangesAction->execute($anggota, $metodePembayaran, $totalHarga);

            // 4. Integrated Tarik Tunai during checkout
            $tarikTunaiData = null;
            if (! empty($data['sertakan_tarik_tunai']) && (float) ($data['tarik_tunai_nominal'] ?? 0) > 0) {
                if (! $anggota_id) {
                    throw new Exception('Tarik tunai saat belanja wajib memilih data anggota.');
                }

                $nominalTarik = (float) $data['tarik_tunai_nominal'];
                $sumberTarik = ($data['tarik_tunai_sumber'] ?? null) ?: 'shu';

                // Minimum purchase check (strictly > Rp 25.000)
                if ($totalHarga <= 25000) {
                    throw new Exception('Syarat penarikan tunai: Total belanja saat ini harus lebih dari Rp 25.000 (Belanja saat ini: Rp '.number_format($totalHarga, 0, ',', '.').').');
                }

                // Purchase coverage check (Mandatory Invariant: nominal_tarikan >= total_belanja)
                if ($nominalTarik < $totalHarga) {
                    $kurang = $totalHarga - $nominalTarik;
                    throw new Exception('Nominal penarikan tunai (Rp '.number_format($nominalTarik, 0, ',', '.').') tidak mencukupi untuk menutup total belanja (Rp '.number_format($totalHarga, 0, ',', '.').'). Kurang Rp '.number_format($kurang, 0, ',', '.').'.');
                }

                if ($sumberTarik === 'shu') {
                    // Authoritative Members eligibility calculation
                    $eligibility = $this->calculateShuWithdrawalEligibilityAction->execute($anggota, $totalHarga);
                    if ($nominalTarik > $eligibility['final_withdrawal_limit']) {
                        throw new Exception('Nominal tarik tunai (Rp '.number_format($nominalTarik, 0, ',', '.').') melebihi batas maksimal penarikan SHU Rp '.number_format($eligibility['final_withdrawal_limit'], 0, ',', '.').'.');
                    }
                    if ($nominalTarik > (float) $anggota->shu) {
                        throw new Exception('Saldo shu tidak mencukupi (Tersedia: Rp '.number_format((float) $anggota->shu, 0, ',', '.').').');
                    }
                } else {
                    $maxPlafon = 100000.0;
                    if ($nominalTarik > $maxPlafon) {
                        throw new Exception('Nominal tarik tunai (Rp '.number_format($nominalTarik, 0, ',', '.').') melebihi batas maksimal Rp '.number_format($maxPlafon, 0, ',', '.').'.');
                    }
                    if ($nominalTarik > (float) $anggota->saldo) {
                        throw new Exception('Saldo saldo tidak mencukupi (Tersedia: Rp '.number_format((float) $anggota->saldo, 0, ',', '.').').');
                    }
                }

                // Master consent check
                if (! $anggota->persetujuan_shu_master_at && empty($data['persetujuan_shu'])) {
                    throw new Exception('Wajib menyetujui ketentuan pemotongan SHU Hari Besar (Master Consent).');
                }

                if (! $anggota->persetujuan_shu_master_at) {
                    $anggota->persetujuan_shu_master_at = Carbon::now();
                    $anggota->persetujuan_shu_version = 'v1.0';
                }

                // Deduct total nominal from member balance via Members Action
                $this->applyPosMemberBalanceChangesAction->deductTarikTunai($anggota, $nominalTarik, $sumberTarik);

                // Net cash handover calculation (invariant ensures nominalTarik >= totalHarga)
                $uangBersihDiserahkan = $nominalTarik - $totalHarga;

                // Persist TarikTunai ticket via Cash Management Action
                $tarik = $this->recordPosIntegratedTarikTunaiAction->execute(
                    (int) $anggota->anggota_id,
                    $kasirId,
                    $nominalTarik,
                    $totalHarga,
                    $uangBersihDiserahkan,
                    $sumberTarik
                );

                $tarikTunaiData = [
                    'tarik_id' => $tarik->tarik_id,
                    'kode_penarikan' => $tarik->kode_penarikan,
                    'nominal_tarik' => $nominalTarik,
                    'potong_belanja' => $totalHarga,
                    'uang_bersih_diserahkan' => $uangBersihDiserahkan,
                    'sumber_dana' => $sumberTarik,
                    'sisa_shu' => (float) $anggota->shu,
                    'sisa_saldo' => (float) $anggota->saldo,
                ];
            }

            // 6. Final payment method determination
            $metodePembayaranFinal = $tarikTunaiData ? 'potong_tarik_tunai' : $metodePembayaran;

            // 7. Persist Transaksi Header
            $transaksi = Transaksi::create([
                'anggota_id' => $anggota_id,
                'kasir_id' => $kasirId,
                'total_harga' => $totalHarga,
                'total_keuntungan' => $totalKeuntungan,
                'metode_pembayaran' => $metodePembayaranFinal,
                'status' => 'selesai',
            ]);

            if ($tarikTunaiData && isset($tarik)) {
                $this->recordPosIntegratedTarikTunaiAction->linkTransaction($tarik, $transaksi->transaksi_id);
            }

            // 8. Persist Transaksi Details (Bulk Insert)
            $detailRecords = [];
            foreach ($transaksiItems as $tItem) {
                $detailRecords[] = [
                    'transaksi_id' => $transaksi->transaksi_id,
                    'barang_id' => $tItem['barang_id'],
                    'jumlah' => $tItem['jumlah'],
                    'harga_satuan' => $tItem['harga_satuan'],
                    'subtotal' => $tItem['subtotal'],
                    'keuntungan' => $tItem['keuntungan'],
                ];
            }
            if (! empty($detailRecords)) {
                TransaksiDetail::insert($detailRecords);
            }

            // 9. Calculate and Distribute SHU (60% Anggota, 10% & 30% Koperasi)
            if ($anggota_id && $totalKeuntungan > 0) {
                $shu60 = $totalKeuntungan * 0.60;
                $shu10 = $totalKeuntungan * 0.10;
                $shu30 = $totalKeuntungan * 0.30;

                $this->applyPosMemberBalanceChangesAction->creditShu($anggota, $shu60);

                // Record to shu_distribusi via Finance Action
                $this->recordPosShuDistributionAction->execute(
                    (int) $anggota_id,
                    $shu60,
                    $shu10,
                    $shu30
                );
            }

            DB::commit();

            return [
                'transaksi_id' => $transaksi->transaksi_id,
                'total' => $totalHarga,
                'total_keuntungan' => $totalKeuntungan,
                'tarik_tunai' => $tarikTunaiData,
                'message' => $tarikTunaiData
                    ? 'Transaksi & Tarik Tunai Berhasil! Serahkan kas bersih sebesar Rp '.number_format($tarikTunaiData['uang_bersih_diserahkan'], 0, ',', '.').' ke pembeli.'
                    : 'Transaksi berhasil',
            ];
        } catch (Exception $e) {
            DB::rollBack();

            throw $e;
        }
    }
}
