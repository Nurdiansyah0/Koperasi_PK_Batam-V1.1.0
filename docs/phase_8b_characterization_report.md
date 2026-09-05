# Phase 8B: POS Checkout Characterization Report

## Executive Summary
Phase 8B establishes executable behavioral characterization tests for the active Point of Sale (POS) checkout implementation (`KasirController::buatTransaksiKasir` at `POST /laravel/api/kasir/buat-transaksi`). 

> [!IMPORTANT]
> **CHARACTERIZATION ≠ REMEDIATION**  
> The characterization suite asserts the **ACTUAL CURRENT RUNTIME BEHAVIOR** of the legacy implementation to ensure zero unintended regressions during subsequent refactoring. Capturing these behaviors in tests does **NOT** endorse, approve, or finalize existing architectural flaws, security risks, or concurrency anomalies. Remediations are intentionally deferred to Phase 8C / future dedicated phases under strict change control.

---

## 1. Existing POS Test Coverage (Pre-Phase 8B Baseline)
Prior to Phase 8B, checkout logic had sparse coverage scattered across feature tests:
1. `tests/Feature/KasirTest.php`:
   - `test_kasir_can_process_cash_transaction_and_reduce_stock`: Basic cash transaction with stock reduction.
   - `test_kasir_can_process_hutang_transaction_and_increase_anggota_debt`: Basic debt purchase within limit.
   - `test_kasir_cannot_process_transaction_if_stock_insufficient`: Basic 400 rejection when item stock is insufficient.
2. `tests/Feature/KasirSopAuditTest.php`:
   - `test_buat_transaksi_kasir_cash_success`: General cash checkout smoke test.
   - `test_buat_transaksi_kasir_hutang_within_limit_success`: Debt checkout limit check.
   - `test_buat_transaksi_kasir_hutang_exceeding_limit_fails`: Debt limit ceiling rejection.
   - `test_buat_transaksi_kasir_insufficient_stock_fails`: Etalase stock boundary rejection.
3. `tests/Feature/TarikTunaiTest.php`:
   - `test_buat_transaksi_kasir_with_tarik_tunai_and_auto_purchase_deduction`: Happy path integration of cash withdrawal (`tarik_tunai`) during checkout.

---

## 2. New Characterization Test Suite (`PosCheckoutCharacterizationTest`)
A dedicated suite was created in `tests/Feature/PosCheckoutCharacterizationTest.php` adding **8 test cases** and **35 assertions**:

| Test Method | Characterized Runtime Invariant / Legacy Flaw | Assertions Verified |
| :--- | :--- | :--- |
| `test_checkout_persists_shu_distribution_when_profit_is_positive` | Characterizes inline SHU calculation: inserts into `transaksi`, `transaksi_detail`, mutates `anggota.shu` (+60% profit), and inserts raw row into `shu_distribusi`. | Header, detail, member SHU balance mutation, `shu_distribusi` persistence. |
| `test_checkout_rolls_back_all_mutations_when_later_item_fails` | Verifies DB transaction atomicity: failure on the Nth item (out of stock) rolls back stock deductions of earlier items, leaving no orphaned transactions or SHU entries. | Zero row creation, stock restored. |
| `test_checkout_uses_client_supplied_harga_satuan` | **Characterizes Price Override Vulnerability:** System computes subtotal, transaction total, and profit using client-provided `harga_satuan` without validating against catalog price in `barang.harga_jual`. | Subtotal & profit derived from payload price; header & detail persist overridden price. |
| `test_checkout_allows_duplicate_barang_ids_as_current_behavior` | **Characterizes Duplicate Item Handling:** Cart with repeated `barang_id` does not consolidate lines; deducts stock per occurrence and inserts multiple detail rows. | Incremental stock deduction, duplicate detail rows. |
| `test_checkout_with_tarik_tunai_persists_ticket_and_deducts_fund` | Characterizes integrated cash withdrawal: creates completed `tarik_tunai` ticket, overrides payment method to `potong_tarik_tunai`, calculates net cash to hand over (`uang_bersih_diserahkan`). | `tarik_tunai` persistence, status completed, net cash calculation. |
| `test_checkout_ewallet_blocks_when_member_has_any_debt` | Characterizes e-wallet payment guard: blocked if member has outstanding debt (`hutang > 0`) regardless of wallet balance. | 400 Bad Request with `tunggakan hutang` message; wallet balance untouched. |
| `test_checkout_hutang_enforces_sisa_limit_ceiling` | Characterizes debt limit guard: ceiling calculated from `simpanan_pokok` + default limit minus existing `hutang`. | Rejects purchases exceeding remaining ceiling; allows purchase within ceiling. |
| `test_checkout_fails_if_anggota_id_is_missing` | Characterizes mandatory member constraint: non-member/guest checkout is rejected. | 400 Bad Request requiring member selection. |

---

## 3. Actual Observed Behaviors & Architectural Findings

### 3.1 Inline SHU Distribution Mutation
During checkout with positive gross profit, the system performs inline member profit-sharing:
- Allocates 60% of transaction gross profit directly to `anggota.shu` via `$anggota->increment('shu', $alokasi60)`.
- Directly inserts an unaggregated record into `shu_distribusi` (`shu_60_percent`, `shu_10_percent`, `shu_30_percent`).
- This makes POS checkout tightly coupled to member accounting and SHU reporting.

