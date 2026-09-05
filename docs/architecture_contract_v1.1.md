# KOPERASI PK — ARCHITECTURE CONTRACT v1.1

## 1. Purpose
This Architecture Contract establishes the mandatory, evidence-based rules for refactoring the Koperasi PK application. It defines boundaries, dependencies, constraints, and data ownership to safely transition the application from a "Fat Controller Monolith" to a "Modular Monolith".

## 2. Architectural Principles
* **Correctness Over Elegance:** Do not implement patterns that add complexity without solving a proven business problem.
* **Protect Financial Integrity:** Concurrency mechanisms (locks) and transaction boundaries must be strictly preserved.
* **Explicit Boundaries:** Cross-module communication must use explicit orchestration, never direct persistence bypass.
* **Test Protection:** Feature tests provide regression protection, though they do not replace formal business invariants.

## 3. Current State
* **Classification:** Traditional Monolith with God Controllers.
* **Module Status:** The `app/Modules` directory exists but is INACTIVE/UNUSED. It is completely unreferenced by providers, routes, container bindings, and tests.
* **Data Access:** Cross-module writes occur directly via Eloquent within HTTP controllers (e.g., `KasirController` updating `Barang`).
* **Concurrency:** Pessimistic locking (`lockForUpdate()`) is used extensively in controllers to prevent race conditions.
* **Database Integrity:** Relies heavily on application-level logic; lacks strict database-level `CHECK` constraints for financial invariants.

## 4. Migration Rules
* **Controllers:** Must not contain business orchestration, persistence mutation, transaction management, or domain rules.
* **Concurrency:** Existing concurrency protections must not be removed or weakened during extraction without explicit review.
* **Dependencies:** New cross-module mutations must go through the owner module's explicit boundary.
* **Reads vs Writes:** Direct Eloquent reads across modules are permitted during initial extraction; direct writes are forbidden.
* **State vs Target:** Migration steps must not prematurely enforce target rules if it breaks existing behavior without a safe path.

## 5. Target State
* **Classification:** Modular Monolith orchestrated by Application Actions and Queries.
* **Application Actions:** One Action/Query per cohesive business use case, orchestrating cross-module logic and owning the transaction boundary.
* **Module Domains:** Own their specific entities, persistence, and business invariants.

## 6. Module Boundaries
| Module | Responsibilities |
|--------|------------------|
| **Identity** | Auth, Sessions, API Keys, Passwords |
| **Members** | Member Profiles, Roles, Debt Limits, SHU Balances |
| **Inventory** | Catalog, Multi-location Stock, PKM, Restocks |
| **POS** | Checkout, Sales Transactions, Order Streams |
| **Cash Mgmt** | Cashier Cash State, Shift Handover, Cash Withdrawals, Cash Deposits, Reconciliation |
| **Finance** | Expenses, Global SHU Distribution Math |

## 7. Entity Ownership
| Entity | Proposed Owner |
|--------|----------------|
| `Anggota` | Members |
| `User` | Identity |
| `Barang` | Inventory |
| `Transaksi` | POS |
| `TarikTunai` | Cash Mgmt |
| `SetoranKasir` | Cash Mgmt |
| `SerahTerimaKasir` | Cash Mgmt |

## 8. Database Ownership
| Table | Owner | Cross-Module Readers | Authorized Writers |
|-------|-------|----------------------|--------------------|
| `anggota` | Members | POS, Finance, Cash Mgmt | Members (Profile), POS (Debt), Finance (SHU) via explicit boundaries |
| `barang` | Inventory | POS, Admin | Inventory, POS (Deduct via boundary) |
| `transaksi` | POS | Finance, Cash Mgmt | POS only |
| `setoran_kasir` | Cash Mgmt | Finance | Cash Mgmt |

## 9. Dependency Rules
* `Controller` → `Application Action / Query`
* `Application Action` → `Module Services`
* `Module Service` → `Module-owned Models`

## 10. Cross-Module Communication
* **Allowed:** A module may request another module to perform an operation through an explicit owner boundary (e.g., `POS -> Inventory.reserveStock()`).
* **Forbidden:** A module directly mutates another module's persistence-owned data (e.g., `POS -> Barang::where(...)->update(stok)`).

## 11. Application Actions and Queries
* **Application Action:** State-changing business use case (Command).
* **Application Query:** Read-oriented business use case.
* **Rules:** No `Request` objects, no JSON responses, explicit inputs/outputs, transaction boundaries (for Commands), appropriate authorization, cohesive business responsibility.

