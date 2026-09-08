# Audit Report: Modul EDIT Barang & Expired (Admin)

Laporan ini merupakan hasil penelusuran mendalam lapis demi lapis (*Frontend → Controller → Action/Service → Model → Database*) terhadap fitur "Pena" (Edit Barang) pada halaman `Admin → Barang`.

---

## 1. Executive Summary
Fungsi Edit Barang saat ini **berbahaya bagi integritas data koperasi**. Terdapat percampuran tanggung jawab antara *Master Data Management* dan *Inventory Transaction*. Sistem mengizinkan modifikasi langsung terhadap stok fisik tanpa *audit trail*, yang diperparah dengan hilangnya validasi *backend* pada endpoint update. Hal ini membuka celah masif terhadap *Lost Update Anomaly* (korupsi stok) saat Admin dan Kasir beroperasi secara bersamaan.

## 2. Actual Architecture & Flow
- **Trigger**: Tombol `Pena` (Edit) di tabel `frontend/src/pages/admin/DataBarang.tsx`.
- **State**: Membuka `<Modal>` dan mengisi state `formData` dengan data spesifik `Barang` (termasuk stok dan harga).
- **Endpoint**: `POST /laravel/api/admin/update-barang` via `adminService.updateBarang()`.
- **Controller**: `AdminController::updateBarang`.
- **Persistence**: Memanggil `Barang::update($request->all())` langsung pada `App\Models\Barang`.

---

## 3. EDIT Barang Audit
- **Validation Backend Absen**: Metode `updateBarang` **tidak memiliki `$request->validate()`** sama sekali (berbeda dengan `tambahBarang` yang memilikinya).
- **Mass Assignment**: Endpoint menerima dan memproses `$request->all()`. Karena `stok`, `stok_toko`, dan `stok_gudang` terdaftar dalam `$fillable` model, sistem mengizinkan modifikasi field tersebut.
- **Negative Pricing**: Karena ketiadaan validasi, Harga Modal dan Harga Jual dapat diisi dengan angka minus (negatif), yang akan merusak kalkulasi SHU (Sisa Hasil Usaha) dan total belanja Kasir.
- **Duplicate Naming (SKU)**: Koperasi ini tidak menggunakan SKU *barcode* terpisah. `nama_barang` menjadi identitas utama, namun tidak divalidasi keunikannya (`unique:barang`). Ini dapat memunculkan 5 entri "Rokok Surya" yang berbeda.

## 4. Expired (Kadaluarsa) Audit
- **Arsitektur Expired**: Expired melekat pada *Master Data* di dua lokasi (`tgl_kadaluarsa_toko` dan `tgl_kadaluarsa_gudang`), **bukan** pada tabel *Batch/Lot* terpisah.
- **Validasi Tanggal**: Tidak ada pencegahan untuk memasukkan tanggal di masa lalu.
- **Null Handling**: Frontend mengirim string kosong `""` dan backend mengonversinya menjadi `null` dengan aman.
- **Timezone**: Aman. Frontend memotong ISO string `split('T')[0]` menjadi `YYYY-MM-DD` absolut, mencegah pergeseran *off-by-one date* akibat zona waktu (UTC vs WIB).

## 5. Inventory Business Logic Audit (CRITICAL)
Sesuai instruksi Anda, ini adalah titik paling krusial: **Endpoint EDIT Barang mencampuradukkan Master Barang dan Inventory Mutation.**
- **Bagian yang Salah**: Modal Edit menampilkan input field `Stok Display` dan `Stok Gudang`. Jika Admin menyimpannya, sistem menimpa (`overwrite`) data di database.
- **Risiko Data Corruption**: Jika Admin memodifikasi `Stok Toko` menjadi 100 via Edit Barang, sistem tidak mencatatnya di `RiwayatRestock` maupun log *adjustment* kasir. Ratusan barang bisa muncul atau hilang tanpa jejak finansial.
- **Desain Seharusnya**: Modal Edit **hanya** untuk nama, PKM, Harga, dan Expired. Perubahan stok HANYA boleh dilakukan via fitur `Restock` (Kulakan) atau fitur `Opname/Penyesuaian` terpisah yang menghasilkan riwayat mutasi kas/barang.

## 6. Authorization & Security Audit
- **Authentication**: Aman (Middleware auth Sanctum).
- **Authorization**: Metode `$this->checkAdmin($request)` mengunci endpoint ini khusus untuk pengguna dengan `role === 'admin'`. Kasir tidak dapat mem-Bypass ini.
- **Mass Assignment Vulnerability**: Terjadi karena `$request->all()`.

## 7. Database Integrity Audit
- **Soft Delete vs Hard Delete**: Jika Admin menghapus (`destroy`) barang yang pernah terjual di Kasir, SQLite akan mengalami pelanggaran *Foreign Key* (jika aktif) atau meninggalkan data yatim (`transaksi_detail` dengan `barang_id` yang sudah hilang), membuat halaman riwayat struk *crash*.
- **Derived Stok**: Kolom `stok` (total) di *database* ditangani secara mandiri via event `static::saving` di model (menambahkan toko + gudang), ini sudah konsisten.

