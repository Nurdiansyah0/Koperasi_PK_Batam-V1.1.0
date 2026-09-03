<?php
require __DIR__.'/backend-laravel/vendor/autoload.php';
$app = require_once __DIR__.'/backend-laravel/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Anggota;

$anggota = Anggota::find(1);
echo "DB START: SHU={$anggota->shu}, Saldo={$anggota->saldo}\n";

$request = Illuminate\Http\Request::create('/laravel/api/admin/konversi-shu', 'POST', [
    'mode' => 'massal_ke_saldo',
    'persentase' => 10
]);
$admin = \App\Models\User::where('role', 'admin')->first();
$request->setUserResolver(function () use ($admin) {
    return $admin;
});

$controller = new App\Http\Controllers\AdminController();
$controller->prosesKonversiShu($request);

$anggotaFresh = Anggota::find(1);
echo "DB END: SHU={$anggotaFresh->shu}, Saldo={$anggotaFresh->saldo}\n";
