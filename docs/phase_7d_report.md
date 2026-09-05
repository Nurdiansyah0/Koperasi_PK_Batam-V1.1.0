# Phase 7D Report: Operational Expenses (OPEX) Refactoring

## 1. Domain Ownership
- Authoritative Owner: **Finance**
- Entity/Table: `pengeluaran_operasional`
- Scope: Operational expense recording, query/filtering, deletion, and reporting aggregation.

## 2. Extracted Write Use Cases
Under `App\Actions\Finance\`:
1. **`RecordPengeluaranOperasionalAction`**:
   - Encapsulates recording of new operational expense entries.
   - Preserves defaults (`kategori = 'Operasional'`, `tanggal = current date`).
   - Associates record with administrator identity (`created_by`).
2. **`DeletePengeluaranOperasionalAction`**:
   - Encapsulates permanent hard deletion of expense entries by ID.
   - Returns boolean status (`true` if deleted, `false` if record not found).

## 3. Read Query Architecture
- `AdminController::getPengeluaran` remains directly in `AdminController`.
- Eager loads `user:user_id,username`, applies date and search filters, and aggregates `total_pengeluaran`.
- No forced indirection or unnecessary read action introduced.

## 4. Behavioral Characterization & Safety Net
- Initial automated test coverage before Phase 7D was 0%.
- Phase 7D-B established `tests/Feature/OperationalExpenseCharacterizationTest.php` with 15 test cases (53 assertions) covering:
  - Valid creation with full fields and minimal fields (defaults).
  - Validation failures (missing name, missing nominal, zero nominal, negative nominal, non-numeric, malformed date).
  - Role-based authorization (403 for non-admin, 401 for unauthenticated).
  - Date filtering and multi-attribute search.
  - Deletion of existing and non-existent IDs (404 with exact `"error"` key).
  - Downstream Net SHU reporting effect in `AdminController::getLaporanTransaksi`.
- All 15 characterization tests and 156 regression tests (total 171 tests / 1275 assertions) pass with zero regressions.

## 5. Behavioral Invariant Preservation
- Zero financial calculation changes.
- Downstream Net SHU derivation (`max(0, laba_kotor - beban_operasional)`) and tripartite allocation remain identical.
- Zero database schema or migration changes.

## 6. Documented Deferred Risks
The following legacy behaviors were strictly preserved without redesign:
1. **Permanent Hard Delete:** Deleting an expense purges the row without soft deletes or tombstone records.
2. **Missing Idempotency / Duplicate Prevention:** Rapid identical submissions can produce duplicate expense rows.
3. **No Explicit Transaction:** Single-row operations execute without explicit `DB::transaction()`.
4. **No Row Locking:** Deletion executes without `lockForUpdate()`.
5. **No Deletion Audit Trail:** Deletion actions are not recorded in an audit log.
