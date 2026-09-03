# GitHub Copilot Code Review Instructions
# Koperasi PK Batam — Laravel 12 Backend

## Project Context
This is a cooperative (koperasi) management system built with **Laravel 12 + PHP 8.2**.
It handles: kasir transactions, anggota (member) management, SHU distribution,
tarik tunai (withdrawal), inventory (barang/opname), serah terima kasir, and webpush notifications.

## Code Review Focus Areas

### Security (HIGH PRIORITY)
- Flag any endpoint missing `auth:sanctum` middleware that should be protected.
- Check for IDOR vulnerabilities — ensure users can only access their own data.
- Verify mass assignment protection (`$fillable`/`$guarded`) on all models.
- Flag hardcoded credentials, tokens, or secrets.
- Check SQL injection risks in raw queries.

### Laravel Best Practices
- Controllers must be thin — business logic belongs in `app/Services/`.
- Use `FormRequest` classes for validation, not `$request->validate()` in controllers.
- Use Eloquent relationships and eager loading — flag N+1 query risks.
- Use `DB::transaction()` for multi-step database operations.
- Prefer `match` expressions over nested ternary operators.

### PHP 8.2 Standards
- All public/protected methods must have explicit return type declarations.
- Use typed properties in models and services.
- Use constructor property promotion where appropriate.
- Follow PSR-12 coding standards.

### Testing Standards
- Use PHPUnit 11 **attributes** (`#[Test]`) not docblock annotations (`@test`).
- Tests using `DatabaseTransactions` must not rely on `:memory:` SQLite — the test DB is file-based.
- Every API endpoint should have at minimum: auth test, success test, and failure/edge case test.
- Flag tests with vague assertions like `assertTrue(true)` or only `assertStatus(200)`.

### Domain Rules (Business Logic)
- **Tarik Tunai**: Requires persetujuan SHU, minimum purchase Rp25.000, no active hutang.
- **Serah Terima Kasir**: Must be approved by receiver kasir before shift transfer completes.
- **SHU**: Distribution and konversi must be traceable per anggota.
- **Stock/Opname**: Stock cannot go negative — flag any logic that skips stock validation.

## File Structure
```
backend-laravel/
  app/
    Http/Controllers/   ← API controllers (thin)
    Models/             ← Eloquent models
    Services/           ← Business logic
    Modules/            ← Feature modules
  tests/Feature/        ← Feature tests (use DatabaseTransactions)
  tests/Unit/           ← Unit tests
```

## What to Ignore
- `vendor/`, `storage/`, `bootstrap/cache/`, `public_html/assets/`, `*.lock`, `*.sql`
