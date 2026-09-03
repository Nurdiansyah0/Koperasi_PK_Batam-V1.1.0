<?php
require __DIR__.'/backend-laravel/vendor/autoload.php';
$app = require_once __DIR__.'/backend-laravel/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Anggota;
use Illuminate\Support\Facades\Cache;

Cache::put('kasir_all_anggota_slim', 'CACHE_IS_SET', 120);
echo "Cache before save: " . Cache::get('kasir_all_anggota_slim') . "\n";

$anggota = Anggota::find(1);
$anggota->saldo += 1;
$anggota->save();

echo "Cache after save: " . (Cache::has('kasir_all_anggota_slim') ? Cache::get('kasir_all_anggota_slim') : 'EMPTY') . "\n";
