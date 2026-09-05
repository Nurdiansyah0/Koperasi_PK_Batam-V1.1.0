# KOPERASI PK — REFACTORING MASTER PLAN

## 1. Transitional Architecture
Physical namespace relocation must happen only after behavioral extraction is stable.
```text
CURRENT
App\Http\Controllers
    ↓
TRANSITION
App\Http\Controllers
    ↓
App\Actions\{Module}
    ↓
TARGET
App\Modules\{Module}\Actions
```

## 2. Core Migration Principles
* **API-Compatible Structural Refactoring:** API request/response contracts remain unchanged. Existing clients require no changes. Business behavior remains unchanged unless explicitly approved.
* **Concurrency Preservation:** Existing transaction and concurrency semantics must be preserved during initial structural extraction. No existing lock or transaction protection may be removed, weakened, broadened, narrowed, or reordered during extraction without explicit review and testing.
* **Behavioral Preservation:** Preserve observable behavior during initial extraction (validation, calculations, financial/inventory effects). The objective is behavioral preservation, not literal code duplication.
* **Avoid God Services:** Do not create generic services like `InventoryService`. Define operations as focused, use-case-based Application Actions. Do not introduce CQRS, Event Sourcing, Microservices, or premature Repository Layers.

## 3. Controller Definition of Done
Controllers retain only HTTP concerns:
- request handling
- authorization delegation
- Action/Query invocation
- HTTP response formatting

Controllers must not own:
- business orchestration
- business invariants
- transaction boundaries
- direct foreign-module persistence mutation

## 4. Detailed Migration Matrix

| Component | Current State | Target State | Owner | Dependencies | Risk | Tests | Wave | Rollback |
| --------- | ------------- | ------------ | ----- | ------------ | ---- | ----- | ---- | -------- |
| Dashboard Data | `KasirController::getDashboard` | `GetCashierDashboardQuery` | POS | Members, Inv, Cash | LOW | `KasirDashboardTest` | P3 | Revert to Controller |
| Recent Trx | `KasirController::getTransaksiTerbaru` | `GetRecentTransactionsQuery` | POS | POS, Members | LOW | `KasirDashboardTest` | P3 | Revert to Controller |
| Member Creation | `AnggotaController::store` | `CreateMemberAction` | Members | Identity | LOW | `AnggotaTest` | P4 | Revert to Controller |
| Shift Handover | `KasirController::createSerahTerima` | `SubmitShiftHandoverAction` | Cash Mgmt | Identity | MEDIUM | `SerahTerimaTest` | P6 | Revert to Controller |
| Cash Withdrawal | `KasirController::tarikTunai` | `ProcessCashWithdrawalAction`| Cash Mgmt | Members | MEDIUM | `TarikTunaiTest` | P6 | Revert to Controller |
| SHU Distro | `AdminController::prosesKonversiShu`| `DistributeGlobalShuAction` | Finance | Members, Finance | HIGH | `AdminSopAuditTest`| P7 | DB Backup / Revert |
| POS Checkout | `KasirController::buatTransaksiKasir` | `ProcessCheckoutAction` | POS | Inv, Cash, Members | HIGH | `KasirCompleteTest`| P8 | DB Backup / Revert |

---

## MIGRATION ROADMAP & PHASE GATING

### PHASE 0: Baseline & Safety
* **Objective:** Establish the foundation without changing any code.
* **Prerequisites:** Access to codebase and test suite.
* **Activities:** Establish the complete baseline test result using `php artisan test`. If failures exist, classify each failure as: 1) Pre-existing application failure, 2) Environment/infrastructure failure, 3) Test defect, or 4) Actual regression. Do not silently classify existing failures as refactoring regressions. Do not proceed with high-risk extraction while critical regression protection is unresolved.
* **Files Affected:** None.
* **Tests Required:** `php artisan test`.
* **Risks:** LOW.
* **Rollback Strategy:** N/A.
* **Definition of Ready:** All developers aligned on Architecture Contract v1.1.
* **Definition of Done:** Baseline established and failures classified.
* **Exit Criteria:** Baseline established.
* **Human Approval Required?** YES.

