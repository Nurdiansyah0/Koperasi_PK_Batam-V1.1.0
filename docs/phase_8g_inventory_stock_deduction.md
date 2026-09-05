# Phase 8G — Inventory Stock Deduction Action

## 1. Executive Summary

Phase 8G executes the architectural extraction of the retail sale inventory deduction capability from `ProcessPosCheckoutAction` into a dedicated Inventory domain Action:

`App\Actions\Inventory\DeductSaleStockAction`

This extraction establishes a modular monolith boundary between the **POS** orchestration domain and the **Inventory** domain. Inventory encapsulates product pre-locking, stock validation, physical `stok_toko` decrement, and authoritative product/pricing data retrieval. POS retains cart normalization, member authorization/locking, payment handling, Tarik Tunai coordination, transaction/detail persistence, and SHU distribution.

Key architectural characteristics:
- **Modular Monolith Boundary:** Stock deduction logic is cleanly separated from checkout orchestration.
- **Ambient Parent Transaction:** `DeductSaleStockAction` does not manage its own transaction; it participates seamlessly in POS's ambient database transaction (`DB::beginTransaction()`).
- **Canonical Lock Ordering Preserved:** Deterministic ascending `barang_id` locking (`sort($uniqueBarangIds)` followed by `lockForUpdate()`) is strictly maintained inside `DeductSaleStockAction`, preserving the Phase 8E/8F deadlock prevention hierarchy (`Barang ASC -> Anggota`).
- **First-Occurrence Business Ordering Preserved:** Items are processed and returned in the exact business line order provided by POS.
- **Server Price Authority Preserved:** Product pricing is strictly derived from `Barang::harga_jual`, ignoring any client-supplied prices.
- **Zero Schema Changes:** No database migrations, table modifications, or index changes were introduced.

---

## 2. Pre-Verification Baseline

