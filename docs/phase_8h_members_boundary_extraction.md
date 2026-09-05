# Phase 8H — Members Boundary Extraction

## 1. Baseline

- **Initial Git Commit:** `081838216544e745295d7dc7186e2f66a32e20ef` (Merge PR #21)
- **Pre-Verification Test Suite:** 210 tests / 1438 assertions / 0 failures
- **Target Working Branch:** `phase8h/members-boundary-extraction`
- **Scope Notice:** This phase constitutes a **structural boundary extraction**, NOT a financial redesign or business rule modification.

---

## 2. Pre-Verification Findings

Audit of the POS checkout orchestration flow (`ProcessPosCheckoutAction`) revealed direct in-line mutations of member state across three operational touchpoints:
1. **E-Wallet Payment:** Deducted `$totalHarga` directly from `$anggota->saldo` after verifying zero debt and sufficient balance.
2. **Hutang (Credit) Payment:** Increased `$anggota->hutang` by `$totalHarga` after verifying the member's remaining credit ceiling (`sisa_limit_hutang`).
3. **Cash Payment:** Executed without mutating member balances.
4. **Integrated Tarik Tunai:** Deducted withdrawal amount from `$anggota->shu` or `$anggota->saldo`.
5. **SHU Profit Distribution:** Credited 60% of gross transaction profit directly to `$anggota->shu` following transaction persistence.

Pre-verification also identified redundant `Anggota::lockForUpdate()` calls inside the Tarik Tunai block and redundant `Anggota::find()` calls during SHU allocation, which were safely cleaned up to eliminate superfluous database round-trips while preserving lock hierarchy.

---

## 3. Exact Member Mutations Found

| Trigger / Context | Fields Mutated | Pre-Conditions & Validations | Timing in Checkout |
| :--- | :--- | :--- | :--- |
| **E-Wallet Payment** | `saldo -= totalHarga` | `hutang == 0`<br>`saldo >= totalHarga` | Pre-Persistence (Payment Phase) |
| **Hutang Payment** | `hutang += totalHarga` | `totalHarga <= sisa_limit_hutang` | Pre-Persistence (Payment Phase) |
| **Cash Payment** | *None* | Valid Member | Pre-Persistence (Payment Phase) |
| **Integrated Tarik Tunai** | `shu -= nominal`<br>OR `saldo -= nominal` | Debt clear, min purchase, proportional limit, consent | Pre-Persistence (Tarik Tunai Phase) |
| **SHU Distribution** | `shu += profit * 0.60` | Member selected, `totalKeuntungan > 0` | Post-Persistence (SHU Phase) |

---

## 4. Ownership Boundary

Under the modular monolith architecture:
- **Members Domain Owns:**
  - `anggota.saldo`
  - `anggota.hutang`
  - `anggota.shu` (member-level runtime SHU balance)
  - Member account balance validation rules (debt checks, saldo sufficiency, debt ceiling compliance).
- **POS Domain Owns:**
  - Checkout orchestration.
  - Cart normalization and first-occurrence business line ordering.
  - Payment method selection.
  - Transaction persistence (`Transaksi` header and `TransaksiDetail` lines).
- **Inventory Domain Owns:**
  - Product locking (`Barang ASC`), stock validation, store stock deduction (`DeductSaleStockAction`), authoritative catalog prices.
- **Finance Domain Owns:**
  - Global cooperative SHU allocation rules, `shu_distribusi` ledger insertion, SHU conversion.
- **Cash Management Domain Owns:**
  - Physical cash operations, Tarik Tunai ticket creation (`TarikTunai::create`), cashier handover, cash reconciliation.

---

## 5. Action Contract

### Class Definition
- **Namespace:** `App\Actions\Members`
- **Class:** `ApplyPosMemberBalanceChangesAction`

### Method Signatures

```php
/**
 * Executes payment balance mutations for POS checkout within an ambient transaction.
 */
public function execute(Anggota $anggota, string $metodePembayaran, float $totalHarga): Anggota;

/**
 * Credits member runtime SHU balance with transaction profit allocation.
 */
public function creditShu(Anggota $anggota, float $shuAmount): Anggota;

/**
 * Deducts member balance for integrated Tarik Tunai.
 */
public function deductTarikTunai(Anggota $anggota, float $nominal, string $sumberDana = 'shu'): Anggota;
```

---

## 6. Transaction Behavior

- `ApplyPosMemberBalanceChangesAction` **does not** manage transactions (`no beginTransaction/commit/rollBack`).
- Participates fully in the ambient transaction opened by `ProcessPosCheckoutAction`.
- **Atomicity Invariant:** If any subsequent step in checkout fails (e.g., Tarik Tunai limit violation, database constraint, detail persistence failure), the parent transaction initiates `DB::rollBack()`. All member balance changes (`saldo`, `hutang`, `shu`) revert completely to their pre-transaction values.

---

## 7. Lock Behavior

- The canonical lock hierarchy established in Phase 8E is strictly preserved:
  $$\text{Barang (ascending barang\_id)} \longrightarrow \text{Anggota}$$
- Inventory rows are locked first by `DeductSaleStockAction`.
- The `Anggota` row is locked exactly once by `ProcessPosCheckoutAction` via `Anggota::lockForUpdate()->find($anggota_id)`.
- `ApplyPosMemberBalanceChangesAction` operates on this already-locked model instance in memory, eliminating redundant queries or lock acquisition.

---

## 8. Preserved Business Semantics

1. **Exact Error Messages:**
   - E-Wallet Debt: `"Gagal: Anggota ini masih memiliki tunggakan hutang. Harap lunasi terlebih dahulu."`
   - E-Wallet Balance: `"Gagal: Saldo tidak mencukupi. Saldo tersedia: Rp ..."`
   - Hutang Limit: `"Gagal: Total belanja Rp ... melebihi sisa limit hutang Rp ..."`
2. **Exact Calculations:**
   - E-Wallet deduction strictly reduces `saldo` by `totalHarga`.
   - Debt accumulation strictly increases `hutang` by `totalHarga`.
   - SHU profit distribution strictly adds `60%` of `totalKeuntungan` to `shu`.
3. **Price Authority:**
   - All balance mutations consume authoritative totals returned by `DeductSaleStockAction`, ignoring client-supplied prices.

---

## 9. Tests Added

A dedicated feature test suite was created in [`tests/Feature/ApplyPosMemberBalanceChangesActionTest.php`](file:///home/nurdiansyah/dev/koperasi-pk/backend-laravel/tests/Feature/ApplyPosMemberBalanceChangesActionTest.php):
1. `test_ewallet_payment_deducts_saldo_correctly`
2. `test_ewallet_payment_fails_when_member_has_outstanding_debt`
3. `test_ewallet_payment_fails_when_saldo_is_insufficient`
4. `test_hutang_payment_increases_debt_correctly`
5. `test_hutang_payment_fails_when_exceeding_sisa_limit_hutang`
6. `test_cash_payment_does_not_mutate_member_balance`
7. `test_credit_shu_increases_member_shu_balance`
8. `test_deduct_tarik_tunai_from_shu_and_saldo`
9. `test_action_participates_in_ambient_transaction_and_rolls_back_on_failure`
10. `test_pos_checkout_atomicity_rolls_back_member_balance_mutation_if_downstream_fails` (Section 16 mandatory test)
11. `test_pos_checkout_enforces_lock_hierarchy_barang_before_anggota`
12. `test_pos_checkout_uses_authoritative_price_for_member_balance_mutations`

---

## 10. Test Results

- **Feature Tests:** 12/12 passed (32 assertions).
- **Regression Suite:** **222 passed, 1470 assertions, 0 failures** (Duration: ~5.15s).
- **Zero regressions** across all characterization, lock-ordering, and price-authority test suites.

---

## 11. Files Changed

1. `backend-laravel/app/Actions/Members/ApplyPosMemberBalanceChangesAction.php` (New action)
2. `backend-laravel/app/Actions/POS/ProcessPosCheckoutAction.php` (Refactored to delegate member balance changes)
3. `backend-laravel/tests/Feature/ApplyPosMemberBalanceChangesActionTest.php` (New feature test suite)
4. `docs/phase_8h_members_boundary_extraction.md` (Architectural documentation)

---

## 12. Deferred Risks

- **Member Ledger / Audit Logging:** Audit logs for `saldo`, `hutang`, and `shu` remain deferred to future schema phases.
- **Tarik Tunai Extraction:** Cash Management extraction remains deferred to future phases.
- **SHU Distribution Extraction:** Finance domain extraction of `shu_distribusi` remains deferred to future phases.

---

## 13. Known Transitional Boundaries

- `ProcessPosCheckoutAction` coordinates calls to `DeductSaleStockAction` (Inventory) and `ApplyPosMemberBalanceChangesAction` (Members) while maintaining the ambient database transaction and persisting POS records (`Transaksi`, `TransaksiDetail`).

---

## 14. Post-Implementation Verification

- Verified clean working tree.
- Verified Laravel Pint compliance.
- Confirmed zero schema modifications, zero migrations, zero route changes, and zero frontend changes.

---

## 15. Final Phase Status

`PHASE 8H COMPLETE — PR OPEN — HUMAN REVIEW REQUIRED`
