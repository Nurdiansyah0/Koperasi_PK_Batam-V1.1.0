# Aplikasi Android Koperasi PKPPK Batam

Aplikasi mobile resmi **Koperasi Karyawan PKPPK BTH** berbasis **Kotlin + Jetpack Compose (Material 3)**. Aplikasi ini terhubung langsung ke backend REST API Laravel (dan siap bermigrasi ke backend Go di masa depan).

---

## 1. Peta Arsitektur Aplikasi

Aplikasi ini memakai tiga pola arsitektur modern Android yang ramah pemula dan mudah dirawat:

1. **Package-by-Feature (`feature/*`)**
   Setiap peran dan fitur dikelompokkan per folder agar tim bisa bekerja paralel tanpa saling tabrakan:
   ```text
   app/src/main/java/id/koperasipk/app/
   ├── KoperasiApp.kt            # Inisialisasi AppContainer (DI manual) & StrictMode (debug)
   ├── MainActivity.kt           # Entry point: cek sesi -> Auth atau Root sesuai role
   ├── core/                     # Pondasi bersama seluruh fitur
   │   ├── common/               # ApiResult, safeApiCall, CurrencyFormatter, DateFormatter, FlexibleNumbers
   │   ├── database/             # Room DB (KoperasiDatabase, CachedBarangEntity, BarangDao)
   │   ├── datastore/            # TokenStore (DataStore) & SessionManager (cache StateFlow + auto 401)
   │   ├── designsystem/         # KoperasiTheme & komponen UI (TopBar, BottomBar, StatCard, RupiahTextField, dll)
   │   └── network/              # NetworkModule (Json, OkHttp, Retrofit), AuthInterceptor, KoperasiApi
   └── feature/
       ├── auth/                 # LoginScreen, ResetPasswordScreen, AuthRepository, AuthViewModel
       ├── akun/                 # AkunSayaScreen (profil /me, ubah password, logout)
       ├── anggota/              # AnggotaRoot & layar khusus Anggota
       ├── kasir/                # KasirRoot & layar POS / Kasir
       └── admin/                # AdminRoot & layar manajemen Admin
   ```

2. **UDF / MVI-Lite (Unidirectional Data Flow)**
   Setiap layar mengikuti alur satu arah yang konsisten:
   - `UiState` (`@Immutable data class`): menyimpan seluruh state UI yang ditampilkan layar.
   - `Event` (`sealed interface`): aksi dari pengguna (ketik input, tekan tombol, tarik untuk refresh).
   - `Effect` (`Channel` -> `Flow`): kejadian satu kali seperti menampilkan snackbar/pesan sukses.
   - UI membaca state dengan `collectAsStateWithLifecycle()` dan mengirim `viewModel.onEvent(...)`.

3. **Hybrid SSOT (Single Source of Truth)**
   - **Data transaksi, saldo, hutang, SHU, persetujuan:** Server adalah satu-satunya sumber kebenaran (*server-authoritative*). Aplikasi tidak menghitung kelayakan tarik tunai, harga final, atau mutasi stok secara lokal—semua ditampilkan dari respons server.
   - **Katalog barang (`cached_barang` di Room):** Disimpan lokal di SQLite (Room WAL mode) melalui `BarangDao` agar pencarian cepat dan tetap tampil saat jaringan lambat, lalu diperbarui ulang dari server.

---

## 2. Cara Menjalankan di Emulator atau HP Asli

### Prasyarat
- **Android Studio** (disarankan Ladybug atau lebih baru) dengan **JDK 21**.
- **Android SDK** Platform 35 (`compileSdk = 35`, `minSdk = 24`).
- Backend Laravel aktif (contoh lokal: `php artisan serve --host=127.0.0.1 --port=8000` di folder `backend-laravel`).

### A. Mengatur `API_BASE_URL` di `local.properties`
Buka file `android-app/local.properties` (file ini tidak di-commit ke Git) lalu tambahkan baris `API_BASE_URL`:

- **Untuk Android Emulator** (menghubungi `localhost:8000` di laptop):
  ```properties
  sdk.dir=/home/nama-user/Android/Sdk
  API_BASE_URL=http://10.0.2.2:8000/laravel/api/
  ```
  *(Jika `API_BASE_URL` tidak diisi di `local.properties`, default bawaan sudah mengarah ke `http://10.0.2.2:8000/laravel/api/`.)*