Prior to Phase 8G extraction, the latest `main` branch was verified:
- **Commit:** `ac308820de6ad1af7b78b0910982984658ebcb1d` (Merge PR #20)
- **Working Tree:** Clean
- **Regression Suite:** 198 tests / 1397 assertions / 0 failures
- **Codebase Audited:** `ProcessPosCheckoutAction`, `Barang` model and casts, `RestockBarangAction`, `PosLockOrderingTest`, `PosCheckoutCharacterizationTest`, and `PosPriceAuthorityCartNormalizationTest`.

---

## 3. Existing Inventory Mutation Flow

Prior to Phase 8G, `ProcessPosCheckoutAction` directly performed:
1. Extraction of unique `barang_id`s from the normalized cart.
2. In-line execution of `Barang::where('barang_id', $bId)->lockForUpdate()->first()`.
3. In-line validation of `$barang->stok_toko < $item['jumlah']`.
4. In-line decrement: `$barang->stok_toko -= $item['jumlah']; $barang->save();`.
5. In-line calculation of `subtotal` and `keuntungan`.

This concentrated domain responsibilities inside POS, causing POS to directly manage inventory persistence and catalog query rules.

---

## 4. Target Inventory Boundary

The Inventory domain owns:
- Authoritative catalog data (`harga_jual`, `harga_modal`, `nama_barang`).
- Inventory levels (`stok_toko`, `stok_gudang`, `stok`).
- Stock validation rules (`stok_toko >= jumlah`).
- Stock mutation execution (`stok_toko -= jumlah`).
- Deterministic locking of `Barang` rows for sale operations.

The POS domain owns:
- Cashier authorization.
- Cart normalization (merging client duplicates by `barang_id` while preserving scan order).
- Orchestration of sale lines with the Inventory domain.
- Member validation and member lock (`Anggota -> lockForUpdate()`).
- Payment processing (Cash, E-Wallet, Hutang).
- Tarik Tunai coordination and net cash handover calculations.
- Transaction persistence (`Transaksi` header and `TransaksiDetail` lines).
- SHU distribution calculation and persistence (`shu_distribusi`).

---

## 5. DeductSaleStockAction Contract

### Class Definition
- **Namespace:** `App\Actions\Inventory`
- **Class:** `DeductSaleStockAction`
- **Method:** `public function execute(array $normalizedItems): array`

### Design Principles
- **Stateless & Reusable:** Can be reused by any authorized sale use case (e.g., POS cashier checkout, mobile member order approval).
- **No Transaction Management:** Relies entirely on caller's ambient transaction.
- **No HTTP/Request Coupling:** Does not inspect Laravel `Request`, session, or auth guards.

---

## 6. Input Contract

`DeductSaleStockAction::execute` receives an array of already-normalized sale lines:

```php
/**
 * @param array<int, array{barang_id: int, jumlah: int}> $normalizedItems
 */
```

Each element contains:
- `barang_id` (int): Unique identifier of the product.
- `jumlah` (int): Validated, positive quantity to deduct.

Client-supplied `harga_satuan` is neither required nor accepted by `DeductSaleStockAction`.

---

## 7. Output Contract

`DeductSaleStockAction::execute` returns authoritative product information and financial aggregations:

```php
[
    'items' => [
        [
            'barang_id' => (int) $barang->barang_id,
            'jumlah' => (int) $item['jumlah'],
            'harga_satuan' => (float) $barang->harga_jual,
            'harga_modal' => (float) $barang->harga_modal,
            'subtotal' => (float) ($hargaSatuan * $qty),
            'keuntungan' => (float) (($hargaSatuan - $hargaModal) * $qty),
        ],
        ...
    ],
    'total_harga' => (float) $totalHarga,
    'total_keuntungan' => (float) $totalKeuntungan,
]
```

- Returned `items` strictly preserve the **first-occurrence business line order** of the input `$normalizedItems`.
- POS consumes this payload directly without needing to re-query `Barang` or re-calculate line pricing.

---

## 8. Price Authority

- Sourced directly and authoritatively from `$barang->harga_jual`.
- Unit profit derived from `($barang->harga_jual - $barang->harga_modal)`.
- Client pricing in raw payloads is ignored before reaching the Inventory Action.
- All downstream mutations (e-wallet, debt, SHU, Tarik Tunai) rely exclusively on the authoritative financial figures returned by `DeductSaleStockAction`.

---

## 9. Stock Validation

For every normalized line:
```php
if (! $barang || $barang->stok_toko < $qty) {
    throw new Exception('Stok etalase tidak mencukupi untuk barang ID: '.$bId);
}
```
- Preserves exact legacy error text and semantic exception type (`\Exception`).
- Ensures HTTP 400 response in `KasirController` remains identical.
- Immediate abort prior to partial mutations taking effect (or rolled back if earlier lines in the batch were decremented).

---

## 10. Locking Strategy

Canonical lock hierarchy established in Phase 8E is strictly enforced:
1. Extract unique `barang_id` values: `array_values(array_unique(array_column($normalizedItems, 'barang_id')))`.
2. Sort ascending: `sort($uniqueBarangIds)`.
3. Pre-lock each `Barang` row via `Barang::where('barang_id', $bId)->lockForUpdate()->first()`.
4. Keep locked model instances in memory (`$lockedBarangs[$bId]`).
5. Process lines in business order using the locked models.

This guarantees:
- Lowest numerical ID is locked first.
- Duplicate lines do not attempt redundant locks.
- Deadlocks between concurrent transactions are structurally prevented.

---

## 11. Transaction Participation

`DeductSaleStockAction` **MUST NOT** invoke:
- `DB::beginTransaction()`
- `DB::commit()`
- `DB::rollBack()`

It participates in the ambient transaction opened by `ProcessPosCheckoutAction`:
```php
// ProcessPosCheckoutAction.php
DB::beginTransaction();
try {
    ...
    $stockResult = $this->deductSaleStockAction->execute($normalizedItems);
    ...
    DB::commit();
} catch (Exception $e) {
    DB::rollBack();
    throw $e;
}
```

---

## 12. Failure / Rollback Semantics

- If an exception occurs within `DeductSaleStockAction` (e.g. stock shortfall on line 3), the exception bubbles to `ProcessPosCheckoutAction`.
- The parent transaction catches the exception and executes `DB::rollBack()`.
- All stock mutations performed on preceding lines (e.g. line 1 and line 2) are rolled back by the database engine.
- If an exception occurs in POS downstream of inventory (e.g. member debt limit exceeded, insufficient e-wallet saldo), the parent rollback restores all deducted store stock to its original value.

---

## 13. POS Before vs After

### Before Phase 8G
```php
// Inside ProcessPosCheckoutAction::execute
$uniqueBarangIds = array_column($normalizedItems, 'barang_id');
sort($uniqueBarangIds);
$lockedBarangs = [];
foreach ($uniqueBarangIds as $bId) {
    $b = Barang::where('barang_id', $bId)->lockForUpdate()->first();
    ...
}
foreach ($normalizedItems as $item) {
    $barang = $lockedBarangs[$item['barang_id']];
    ...
    $barang->stok_toko -= $item['jumlah'];
    $barang->save();
}
```

### After Phase 8G
```php
// Inside ProcessPosCheckoutAction::execute
$stockResult = $this->deductSaleStockAction->execute($normalizedItems);
$transaksiItems = $stockResult['items'];
$totalHarga = $stockResult['total_harga'];
$totalKeuntungan = $stockResult['total_keuntungan'];
```
`ProcessPosCheckoutAction` no longer imports `App\Models\Barang` or interacts directly with the `barang` database table.

---

## 14. Responsibility Matrix

| Responsibility | Before Owner | After Owner | Implementation | Transaction Context | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cart Normalization** | POS | POS | `ProcessPosCheckoutAction` | Pre-Locking | Low |
| **Barang Lock Acquisition** | POS | Inventory | `DeductSaleStockAction` (`sort` + `lockForUpdate`) | Ambient POS Transaction | High (Deadlock Risk if inverted) |
| **Stock Validation** | POS | Inventory | `DeductSaleStockAction` (`stok_toko >= jumlah`) | Ambient POS Transaction | Medium |
| **Stock Deduction** | POS | Inventory | `DeductSaleStockAction` (`stok_toko -= jumlah`) | Ambient POS Transaction | High (Data Corruption if unrolled) |
| **Price Authority Lookup** | POS | Inventory | `DeductSaleStockAction` (`(float) $barang->harga_jual`) | Ambient POS Transaction | High (Financial Integrity) |
| **Member Lock & Validation** | POS | POS | `ProcessPosCheckoutAction` (`Anggota::lockForUpdate`) | Ambient POS Transaction | High (Concurrency Invariant) |
| **Payment Mutation** | POS | POS | `ProcessPosCheckoutAction` (Saldo / Hutang) | Ambient POS Transaction | High |
| **Tarik Tunai Offset** | POS | POS | `ProcessPosCheckoutAction` | Ambient POS Transaction | Medium |
| **Transaction Persistence** | POS | POS | `ProcessPosCheckoutAction` (`Transaksi` & `TransaksiDetail`) | Ambient POS Transaction | Low |
| **SHU Distribution** | POS | POS | `ProcessPosCheckoutAction` (`shu_distribusi`) | Ambient POS Transaction | Medium |

---

## 15. Test Coverage

A dedicated test suite was added in [`tests/Feature/DeductSaleStockActionTest.php`](file:///home/nurdiansyah/dev/koperasi-pk/backend-laravel/tests/Feature/DeductSaleStockActionTest.php) containing 12 unit and integration tests:

1. `test_successful_single_item_stock_deduction`: Validates single line deduction, stock update, and return values.
2. `test_successful_multi_item_stock_deduction`: Validates multi-item deduction, totals, and profits.
3. `test_deterministic_ascending_barang_lock_order`: Listens to database queries to verify that `barang_id` locks are acquired in strictly ascending numerical order (`minId -> midId -> maxId`), while output preserves the input line order.
4. `test_duplicate_normalized_input_does_not_lock_same_barang_repeatedly`: Confirms that products are locked exactly once per execution.
5. `test_stock_insufficiency_throws_exact_semantic_exception`: Verifies exception message and confirms zero stock mutation.
6. `test_missing_barang_throws_exact_semantic_exception`: Verifies handling of non-existent `barang_id`.
7. `test_stock_mutation_remains_transactional_and_rolls_back_with_parent_transaction`: Verifies that stock mutations revert completely if the parent transaction rolls back.
8. `test_authoritative_harga_jual_and_harga_modal_are_returned`: Verifies that catalog pricing and costs are returned accurately.
9. `test_client_harga_satuan_is_completely_ignored`: Asserts that client spoofed price attributes are ignored.
10. `test_original_business_line_ordering_remains_intact`: Asserts that non-sorted business line order (e.g. 3 -> 1 -> 2) is preserved in the output items array.
11. `test_empty_items_returns_empty_summary`: Validates graceful empty array handling.
12. `test_later_item_failure_leaves_earlier_item_intact_before_parent_rollback`: Validates that a failure on a subsequent line aborts the action, allowing parent rollback to restore earlier lines.

---

## 16. Regression Verification

Executed full regression test suite across the application:

```text
Tests:    210 passed (1438 assertions)
Duration: 4.87s
Failures: 0
```

- **Phase 8F Baseline:** 198 tests / 1397 assertions / 0 failures
- **Phase 8G Baseline:** 210 tests / 1438 assertions / 0 failures (+12 tests, +41 assertions)
- All existing tests in `PosLockOrderingTest`, `PosCheckoutCharacterizationTest`, and `PosPriceAuthorityCartNormalizationTest` continue to pass with 0 regressions.

---

## 17. Deferred Work

In strict adherence to Phase 8G boundaries:
- **Member Mutation Extraction:** Deferred to future phase.
- **Payment Processing Action Extraction:** Deferred to future phase.
- **Tarik Tunai Coordination Extraction:** Deferred to future phase.
- **SHU Distribution Extraction:** Deferred to future phase.

---

## 18. Final Assessment

Phase 8G successfully decoupled Inventory stock deduction from POS checkout. The new `DeductSaleStockAction` encapsulates all Inventory concerns, participates in the ambient POS transaction, preserves the canonical lock hierarchy, enforces server price authority, and maintains 100% backward API compatibility.
