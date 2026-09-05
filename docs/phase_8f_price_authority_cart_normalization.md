# Phase 8F — Price Authority & Cart Normalization

## 1. Executive Summary

Phase 8F eliminates two high-risk business logic and financial integrity vulnerabilities identified during Phase 8A pre-verification within the POS checkout workflow (`ProcessPosCheckoutAction`):

1. **Client-Controlled Pricing (Arbitrary Price Override):** Previously, the POS checkout accepted client-supplied `harga_satuan` (`$item['harga_satuan'] ?? $barang->harga_jual`), allowing malicious or desynchronized clients to override product sale prices, manipulate transaction subtotals, deflate or inflate gross profits, distort SHU distributions, bypass debt limits, or siphon cooperative funds.
2. **Unconsolidated Duplicate Cart Lines:** Previously, if a client sent multiple cart items with identical `barang_id`s, the system executed redundant stock checks, multiple database updates on the same row, and persisted fragmented transaction detail rows.

Under Phase 8F:
- **Server Price Authority** is strictly enforced: `harga_satuan` is determined exclusively from `barang.harga_jual`. Any client-supplied `harga_satuan` is completely ignored for all financial calculations, persistence, and downstream mutations.
- **Cart Normalization (Consolidation)** is performed prior to locking: duplicate `barang_id` entries are consolidated into a single logical cart line by summing requested quantities, while preserving the first-occurrence line ordering for invoice readability.
- **Canonical Lock Hierarchy** established in Phase 8E (`Barang (ascending barang_id) -> Anggota`) remains strictly intact and deterministic.
- Zero schema changes and zero cross-module extractions were made; all architectural boundaries remain clean for Phase 8G+.

---

## 2. Problem Statement & Vulnerabilities Remediated

### 2.1 Arbitrary Price Override Hazard
In the legacy implementation:
```php
// LEGACY (VULNERABLE)
$harga_satuan = $item['harga_satuan'] ?? $barang->harga_jual;
$subtotal = $harga_satuan * $item['jumlah'];
$keuntungan = ($harga_satuan - $barang->harga_modal) * $item['jumlah'];
```

This caused multiple severe security and accounting vulnerabilities:
- **Underpricing Attack:** A rogue cashier or API caller could set `harga_satuan = 100` on a Rp 50.000 item. The member would be charged Rp 100, while the cooperative suffered negative gross margin.
- **Overpricing Attack:** A client could submit inflated prices, artificially inflating recorded profit and distorting financial statements.
- **SHU Distribution Skew:** The cooperative's SHU distribution (60% Anggota, 10% Cadangan, 30% Pengurus) is computed directly from `$totalKeuntungan`. Overriding sale prices directly manipulated member SHU credits.
- **Debt Limit Bypass:** A member near their debt ceiling could checkout an expensive cart with spoofed low prices, bypassing `sisa_limit_hutang`.
- **Tarik Tunai Fund Siphoning:** When checkout includes integrated Tarik Tunai with purchase deduction (`uangBersihDiserahkan = max(0, nominalTarik - totalHarga)`), deflating `totalHarga` directly increased the net physical cash handed to the purchaser.

### 2.2 Unconsolidated Duplicate Cart Lines Hazard
In the legacy implementation, items in `$data['items']` were processed directly without cart normalization:
- If a cart contained `[{barang_id: 5, jumlah: 2}, {barang_id: 5, jumlah: 3}]`, the system executed two separate stock deductions and inserted two distinct `transaksi_detail` rows.
- If individual quantities were within stock but their sum exceeded stock (e.g., stock = 4, lines = 3 and 3), the first line succeeded and only the second failed, relying entirely on rollback.
- Inconsistent client prices across duplicate lines created ambiguity in unit cost and line item reporting.

---

## 3. Remediated Architecture & Implementation

### 3.1 Cart Normalization Algorithm
Before database locking or stock checks, `$data['items']` is normalized into `$normalizedItems`:
- Iterates over the raw cart payload.
- Groups and sums `jumlah` by `barang_id`.
- Preserves the **first-occurrence** sequence of products as selected by the user.

