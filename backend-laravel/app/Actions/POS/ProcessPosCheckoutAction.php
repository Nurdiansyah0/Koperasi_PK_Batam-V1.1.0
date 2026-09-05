<?php

namespace App\Actions\POS;

use App\Models\Anggota;
use App\Models\Barang;
use App\Models\TarikTunai;
use App\Models\Transaksi;
use App\Models\TransaksiDetail;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;

class ProcessPosCheckoutAction
{
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
            $totalHarga = 0;
            $totalKeuntungan = 0;
            $transaksiItems = [];

            // 1. Canonical Lock Hierarchy Step 1: Deterministic ascending Barang pre-locking
            $uniqueBarangIds = array_values(array_unique(array_column($data['items'], 'barang_id')));
            sort($uniqueBarangIds);

            $lockedBarangs = [];
            foreach ($uniqueBarangIds as $bId) {
                $b = Barang::where('barang_id', $bId)->lockForUpdate()->first();
                if (! $b) {
                    throw new Exception('Stok etalase tidak mencukupi untuk barang ID: '.$bId);
                }
                $lockedBarangs[$bId] = $b;
            }

            // Process inventory items in original client payload order (Preserves legacy calculations & line ordering)
            foreach ($data['items'] as $item) {
                $barang = $lockedBarangs[$item['barang_id']] ?? null;
                if (! $barang || $barang->stok_toko < $item['jumlah']) {
                    throw new Exception('Stok etalase tidak mencukupi untuk barang ID: '.$item['barang_id']);
                }

                $harga_satuan = $item['harga_satuan'] ?? $barang->harga_jual;
                $subtotal = $harga_satuan * $item['jumlah'];
                $keuntungan = ($harga_satuan - $barang->harga_modal) * $item['jumlah'];

                $totalHarga += $subtotal;
                $totalKeuntungan += $keuntungan;

                $transaksiItems[] = [
                    'barang_id' => $barang->barang_id,
                    'jumlah' => $item['jumlah'],
                    'harga_satuan' => $harga_satuan,
                    'subtotal' => $subtotal,
                    'keuntungan' => $keuntungan,
                ];

                $barang->stok_toko -= $item['jumlah'];
                $barang->save();
            }

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

            // 3. Payment Mode: E-Wallet
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

            // 4. Payment Mode: Hutang
            if ($metodePembayaran === 'hutang') {
                $sisa_limit = (float) $anggota->sisa_limit_hutang;
                if ($totalHarga > $sisa_limit) {
                    throw new Exception('Gagal: Total belanja Rp '.number_format($totalHarga, 0, ',', '.').' melebihi sisa limit hutang Rp '.number_format($sisa_limit, 0, ',', '.'));
                }
                $anggota->hutang += $totalHarga;
                $anggota->save();
            }

            // 5. Integrated Tarik Tunai during checkout
            $tarikTunaiData = null;
            if (! empty($data['sertakan_tarik_tunai']) && (float) ($data['tarik_tunai_nominal'] ?? 0) > 0) {
                if (! $anggota_id) {
                    throw new Exception('Tarik tunai saat belanja wajib memilih data anggota.');
                }

                $anggota = Anggota::lockForUpdate()->find($anggota_id);
                if (! $anggota) {
                    throw new Exception('Anggota tidak ditemukan');
                }

                // Debt check
                if ((float) $anggota->hutang > 0) {
                    throw new Exception('Gagal: Anggota memiliki tagihan hutang berjalan sebesar Rp '.number_format($anggota->hutang, 0, ',', '.').'. Wajib lunasi hutang terlebih dahulu.');
                }

                // Minimum purchase check (>= Rp 25.000)
                if ($totalHarga < 25000) {
                    throw new Exception('Syarat penarikan tunai: Total belanja saat ini minimal Rp 25.000 (Belanja saat ini: Rp '.number_format($totalHarga, 0, ',', '.').').');
                }

                // Proportional limit (Maks 2x Belanja, Plafon Rp 100.000)
                $maxPlafon = min(100000, $totalHarga * 2);
                $nominalTarik = (float) $data['tarik_tunai_nominal'];
                if ($nominalTarik > $maxPlafon) {
                    throw new Exception('Nominal tarik tunai (Rp '.number_format($nominalTarik, 0, ',', '.').') melebihi batas kuota proporsional Rp '.number_format($maxPlafon, 0, ',', '.').' (Maks. 2x belanja saat ini, Plafon Rp 100.000).');
                }

                $sumberTarik = ($data['tarik_tunai_sumber'] ?? null) ?: 'shu';
                $available = ($sumberTarik === 'shu' ? (float) $anggota->shu : (float) $anggota->saldo);
                if ($nominalTarik > $available) {
                    throw new Exception("Saldo {$sumberTarik} tidak mencukupi (Tersedia: Rp ".number_format($available, 0, ',', '.').').');
                }

                // Master consent check
                if (! $anggota->persetujuan_shu_master_at && empty($data['persetujuan_shu'])) {
                    throw new Exception('Wajib menyetujui ketentuan pemotongan SHU Hari Besar (Master Consent).');
                }

                if (! $anggota->persetujuan_shu_master_at) {
                    $anggota->persetujuan_shu_master_at = Carbon::now();
                    $anggota->persetujuan_shu_version = 'v1.0';
                }

                // Deduct total nominal from member balance
                if ($sumberTarik === 'shu') {
                    $anggota->shu -= $nominalTarik;
                } else {
                    $anggota->saldo -= $nominalTarik;
                }
                $anggota->save();

                // Net cash handover calculation
                $uangBersihDiserahkan = max(0, $nominalTarik - $totalHarga);

                $kodePenarikan = 'TRK-'.date('ymd').'-'.rand(1000, 9999);
                $tarik = TarikTunai::create([
                    'kode_penarikan' => $kodePenarikan,
                    'kasir_id' => $kasirId,
                    'anggota_id' => $anggota->anggota_id,
                    'nominal' => $nominalTarik,
                    'status' => 'completed',
                    'sumber_dana' => $sumberTarik,
                    'persetujuan_shu' => true,
                    'approved_at' => Carbon::now(),
                    'keterangan' => 'Tarik Tunai saat Belanja (Potong Belanja Rp '.number_format($totalHarga, 0, ',', '.').', Kas Diserahkan Rp '.number_format($uangBersihDiserahkan, 0, ',', '.').')',
                    'created_at' => Carbon::now(),
                ]);

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
                $tarik->transaksi_id = $transaksi->transaksi_id;
                $tarik->save();
            }

            // 8. Persist Transaksi Details
            foreach ($transaksiItems as $tItem) {
                $tItem['transaksi_id'] = $transaksi->transaksi_id;
                TransaksiDetail::create($tItem);
            }

            // 9. Calculate and Distribute SHU (60% Anggota, 10% & 30% Koperasi)
            if ($anggota_id && $totalKeuntungan > 0) {
                $anggota = Anggota::find($anggota_id);
                if ($anggota) {
                    $shu60 = $totalKeuntungan * 0.60;
                    $shu10 = $totalKeuntungan * 0.10;
                    $shu30 = $totalKeuntungan * 0.30;

                    $anggota->shu += $shu60;
                    $anggota->save();

                    // Record to shu_distribusi (Legacy Parity)
                    DB::table('shu_distribusi')->insert([
                        'anggota_id' => $anggota_id,
                        'tahun' => date('Y'),
                        'shu_60_percent' => $shu60,
                        'shu_10_percent' => $shu10,
                        'shu_30_percent' => $shu30,
                        'created_at' => now(),
                    ]);
                }
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
