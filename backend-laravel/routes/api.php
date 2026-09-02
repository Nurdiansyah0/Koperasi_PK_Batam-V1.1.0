<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AnggotaController;
use App\Http\Controllers\KasirController;
use App\Http\Controllers\AdminController;

// Public routes with rate limiting
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/reset-password', [AuthController::class, 'resetPasswordWithChallenge'])->middleware('throttle:5,1');

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth Profile
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Anggota Module
    Route::prefix('anggota')->group(function () {
        Route::get('/profil', [AnggotaController::class, 'getProfil']);
        Route::get('/barang', [AnggotaController::class, 'getDataBarangBelanja']);
        Route::get('/paket-belanja', [AnggotaController::class, 'getPaketBelanja']);
        Route::post('/transaksi', [AnggotaController::class, 'simpanTransaksi']);
        Route::get('/transaksi', [AnggotaController::class, 'getHistoriTransaksi']);
        Route::post('/bayar-hutang', [AnggotaController::class, 'bayarHutang']);
        Route::get('/bayar-hutang', [AnggotaController::class, 'getHistoriBayarHutang']);
        Route::post('/update-profile', [AnggotaController::class, 'updateProfile']);
        Route::post('/change-password', [AnggotaController::class, 'changePassword']);
        Route::get('/cek-kelayakan-tarik-tunai', [AnggotaController::class, 'cekKelayakanTarikTunai']);
        Route::post('/setujui-master-consent-shu', [AnggotaController::class, 'setujuiMasterConsentShu']);
        Route::post('/ajukan-tarik-tunai', [AnggotaController::class, 'ajukanTarikTunai']);
        Route::get('/riwayat-tarik-tunai', [AnggotaController::class, 'getRiwayatTarikTunai']);
    });

    // Kasir Module
    Route::prefix('kasir')->middleware('kasir')->group(function () {
        Route::get('/dashboard', [KasirController::class, 'getDashboard']);
        Route::get('/transaksi-terbaru', [KasirController::class, 'getTransaksiTerbaru']);
        Route::get('/barang-belanja', [KasirController::class, 'getDataBarangBelanjaKasir']);
        Route::get('/paket-belanja', [KasirController::class, 'getPaketBelanja']);
        Route::get('/pesanan-anggota', [KasirController::class, 'getPesananAnggota']);
        Route::post('/tolak-pesanan-anggota', [KasirController::class, 'tolakPesananAnggota']);
        Route::post('/simpan-transaksi-kasir', [KasirController::class, 'simpanTransaksiKasir']);
        Route::post('/buat-transaksi', [KasirController::class, 'buatTransaksiKasir']);
        Route::get('/all-anggota', [KasirController::class, 'getAllAnggota']);
        Route::get('/cari-profil-anggota', [KasirController::class, 'cariProfilAnggota']);
        Route::get('/all-pembayaran-hutang', [KasirController::class, 'getAllPembayaranHutang']);
        Route::post('/approve-pembayaran-hutang', [KasirController::class, 'approvePembayaranHutang']);
        Route::post('/history-transaksi', [KasirController::class, 'getHistoryTransaksi']);
        Route::post('/setor-admin', [KasirController::class, 'setorAdmin']);
        Route::get('/setoran-history', [KasirController::class, 'getRiwayatSetoran']);
        Route::post('/tarik-tunai', [KasirController::class, 'tarikTunai']);
        Route::get('/antrean-tarik-tunai', [KasirController::class, 'getAntreanTarikTunai']);
        Route::post('/proses-tarik-tunai', [KasirController::class, 'prosesTarikTunai']);
        Route::get('/cek-kelayakan-tarik-tunai/{anggota_id}', [KasirController::class, 'cekKelayakanTarikTunai']);
        Route::get('/riwayat-tarik-tunai', [KasirController::class, 'getRiwayatTarikTunaiKasir']);
        Route::get('/daftar-kasir', [KasirController::class, 'getDaftarKasir']);
        Route::get('/serah-terima-for-me', [KasirController::class, 'getSerahTerimaForMe']);
        Route::get('/serah-terima-draft', [KasirController::class, 'getSerahTerimaDraft']);
        Route::get('/active-shift-info', [KasirController::class, 'getActiveShiftInfo']);
        Route::post('/create-serah-terima', [KasirController::class, 'createSerahTerima']);
        Route::post('/approve-serah-terima', [KasirController::class, 'approveSerahTerima']);
        Route::post('/reject-serah-terima', [KasirController::class, 'rejectSerahTerima']);
    });

    // Admin Module
    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::post('/opname', [AdminController::class, 'submitOpnameMassal']);
        Route::get('/dashboard-stats', [AdminController::class, 'getDashboardStats']);
        Route::get('/barang', [AdminController::class, 'getBarang']);
        Route::post('/tambah-barang', [AdminController::class, 'tambahBarang']);
        Route::post('/update-barang', [AdminController::class, 'updateBarang']);
        Route::post('/hapus-barang', [AdminController::class, 'hapusBarang']);
        Route::get('/anggota', [AdminController::class, 'getAnggota']);
        Route::post('/tambah-user', [AdminController::class, 'tambahUser']);
        Route::post('/update-user', [AdminController::class, 'updateUser']);
        Route::post('/hapus-user', [AdminController::class, 'hapusUser']);
        Route::get('/setoran-kasir', [AdminController::class, 'getSetoranKasir']);
        Route::post('/approve-setoran-kasir', [AdminController::class, 'approveSetoranKasir']);
        Route::post('/topup-shu', [AdminController::class, 'topupSHU']);
        Route::post('/laporan-transaksi', [AdminController::class, 'getLaporanTransaksi']);
        Route::get('/monitor-barang', [AdminController::class, 'getMonitorBarang']);
        Route::get('/shu-distribusi', [AdminController::class, 'getShuDistribusi']);
        Route::get('/data-kasir', [AdminController::class, 'getDataKasir']);
        Route::post('/restock-barang', [AdminController::class, 'restockBarang']);
        Route::get('/riwayat-restock', [AdminController::class, 'getRiwayatRestock']);
        Route::get('/pkm-analysis', [AdminController::class, 'getPkmAnalysis']);
        Route::post('/update-pkm', [AdminController::class, 'updatePkm']);
        Route::post('/auto-calculate-pkm', [AdminController::class, 'autoCalculatePkm']);
        Route::get('/laporan-selisih-kasir', [AdminController::class, 'getLaporanSelisihKasir']);
        Route::get('/laporan-tarik-tunai', [AdminController::class, 'getLaporanTarikTunai']);
        Route::get('/shu-management', [AdminController::class, 'getShuManagement']);
        Route::post('/konversi-shu', [AdminController::class, 'prosesKonversiShu']);
        Route::post('/mutasi-stok', [AdminController::class, 'mutasiStok']);
        Route::post('/auto-refill-display', [AdminController::class, 'autoRefillDisplay']);
        Route::get('/jabatan', [AdminController::class, 'getDaftarJabatan']);
        Route::post('/jabatan/assign', [AdminController::class, 'assignJabatan']);
        Route::post('/jabatan/revoke', [AdminController::class, 'revokeJabatan']);
    });
});