```php
$normalizedItems = [];
foreach ($data['items'] as $item) {
    $bId = (int) $item['barang_id'];
    $qty = (int) $item['jumlah'];

    if (isset($normalizedItems[$bId])) {
        $normalizedItems[$bId]['jumlah'] += $qty;
    } else {
        $normalizedItems[$bId] = [
            'barang_id' => $bId,
            'jumlah' => $qty,
        ];
    }
}
$normalizedItems = array_values($normalizedItems);
```

### 3.2 Canonical Lock Hierarchy Preservation (Phase 8E Invariant)
The normalized items are pre-locked in strictly ascending `barang_id` order to eliminate InnoDB deadlocks:
```php
$uniqueBarangIds = array_column($normalizedItems, 'barang_id');
sort($uniqueBarangIds);

$lockedBarangs = [];
foreach ($uniqueBarangIds as $bId) {
    $b = Barang::where('barang_id', $bId)->lockForUpdate()->first();
    if (! $b) {
        throw new Exception('Stok etalase tidak mencukupi untuk barang ID: '.$bId);
    }
    $lockedBarangs[$bId] = $b;
}
```

### 3.3 Server Price Authority Enforcement
Processing proceeds over `$normalizedItems`. Pricing is derived exclusively from `$barang->harga_jual`:
```php
foreach ($normalizedItems as $item) {
    $barang = $lockedBarangs[$item['barang_id']] ?? null;
    if (! $barang || $barang->stok_toko < $item['jumlah']) {
        throw new Exception('Stok etalase tidak mencukupi untuk barang ID: '.$item['barang_id']);
    }

    // Price Authority: Always use server catalog harga_jual; ignore any client-supplied harga_satuan
    $harga_satuan = (float) $barang->harga_jual;
    $subtotal = $harga_satuan * $item['jumlah'];
    $keuntungan = ($harga_satuan - (float) $barang->harga_modal) * $item['jumlah'];

    $totalHarga += $subtotal;
    $totalKeuntungan += $keuntungan;

    $transaksiItems[] = [
        'barang_id' => $barang->barang_id,
        'jumlah' => $item['jumlah'],
        'harga_satuan' => $harga_satuan,
        'subtotal' => $subtotal,
        'keuntungan' => $keuntungan,
    ];

    $barang->stok_toko -= $item['jumlah'];
    $barang->save();
}
```

---

## 4. Financial Calculation Trace Matrix

All downstream financial flows now derive deterministically from the authoritative server prices:

| Downstream Operation | Financial Formula | Authoritative Source |
| :--- | :--- | :--- |
| **Line Subtotal** | `harga_satuan * jumlah` | `barang.harga_jual * consolidated_jumlah` |
| **Line Profit** | `(harga_satuan - harga_modal) * jumlah` | `(barang.harga_jual - barang.harga_modal) * consolidated_jumlah` |
| **Transaction Total** | `∑ subtotal` | Sum of authoritative line subtotals |
| **Total Profit** | `∑ keuntungan` | Sum of authoritative line profits |
| **E-Wallet Deduction** | `anggota.saldo -= totalHarga` | Authoritative `totalHarga` |
| **Debt Accumulation** | `anggota.hutang += totalHarga` | Authoritative `totalHarga` (subject to `sisa_limit_hutang`) |
| **Tarik Tunai Offset** | `uangBersihDiserahkan = max(0, nominal - totalHarga)` | Authoritative `totalHarga` |
| **SHU Member (60%)** | `anggota.shu += totalKeuntungan * 0.60` | Authoritative `totalKeuntungan * 0.60` |
| **SHU Cooperative (10% & 30%)** | `shu_distribusi` records | Authoritative `totalKeuntungan * 0.10` and `0.30` |

---

## 5. Cart Normalization Trace Matrix

The following table demonstrates how client payloads are normalized, locked, and persisted:

| Client Input Order | Client Payload | Normalized Cart | Lock Order (`lockForUpdate`) | Persisted Details Order (`transaksi_detail`) |
| :--- | :--- | :--- | :--- | :--- |
| 1. Item C (ID: 30)<br>2. Item A (ID: 10)<br>3. Item C (ID: 30)<br>4. Item B (ID: 20)<br>5. Item A (ID: 10) | `C (qty: 1, price: 9k)`<br>`A (qty: 2, price: 1k)`<br>`C (qty: 3, price: 8k)`<br>`B (qty: 1, price: 5k)`<br>`A (qty: 1, price: 2k)` | `C: qty 4`<br>`A: qty 3`<br>`B: qty 1` | 1. `Barang 10` (A)<br>2. `Barang 20` (B)<br>3. `Barang 30` (C) | 1. `Item C` (qty: 4, catalog price)<br>2. `Item A` (qty: 3, catalog price)<br>3. `Item B` (qty: 1, catalog price) |

