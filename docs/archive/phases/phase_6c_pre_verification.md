# KOPERASI PK — PHASE 6C SERAH TERIMA PRE-VERIFICATION REPORT

## 1. Controller & Methods Identified
* Controller: `KasirController`
* Methods:
  - `getSerahTerimaDraft`: Prepares draft form with physical inventory targets (cycle count) and system drawer cash calculation.
  - `createSerahTerima`: Submits physical cash count and items for handover (pending status).
  - `approveSerahTerima`: Receiving kasir approves the handover, which updates status to `approved` and mutates Inventory `Barang::stok`.
  - `rejectSerahTerima`: Receiving kasir rejects the handover.

## 2. Request Parameters
* **create**: `kasir_to` (required), `hasil_opname` (JSON/Array containing `uang_fisik`, `catatan`, `items`). Checks for implicit items payload as well.
* **approve**: `serah_id` (required).
* **reject**: `serah_id` (required), `alasan_penolakan` / `alasan` (required).

## 3. Authorization & Roles
* Uses `$this->checkKasir($request)` directly in each method to verify active Kasir mandate.

## 4. Cash Drawer Calculation
* Calculates `saldoKasSistem` based on operations tied to the `$kasirId`:
  - `+` POS Transactions (`Transaksi` with `metode_pembayaran` = `cash/tunai`)
  - `+` Handover Ins (`SerahTerimaKasir` approved where `kasir_to` = self)
  - `+` Debt Repayments (`pembayaran_hutang` approved with `cash`)
  - `-` Handover Outs (`SerahTerimaKasir` approved where `kasir_from` = self)
  - `-` Cash Deposits (`SetoranKasir` approved)
  - `-` Withdrawals (`tarik_tunai`)

## 5. Cross-Module Dependencies & Mutations
* **READ (POS):** Reads `Transaksi` explicitly to determine theoretical drawer balance. (To be preserved as a read-oriented dependency).
* **READ (Inventory):** `getSerahTerimaDraft` reads all `Barang` for cycle count (checking PKM vs Stok for cigarette/risk badges).
* **WRITE (Inventory):** `approveSerahTerima` explicitly loops over `hasil_opname['items']`, locks `Barang`, and updates `$barang->stok` = `stok_aktual/input`.

**This cross-module write to `Barang::stok` is critical and must be preserved for behavioral compatibility.**

## 6. Concurrency & Transaction Rules
* `createSerahTerima`: No explicit DB transaction (just creating a pending row).
* `approveSerahTerima`:
  - Starts `DB::beginTransaction()`
  - Calls `SerahTerimaKasir::lockForUpdate()`
  - Loops items and calls `Barang::lockForUpdate()`
  - Commits.
* `rejectSerahTerima`:
  - Starts `DB::beginTransaction()`
  - Calls `SerahTerimaKasir::lockForUpdate()`
  - Commits.

## 7. Action Boundaries Proposed
To keep the controller thin without over-engineering:
* `App\Actions\CashManagement\CalculateSerahTerimaDraftAction` (Reads POS/Inventory to build draft).
* `App\Actions\CashManagement\CreateSerahTerimaAction` (Handles pending creation).
* `App\Actions\CashManagement\ApproveSerahTerimaAction` (Handles approval + inventory sync lock).
* `App\Actions\CashManagement\RejectSerahTerimaAction` (Handles rejection).

No POS schema, ledger, or financial rules will be modified.

---
**STATUS: Pre-Verification Complete.**
Ready for extraction upon this documented baseline.
