# Phase 8C: POS Checkout Action Extraction Report

## Executive Statement
> [!IMPORTANT]
> **PHASE 8C IS STRUCTURAL EXTRACTION, NOT CONCURRENCY OR FINANCIAL REMEDIATION.**  
> The extraction migrates application-level orchestration from the bloated controller into a dedicated single-purpose Action (`ProcessPosCheckoutAction`) while preserving 100% of current runtime behaviors, concurrency characteristics, and transitional cross-module writes established in Phase 8B characterization.

---

## 1. Previous Controller Workflow
Previously, `KasirController::buatTransaksiKasir` was a 213-line god-method containing:
- Cashier authorization check (`checkKasir`)
- HTTP input validation (`metode_pembayaran`, `items`, `items.*.barang_id`, `items.*.jumlah`)
- Database transaction management (`DB::beginTransaction`, `commit`, `rollBack`)
- Cart inventory locking (`Barang::where(...)->lockForUpdate()->first()`)
- In-loop stock deduction and unverified client price acceptance
- Member verification and locking (`Anggota::lockForUpdate()->find(...)`)
- E-wallet debt blocking and balance decrement
- Debt purchase limit checking and balance increment
- Integrated cash withdrawal (`TarikTunai`) qualification, consent checks, source fund deduction, and ticket generation
- Payment method override logic (`potong_tarik_tunai`)
- `Transaksi` and `TransaksiDetail` entity persistence
- Inline SHU calculation (60% member, 10% & 30% cooperative)
- Member SHU balance mutation and direct insertion into `shu_distribusi`
- Response serialization and error catching

---

## 2. New Action Boundary (`ProcessPosCheckoutAction`)
- **Location:** `app/Actions/POS/ProcessPosCheckoutAction.php`
- **Class:** `App\Actions\POS\ProcessPosCheckoutAction`
- **Primary Method:** `execute(array $data, int $kasirId): array`
- **Boundary Responsibility:** Encapsulates the entirety of the database transaction, inventory mutations, member balance and debt updates, Tarik Tunai creation, transaction record creation, and SHU allocation.
- **Return Contract:**
  ```php
  [
      'transaksi_id' => int,
      'total' => float,
      'total_keuntungan' => float,
      'tarik_tunai' => array|null,
      'message' => string,
  ]
  ```

---

## 3. Controller Responsibilities After Extraction
`KasirController::buatTransaksiKasir` has been slimmed to a pure HTTP adapter (26 lines):
1. **Cashier Authorization:** Calls `$this->checkKasir($request)`.
2. **Request Validation:** Validates required HTTP request payload structure.
3. **Action Invocation:** Injects and executes `ProcessPosCheckoutAction->execute($request->all(), $kasirId)`.
4. **Response Serialization:** Serializes result array into standard JSON HTTP response.
5. **HTTP Error Handling:** Catches business/runtime exceptions and formats them into HTTP 400 response with `message` payload.

---

## 4. Transaction Boundary Preservation
- The atomic database transaction boundary (`DB::beginTransaction()`, `DB::commit()`, `DB::rollBack()`) is preserved intact within `ProcessPosCheckoutAction::execute()`.
- If an exception occurs at any point (e.g. out of stock on subsequent cart item, debt ceiling breach, insufficient funds), all mutations across `barang`, `anggota`, `tarik_tunai`, `transaksi`, `transaksi_detail`, and `shu_distribusi` are fully rolled back.
- No nested transactions, synthetic savepoints, or widened transactions were introduced.

---

## 5. Lock Preservation
- **Preserved Order:** Product inventory rows are locked first (`Barang::where('barang_id', ...)->lockForUpdate()->first()`), followed by member row (`Anggota::lockForUpdate()->find(...)`).
- **Preserved Sequence:** Multiple inventory rows continue to be locked in the exact order received in `$data['items']` (client payload order).
- **No Remediation:** Sorting of IDs and reconciliation of inverse lock hierarchy with `AnggotaController::simpanTransaksi` are strictly deferred.

---

## 6. Inventory Behavior Preservation
- Products locked via `lockForUpdate()`.
- Validates against `stok_toko` (etalase stock).
- Decrements `stok_toko` per item row.
- Calculates subtotal and gross profit using `$item['harga_satuan'] ?? $barang->harga_jual`.
- Duplicate `barang_id` entries are processed iteratively and independently without merging.

---

