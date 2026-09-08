# HISTORICAL CASH RECONCILIATION: Pre-Implementation Audit & Plan

## A. Existing Architecture Findings
Arsitektur saat ini menggunakan `/admin/laporan` (via `AdminController::getLaporanTransaksi`) untuk menghitung performa finansial berdasarkan rentang tanggal. Sistem secara *real-time* melakukan *aggregate* langsung ke tabel transaksi dan pengeluaran.
Sistem **TIDAK** memiliki *General Ledger* atau tabel Jurnal Kas tersendiri. Arus Kas (Cash Flow) saat ini sepenuhnya dihitung secara implisit dari penjumlahan (Transaksi Tunai) dikurangi (Pembelian Restock) dan (OPEX).

## B. Existing Tables/Models Involved
- `Transaksi` & `TransaksiDetail`: Menyimpan rekam jejak Omset (Revenue), HPP/COGS, Laba (Profit), dan metode pembayaran.
- `RiwayatRestock`: Menyimpan *cash outflow* untuk pembelian inventaris. Mewajibkan relasi ke `barang_id`.
- `PengeluaranOperasional`: Menyimpan OPEX.
- `TarikTunai` & `SetoranKasir`: Berdampak pada mobilitas kas fisik.

## C. Current Cash-Flow Calculation
Sistem mengkalkulasi arus kas secara implisit dengan rumusan:
```text
Kas Masuk Likuid = SUM(transaksi dimana metode = cash/ewallet/qr/transfer) -- hutang tidak masuk.
Inventory Purchase = SUM(riwayat_restock.total_biaya)
OPEX Paid = SUM(pengeluaran_operasional.nominal)

Net Cash Flow = Kas Masuk Likuid - Inventory Purchase - OPEX Paid
```

## D. Exact Source of Historical Discrepancy
Sebelum modul `RiwayatRestock` digunakan secara disiplin, kasir sudah mencatat penjualan barang peninggalan lama (warisan). Hal ini menghasilkan:
- Uang penjualan masuk sebagai `Kas Masuk Likuid` dan HPP terekam.
- Uang yang *dulu* digunakan untuk membeli/kulakan barang warisan tersebut **TIDAK TEREKAM** dalam `RiwayatRestock` (sehingga *Cash Outflow*-nya gaib/kosong).
- Akibatnya: Nilai `Net Cash Flow` saat ini terlihat membengkak sangat besar, karena sistem melihat ada uang masuk tanpa melihat uang keluar dari masa lalu.

## E. Proposed Reconciliation Design
Kita memerlukan mekanisme penyesuaian khusus. Karena `riwayat_restock` memaksa keberadaan `barang_id` (sangat tidak ideal untuk *blanket adjustment* masa lalu) dan karena `pengeluaran_operasional` akan menghancurkan *Net Profit/Laba Bersih* (terhitung sebagai OPEX pengurang P&L), maka sebuah entitas log baru **DIBUTUHKAN**.

**Skema Model Baru: `CashAdjustment`**
```sql
- adjustment_id (PK)
- adjustment_date (Date)
- type (HISTORICAL_INVENTORY_PURCHASE | CASH_RECONCILIATION)
- amount (Decimal)
- direction (IN | OUT)
- source (CASH | BANK)
- reason (Text)
- created_by (Admin ID)
- timestamps
```

## F. Why the Design does not Corrupt P&L/SHU/Inventory
1. **Tidak Merusak P&L**: Model `CashAdjustment` secara ketat hanya akan diinjeksikan ke dalam kalkulasi **Panel 2 (Arus Kas)**. Operasi `SUM` pada Gross Sales, HPP, OPEX, dan Net Profit sama sekali tidak akan menyentuh tabel ini.
2. **Tidak Merusak SHU**: SHU dihitung menggunakan persentase dari `Net Profit` atau *Transaction Margin*. Penyesuaian arus kas fisik tidak mengubah Laba Akuntansi, sehingga SHU tetap statis dan aman.
3. **Tidak Merusak Inventory**: Tabel ini murni tentang pencatatan mobilitas uang (*cash correction*), tidak berelasi ke `barang_id`, dan tidak mentrigger *mutator* `stok_toko` maupun `stok_gudang`.

## G. Migration Requirement: YES
**Justification**: Ya, migrasi absolut diperlukan. 
Menggunakan tabel `pengeluaran_operasional` untuk fungsi ini akan secara otomatis mendistorsi Laba Akuntansi (`Net Profit = Gross Profit - OPEX`). Menggunakan `riwayat_restock` tidak memungkinkan tanpa menciptakan entitas "Barang Palsu/Dummy" karena wajib `barang_id`. Sebuah tabel `cash_adjustments` minimalis adalah satu-satunya cara bersih mengisolasi koreksi uang tunai tanpa menyentuh *Accounting Logic*.

## H. Implementation Plan
1. **Database**: Buat *migration* `create_cash_adjustments_table` & Model `CashAdjustment.php`.
2. **Backend API**: 
   - Tambah endpoint `POST /api/admin/cash-adjustments` dengan validasi ketat (hanya Admin).
   - Ubah `AdminController::getLaporanTransaksi` untuk melakukan agregat `SUM(amount)` dari tabel ini berdasarkan periode dan menguranginya/menambahkannya ke dalam parameter `net_cash_flow`.
3. **Frontend UI**:
   - Tambahkan *button* "Penyesuaian Kas Historis" (Modal Form) yang menembak endpoint baru.
   - Perbarui *Panel 2 (Cash Flow)* pada `/admin/laporan` untuk memuat baris `± Penyesuaian Kas Historis` agar rekonsiliasi dapat dibaca secara transparan oleh Pengurus.
4. **Testing**: Tambahkan unit test untuk memastikan P&L tetap konstan saat Kas direkonsiliasi.