### PHASE 1: Characterization & Regression Protection
* **Objective:** Ensure all workflows have regression nets before extraction.
* **Prerequisites:** Phase 0 complete.
* **Activities:** Write characterization tests for edge cases currently lacking coverage.
* **Files Affected:** `tests/Feature/*`.
* **Tests Required:** New Characterization Tests.
* **Risks:** LOW.
* **Rollback Strategy:** Discard test commits.
* **Definition of Ready:** Uncovered areas identified.
* **Definition of Done:** All critical paths covered by Feature tests.
* **Exit Criteria:** Sufficient safety net established.
* **Human Approval Required?** NO.

### PHASE 2: Dependency + Ownership Verification
* **Objective:** Formalize cross-module ownership maps.
* **Prerequisites:** Phase 1 complete.
* **Activities:** Verify SHU Business Ownership. Verify Financial Invariant Map, Transaction Map, Audit Trail Map.
* **Files Affected:** Documentation/ADRs.
* **Tests Required:** None.
* **Risks:** LOW.
* **Rollback Strategy:** Documentation revision.
* **Definition of Ready:** Ownership maps drafted.
* **Definition of Done:** All maps fully documented and reviewed.
* **Exit Criteria:** Zero ambiguous boundaries remain.
* **Human Approval Required?** YES.

### PHASE 3: First Read Use Case
* **Objective:** Extract `KasirController::getDashboard` to prove the transitional architecture.
* **Prerequisites:** Phase 2 complete.
* **Activities:** Extract aggregation logic into `GetCashierDashboardQuery`. This is a low-risk structural refactoring candidate, not a guarantee of zero risk. Before implementation, verify: authorization behavior, query dependencies, hidden side effects, response shape, aggregation semantics, recent transaction coupling, test coverage. `getTransaksiTerbaru` remains a separate candidate unless actual business cohesion proves otherwise.
* **Files Affected:** `KasirController.php`, `App/Actions/POS/GetCashierDashboardQuery.php`.
* **Tests Required:** Existing `KasirDashboardTest.php`.
* **Risks:** LOW RISK.
* **Rollback Strategy:** Git revert.
* **Definition of Ready:** Query dependencies verified.
* **Definition of Done:** Controller acts only as HTTP dispatcher.
* **Exit Criteria:** Tests pass, API identical.
* **Human Approval Required?** YES.

### PHASE 4: Low-Risk Application Actions
* **Objective:** Extract simple, isolated command workflows.
* **Prerequisites:** Phase 3 complete.
* **Activities:** Extract simple entity CRUD into Actions.
* **Files Affected:** Controller/Action mappings.
* **Tests Required:** Existing Feature tests.
* **Risks:** LOW.
* **Rollback Strategy:** Git revert.
* **Definition of Ready:** Target workflows identified.
* **Definition of Done:** Logic encapsulated in cohesive Actions.
* **Exit Criteria:** Zero regressions.
* **Human Approval Required?** NO.

### PHASE 5: Cross-Module Boundary Preparation
* **Objective:** Define cross-module boundaries from verified business use cases and ownership maps.
* **Prerequisites:** Phase 4 complete.
* **Activities:** Define boundaries. Do not introduce an Action merely because a cross-module model currently exists. Specific Action names are implementation decisions to be made after repository inspection. Do not create generic boundary services or God Actions.
* **Files Affected:** Target module boundaries.
* **Tests Required:** Tests protecting the contract.
* **Risks:** MEDIUM.
* **Rollback Strategy:** Git revert.
* **Definition of Ready:** Boundary actions identified from Phase 2 maps.
* **Definition of Done:** Each boundary has a clearly defined business responsibility, single authoritative owner, explicit input/output, authorization semantics, and transaction semantics where applicable.
* **Exit Criteria:** Boundaries are tested and strictly typed.
* **Human Approval Required?** YES.

