# Phase 8I — Finance Boundary Extraction

## 1. Baseline

- **Initial Git Commit:** `9879c2d79c67675e4e5ba0ec2dbdf5c589ba5b6f` (Merge PR #22)
- **Pre-Verification Test Suite:** 222 tests / 1470 assertions / 0 failures
- **Target Working Branch:** `phase8i/finance-shu-distribution-extraction`
- **Scope Notice:** This phase constitutes a **structural Finance boundary extraction**, NOT a financial redesign, accounting redesign, or schema migration.

---

## 2. Pre-Verification Findings

Audit of the POS checkout flow (`ProcessPosCheckoutAction`) and Finance data structures revealed:
1. **Direct Persistence Leak:** POS checkout executed an in-line raw query `DB::table('shu_distribusi')->insert(...)` following transaction item creation and member SHU mutation.
2. **Calculation vs Persistence Separation:**
   - Calculation: POS determines gross margin `totalKeuntungan` and computes the statutory splits:
     - 60% Member share (`$shu60 = $totalKeuntungan * 0.60`)
     - 10% Management/Pengurus share (`$shu10 = $totalKeuntungan * 0.10`)
     - 30% Cooperative reserve share (`$shu30 = $totalKeuntungan * 0.30`)
   - Members Mutation: 60% member share credited via `ApplyPosMemberBalanceChangesAction::creditShu($anggota, $shu60)` (extracted in Phase 8H).
   - Finance Persistence: Insertion of the fiscal distribution record into `shu_distribusi`.
3. **Database Schema Inspection:**
   - Table: `shu_distribusi`
   - Columns: `shu_id` (PK, integer auto-increment), `anggota_id` (nullable integer), `tahun` (nullable text), `shu_60_percent` (nullable numeric), `shu_10_percent` (nullable numeric), `shu_30_percent` (nullable numeric), `created_at` (nullable datetime).
   - **Key Finding:** `shu_distribusi` **DOES NOT** contain a `transaksi_id` column or unique checkout constraint. This absence of transaction linkage is preserved without schema changes and documented as a deferred integrity risk.

---

## 3. Current `shu_distribusi` Semantics

- Every completed checkout for an associated member with positive profit creates a single `shu_distribusi` record.
- The record records the member's ID, the fiscal year (`tahun`), the 60% member share, the 10% management share, the 30% cooperative reserve share, and creation timestamp.
- The table serves as a historical distribution ledger queried by administrative aggregation endpoints (e.g., `AdminController::getShuDistribusi` and `AdminController::index` dashboard telemetry).

---

## 4. Finance Ownership & Domain Boundaries

Under the modular monolith architecture:
- **Finance Domain Owns:**
  - `shu_distribusi` persistence and ledger records.
  - Cooperative profit allocation rules (60/10/30 global allocation ledger).
  - SHU conversion workflows (`ProsesKonversiShuAction`).
  - Financial reporting and dashboard telemetry aggregation.
- **Members Domain Owns:**
  - `anggota.shu` (member runtime SHU balance).
  - `anggota.saldo` and `anggota.hutang`.
  - Member balance mutation execution via `ApplyPosMemberBalanceChangesAction`.
- **POS Domain Owns:**
  - Retail checkout orchestration (`ProcessPosCheckoutAction`).
  - Cart line normalization and first-occurrence business line ordering.
  - Gross profit computation (`totalKeuntungan`) from line items.
  - Transaction persistence (`Transaksi`, `TransaksiDetail`).
- **Inventory Domain Owns:**
  - Product catalog prices (`barang.harga_jual`).
  - Stock validation and store deduction (`DeductSaleStockAction`).
- **Cash Management Domain Owns:**
  - Physical cash operations, Tarik Tunai ticket creation (`TarikTunai::create`), and handover workflows.

---

## 5. Members vs Finance Distinction

A clear distinction is maintained between runtime member balances and financial distribution ledgers:
- **`anggota.shu` (Members):** Runtime spendable/convertible SHU balance owned by the member.
- **`shu_distribusi` (Finance):** Fiscal distribution log of cooperative earnings allocation.
- `RecordPosShuDistributionAction` **never** updates `anggota.shu`, and `ApplyPosMemberBalanceChangesAction` **never** writes to `shu_distribusi`.

---

## 6. Action Contract

### Class Definition
- **Namespace:** `App\Actions\Finance`
- **Class:** `RecordPosShuDistributionAction`

### Method Signature
```php
/**
 * Records an authoritative POS SHU distribution entry within the ambient parent transaction.
 *
 * @param  int  $anggotaId  Member identifier
 * @param  float  $shu60  60% member share
 * @param  float  $shu10  10% management share
 * @param  float  $shu30  30% cooperative reserve share
 * @param  string|null  $tahun  Fiscal year (defaults to current year)
 * @param  DateTimeInterface|string|null  $createdAt  Timestamp (defaults to current time)
 * @return ShuDistribusi Created distribution record
 *
 * @throws InvalidArgumentException
 */
public function execute(
    int $anggotaId,
    float $shu60,
    float $shu10,
    float $shu30,
    ?string $tahun = null,
    mixed $createdAt = null
): ShuDistribusi
```

---

## 7. Transaction Behavior & Rollback Verification

- `RecordPosShuDistributionAction` **contains zero transaction management boundaries** (`no DB::beginTransaction()`, `no DB::commit()`, `no DB::rollBack()`).
- Executes entirely within the ambient database transaction coordinated by `ProcessPosCheckoutAction`.
- **Atomicity Invariant:** If downstream processing throws an exception prior to commit, the parent transaction initiates `DB::rollBack()`.
- **Verification:** Verified via `test_pos_checkout_atomicity_rolls_back_finance_distribution_when_downstream_fails`, proving that a downstream error immediately after distribution insertion causes full rollback of:
  1. `shu_distribusi` insertion
  2. `anggota.saldo` and `anggota.shu` balance mutations
  3. `barang.stok_toko` inventory deductions
  4. `transaksi` and `transaksi_detail` records

---

## 8. Lock Behavior

- The canonical lock hierarchy established in Phase 8E is preserved:
  $$\text{Barang (ascending barang\_id)} \longrightarrow \text{Anggota}$$
- `RecordPosShuDistributionAction` introduces **no new locks** and does not lock `Anggota` or `Barang`.
- Ambient transaction handles row insertion cleanly without interfering with acquired row locks.

---

## 9. Preserved 60/10/30 Behavior

- The statutory 60/10/30 calculation remains in the POS checkout orchestration layer:
  - `$shu60 = $totalKeuntungan * 0.60;`
  - `$shu10 = $totalKeuntungan * 0.10;`
  - `$shu30 = $totalKeuntungan * 0.30;`
- Authoritative values are passed explicitly to `RecordPosShuDistributionAction`.
- Preserves identical floating-point precision, year defaulting, and timestamp handling.

---

## 10. Tests Added

A dedicated test suite was created in [`tests/Feature/RecordPosShuDistributionActionTest.php`](file:///home/nurdiansyah/dev/koperasi-pk/backend-laravel/tests/Feature/RecordPosShuDistributionActionTest.php):
1. `test_creates_valid_shu_distribusi_record`: Verifies record creation and attributes.
2. `test_preserves_exact_60_10_30_values_with_fractional_amounts`: Validates float precision handling.
3. `test_preserves_custom_year_when_provided`: Verifies explicit year parameter override.
4. `test_defaults_to_current_year_when_tahun_is_null`: Verifies current year fallback.
5. `test_preserves_custom_timestamp_when_provided`: Verifies custom timestamp assignment.
6. `test_defaults_to_current_timestamp_when_created_at_is_null`: Verifies `now()` fallback.
7. `test_action_does_not_mutate_member_shu_or_balances`: Confirms boundary isolation.
8. `test_validation_rejects_invalid_anggota_id`: Rejects non-positive member IDs.
9. `test_validation_rejects_negative_distribution_amounts`: Rejects negative values.
10. `test_participates_in_ambient_transaction_and_rolls_back`: Confirms savepoint/ambient rollback.
11. `test_pos_checkout_integrates_finance_action_on_positive_profit`: Verifies real POS checkout integration.
12. `test_pos_checkout_does_not_create_distribution_when_profit_is_zero`: Verifies zero profit no-op.
13. `test_pos_checkout_does_not_create_distribution_when_no_member_associated`: Verifies no-member rejection/no-op.
14. `test_pos_checkout_atomicity_rolls_back_finance_distribution_when_downstream_fails`: Verifies full end-to-end atomicity under simulated failure.

---

## 11. Test Results

- **Feature Tests:** 14/14 passed (43 assertions).
- **Full Test Suite:** **236 passed, 1513 assertions, 0 failures** (Duration: ~5.25s).
- **Code Style:** Laravel Pint passed cleanly (`0 issues`).

---

## 12. Files Changed

1. `backend-laravel/app/Actions/Finance/RecordPosShuDistributionAction.php` — *(Created)*
2. `backend-laravel/app/Actions/POS/ProcessPosCheckoutAction.php` — *(Modified: injected and called Finance Action)*
3. `backend-laravel/tests/Feature/RecordPosShuDistributionActionTest.php` — *(Created: 14 feature tests)*
4. `docs/phase_8i_finance_boundary_extraction.md` — *(Created: this documentation)*

---

## 13. Deferred Risks

- **Missing `transaksi_id` on `shu_distribusi`:** The database table `shu_distribusi` lacks a foreign key or reference column linking distribution records to the generating `transaksi_id`. Deferred to future schema normalization phase.
- **Idempotency & Duplicate Protection:** The absence of a unique constraint on `(transaksi_id)` or `(anggota_id, reference)` means idempotency relies purely on the parent POS transaction boundary. Deferred to future schema/ledger phase.
- **Tarik Tunai Ticket Extraction:** Extraction of Cash Management ticket creation from POS checkout remains deferred to Phase 8J.
- **Physical Modular Monolith Migration:** `app/Modules` remains inactive and unorganized pending completion of transitional Action extractions.

---

## 14. Known Transitional Boundaries

- `ProcessPosCheckoutAction` acts as the POS Transaction Coordinator, orchestrating:
  - `DeductSaleStockAction` (Inventory)
  - `ApplyPosMemberBalanceChangesAction` (Members)
  - `RecordPosShuDistributionAction` (Finance)
  - In-line Tarik Tunai ticket creation (Cash Management — targeted for Phase 8J)
  - POS record persistence (`Transaksi`, `TransaksiDetail`)

---

## 15. Final Phase Status

`PHASE 8I COMPLETE — PR OPEN — HUMAN REVIEW REQUIRED`
