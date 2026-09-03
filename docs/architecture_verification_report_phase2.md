# KOPERASI PK — PHASE 2 ARCHITECTURE VERIFICATION REPORT

## 1. Verified Ownership Matrix
Based on repository evidence, the current logical boundaries are highly entangled, requiring explicit definition for the target architecture.

| Domain Concept | Current Mutating Actor(s) | Verified Authoritative Target Owner |
| -------------- | ------------------------- | ----------------------------------- |
| `Barang` (Stok Toko/Gudang) | POS (`buatTransaksiKasir`), Admin (`mutasiStok`) | **Inventory** |
| `Anggota` (Saldo / E-Wallet) | POS (`buatTransaksiKasir`), Admin, Cash Mgmt | **Members (Wallet)** |
| `Anggota` (Hutang) | POS (`buatTransaksiKasir`), Members (`pembayaran`) | **Members (Credit)** |
| `Anggota` (SHU Balance) | POS (`tarik_tunai`), Finance (`konversiShu`) | **Finance** |
| `TarikTunai` (Withdrawal) | POS (Inline during checkout), Cash Mgmt | **Cash Management** |
| `SetoranKasir` | Cash Mgmt (Kasir), Admin (Approval) | **Cash Management** |
| `KonversiShu` | Finance (Admin) | **Finance** |

---

## 2. Cross-Module Dependency Findings
The repository analysis reveals severe procedural coupling where modules directly mutate foreign persistence layers rather than delegating business rules.

* **POS ↔ Inventory:** 
  **Finding:** POS (`buatTransaksiKasir`) iterates over `$request->items`, directly locks the `Barang` model, evaluates the `stok_toko < jumlah` rule, and mutates `stok_toko`. 
  **Required Change:** Inventory must expose a `ReserveStockAction` that POS calls.
* **POS ↔ Cash Management & Finance (Tarik Tunai Inline):**
  **Finding:** POS checkout contains heavy, inline implementation of Cash Management rules (`sertakan_tarik_tunai`). POS directly checks the member's debt, calculates the 2x proportional limit for cash withdrawals, checks the master consent timestamp, and directly mutates `anggota->shu`.
  **Required Change:** Cash Management must own the withdrawal rules and expose an API/Action for POS to invoke.
* **Members ↔ Finance / SHU:**
  **Finding:** `AdminController::prosesKonversiShu` manages SHU, but it directly locks `Anggota` and directly mutates `anggota->shu` and `anggota->saldo`.
  **Required Change:** Finance calculates the global/individual distribution, but must command the Members module to execute the balance updates.

---

## 3. Financial Invariant Map

| Invariant | Current Enforcement | DB Constraint | Risk |
| --------- | ------------------- | ------------- | ---- |
| **Inventory >= 0** | App Logic (`Barang::stok_toko < jumlah`) | None | High (Race conditions could bypass app logic) |
| **Saldo >= 0** | App Logic (`Anggota::saldo < totalHarga`) | None | High |
| **SHU >= 0** | App Logic (`Anggota::shu < nominal`) | None | High |
| **Hutang <= Plafon** | App Logic (`Anggota::hutang + total > limit`) | None | High |

---

## 4. Transaction & Concurrency Map

* **Transaction Boundaries:** Both `KasirController` and `AdminController` rely on massive, encompassing `DB::beginTransaction()` blocks spanning the entire request lifecycle.
* **Locking Behavior:** Heavy reliance on pessimistic locking (`lockForUpdate()`) on `Anggota`, `Barang`, and `PembayaranHutang`.
* **Identified Concurrency Risk (Deadlock Potential):** Inside `KasirController::buatTransaksiKasir`, the system iterates over `$request->items` array and locks `Barang` one by one in the order provided by the client. **If two concurrent checkouts contain the same two items but in a different array order, a MySQL deadlock will inevitably occur.**
  * *Required Mitigation:* The extraction phase must sort items by ID prior to locking to ensure consistent lock acquisition ordering.

---

## 5. Business Audit-Trail Map
Evidence-based inventory of financial and stock movements:

| Movement Type | Authoritative Record | Classification | Missing Data |
| ------------- | -------------------- | -------------- | ------------ |
| **Stock Deductions** | `TransaksiDetail` | AUDIT PARTIAL | Does not record Before/After state of inventory, only delta. |
| **Stock Refills** | `RiwayatRestock` | AUDIT PARTIAL | Captures delta, lacks Before/After state snapshot. |
| **POS Sales** | `Transaksi` | AUDIT COMPLETE | Fully tracked with items, amounts, methods. |
| **Cash Withdrawals**| `TarikTunai` | AUDIT COMPLETE | Tracks amount, method, timestamp. |
| **E-Wallet Payments**| None (Implicit) | **AUDIT MISSING** | No `member_wallet_ledger` exists. `Anggota->saldo` is mutated invisibly without a dedicated movement record. |
| **Debt Accumulation**| None (Implicit) | **AUDIT MISSING** | `Anggota->hutang` is mutated via `buatTransaksiKasir` with no explicit credit ledger log. |

---

## 6. Ambiguities & Conflicts
* **Ambiguity 1 (SHU Ownership):** Does the Members module own the `shu` balance column, or does Finance? *Recommendation:* Members owns the storage/wallet, Finance owns the calculation and commands the mutation.
* **Ambiguity 2 (Tarik Tunai Inline):** Should Tarik Tunai be allowed inline during POS checkout? It heavily entangles the systems. *Recommendation:* Defer structural separation of this specific flow until Phase 8 to prevent breaking existing cashier SOPs.
* **Ambiguity 3 (Audit Ledger):** Because e-wallet mutations are invisible (no ledger table), tracing historical balance discrepancies is impossible. *Decision Required:* Do we introduce a `wallet_ledger` migration in Phase 14B?

## 7. Execution Information
* **Branch:** `phase2/dependency-ownership-verification`
* **Test Suite:** Passed (156 tests, 1222 assertions). No regressions introduced.
* **Code Modified:** None.
* **Documentation Added:** `docs/architecture_verification_report_phase2.md`

**STATUS: PHASE 2 VERIFICATION COMPLETE**
