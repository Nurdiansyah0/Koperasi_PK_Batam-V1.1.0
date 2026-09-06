# Koperasi PK Batam — Phase 10B: SHU Withdrawal Eligibility Implementation Report

## Executive Summary

Phase 10B implements the approved **SHU Cash Withdrawal Eligibility Policy** across the Koperasi PK Batam modular monolith system.

The implementation unifies the financial eligibility rules into a dedicated Members-boundary action:
`App\Actions\Members\CalculateShuWithdrawalEligibilityAction`

---

## 1. Approved Business Rules Enforced

### 1.1 Eligible SHU Calculation
- `eligible_shu = max(0, anggota.shu - anggota.hutang)`
- 100% of outstanding debt (`anggota.hutang`) is netted against SHU before calculating withdrawal limits.
- No requirement that `hutang == 0` for withdrawal eligibility.
- Simpanan Pokok is NOT subtracted and remains preserved as capital equity.

### 1.2 Withdrawal Limit Formula
- `raw_limit = 50% * eligible_shu`
- `pre_round_limit = min(100.000, raw_limit)`
- Physical cash withdrawal is floored down to the nearest Rp 1.000:
  `final_withdrawal_limit = min(100.000, floor(raw_limit / 1000.0) * 1000.0)`
- Multiples of Rp 1.000 only.

### 1.3 Qualifying Purchase Requirement
- Qualifying purchase threshold is strictly `total_belanja > 25.000`.
- An amount of exactly Rp 25.000 is rejected; Rp 25.001 is eligible.
- Legacy 2x spending multipliers have been completely removed.

### 1.4 POS Integrated Invariant
- For integrated checkout with cash withdrawal:
  `nominal_tarik >= total_harga`
- Full purchase coverage invariant is strictly maintained: net cash handed over is `nominal_tarik - total_harga`.

---

## 2. Architecture & Modular Boundary Alignment

### 2.1 Action Extraction
- **Action Class:** `App\Actions\Members\CalculateShuWithdrawalEligibilityAction`
- **Location:** `backend-laravel/app/Actions/Members/CalculateShuWithdrawalEligibilityAction.php`
- **Responsibility:** Authoritative, pure business rule computation for SHU eligibility, debt netting, rounding to Rp 1.000 multiples, and Rp 100.000 ceiling enforcement.

### 2.2 Integration Touchpoints
1. **POS Integrated Checkout Action (`ProcessPosCheckoutAction.php`):**
   - Constructor injection of `CalculateShuWithdrawalEligibilityAction`.
   - Replaced legacy debt barrier and 2x limit with authoritative calculation.
   - Preserves canonical lock order (`Barang (ascending) -> Anggota`).
2. **Cash Management Standalone Action (`TarikTunaiAction.php`):**
   - Constructor injection of `CalculateShuWithdrawalEligibilityAction`.
   - Replaced unconditional debt lockout with authoritative debt netting.
   - Enforced strict `total_harga > 25000` rule.
3. **Member Mobile Controller (`AnggotaController.php`):**
   - `cekKelayakanTarikTunai`: Exposes `eligible_shu`, `raw_withdrawal_limit`, `final_withdrawal_limit`, etc.
   - `ajukanTarikTunai`: Enforces authoritative eligibility check.
   - `transaksi`: Enforces strict `total > 25000` and authoritative 50% net SHU ceiling.
4. **Cashier Controller (`KasirController.php`):**
   - `cekKelayakanTarikTunai`: Authoritative query and metrics breakdown.

### 2.3 Excluded Flows Preserved (Untouched)
- `ProsesTarikTunaiAction.php` (Cashier ticket approval execution) — UNTOUCHED
- `ProsesKonversiShuAction.php` (SHU conversion) — UNTOUCHED
- `RecordPosShuDistributionAction.php` (SHU distribution persistence) — UNTOUCHED
- Database Schema / Migrations — NO MIGRATIONS CREATED

---

## 3. Frontend Alignment

1. **`frontend/src/pages/kasir/Transaksi.tsx`:**
   - Memoized `tarikTunaiEligibility` calculation (debt netting + 50% SHU floored to 1.000).
   - Removed unconditional debt lockout.
   - Warning banner: updated to strict `> Rp 25.000`.
   - Netting info card displaying `SHU Bersih` when debt exists.
2. **`frontend/src/pages/anggota/Belanja.tsx`:**
   - Memoized `tarikTunaiEligibility`.
   - Updated validation warnings and checkout button disabled state.
3. **`frontend/src/pages/anggota/TarikTunai.tsx`:**
   - Plafon quota updated: `50% (SHU - Hutang), Maks. Rp 100.000`.
   - Purchase requirement updated: `> Rp 25.000`.
4. **`frontend/src/pages/kasir/TarikTunai.tsx`:**
   - Updated header banner and max quota calculation.

---

## 4. Test Suite Verification

- **Baseline:** 250 tests / 1,572 assertions / 0 failures
- **Post-Implementation:** 267 tests / 1,649 assertions / 0 failures
- **New Test Files:**
  - `backend-laravel/tests/Unit/CalculateShuWithdrawalEligibilityActionTest.php` (10 unit tests)
  - `backend-laravel/tests/Feature/ShuWithdrawalEligibilityPolicyTest.php` (6 feature tests)
- **Formatting:** Laravel Pint verified with 0 issues.
- **Frontend Build:** `npm run build` verified with 0 TypeScript errors.