## 7. Member Behavior Preservation
- Member existence validated and row locked with `lockForUpdate()`.
- E-wallet checkout blocked if member has outstanding debt (`hutang > 0`).
- Debt checkout blocked if purchase exceeds remaining credit limit (`sisa_limit_hutang`).
- Direct balance mutations (`saldo`, `hutang`, `shu`) preserved without alteration.

---

## 8. Payment Modes Preservation
- Exact handling for all payment methods preserved: `cash`, `ewallet`, `hutang`, `potong_tarik_tunai`, `qr`, `transfer`.
- Payment method remains subject to override to `potong_tarik_tunai` when shopping-with-withdrawal is requested.

---

## 9. Tarik Tunai Preservation
Integrated cash withdrawal preserved synchronously inside checkout transaction:
- Validates minimum purchase threshold (>= Rp 25.000).
- Validates proportional limit (min Rp 100.000, 2x purchase).
- Enforces debt guard (`hutang == 0`).
- Validates and updates Master Consent (`persetujuan_shu_master_at`).
- Deducts selected source fund (`shu` or `saldo`).
- Creates completed `TarikTunai` ticket linked to transaction.
- Accurately computes net cash to hand over: `uang_bersih_diserahkan = max(0, nominal_tarik - total_belanja)`.

---

## 10. SHU Behavior Preservation
- Positive transaction gross profit triggers inline SHU allocation:
  - 60% credited directly to `anggota.shu`.
  - Record inserted directly into `shu_distribusi` table with `shu_60_percent`, `shu_10_percent`, `shu_30_percent`, and current year.
- Preserved without altering financial allocations or introducing premature event buses.

---

## 11. API Compatibility
- **Route:** `POST /laravel/api/kasir/buat-transaksi` (unchanged)
- **Status Codes:** 200 (Success), 400 (Bad Request/Business Failure), 403 (Unauthorized), 422 (Validation Failure).
- **Success JSON Structure:**
  ```json
  {
      "success": true,
      "message": "...",
      "transaksi_id": 123,
      "total": 30000,
      "total_keuntungan": 10000,
      "tarik_tunai": null
  }
  ```
- **Error JSON Structure:**
  ```json
  {
      "success": false,
      "message": "..."
  }
  ```

---

## 12. Characterization Tests Used
The extraction was verified against the 8 characterization tests established in Phase 8B ([`tests/Feature/PosCheckoutCharacterizationTest.php`](file:///home/nurdiansyah/dev/koperasi-pk/backend-laravel/tests/Feature/PosCheckoutCharacterizationTest.php)):
1. `test_checkout_persists_shu_distribution_when_profit_is_positive` (passed)
2. `test_checkout_rolls_back_all_mutations_when_later_item_fails` (passed)
3. `test_checkout_uses_client_supplied_harga_satuan` (passed)
4. `test_checkout_allows_duplicate_barang_ids_as_current_behavior` (passed)
5. `test_checkout_with_tarik_tunai_persists_ticket_and_deducts_fund` (passed)
6. `test_checkout_ewallet_blocks_when_member_has_any_debt` (passed)
7. `test_checkout_hutang_enforces_sisa_limit_ceiling` (passed)
8. `test_checkout_fails_if_anggota_id_is_missing` (passed)

---

## 13. Deferred Risks & Known Transitional Cross-Module Writes
The following known flaws and risks were deliberately **NOT** remediated in Phase 8C:
1. **Unvalidated Client Pricing:** Accepts `$item['harga_satuan']` directly from payload without enforcing catalog price.
2. **Lock Hierarchy Inversion:** POS locks `Barang` $\rightarrow$ `Anggota`, while Mobile Order locks `Anggota` $\rightarrow$ `Barang`.
3. **Payload-Controlled Lock Order:** Cart items locked in incoming payload sequence rather than primary key order.
4. **Duplicate Cart Items:** Product IDs appearing multiple times are not consolidated into single lines.
5. **Transitional Cross-Module Writes:** POS Action performs direct writes to `shu_distribusi` and `tarik_tunai` tables rather than communicating through distinct domain service boundaries.
6. **Missing Financial Audit Ledger:** Direct mutation of balances without double-entry financial ledger journal entries.

---

## 14. Verification Summary
- **Regression Baseline:** 179 tests / 1310 assertions / 0 failures
- **Post-Extraction Regression:** **179 tests / 1310 assertions / 0 failures**
- **Test Suite Duration:** ~4.4s
- **Production Files Modified:** 2 (`app/Actions/POS/ProcessPosCheckoutAction.php`, `app/Http/Controllers/KasirController.php`)
- **Database / Schema / Route Changes:** NONE.