### 3.2 Atomic Rollback Boundary
The entire checkout operation is enclosed in a database transaction (`DB::beginTransaction()` / `DB::commit()` / `DB::rollBack()`). If validation or stock checking fails on any item in a multi-item payload, all previous mutations (stock deductions, calculations) are completely rolled back, guaranteeing database consistency.

### 3.3 Client-Controlled Price Override (`harga_satuan`)
`KasirController::buatTransaksiKasir` reads `harga_satuan` directly from `$item['harga_satuan']` supplied in the JSON payload:
```php
$harga = (float) $item['harga_satuan'];
$subtotal = $harga * $qty;
$keuntungan = ($harga - (float) $b->harga_modal) * $qty;
```
It does not compare `$harga` against `$b->harga_jual`. The characterization test faithfully records this behavior without altering it.

### 3.4 Duplicate Payload Item IDs
When an incoming cart contains duplicate `barang_id` entries (e.g. item 5 added twice with different or identical quantities), the controller processes each sequentially:
- Locks and queries the product row each time.
- Decrements stock incrementally.
- Creates separate `transaksi_detail` rows.
No grouping or validation against duplicate entries is performed.

### 3.5 Lock Ordering Asymmetry & Deadlock Potential
- `KasirController::buatTransaksiKasir` locks `Barang` rows first (`Barang::where('barang_id', ...)->lockForUpdate()->first()`), and subsequently locks `Anggota` (`Anggota::where('anggota_id', ...)->lockForUpdate()->first()`).
- In contrast, `AnggotaController::simpanTransaksi` (mobile app checkout) locks `Anggota` first, then locks `Barang`.
- Furthermore, `buatTransaksiKasir` iterates over `$request->items` without sorting `barang_id`, meaning client payload order dictates row acquisition order across multiple items.

---

## 4. Concurrency Test Feasibility & Test Environment Constraints
The test suite utilizes in-memory / SQLite with Laravel's `DatabaseTransactions` and single-process PHP CLI execution:
- **SQLite Concurrency Model:** SQLite uses database-level locks rather than fine-grained row-level locks (`SELECT ... FOR UPDATE` is parsed but effectively a no-op or file lock in SQLite).
- **Single-Threaded Execution:** PHPUnit executes synchronously within a single process and single thread. Creating true concurrent thread contention or reproducing deadlocks between `KasirController` and `AnggotaController` in this runner is infeasible and would produce flaky or synthetic tests.
- **Decision:** Asymmetry and lock order inversion are documented as architectural risks and verified through structural analysis rather than synthetic, unreliable concurrency unit tests.

---

## 5. Protected Invariants vs. Remaining Coverage Gaps

| Invariant / Feature Area | Pre-Phase 8B Status | Post-Phase 8B Status | Notes |
| :--- | :--- | :--- | :--- |
| Single-item cash checkout | Covered | Covered | Verified by legacy & characterization suites |
| Multi-item atomic rollback | Not covered | **Protected** | Verified in `test_checkout_rolls_back_all_mutations_when_later_item_fails` |
| Instant SHU distribution | Partial | **Protected** | Verified exact member balance & `shu_distribusi` persistence |
| Client price override | Not covered | **Protected (Characterized)** | Prevents silent behavioral deviation during refactoring |
| Duplicate item payload | Not covered | **Protected (Characterized)** | Preserves existing decrements and multi-detail records |
| Integrated `tarik_tunai` | Basic happy path | **Protected** | Ticket creation, status completed, net cash calculation verified |
| Debt limit ceiling enforcement | Covered | **Protected** | Characterized specific boundary formulas |
| E-wallet debt blocking | Not covered | **Protected** | Explicit check on `anggota.hutang > 0` guard |
| Guest / anonymous checkout | Not covered | **Protected** | Enforces requirement for member ID |
| Multi-process concurrency deadlock | Uncovered | Uncovered (Gap) | Infeasible under SQLite single-process test environment |
| Packet / bundle item checkout | Uncovered | Uncovered (Gap) | Legacy packet endpoint exists separately |

---

## 6. Discovered Security & Business Risks (Deferred to Future Phases)
The following vulnerabilities were identified and characterized but **NOT** modified:
1. **Unvalidated Client Pricing:** Cashiers or API clients can inject arbitrary item prices resulting in altered revenue and member SHU generation.
2. **Deadlock Potential:** Inverted lock acquisition between Kasir POS and Mobile Anggota checkouts, compounded by unsorted product lock orders.
3. **Cross-Domain Coupling:** POS checkout directly writes to `shu_distribusi` and `tarik_tunai` tables rather than delegating to respective domain boundaries.
4. **Duplicate Payload Injection:** Cart allows duplicate lines for the same product ID without normalization.

---

## 7. Test Suite Status & Baseline Evolution
- **Starting Baseline (Phase 7D-C):** 171 tests / 1275 assertions / 0 failures
- **New Baseline (Phase 8B):** **179 tests / 1310 assertions / 0 failures**
- **Execution Time:** ~4.3 seconds
- **Production Code Changes:** **ZERO** (0 files modified in `app/`, `database/`, `routes/`, or `config/`).
