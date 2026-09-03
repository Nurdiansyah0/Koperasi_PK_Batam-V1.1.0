<?php
require __DIR__.'/backend-laravel/vendor/autoload.php';
$app = require_once __DIR__.'/backend-laravel/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Anggota;

$anggota = Anggota::first();
echo "Before: SHU={$anggota->shu}, Saldo={$anggota->saldo}\n";

// Fake a request to prosesKonversiShu
$request = Illuminate\Http\Request::create('/laravel/api/admin/konversi-shu', 'POST', [
    'mode' => 'individual',
    'anggota_id' => $anggota->anggota_id,
    'nominal' => 1000
]);
$admin = \App\Models\User::where('role', 'admin')->first();
$request->setUserResolver(function () use ($admin) {
    return $admin;
});

$controller = new App\Http\Controllers\AdminController();
$response = $controller->prosesKonversiShu($request);
echo "Response: " . $response->getContent() . "\n";

$anggota->refresh();
echo "After: SHU={$anggota->shu}, Saldo={$anggota->saldo}\n";
