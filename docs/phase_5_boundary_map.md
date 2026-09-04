# KOPERASI PK — PHASE 5 BOUNDARY MAP (REVISED)

## 1. Module Ownership Matrix (VERIFIED)

| Domain | Authoritative Persistence (Tables) | Core Business Capabilities |
| :--- | :--- | :--- |
| **Identity** | `users`, `jabatan_anggota` | Authentication, Role Assignment, Access Mandates |
| **Members** | `anggota` | Member Profile, E-Wallet Balances (`saldo`), Debt (`hutang`), member-level SHU |
| **Inventory** | `barang`, `riwayat_restock` | Stock Levels, Pricing, Write-Offs, Re-stocking, PKM Analysis |
| **POS** | `transaksi`, `transaksi_detail` (Pending orders are just `transaksi` rows) | Checkout (Cash/Debt/E-Wallet), Order Processing, Void/Reject |
| **Cash Mgmt** | `tarik_tunai`, `setoran_kasir`, `serah_terima_kasir`, `pembayaran_hutang` | Physical Cash Operations, Shift Handovers, Admin Deposits, Withdrawals, Reconciliation |
| **Finance** | `konversi_shu`, `shu_distribusi`, `pengeluaran_operasional` | Global SHU Declaration & Calculation, Ledger Conversions, Operational Expenses |
| **Reporting** | N/A (Read Models / Queries) | Aggregated Read Models (Cashier Dashboard, Admin Stats) |

---

## 2. Cross-Module Write Violations (VERIFIED & RISK)

Current monolithic controllers perform direct cross-module mutations. In future extraction phases, these cross-module writes must be replaced by **explicit synchronous Action invocations** to the owning module.

* **POS → Inventory [VIOLATION]**: `KasirController::buatTransaksiKasir` manually loops through items, checks stock, and decrements `stok_toko` directly.
* **POS → Members [VIOLATION]**: `KasirController::buatTransaksiKasir` mutates `anggota->saldo`, `anggota->hutang`, and `anggota->shu` inline.
* **POS → Finance [VIOLATION]**: `KasirController::buatTransaksiKasir` directly inserts into `shu_distribusi` to calculate and record the checkout profit distribution.
* **Cash Mgmt → Members [VIOLATION]**: `KasirController::prosesTarikTunai` manually decrements `anggota->shu` on approval.
* **Finance → Members [VIOLATION]**: `AdminController::prosesKonversiShu` iterates through members and directly alters `saldo` and `hutang`.

---

## 3. Dependency Direction & Cross-Module Reads (INFERRED)

To decouple the monolith safely, dependencies should flow logically via synchronous calls. Cross-module reads may remain where justified.
* **POS** depends on **Inventory** (to deduct stock).
* **POS** depends on **Members** (to verify and mutate e-wallet/debt limits).
* **Cash Management** depends on **Members** (for SHU balance checks during Tarik Tunai).
* **Cash Management** depends on **POS** (for calculating real-time drawer balances).

---

## 4. Transaction Boundaries (VERIFIED)

Current operations utilize broad, single-controller database transactions (e.g., POS Checkout spans `Transaksi`, `Barang`, `Anggota`, `TarikTunai`, and `shu_distribusi`).
*Rule for extractions:* These broad DB transactions MUST be preserved at the Use Case layer to guarantee deterministic consistency, even when synchronous calls span modules.

---

## 5. Concurrency & Lock Map (RISK)

**POS Iterative Inventory Locking (Major Risk):**
In `buatTransaksiKasir`, the system calls `Barang::lockForUpdate()->find()` sequentially within a loop determined by the client's payload.
* *Risk:* Database deadlocks if concurrent transactions process overlapping items in different orders.
* *Constraint:* Locking behavior will NOT be changed in Phase 5.

---

## 6. Authorization Contexts (VERIFIED)

* **Identity context:** Verified via Sanctum token.
* **Shift/Mandate context:** `JabatanAnggota` status (Active shift required for POS and Cash Mgmt).
* *Note:* Phase 9 will centralize this; until then, `checkKasir()` and `checkAdmin()` remain in HTTP controllers.

---

## 7. Audit Responsibility Map & Ledger Decision (RESOLVED)

**Missing Ledgers (Audit Vulnerability from Phase 2):**
Changes to `Anggota` (`saldo`, `hutang`, `shu`) lack a dedicated immutable ledger. Direct balance edits silently alter state.

**Architectural Decision (HUMAN APPROVED):**
* **Do NOT introduce an `AnggotaLedger` in Phase 7.**
* The current observable behavior must be strictly preserved without adding schema changes or silently modifying financial semantics.
* The missing ledger remains a documented audit vulnerability. Any future `AnggotaLedger` requires the explicit Phase 14B schema process.

---

## 8. Architectural Decisions for Extractions (RESOLVED)

**Tarik Tunai Orchestration (HUMAN APPROVED):**
* The application remains a modular monolith.
* POS and Cash Management interactions MUST use **explicit synchronous Action invocation** where transactional consistency requires it.
* **Do NOT** introduce event-driven choreography. Financial state mutations require deterministic consistency without the complexity of asynchronous events.

---

## 9. Candidate Use Cases for Extractions (VERIFIED ALIGNMENT)

### Phase 6 (Low/Medium-Risk Extractions)
Phase 6 will target established operations outside the volatile POS core:
* **Inventory:** `RestockBarang`
* **Cash Management:** `TarikTunai`, `SerahTerima`
* **Members:** (Where applicable for profile management outside financial ledgers)

### Phase 7 (Finance & SHU)
Phase 7 targets global calculation vs member state. Candidate use cases requiring strict semantic verification before implementation:
* Differentiating **Members-owned** member balances (`saldo`, `hutang`) from **Finance-owned** global SHU calculation and distribution.
* Differentiating **Cash Management-owned** physical cash payouts from **POS-owned** sales/payment orchestrations.

### Phase 8 (High-Risk POS Orchestration)
* Synchronous orchestration of POS checkout invoking the domain Actions defined in Phase 6 and 7 within a unified database transaction.
