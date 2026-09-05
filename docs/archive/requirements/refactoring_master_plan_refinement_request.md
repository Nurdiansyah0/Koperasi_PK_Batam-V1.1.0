# KOPERASI PK — FINAL REFINEMENT REQUEST FOR REFACTORING MASTER PLAN

The revised `refactoring_master_plan.md` is substantially aligned with `architecture_contract_v1.1`.

However, before this plan can be marked:

```text
PLAN STATUS:
READY FOR HUMAN APPROVAL
```

apply the following final corrections.

No implementation is authorized.

## 1. PHASE 5 — DO NOT PREDEFINE BOUNDARY IMPLEMENTATIONS

The current wording:

```text
ReserveStockAction
UpdateMemberBalanceAction
```

must not be treated as mandatory class designs.

Change the principle to:

```text
Define cross-module boundaries from verified business use cases
and ownership maps.

Do not introduce an Action merely because a cross-module model
currently exists.

Each boundary must have:
- a clearly defined business responsibility
- a single authoritative owner
- explicit input/output
- authorization semantics
- transaction semantics where applicable
- tests protecting the contract
```

Specific Action names are implementation decisions to be made after repository inspection.

Do not create generic boundary services or God Actions.

---

## 2. PHASE 8 — REMOVE PRESCRIPTIVE "ReserveStockAction"

The current statement:

```text
Replace direct Barang::update() with ReserveStockAction.
```

is too implementation-specific.

Replace it with:

```text
Replace direct POS mutation of Inventory-owned persistence
with an Inventory-owned business operation.

The exact operation name and abstraction must be derived from
the verified inventory business semantics.

Do not assume that checkout inventory mutation is a "reservation"
unless repository and business evidence confirms this.
```

Preserve existing observable behavior during the first extraction.

---

## 3. PHASE 6 — CONTROLLER DEFINITION OF DONE

Replace:

```text
controllers empty of logic
```

with:

```text
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
```

This must match Architecture Contract v1.1.

---

## 4. PHASE 10 — CONCURRENCY ACCEPTANCE CRITERION

Replace:

```text
Zero race conditions identified in analysis.
```

with:

```text
No known race conditions remain within the tested concurrency
scenarios.

Lock scope, transaction boundaries, isolation behavior, deadlock
risk, and concurrent mutation paths have been analyzed.

Any residual concurrency risk is explicitly documented.
```

Do not claim absolute absence of race conditions.

---

## 5. PHASE 12 — AUDIT TRAIL MUST BE VERIFIED

Do not assume:

```text
Transaksi = authoritative audit trail
```

Instead require an evidence-based audit inventory.

For every financial and stock movement, determine whether the authoritative record contains, where applicable:

```text
Actor
Operation
Entity / Reference
Before State
After State
Amount / Quantity
Reason
Timestamp
Related Transaction
```

Classify each movement as:

```text
AUDIT COMPLETE
AUDIT PARTIAL
AUDIT MISSING
AUDIT SEMANTICS UNKNOWN
```

`Log::info()` must never be treated as a substitute for an authoritative business audit trail.

---

## 6. PHASE 14 — SEPARATE LEGACY CLEANUP FROM DATABASE HARDENING

Do not combine these into one implicit cleanup operation.

Split Phase 14 conceptually into:

```text
14A — Architecture Cleanup & Legacy Review
14B — Database Integrity Hardening Review
14C — Final Architecture Governance
```

`app/Modules` deletion requires explicit human approval.

Database constraint additions require:

```text
business semantic verification
→ compatibility analysis
→ migration design
→ test coverage
→ explicit approval
```

No automatic `CHECK (saldo >= 0)` or `CHECK (stok >= 0)` should be introduced merely because such constraints appear desirable.

---

## 7. PHASE 0 — BASELINE FAILURE CLASSIFICATION

Keep the requirement to execute:

```text
php artisan test
```

but change the baseline rule to:

```text
Establish the complete baseline test result.

If failures exist, classify each failure as:

1. Pre-existing application failure
2. Environment/infrastructure failure
3. Test defect
4. Actual regression

Do not silently classify existing failures as refactoring regressions.
Do not proceed with high-risk extraction while critical regression
protection is unresolved.
```

---

## 8. PHASE 3 — DASHBOARD CANDIDATE

Keep:

```text
GetCashierDashboardQuery
```

as the first candidate.

However, explicitly state:

```text
This is a low-risk structural refactoring candidate,
not a guarantee of zero risk.

Before implementation, verify:
- authorization behavior
- query dependencies
- hidden side effects
- response shape
- aggregation semantics
- recent transaction coupling
- test coverage
```

`getTransaksiTerbaru` remains a separate candidate unless actual business cohesion proves otherwise.

---

## 9. PHASE 7 — SHU SAFETY GATE

Keep Phase 7 as HIGH risk.

Before implementation, require explicit verification of:

```text
anggota.shu
shu_distribusi
konversi_shu
```

including:

- calculation ownership
- distribution ownership
- member-level balance ownership
- mutation authority
- authoritative history
- transaction boundaries
- concurrency behavior
- audit requirements
- existing financial invariants
- characterization tests

No SHU extraction should begin merely because the method is named `prosesKonversiShu`.

---

## 10. PHASE 8 — CHECKOUT SAFETY GATE

Before extracting checkout, require verification of:

```text
Inventory ownership
Member balance/debt ownership
Cash Management ownership
Transaction ownership
Payment semantics
Stock deduction semantics
Tarik Tunai interaction
Transaction/locking boundaries
Authorization behavior
API response behavior
```

The first extraction must preserve observable behavior.

Do not intentionally change business calculations or financial semantics during structural extraction.

---

## 11. PHASE 11 — PERFORMANCE AND MEMORY

The existing evidence classification is correct.

Retain:

```text
Measure
→ Profile
→ Identify Bottleneck
→ Optimize
→ Measure Again
→ Decide
```

Do not make caching, indexing, pagination, chunking, or schema changes mandatory before evidence establishes the need.

Distinguish:

```text
Observed
Measured
Static Risk
Optimization Candidate
Unknown
```

---

## 12. FINAL ARCHITECTURAL CONSISTENCY CHECK

Before marking the document READY FOR HUMAN APPROVAL, verify that:

### Current State

Still describes:

```text
Traditional Monolith
God Controllers
Weak Module Boundaries
Direct Cross-Module Persistence Access
Inactive app/Modules
```

### Transitional State

Still describes:

```text
Controllers
    ↓
App\Actions\{Module}
    ↓
Module-owned operations
```

with API and behavioral compatibility preserved.

### Target State

Still describes:

```text
Modular Monolith
Application Actions / Queries
Explicit Module Ownership
Controlled Cross-Module Communication
Clear Transaction Boundaries
```

### Forbidden shortcuts

The plan must not introduce:

```text
God Service
Generic InventoryService
Premature Repository Layer
CQRS
Event Sourcing
Microservices
Unapproved Schema Redesign
API Contract Changes
```

---

# FINAL APPROVAL CONDITION

After applying all corrections, perform one final consistency check against:

```text
architecture_contract_v1.1.md
```

The master plan may only state:

```text
PLAN STATUS:
READY FOR HUMAN APPROVAL
```

if there are no remaining conflicts with the contract.

Otherwise state:

```text
PLAN STATUS:
NEEDS REVISION
```

Regardless of plan status:

```text
IMPLEMENTATION AUTHORIZATION:
NOT AUTHORIZED
```

This task remains READ-ONLY.

Do not:

- modify application code
- create Actions
- create Queries
- modify controllers
- modify routes
- modify models
- modify migrations
- modify database schema
- delete `app/Modules`
- move files
- rename files
- deploy
- modify production
- modify production data

Update only:

```text
refactoring_master_plan.md
```

Then stop and wait for human review.