### PHASE 6: Cash Management / Inventory / Members
* **Objective:** Extract medium-risk mutations.
* **Prerequisites:** Phase 5 complete.
* **Activities:** Extract `TarikTunai`, `SerahTerima`, `RestockBarang`. Ensure locks and transactions are preserved.
* **Files Affected:** `KasirController`, `AdminController`, Actions.
* **Tests Required:** Relevant feature tests.
* **Risks:** MEDIUM.
* **Rollback Strategy:** Git revert.
* **Definition of Ready:** Phase 5 boundaries available if needed.
* **Definition of Done:** Controllers retain only HTTP concerns.
* **Exit Criteria:** Tests pass, behaviors intact.
* **Human Approval Required?** NO.

### PHASE 7: Finance & SHU (SHU Safety Gate)
* **Objective:** Extract highly complex financial logic.
* **Prerequisites:** Phase 6 complete. Phase 2 SHU Map approved. Before implementation, require explicit verification of `anggota.shu`, `shu_distribusi`, and `konversi_shu` including calculation ownership, distribution ownership, member-level balance ownership, mutation authority, authoritative history, transaction boundaries, concurrency behavior, audit requirements, existing financial invariants, and characterization tests.
* **Activities:** Extract SHU logic. No SHU extraction should begin merely because the method is named `prosesKonversiShu`.
* **Files Affected:** `AdminController`, Finance Actions.
* **Tests Required:** `AdminSopAuditTest`.
* **Risks:** HIGH.
* **Rollback Strategy:** Strict DB snapshot / Git revert.
* **Definition of Ready:** Safety gate verified.
* **Definition of Done:** SHU calculations strictly owned by Finance.
* **Exit Criteria:** Financial invariants maintained perfectly.
* **Human Approval Required?** YES.

### PHASE 8: POS Checkout (Checkout Safety Gate)
* **Objective:** Refactor the highest-risk revenue engine (`buatTransaksiKasir`).
* **Prerequisites:** Before extracting checkout, require verification of: Inventory ownership, Member balance/debt ownership, Cash Management ownership, Transaction ownership, Payment semantics, Stock deduction semantics, Tarik Tunai interaction, Transaction/locking boundaries, Authorization behavior, and API response behavior.
* **Activities:** Extract checkout logic. Replace direct POS mutation of Inventory-owned persistence with an Inventory-owned business operation. The exact operation name and abstraction must be derived from the verified inventory business semantics. Do not assume checkout inventory mutation is a "reservation" unless repository and business evidence confirms this. Preserve observable behavior during initial extraction. Do not intentionally change business calculations or financial semantics during structural extraction.
* **Files Affected:** `KasirController.php`, `App/Actions/POS/ProcessCheckoutAction.php`.
* **Tests Required:** `KasirCompleteTest`, `KasirPesananTest`.
* **Risks:** HIGH.
* **Rollback Strategy:** Strict DB snapshot / Git revert.
* **Definition of Ready:** Safety gate verified.
* **Definition of Done:** POS Controller holds zero business logic or direct foreign mutations.
* **Exit Criteria:** Checkout workflows process with zero regressions.
* **Human Approval Required?** YES.

### PHASE 9: Authorization Hardening
* **Objective:** Move authorization to the application edge.
* **Prerequisites:** Phase 8 complete.
* **Activities:** Manual controller checks → middleware/policies/application authorization.
* **Files Affected:** `routes/api.php`, Controllers, Actions.
* **Tests Required:** Authorization edge-case tests.
* **Risks:** MEDIUM.
* **Rollback Strategy:** Git revert.
* **Definition of Ready:** Phase 0 authorization inventory available.
* **Definition of Done:** Manual checks removed from controllers.
* **Exit Criteria:** Unauthorized access blocked correctly.
* **Human Approval Required?** NO.

### PHASE 10: Concurrency & Financial Integrity
* **Objective:** Review and optimize preserved locks.
* **Prerequisites:** Phase 9 complete.
* **Activities:** Analyze lock scope, transaction boundaries, isolation behavior, deadlock risk, and concurrent mutation paths.
* **Files Affected:** Application Actions.
* **Tests Required:** Load tests / concurrency tests if applicable.
* **Risks:** HIGH.
* **Rollback Strategy:** Revert to safely preserved locks from extraction.
* **Definition of Ready:** Concurrency Map reviewed.
* **Definition of Done:** Any residual concurrency risk is explicitly documented.
* **Exit Criteria:** No known race conditions remain within the tested concurrency scenarios.
* **Human Approval Required?** YES.