- **Untuk HP Fisik lewat Wi-Fi yang sama dengan laptop:**
  1. Jalankan Laravel di semua interface jaringan:
     ```bash
     php artisan serve --host=0.0.0.0 --port=8000
     ```
  2. Cek IP laptop Anda (misalnya `192.168.1.25`) dengan perintah `ip addr` atau `hostname -I`.
  3. Isi `local.properties`:
     ```properties
     API_BASE_URL=http://192.168.1.25:8000/laravel/api/
     ```

- **Untuk Server Produksi (HTTPS):**
  ```properties
  API_BASE_URL=https://domain-koperasi-anda.com/laravel/api/
  ```
  *(Catatan keamanan: lalu lintas HTTP non-enkripsi/`cleartext` hanya aktif pada build `debug`; build `release` mewajibkan HTTPS.)*

### B. Menjalankan Build & Unit Test via Terminal
Jalankan dari folder `android-app/`:
```bash
# Build APK debug
./gradlew assembleDebug

# Jalankan seluruh unit test
./gradlew testDebugUnitTest

# Install langsung ke emulator/HP yang terhubung lewat USB/ADB
./gradlew installDebug
```

---

## 3. Cara Menambah Layar Baru (Langkah demi Langkah)

Misalnya Anda ingin menambah layar baru di fitur Anggota:

1. **Buat Endpoint & DTO (jika ada API baru):**
   Tambahkan data class `@Serializable` untuk request/response dan daftarkan endpoint di `AnggotaApi.kt` (gunakan serializer fleksibel dari `core/common/FlexibleNumbers.kt` jika backend mengirim angka desimal sebagai string).
2. **Tambahkan Metode di Repository:**
   Bungkus panggilan Retrofit menggunakan `safeApiCall(container.json) { ... }` agar error jaringan (`IOException`) dan error validasi Laravel (`422` / `message`) otomatis terpetakan menjadi `ApiResult.Error`.
3. **Buat Contract (`XContract.kt`):**
   Definisikan `@Immutable data class XUiState`, `sealed interface XEvent`, dan `sealed interface XEffect`.
4. **Buat ViewModel (`XViewModel.kt`):**
   - Gunakan `viewModelScope` (jangan `GlobalScope` atau `runBlocking`).
   - Pasang guard `Job` (`if (submitJob?.isActive == true) return`) pada setiap aksi tulis/submit agar tidak terjadi *double-submit*.
   - Selalu lempar ulang `CancellationException` jika menggunakan blok `try/catch` manual.
   - Sediakan `companion object { fun factory(...): ViewModelProvider.Factory }`.
5. **Buat Composable Screen (`XScreen.kt`):**
   - Ambil state dengan `collectAsStateWithLifecycle()`.
   - Gunakan komponen dari `core/designsystem` (`KoperasiTopBar`, `StatCard`, `LoadingState`, `EmptyState`, `ErrorState`, `KoperasiPullToRefreshBox`, `RupiahTextField`, `ConfirmDialog`, `StatusBadge`).
   - Format seluruh nominal uang lewat `CurrencyFormatter.format(...)` dan tanggal lewat `DateFormatter.formatDateTime(...)`.
   - Selalu berikan `key = { item -> item.id }` pada `LazyColumn` / `LazyRow`.
6. **Daftarkan Rute di `AnggotaRoot.kt` / `KasirRoot.kt` / `AdminRoot.kt`:**
   Tambahkan rute `composable(...)` di `NavHost` internal peran tersebut.

---

## 4. Catatan Migrasi Backend ke Go (Masa Depan)

Aplikasi Android ini sudah dirancang *backend-agnostic* terhadap server selama kontrak JSON dipertahankan:
- Selama backend Go menyediakan endpoint, method HTTP, path relatif, dan bentuk payload JSON yang sama (termasuk format error `message` / `errors` pada HTTP 422 dan HTTP 401 untuk token tidak valid), **tidak perlu mengubah kode fitur Android**.
- Anda cukup mengganti nilai `API_BASE_URL` di `local.properties` (misalnya `http://10.0.2.2:8080/api/` atau domain produksi baru) lalu build ulang aplikasi.
