const fs = require('fs');
let code = fs.readFileSync('app/Http/Controllers/AdminController.php', 'utf8');

const rekapCode = `
            // Rekapitulasi Penjualan per Barang (Sales Detail / Quantity Analysis)
            $rekapBarang = \\App\\Models\\TransaksiDetail::query()
                ->join('transaksi', 'transaksi.transaksi_id', '=', 'transaksi_detail.transaksi_id')
                ->join('barang', 'barang.barang_id', '=', 'transaksi_detail.barang_id')
                ->whereIn('transaksi.transaksi_id', (clone $q)->select('transaksi_id'))
                ->selectRaw('
                    transaksi_detail.barang_id,
                    barang.nama_barang,
                    SUM(transaksi_detail.jumlah) as qty_terjual,
                    SUM(transaksi_detail.subtotal) as revenue,
                    SUM(transaksi_detail.keuntungan) as gross_profit,
                    SUM(transaksi_detail.subtotal - transaksi_detail.keuntungan) as historical_hpp
                ')
                ->groupBy('transaksi_detail.barang_id', 'barang.nama_barang')
                ->orderByDesc('qty_terjual')
                ->get()
                ->map(function ($b) {
                    return [
                        'barang_id' => $b->barang_id,
                        'nama_barang' => $b->nama_barang,
                        'qty_terjual' => (int) $b->qty_terjual,
                        'revenue' => (float) $b->revenue,
                        'historical_hpp' => (float) $b->historical_hpp,
                        'gross_profit' => (float) $b->gross_profit,
                    ];
                });

            // ── 1. RASIO MANAJEMEN KEUANGAN & KESEHATAN KOPERASI (Permenkop UKM & Financial Ratio Analysis) ──`;

code = code.replace(/            \/\/ ── 1\. RASIO MANAJEMEN KEUANGAN \& KESEHATAN KOPERASI \(Permenkop UKM \& Financial Ratio Analysis\) ──/, rekapCode);
code = code.replace(/'rekap_bulanan' => \$rekapBulanan,/, "'rekap_bulanan' => $rekapBulanan,\n                'rekap_barang' => $rekapBarang,");

fs.writeFileSync('app/Http/Controllers/AdminController.php', code);