### PHASE 11: Performance & Memory
* **Objective:** Evidence-driven optimization.
* **Prerequisites:** Telemetry setup.
* **Activities:** Measure → Profile → Identify Bottleneck → Optimize → Measure Again → Decide. Do not make caching, indexing, pagination, chunking, or schema changes mandatory before evidence establishes the need. Distinguish findings as: Observed, Measured, Static Risk, Optimization Candidate, Unknown.
* **Files Affected:** Queries, Actions.
* **Tests Required:** Performance benchmarking.
* **Risks:** LOW.
* **Rollback Strategy:** Git revert.
* **Definition of Ready:** Bottlenecks identified correctly via telemetry.
* **Definition of Done:** Verified performance improvement.
* **Exit Criteria:** Telemetry confirms resolution.
* **Human Approval Required?** YES.

### PHASE 12: Observability & Business Audit Trail
* **Objective:** Ensure financial ledger completeness.
* **Prerequisites:** Phase 11 complete.
* **Activities:** Evidence-based audit inventory. For every financial and stock movement, determine whether the authoritative record contains: Actor, Operation, Entity/Reference, Before State, After State, Amount/Quantity, Reason, Timestamp, Related Transaction. Classify each movement as: AUDIT COMPLETE, AUDIT PARTIAL, AUDIT MISSING, AUDIT SEMANTICS UNKNOWN. `Log::info()` must never be treated as a substitute for an authoritative business audit trail.
* **Files Affected:** Database migrations (if necessary).
* **Tests Required:** Audit log insertion tests.
* **Risks:** LOW.
* **Rollback Strategy:** Rollback new migrations.
* **Definition of Ready:** Missing audit trails identified.
* **Definition of Done:** Audit matrix completed and categorized.
* **Exit Criteria:** Audit completeness verified.
* **Human Approval Required?** NO.

### PHASE 13: Physical Module Reorganization
* **Objective:** Enforce the physical Target Architecture.
* **Prerequisites:** Phase 12 complete.
* **Activities:**
  * **13A — Action namespace relocation** (Move `App\Actions\{Module}` -> `App\Modules\{Module}\Actions`).
  * **13B — Controller relocation**
  * **13C — Model relocation** (Requires separate ownership verification).
  * **13D — Route dependency update**
  * **13E — Dependency verification** (Ensure namespaces and autoloaders are correct).
* **Files Affected:** All migrated files, `routes/api.php`, `composer.json`.
* **Tests Required:** Full Test Suite.
* **Risks:** MEDIUM (Routing/Autoloading breaks).
* **Rollback Strategy:** Git revert batch move.
* **Definition of Ready:** All behavioral extractions completely stable.
* **Definition of Done:** Files located in Target architecture.
* **Exit Criteria:** Tests pass, API identical.
* **Human Approval Required?** YES.

### PHASE 14: Architecture Governance (14A-14C)
* **Objective:** Final legacy cleanup and database hardening.
* **Prerequisites:** Phase 13 complete.
* **Activities:**
  * **14A — Architecture Cleanup & Legacy Review:** `app/Modules` deletion requires explicit human approval.
  * **14B — Database Integrity Hardening Review:** Database constraint additions require: business semantic verification → compatibility analysis → migration design → test coverage → explicit approval. No automatic `CHECK (saldo >= 0)` or `CHECK (stok >= 0)` should be introduced merely because such constraints appear desirable.
  * **14C — Final Architecture Governance.**
* **Files Affected:** Legacy files, new Schema migrations.
* **Tests Required:** Full Test Suite.
* **Risks:** LOW.
* **Rollback Strategy:** Git revert / Migration rollback.
* **Definition of Ready:** Refactoring functionally complete.
* **Definition of Done:** Legacy code removed, future architecture locked, constraints implemented where approved.
* **Exit Criteria:** Refactoring effectively closed.
* **Human Approval Required?** YES.

---

# SIGN-OFF & STATUS

PLAN STATUS:
READY FOR HUMAN APPROVAL

IMPLEMENTATION AUTHORIZATION:
NOT AUTHORIZED
