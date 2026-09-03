<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Barang;
use Illuminate\Support\Facades\DB;

$barangs = Barang::all();
$fixed = 0;
foreach($barangs as $barang) {
    if ($barang->stok != ($barang->stok_toko + $barang->stok_gudang)) {
        $stok = (int) $barang->stok;
        $pkm = (int) ($barang->pkm ?: 1);
        $toko = min($stok, $pkm);
        $gudang = max(0, $stok - $toko);
        
        DB::table('barang')
            ->where('barang_id', $barang->barang_id)
            ->update([
                'stok_toko' => $toko,
                'stok_gudang' => $gudang
            ]);
        $fixed++;
        echo "Fixed {$barang->nama_barang}: Stok $stok -> Toko $toko, Gudang $gudang\n";
    }
}
echo "Total fixed: $fixed\n";
