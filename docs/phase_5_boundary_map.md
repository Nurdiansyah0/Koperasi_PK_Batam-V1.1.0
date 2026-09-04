# KOPERASI PK — PHASE 5 BOUNDARY MAP

## 1. Module Ownership Matrix (VERIFIED)

| Domain | Authoritative Persistence (Tables) | Core Business Capabilities |
| :--- | :--- | :--- |
| **Identity** | `users`, `jabatan_anggota` | Authentication, Role Assignment, Access Mandates |
| **Members** | `anggota` | Member Profile, E-Wallet Balances (`saldo`), Debt (`hutang`), SHU allocation |
| **Inventory** | `barang`, `barang_history`, `pkm_barang`, `restock_history` | Stock Levels, Pricing, Write-Offs, Re-stocking, PKM Analysis |
| **POS** | `transaksi`, `transaksi_detail`, `pesanan_anggota` | Checkout (Cash/Debt/E-Wallet), Order Processing, Void/Reject |
| **Cash Mgmt** | `tarik_tunai`, `setoran_kasir`, `serah_terima_kasir`, `pembayaran_hutang` | Drawer Balances, Shift Handovers, Admin Deposits, Debt Repayment, Withdrawals |
| **Finance** | `konversi_shu`, `shu_distribusi`, `pengeluaran` | Global SHU Declaration, Ledger Conversions, Operational Expenses |
| **Reporting** | N/A (Read Models / Queries) | Aggregated Read Models (Cashier Dashboard, Admin Stats) |

---

## 2. Cross-Module Write Violations (VERIFIED & RISK)

Current monolithic controllers perform direct cross-module mutations rather than relying on domain-specific Actions.

* **POS → Inventory [VIOLATION]**: `KasirController::buatTransaksiKasir` manually loops through items, checks stock, and decrements `stok_toko` directly.
* **POS → Members [VIOLATION]**: `KasirController::buatTransaksiKasir` mutates `anggota->saldo`, `anggota->hutang`, and `anggota->shu` inline.
* **Cash Mgmt → Members [VIOLATION]**: `KasirController::prosesTarikTunai` manually decrements `anggota->shu` on approval.
* **Finance → Members [VIOLATION]**: `AdminController::prosesKonversiShu` iterates through members and directly alters `saldo` and `hutang`.

---

## 3. Dependency Direction (INFERRED)

To decouple the monolith safely in Phases 6-8, dependencies should flow logically:
* **POS** depends on **Inventory** (to deduct stock).
* **POS** depends on **Members** (to verify and mutate e-wallet/debt limits).
* **Cash Management** depends on **Members** (for SHU balance checks during Tarik Tunai).
* **Cash Management** depends on **POS** (for calculating real-time drawer balances, though primarily a read dependency).
* **Identity** stands alone.
* **Reporting** depends on all modules.

**Circular Dependency Risk:** POS Checkout natively creates Tarik Tunai tickets (Cash Mgmt), while Tarik Tunai approval checks limits (Members). The inline `Tarik Tunai` checkout flow tightly couples POS, Cash Mgmt, and Members.

---

## 4. Transaction Boundaries (VERIFIED)

Current operations utilize broad, single-controller database transactions:
* **POS Checkout:** Spans `Transaksi`, `TransaksiDetail`, `Barang`, `Anggota`, and `TarikTunai`.
* **SHU Conversion:** Spans `KonversiShu` and `Anggota`.
* **Member Registration:** Spans `User`, `Anggota`, and `JabatanAnggota` (Refactored in Phase 4).

*Rule for Phases 6-8:* These broad DB transactions MUST be preserved at the Use Case layer to prevent partial data writes, even when operations cross conceptual boundaries.

---

## 5. Concurrency & Lock Map (RISK)

**POS Iterative Inventory Locking (Major Risk):**
In `buatTransaksiKasir`, the system calls `Barang::lockForUpdate()->find()` sequentially within a loop determined by the client's payload (`$request->items`).
* *Risk:* If two cashiers checkout overlapping items in different orders simultaneously, a database deadlock will occur.
* *Future mitigation (Not Phase 5):* The incoming items array must be sorted by `barang_id` before querying, or a bulk `lockForUpdate` should be applied.

---

## 6. Authorization Contexts (VERIFIED)

* **Identity context:** Verified via Sanctum token.
* **Role context:** Primary `$user->role`.
* **Shift/Mandate context:** `JabatanAnggota` status (Active shift required for POS and Cash Mgmt mutations).
* *Note:* Phase 9 will centralize this; until then, `checkKasir()` and `checkAdmin()` must remain in HTTP controllers.

---

## 7. Audit Responsibility Map (INFERRED & RISK)

**Missing Ledgers (Audit Vulnerability from Phase 2):**
* Changes to `Anggota` (`saldo`, `hutang`, `shu`) lack a dedicated immutable ledger.
* `TarikTunai` and `PembayaranHutang` act as pseudo-ledgers, but direct balance edits (like voiding an order) silently alter balances without an explicit ledger trail.
* *Decision:* Phase 5 carries this finding forward, but no schema changes will be introduced yet.

---

## 8. Candidate Use Cases for Phases 6-8 (VERIFIED)

Based on the boundary mapping, the following Use Cases (Actions) are primed for extraction:

**Phase 6 (Inventory & Core Domain Extractions):**
* `DeductInventoryStockAction`
* `RestoreInventoryStockAction`

**Phase 7 (Member Financial Extractions):**
* `ProcessMemberPaymentAction` (handles E-Wallet/Debt variations)
* `RefundMemberPaymentAction`

**Phase 8 (POS Checkout Core):**
* `ProcessPosCheckoutAction` (Orchestrates POS, invokes Phase 6 Inventory Actions and Phase 7 Member Actions within a unified DB transaction).

---

## 9. Unresolved Decisions (REQUIRES HUMAN DECISION)

Before implementing Phase 8 (POS Checkout), the following must be decided:
1. **Tarik Tunai Inline Orchestration:** Should POS Checkout directly invoke `CreateTarikTunaiAction` (strong coupling), or should it emit an internal domain event `PosCheckoutCompleted` that Cash Mgmt listens to?
2. **Ledger Implementation:** Should we introduce an `AnggotaLedger` table in Phase 7 to fix the audit trail vulnerability before extracting the financial actions, or maintain the vulnerability to strictly preserve current behavior?