## 12. Transaction Rules
* Belongs at the Application Action layer.
* Controllers must not manually orchestrate database atomicity.
* Financial mutations must be atomic.
* Scope should be as small as business correctness allows.

## 13. Concurrency Rules
* Existing concurrency protections (`lockForUpdate`, `DB::beginTransaction`) must not be removed or weakened during extraction without explicit review.
* Locking strategy may be corrected later when evidence demonstrates it is incomplete, excessive, or incorrectly scoped.

## 14. Financial Integrity
* **SHU Ownership:** Members module owns member-level SHU balances and mutation authorization (`anggota.shu`). Finance module owns the global calculation and distribution event logic (`shu_distribusi`, `konversi_shu`).
* Financial operations require both operational observability AND a strict business audit trail.

## 15. Authorization
* Shift authorization into Laravel Route Middleware or Policies where appropriate.
* Application Actions must enforce domain-specific authorization rules.

## 16. Testing
* Tests provide executable evidence and regression protection for current behavior.
* Business requirements, invariants, authorization rules, and database constraints remain authoritative independently of test coverage.

## 17. Performance
* Distinguish between proven problems, static code risks, and optimization candidates.
* Measure before optimization.
* Avoid unbounded queries; use database aggregation where appropriate.

## 18. Memory
* Distinguish between observed memory issues and potential unbounded memory usage.
* Paginate large datasets; use chunk/lazy/cursor where appropriate.

## 19. Observability
* **Operational Observability:** Structured logs, request IDs, correlation IDs, error logs, timing metrics.

## 20. Audit Trail
* **Business Audit Trail:** Authoritative ledger records (who, what, previous value, new value, amount, reason, timestamp, reference transaction). Identify missing audit trails for critical financial movements.

## 21. SharedKernel
* Must meet strict criteria: Cross-module necessity, stable semantics, low volatility, no single-module ownership, minimal coupling.
* Reject anything merely "convenient to share."

## 22. Refactoring Rules
* Extract Application Actions based on cohesive business capabilities, avoiding God Services.
* Existing feature tests must pass before and after extraction.

## 23. High-Risk Areas
* **POS Checkout (`KasirController::buatTransaksiKasir`)**
* **SHU Calculations (`AdminController::prosesKonversiShu`)**
* **Production Database Schema**

## 24. First Refactoring Candidate
**CANDIDATE:** `GetCashierDashboardQuery` (extracted from `KasirController::getDashboard`).
* **Reasoning:** A read-oriented business use case (Query) with zero mutation risk. Validates architectural scaffolding without threatening data integrity.

## 25. Definition of Done
* Controller does not own business orchestration, transaction boundaries, or directly mutate foreign module persistence.
* Application layer owns the use case.
* Domain invariants remain protected.
* API contract remains compatible unless explicitly approved.
* Relevant tests pass; no regression introduced.
* Dependencies remain within architectural rules.

## 26. ADR Log
| ADR | Decision | Status | Reason |
|-----|----------|--------|--------|
| ADR-001 | Current Architecture: Monolith | CONFIRMED | Validated against controllers |
| ADR-002 | `app/Modules` Status | REVISED | Inactive/Unused, deletion deferred |
| ADR-003 | Module Boundaries | REVISED | Split POS vs Cash Mgmt based on semantics |
| ADR-004 | Application Actions/Queries | REVISED | Use-case based, not route-based |
| ADR-005 | Concurrency/Locking | REVISED | Preserve locks during extraction |
| ADR-006 | Audit Trail vs Observability | NEW | Distinguish ledgers from text logs |
| ADR-007 | First Refactoring Candidate | CONFIRMED | `GetCashierDashboardQuery` |

## 27. Architecture Readiness Assessment
* **Test Readiness:** HIGH (Feature tests provide solid regression protection).
* **Data Integrity Readiness:** QUALITATIVE (Requires DB-level hardening; relies on app-level locks).
* **Module Boundary Readiness:** HIGH.
* **Dependency Readiness:** HIGH.
* **Transaction Readiness:** HIGH.
* **Security Readiness:** MEDIUM.
* **Operational Readiness:** MEDIUM.

## 28. Known Unknowns / Evidence Gaps
* The exact scoping and necessity of every `lockForUpdate()` requires deeper runtime concurrency analysis.
* Actual production performance characteristics (CPU/Memory) are unmeasured.

---

# FINAL STATUS REQUIREMENT

ARCHITECTURE CONTRACT v1.1:
READY FOR HUMAN APPROVAL

IMPLEMENTATION AUTHORIZATION:
NOT AUTHORIZED
