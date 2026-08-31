<?php
$file = 'app/Http/Controllers/KasirController.php';
$content = file_get_contents($file);

$newMethod = <<<'METHOD'
    public function getDashboard(Request $request)
    {
        $kasirId = $this->checkKasir($request);

        $penjualanHariIni = Transaksi::where('kasir_id', $kasirId)
            ->whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')
            ->sum('total_harga');

        $transaksiHariIni = Transaksi::where('kasir_id', $kasirId)
            ->whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')
            ->count();

        $uangCashMasuk = Transaksi::where('kasir_id', $kasirId)
            ->whereDate('created_at', Carbon::today())
            ->where('status', 'selesai')
            ->whereIn('metode_pembayaran', ['cash', 'tunai'])
            ->sum('total_harga');

        $pendingSerahTerima = App\Models\SerahTerimaKasir::where('kasir_to', $kasirId)
            ->where('status', 'pending')
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_pendapatan_hari_ini' => (float) $penjualanHariIni,
                'total_transaksi_hari_ini' => (int) $transaksiHariIni,
                'saldo_kas' => (float) $uangCashMasuk,
                'pending_serah_terima' => (int) $pendingSerahTerima,
                
                // Keep old keys just in case
                'totalPenjualanHariIni' => (float) $penjualanHariIni,
                'totalTransaksiHariIni' => (int) $transaksiHariIni,
            ]
        ]);
    }
METHOD;

$content = preg_replace('/public function getDashboard\(Request \$request\).*?\]\);\s*}/s', $newMethod, $content);
file_put_contents($file, $content);
echo "Patched KasirController.php";
