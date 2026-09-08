# Audit Report: Financial & Accounting Logic (`/admin/laporan`)

Laporan ini merupakan hasil *tracing* arsitektur dari UI (React) hingga ke Skema SQLite untuk memvalidasi keluhan mengenai besarnya laporan keuangan yang membesar secara artifisial akibat tidak dihitungnya beban restock dan modal kerja.

---

## 1. Definisi Masalah Accounting
Keluhan Anda **TERBUKTI BENAR**. Laporan `/admin/laporan` saat ini mengalami disonansi kognitif antara **Laporan Laba Rugi (Profit & Loss)** dan **Laporan Arus Kas (Cash Flow)**. 
Sistem hanya menampilkan Omset, Laba Kotor (setelah dipotong HPP), OPEX, dan Laba Bersih. Namun, di layar yang sama, sistem menampilkan "Total Pendapatan Tunai" **TANPA** memotong uang kas yang telah dikeluarkan Admin untuk *Restock/Kulakan*. Hal ini menciptakan **ilusi saldo kas yang besar**, padahal uang tersebut terikat (*tied up*) dalam wujud Aset Persediaan (Inventory).

## 2. Audit Transaksi Penjualan & Historical Cost
- **Status**: `HISTORICAL COST INTEGRITY: SAFE`
- **Tracing**: Saat Kasir memproses pembayaran (`ProcessPosCheckoutAction`), sistem menyimpan `keuntungan = (harga_satuan - harga_modal) * jumlah` ke tabel `transaksi_detail`.
- **Kesimpulan**: Sistem **TIDAK** menggunakan harga master saat ini untuk menghitung HPP masa lalu. HPP masa lalu terkunci secara absolut, sehingga jika besok harga modal Indomie naik, laporan bulan lalu tidak akan rusak.

## 3. Audit Restock / Pembelian
- **Status**: `MISSING PURCHASE COST LEDGER` (CRITICAL)
- **Tracing**: Tabel `riwayat_restock` menyimpan data `jumlah_tambah`, `harga_beli_satuan`, `total_biaya`, dan `sumber_dana`.
- **Kesimpulan**: Endpoint `AdminController::getLaporanTransaksi` **SAMA SEKALI TIDAK MELAKUKAN QUERY** ke tabel `riwayat_restock`. Seluruh uang jutaan rupiah yang dikeluarkan untuk membeli barang kulakan dianggap tidak pernah keluar dari kas di mata dashboard laporan keuangan.

## 4. Audit Modal Kerja (Replenishment Requirement)
Sistem secara implisit menghitung *Replacement Cost of Goods Sold* (Beban Pokok Barang Terjual) melalui variabel `$totalHpp = max(0, $totalPendapatan - $totalKeuntungan)`. Namun, UI menampilkannya murni sebagai metrik pengurang Laba Kotor, bukan sebagai pengingat "Modal Kerja Replenishment" yang harus diputar kembali.

## 5. Audit Cash Flow & Profit
- **Laba Bersih**: Dihitung dengan benar secara akuntansi akrual (`Gross Profit - OPEX = Net Profit`).
- **Cash Flow**: Gagal total. Sistem mencampuradukkan *Gross Cash Sales* tanpa memotong *Inventory Purchase Cash Outflow*.

---

## 16. REQUIRED FINAL OUTPUT

### A. Current Financial Flow
`Kasir (POS) → Transaksi → Controller Laporan → Laba Kotor (Valid)`
`Admin Restock → Riwayat Restock → Controller Laporan → DIABAIKAN/TIDAK DITAMPILKAN (Invalid)`

### B. Current Calculation (Existing Formula)
```php
Gross Sales = SUM(transaksi.total_harga)
Gross Profit = SUM(transaksi.total_keuntungan)
COGS (HPP) = Gross Sales - Gross Profit
OPEX = SUM(pengeluaran_operasional.nominal)
Net Profit = Gross Profit - OPEX

// CRITICAL FLAW:
Cash Available = SUM(transaksi tunai)
(Sistem gagal mengurangi Kas dengan Total Pembelian Kulakan/Restock)
```

