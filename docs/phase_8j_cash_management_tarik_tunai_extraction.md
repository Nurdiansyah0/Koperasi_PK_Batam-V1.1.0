# Phase 8J — Cash Management Boundary Extraction
## Integrated POS Tarik Tunai Persistence

## 1. Baseline

- **Initial Git Commit:** `1834ce89e9d690a61be8122d6409febe9ca3fb4d` (Merge PR #23)
- **Pre-Verification Test Suite:** 236 tests / 1513 assertions / 0 failures
- **Target Working Branch:** `phase8j/cash-management-tarik-tunai-extraction`
- **Scope Notice:** This phase constitutes a **structural Cash Management boundary extraction**, NOT a Tarik Tunai redesign, POS redesign, or schema migration.

---

## 2. Current Integrated Tarik Tunai Flow

During POS checkout (`ProcessPosCheckoutAction`), when `sertakan_tarik_tunai = true` and `tarik_tunai_nominal > 0`:
1. **Pre-Validation Checks:**
   - Member must be associated with the transaction (`anggota_id` required).
   - Member must have zero outstanding debt (`anggota.hutang == 0`).
   - Transaction total must satisfy minimum store purchase threshold (`totalHarga >= 25.000`).
   - Withdrawal nominal must not exceed proportional ceiling (`nominalTarik <= min(100.000, totalHarga * 2)`).
   - Withdrawal nominal must not exceed available member fund balance (`shu` or `saldo`).
   - Member master consent for holiday SHU deduction must be active or provided in the payload.
2. **Business Invariant Check:**
   - The withdrawal amount MUST cover the purchase total:
     $$\text{nominal\_tarikan} \ge \text{total\_belanja}$$
   - If $\text{nominal\_tarikan} < \text{total\_belanja}$, the checkout is **REJECTED** immediately. Negative cash difference is never silently clamped to zero.
3. **Balance Mutation:**
   - Total withdrawal nominal is deducted from member balance (`shu` or `saldo`) via `ApplyPosMemberBalanceChangesAction::deductTarikTunai`.
4. **Cash Handover Calculation:**
   $$\text{cash\_diberikan} = \text{nominal\_tarikan} - \text{total\_belanja}$$
   Because the invariant enforces $\text{nominal\_tarikan} \ge \text{total\_belanja}$, $\text{cash\_diberikan}$ is strictly $\ge 0$.
5. **Ticket Persistence:**
   - Ticket persisted in `tarik_tunai` table with `status = 'completed'` via `RecordPosIntegratedTarikTunaiAction::execute`.
6. **Payment Method Override:**
   - Checkout payment method is set to `potong_tarik_tunai`.
7. **Transaction Persistence & Linking:**
   - `transaksi` header is created.
   - Ticket `transaksi_id` foreign key is updated via `RecordPosIntegratedTarikTunaiAction::linkTransaction`.

---

## 3. Distinction Among Tarik Tunai Workflows

Pre-verification examined all three Tarik Tunai touchpoints in the system:
1. **Direct Cashier Tarik Tunai (`TarikTunaiAction`):**
   - Standalone counter transaction initiated by cashier.
   - Requires an existing completed store purchase today ($\ge \text{Rp } 25.000$).
   - Full cash nominal handed over to customer (no purchase deduction).
   - Manages its own database transaction (`DB::beginTransaction()`).
2. **Pending Member Tarik Tunai (`ProsesTarikTunaiAction`):**
   - Approval/rejection workflow for pre-submitted mobile app tickets.
   - Manages its own transaction lifecycle and member balance deduction upon approval.
3. **Integrated POS Checkout Tarik Tunai (`RecordPosIntegratedTarikTunaiAction`):**
   - Executed simultaneously with retail goods purchase at checkout.
   - Purchase amount is deducted from the withdrawal; net remaining cash is handed to customer.
   - Executes inside the parent POS ambient transaction without independent transaction management.

---

## 4. Ownership Decision

Under the modular monolith architecture:
- **Cash Management Domain Owns:**
  - `tarik_tunai` table persistence and ticket lifecycle.
  - Withdrawal ticket code generation (`TRK-ymd-xxxx`).
  - Cashier handover tracking and cash reconciliation.
  - Action: `RecordPosIntegratedTarikTunaiAction`.
- **Members Domain Owns:**
  - `anggota.saldo`, `anggota.hutang`, `anggota.shu`.
  - Member balance mutations via `ApplyPosMemberBalanceChangesAction::deductTarikTunai`.
- **POS Domain Owns:**
  - Checkout orchestration (`ProcessPosCheckoutAction`).
  - Purchase qualification checks (minimum purchase, proportional limit).
  - Net cash handover calculation (`nominal_tarikan - total_belanja`).
  - Sales transaction persistence (`Transaksi`, `TransaksiDetail`).
- **Inventory Domain Owns:**
  - Catalog pricing and stock reservation/deduction (`DeductSaleStockAction`).
- **Finance Domain Owns:**
  - Statutory 60/10/30 SHU distribution record persistence (`RecordPosShuDistributionAction`).

---

## 5. New Action Contract

### Class Definition
- **Namespace:** `App\Actions\CashManagement`
- **Class:** `RecordPosIntegratedTarikTunaiAction`

### Method Signatures
```php
/**
 * Persists an integrated Tarik Tunai ticket within an ambient parent transaction.
 *
 * @param  int  $anggotaId  Member ID
 * @param  int  $kasirId  Cashier user ID
 * @param  float  $nominal  Total withdrawal amount
 * @param  float  $totalBelanja  Purchase total to be covered
 * @param  float  $uangBersihDiserahkan  Net cash given to customer (nominal - totalBelanja)
 * @param  string  $sumberDana  Fund source ('shu' or 'saldo')
 * @param  int|null  $transaksiId  Associated POS transaction ID if already known
 * @param  string|null  $kodePenarikan  Optional withdrawal code override
 * @return TarikTunai Created TarikTunai instance
 *
 * @throws InvalidArgumentException
 */
public function execute(
    int $anggotaId,
    int $kasirId,
    float $nominal,
    float $totalBelanja,
    float $uangBersihDiserahkan,
    string $sumberDana = 'shu',
    ?int $transaksiId = null,
    ?string $kodePenarikan = null
): TarikTunai;

/**
 * Links an existing TarikTunai ticket to a persisted POS transaction.
 *
 * @param  TarikTunai  $tarik  Existing TarikTunai model instance
 * @param  int  $transaksiId  Persisted Transaksi ID
 * @return TarikTunai Updated TarikTunai instance
 *
 * @throws InvalidArgumentException
 */
public function linkTransaction(TarikTunai $tarik, int $transaksiId): TarikTunai;
```

---

## 6. Transaction Boundary & Rollback Semantics

- `RecordPosIntegratedTarikTunaiAction` **contains zero transaction management boundaries** (`no DB::beginTransaction()`, `no DB::commit()`, `no DB::rollBack()`).
- Executes entirely within the ambient parent transaction opened and coordinated by `ProcessPosCheckoutAction`.
- **Atomicity Guarantee:** If any subsequent operation fails (e.g., detail persistence error, database constraint, or downstream SHU failure):
  1. Parent transaction catches the exception and executes `DB::rollBack()`.
  2. The `tarik_tunai` ticket is completely rolled back (zero records persisted).
  3. Member balance changes (`saldo`, `shu`) are completely reverted.
  4. Inventory stock deductions (`stok_toko`) are completely reverted.
  5. Transaction headers and details (`transaksi`, `transaksi_detail`) are completely reverted.
- **Rollback Verification:** Proved via `test_pos_checkout_atomicity_rolls_back_tarik_tunai_when_downstream_fails` and `test_pos_checkout_rejects_tarik_tunai_lower_than_total_belanja_and_rolls_back`.

---

## 7. Locking Behavior

- Canonical lock hierarchy established in Phase 8E is strictly preserved:
  $$\text{Barang (ascending barang\_id)} \longrightarrow \text{Anggota}$$
- `RecordPosIntegratedTarikTunaiAction` introduces **no new row locks** and does not query or lock `Anggota` or `Barang`.
- Ambient transaction handles ticket insertion and foreign key update cleanly.

---

## 8. Business Invariant: Purchase Coverage Requirement

Integrated POS Tarik Tunai enforces the strict invariant:
$$\text{nominal\_tarikan} \ge \text{total\_belanja}$$

- **Equal-Value Case:**
  - Belanja: Rp 100.000
  - Tarik Tunai: Rp 100.000
  - Cash Handover: $\text{Rp } 100.000 - \text{Rp } 100.000 = \text{Rp } 0$
  - Result: **VALID** (`uang_bersih_diserahkan = 0`)
- **Greater-Value Case:**
  - Belanja: Rp 50.000
  - Tarik Tunai: Rp 80.000
  - Cash Handover: $\text{Rp } 80.000 - \text{Rp } 50.000 = \text{Rp } 30.000$
  - Result: **VALID** (`uang_bersih_diserahkan = 30.000`)
- **Undercover / Invalid Lower-Value Case:**
  - Belanja: Rp 100.000
  - Tarik Tunai: Rp 70.000
  - Shortfall: Rp 30.000
  - Result: **REJECT** (Exception thrown: `"Nominal penarikan tunai (Rp 70.000) tidak mencukupi untuk menutup total belanja (Rp 100.000). Kurang Rp 30.000."`)
  - **No silent conversion:** Negative differences are never clamped via `max(0, ...)`. The entire checkout fails, and all operations roll back.

---

## 9. API & Payment Semantics Preservation

- Payment method override to `potong_tarik_tunai` is preserved exactly.
- API response payload structure (`tarik_tunai.tarik_id`, `tarik_tunai.nominal_tarik`, `tarik_tunai.potong_belanja`, `tarik_tunai.uang_bersih_diserahkan`, `tarik_tunai.sisa_shu`, `tarik_tunai.sisa_saldo`) remains 100% compatible.
- All existing Phase 8B characterization tests continue to pass without modification.

---

## 10. Tests Added

A dedicated feature test suite was created in [`tests/Feature/RecordPosIntegratedTarikTunaiActionTest.php`](file:///home/nurdiansyah/dev/koperasi-pk/backend-laravel/tests/Feature/RecordPosIntegratedTarikTunaiActionTest.php):
1. `test_creates_valid_tarik_tunai_record`: Validates ticket creation, fields, and database state.
2. `test_link_transaction_updates_transaksi_id`: Validates two-phase linking with `transaksi_id`.
3. `test_creates_tarik_tunai_with_immediate_transaksi_id_if_provided`: Validates direct creation with transaction ID.
4. `test_action_participates_in_ambient_transaction_and_rolls_back`: Verifies transaction rollback isolation.
5. `test_validation_rejects_nominal_less_than_total_belanja`: Verifies Action-level invariant defense.
6. `test_validation_rejects_invalid_inputs`: Rejects zero/negative IDs and nominals.
7. `test_validation_rejects_negative_cash_given`: Rejects negative cash handover.
8. `test_link_transaction_rejects_invalid_transaksi_id`: Rejects invalid linking ID.
9. `test_action_does_not_mutate_member_balance_directly`: Confirms Members boundary isolation.
10. `test_pos_checkout_equal_value_tarik_tunai_succeeds_with_zero_cash_given`: End-to-end equal value test (Rp 100k / Rp 100k).
11. `test_pos_checkout_greater_value_tarik_tunai_succeeds_with_calculated_cash_given`: End-to-end greater value test.
12. `test_pos_checkout_rejects_tarik_tunai_lower_than_total_belanja_and_rolls_back`: End-to-end undercover test (Rp 100k / Rp 70k) with full rollback verification.
13. `test_pos_checkout_atomicity_rolls_back_tarik_tunai_when_downstream_fails`: End-to-end atomicity test under downstream failure.
14. `test_pos_checkout_does_not_create_duplicate_tarik_tunai_tickets`: Verifies exactly one ticket per checkout.

---

## 11. Test Results

- **Focused Tests:** 14/14 passed (59 assertions).
- **Full Test Suite:** **250 passed, 1572 assertions, 0 failures** (Duration: ~5.48s).
- **Code Style:** Laravel Pint passed cleanly (`0 issues`).

---

## 12. Files Changed

1. `backend-laravel/app/Actions/CashManagement/RecordPosIntegratedTarikTunaiAction.php` — *(Created)*
2. `backend-laravel/app/Actions/POS/ProcessPosCheckoutAction.php` — *(Modified: injected and delegated Tarik Tunai ticket persistence, enforced coverage invariant)*
3. `backend-laravel/tests/Feature/RecordPosIntegratedTarikTunaiActionTest.php` — *(Created: 14 feature tests)*
4. `docs/phase_8j_cash_management_tarik_tunai_extraction.md` — *(Created: this documentation)*

---

## 13. Schema Changes Confirmation

**ABSOLUTELY ZERO SCHEMA CHANGES WERE MADE.**
- No migrations created or executed.
- No table schema, columns, indexes, or constraints altered.
- Existing `tarik_tunai` table columns (`transaksi_id`, `kode_penarikan`, `status`, etc.) utilized as-is.

---

## 14. Deferred Risks

- **Cash Handover Physical Ledger:** The application lacks a formal physical till/cash drawer ledger entry linking physical cash outflow to cashier shift balances during integrated Tarik Tunai. Deferred to future Cash Reconciliation phases.
- **Tarik Tunai Lifecycle Normalization:** Unifying direct, pending, and integrated Tarik Tunai into a polymorphic or normalized workflow is deferred to future domain redesign phases.
- **Physical Modular Monolith Migration:** `app/Modules` remains transitional and inactive pending completion of transitional Action extractions.

---

## 15. Final Phase Status

`PHASE 8J IMPLEMENTATION COMPLETE — PR OPEN — HUMAN REVIEW REQUIRED`