## 8. Transaction & Concurrency Audit (LOST UPDATE ANOMALY)
Ini adalah bahaya nyata dalam operasi sehari-hari koperasi:
1. Pukul 08:00 - Admin menekan ikon pena pada "Rokok Surya" untuk memperbaiki salah ketik nama. Modal terbuka. Form terisi state lokal: **Stok: 50**.
2. Pukul 08:01 - Kasir menjual 3 Rokok Surya. Sistem memotong stok database. **Stok aktual di DB kini: 47**.
3. Pukul 08:02 - Admin menekan "Simpan". Frontend mengirim *payload* berisi stok lokal yang basi (50).
4. **Hasil**: Sistem secara diam-diam me-*reset* stok kembali ke 50. Koperasi kehilangan jejak 3 barang. Terjadilah **Lost Update Anomaly**.

Tidak adanya `DB::transaction()` dan `lockForUpdate()` pada endpoint ini memperburuk potensi tabrakan *query*.

## 9. Frontend Modal Behavior
- **Cancel Behavior**: Aman, data tidak tersimpan jika ditutup.
- **Loading State**: Tombol submit ter-disable dengan baik selama proses asinkron.

## 10. API Contract Audit
- Frontend memaksa format numerik melalui utilitas `Number(val)`, namun membiarkan string kosong menjadi `"" as any`. Jika tipe tersebut lolos dari TypeScript, ketiadaan validasi Laravel akan membuat SQLite *choke* atau menyimpan nilai 0 *default*.

---

## 11. Test Matrix Minimal
- [ ] Validasi penolakan stok dikirim via `/update-barang`.
- [ ] Simpan barang dengan nama duplikat (seharusnya gagal).
- [ ] Simpan harga jual < harga modal (memunculkan peringatan).
- [ ] Simpan harga negatif (seharusnya gagal).
- [ ] Pastikan perubahan *expired* tersimpan ke kolom yang tepat tanpa menyentuh stok.

---

## 12. Findings by Severity

| Severity | Isu | Lokasi | Dampak Bisnis |
|----------|-----|--------|---------------|
| **CRITICAL** | **Silent Inventory Corruption (Lost Update)** | `AdminController::updateBarang` & `DataBarang.tsx` | Korupsi total stok tanpa jejak jika terjadi transaksi kasir saat modal Edit Admin terbuka. |
| **HIGH** | **Missing Request Validation** | `AdminController::updateBarang` | Data kotor (harga minus, tipe data salah) bisa merusak database dan POS kasir. |
| **HIGH** | **Bypass Inventory Audit Trail** | `AdminController::updateBarang` | Admin bisa memodifikasi stok tanpa tercatat di laporan keuangan / kulakan. |
| **MEDIUM** | **Hard Delete Master Data** | `AdminController::hapusBarang` | Dapat merusak relasi nota `transaksi_detail` historis. |

---

## 13. Required Fixes (Rekomendasi Aksi)
1. **Pangkas Form Edit Frontend**: Hapus *input field* `Stok Display` dan `Stok Gudang` dari `<Modal>` Edit Barang di `DataBarang.tsx`.
2. **Kunci API Backend**: Implementasikan `$request->validate()` yang ketat di `AdminController::updateBarang`. Tolak permintaan apa pun yang memuat key `stok`, `stok_toko`, atau `stok_gudang`.
3. **Soft Deletes**: Tambahkan *trait* `SoftDeletes` pada model `Barang` agar transaksi masa lalu kasir tetap dapat menampilkan nama barang yang sudah tidak dijual.

---

## 14. Business Rule Ambiguities (Kejanggalan Aturan Bisnis)
**Bagaimana Koperasi Menangani Batch Expired Campuran?**
Karena skema database HANYA memiliki 1 slot `tgl_kadaluarsa_toko` per barang, jika Admin me-Restock Indomie dengan expired 2026, lalu merestock lagi dengan expired 2027, sistem akan **menimpa** *(overwrite)* expired menjadi 2027 seutuhnya. Sistem tidak mengetahui bahwa masih ada sisa stok fisik yang akan expired di 2026. 
*Catatan: Ini umum untuk sistem retail skala kecil, asalkan kasir dilatih untuk selalu melakukan FIFO fisik di rak secara manual.*

---

## 15. Final Verdict

Berdasarkan audit arsitektur menyeluruh:
### **NEEDS FIX** *(Business Logic Incorrect & Unsafe)*

**Apakah fungsi ikon pena pada Admin → Barang sudah benar secara business logic?**
**TIDAK.** Secara teknis tombolnya berfungsi, namun secara *business logic* ia melanggar prinsip *Inventory Management*. Modal EDIT barang saat ini berpotensi besar menyebabkan kebocoran aset Koperasi tanpa audit (*Lost Update & Shadow Mutating*), karena membiarkan formulir Master Data secara diam-diam menimpa ulang data Transaksional (Stok Fisik) menggunakan state *frontend* yang basi.

*Silakan berikan instruksi "Lanjutkan perbaikan" jika Anda ingin saya mengeksekusi Required Fixes (Refaktor API & UI) di atas ke dalam codebase Anda.*