### C. Identified Bugs
| Severity | Isu | Deskripsi |
|----------|-----|-----------|
| **CRITICAL** | **Missing Inventory Cash Outflow** | Pengeluaran untuk *Restock* tidak muncul di laporan keuangan. Menciptakan ilusi kas positif. |
| **HIGH** | **Conflated Cash vs Profit** | UI mencampuradukkan Laba Akuntansi dengan Arus Kas, membuat pengurus koperasi salah mengambil keputusan SHU tunai. |
| **LOW** | **Costing Method Undefined** | Tidak ada visibilitas nilai aset persediaan (*Inventory Valuation*) di gudang. |

### D. Data Sources
- **Gross Sales & Gross Profit**: `transaksi` → `total_harga` & `total_keuntungan`
- **HPP**: `transaksi_detail` (Derived dari subtotal - keuntungan)
- **OPEX**: `pengeluaran_operasional` → `nominal`
- **Inventory Purchase**: `riwayat_restock` → `total_biaya` (Saat ini yatim/tidak dipanggil)

### E. Correct Financial Model (Target Formula)
Laporan harus dipecah menjadi 3 pilar:

**1. Laba Rugi (Profit & Loss)**
`Omset - HPP = Laba Kotor`
`Laba Kotor - OPEX = Laba Bersih`

**2. Arus Kas Kasir (Cash Flow)**
`Kas Masuk (Cash/Transfer/Ewallet)`
`- Kas Keluar (Restock/Kulakan)`
`- Kas Keluar (OPEX)`
`= Kas Bersih (Net Cash Position)`

**3. Replenishment & Aset**
`Target Modal Kerja (Sama dengan total HPP)`
`Nilai Persediaan Saat Ini (SUM(stok * harga_modal))`

### F. Sample Reconciliation
*(Skenario: Jual Rp10jt, HPP Rp7jt, Beli Stok Rp8jt, Listrik/OPEX Rp1jt)*
**Aplikasi Saat Ini:**
- Laba Bersih: Rp 2jt (Benar)
- Total Pendapatan Tunai: Rp 10jt (Admin mengira punya uang kas Rp10jt, padahal sudah dipakai kulakan Rp8jt dan bayar listrik Rp1jt. Sisa kas aslinya hanya Rp1jt!)
**Seharusnya:**
- Net Profit: Rp 2jt
- Net Cash Flow: Rp 1jt (10jt in - 8jt restock - 1jt opex).

### G. Required Code Changes
1. `AdminController.php`: Tambahkan query `$qRestock = RiwayatRestock::whereBetween(...)` untuk menghitung `$totalPembelianInventory`.
2. `AdminController.php`: Tambahkan query `Barang::selectRaw('SUM((stok_toko + stok_gudang) * harga_modal)')->value(...)` untuk Nilai Aset.
3. `LaporanTransaksi.tsx`: Desain ulang seksi *Summary* untuk memisahkan secara tegas metrik **Laba Rugi** vs **Arus Kas** vs **Aset/Modal**.

### H. Database Changes
Tidak ada. Struktur database sudah sempurna merekam transaksi, HPP historis, dan riwayat restock. Hanya controllernya yang malas memanggil data tersebut.

### I. Historical Data Risk
**SAFE**. Data masa lalu dapat dihitung mundur secara akurat karena `transaksi_detail` telah mengunci nilai HPP absolut secara historis, dan `riwayat_restock` mengunci `total_biaya` secara historis.

### J. Test Matrix (Post-Implementation)
1. Beli barang Rp1jt (Laba = 0, Cash = -1jt, Aset = +1jt).
2. Jual barang Rp1.5jt, HPP Rp1jt (Laba = +500rb, Cash In = +1.5jt, Aset = -1jt).
3. Catat bayar listrik Rp100rb (Laba = +400rb, Cash = -100rb).
4. Hasil Akhir Test: Net Profit (400rb), Net Cash Flow (+400rb).

### K. Final Verdict
**NEEDS FINANCIAL LOGIC FIX** ❌

*(Logika pencatatan dasar di database sudah benar, namun Logika Agregasi Pelaporan di Controller mengalami disonansi fatal antara Profit dan Cash Flow).*

---
Berikan instruksi jika Anda setuju untuk mengeksekusi *Required Code Changes* (Menarik data `RiwayatRestock` ke dalam API dan memisahkannya di UI Laporan).