### Key Properties Preserved:
1. **Consolidation:** Exactly 3 rows are inserted into `transaksi_detail`, instead of 5.
2. **Deadlock Prevention:** Rows are locked strictly in ascending numerical order (`10 -> 20 -> 30`).
3. **Receipt Ordering:** Invoice details match the initial sequence the cashier scanned (`C -> A -> B`).
4. **Stock Accuracy:** `Barang 30` stock is decremented once by 4, `Barang 10` once by 3, `Barang 20` once by 1.

---

## 6. Verification and Regression Suite

### 6.1 Updated Characterization Tests
In [`PosCheckoutCharacterizationTest.php`](file:///home/nurdiansyah/dev/koperasi-pk/backend-laravel/tests/Feature/PosCheckoutCharacterizationTest.php):
- `test_checkout_uses_client_supplied_harga_satuan`: Updated to assert that client price spoofing (Rp 12.000 vs Rp 20.000 catalog) is rejected in favor of catalog price Rp 20.000 (total Rp 40.000, profit Rp 20.000).
- `test_checkout_allows_duplicate_barang_ids_as_current_behavior`: Updated to assert that duplicate lines (qty 2 and qty 3) consolidate into exactly 1 detail row with qty 5 and single stock decrement.
- `test_checkout_hutang_enforces_sisa_limit_ceiling`: Updated test fixture to use server catalog pricing for within-limit assertion.

### 6.2 Dedicated Test Suite: `PosPriceAuthorityCartNormalizationTest.php`
16 comprehensive test cases covering 73 assertions:
1. `test_client_cannot_override_price_with_lower_amount_enforces_catalog_price`
2. `test_client_cannot_override_price_with_higher_amount`
3. `test_checkout_omitting_harga_satuan_uses_catalog_price_transparently`
4. `test_shu_distribution_calculated_strictly_from_catalog_price`
5. `test_ewallet_payment_deducts_exact_catalog_amount_ignoring_client_price`
6. `test_ewallet_blocks_when_catalog_price_exceeds_saldo_even_if_client_price_is_lower`
7. `test_debt_payment_accumulates_exact_catalog_amount_ignoring_client_price`
8. `test_debt_limit_enforced_against_catalog_total_preventing_bypass`
9. `test_integrated_tarik_tunai_potong_belanja_uses_catalog_price_for_net_cash_handover`
10. `test_duplicate_barang_ids_are_consolidated_into_single_cart_line`
11. `test_multiple_distinct_duplicate_items_are_properly_consolidated`
12. `test_cart_normalization_preserves_first_occurrence_line_ordering`
13. `test_consolidated_quantity_enforces_inventory_stock_boundary`
14. `test_duplicate_cart_lines_with_conflicting_client_prices_are_both_ignored`
15. `test_transaction_atomicity_and_zero_mutations_on_failure_with_normalized_cart`
16. `test_canonical_lock_ordering_remains_strictly_ascending_with_scrambled_duplicates`

### 6.3 Test Suite Baseline Comparison
- **Phase 8E Baseline:** 182 tests / 1323 assertions / 0 failures
- **Phase 8F New Baseline:** 198 tests / 1397 assertions / 0 failures (+16 tests, +74 assertions)

---

## 7. Scope Boundaries & Next Steps

- **No Schema Changes / Migrations:** Completed without modifying tables, columns, or indexes.
- **No Module Extraction:** Cross-module operations (inventory deduction, e-wallet mutation, debt mutation, SHU distribution) remain inside `ProcessPosCheckoutAction` orchestration, ready for modular extraction in Phase 8G+.
- **Frontend Compatibility:** The cashier React UI already aggregates unique products by `barang_id` and expects server catalog pricing; the backend changes provide complete defense-in-depth and total API safety.
