# Testing Guide — Koperasi PK

## Setup Lokal

```bash
cd backend-laravel

# Pastikan database ada dan sudah di-migrate
mkdir -p database && touch database/database.sqlite
php artisan migrate

# Jalankan test
php artisan test
```

## Konfigurasi Database Test

- **Driver**: SQLite file-based (`database/database.sqlite`)
- **Bukan** `:memory:` — karena menggunakan `DatabaseTransactions`
- `DB_URL` harus kosong/tidak di-set — jika ada nilainya, config SQLite rusak

File konfigurasi: `phpunit.xml`
```xml
<env name="DB_CONNECTION" value="sqlite" force="true"/>
<env name="DB_DATABASE" value="database/database.sqlite" force="true"/>
<env name="DB_URL" value="" force="true"/>
```

## Trait yang Digunakan

Semua Feature test menggunakan `DatabaseTransactions`:
```php
use Illuminate\Foundation\Testing\DatabaseTransactions;

class MyTest extends TestCase
{
    use DatabaseTransactions;  // wrap setiap test dalam transaction, rollback setelah selesai
}
```

**JANGAN** pakai `RefreshDatabase` — akan migrate ulang setiap test (lambat + inkonsisten).

## Menulis Test Baru

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ContohTest extends TestCase
{
    use DatabaseTransactions;

    private function loginSebagai(string $role): array
    {
        $user = User::create([
            'username' => $role . '_' . uniqid(),
            'password_hash' => Hash::make('password123'),
            'role' => $role,
        ]);
        $token = $user->createToken('test')->plainTextToken;
        return [$user, $token];
    }

    #[Test]
    public function kasir_bisa_lihat_dashboard(): void
    {
        [$user, $token] = $this->loginSebagai('kasir');

        $response = $this->withToken($token)->getJson('/api/kasir/dashboard');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => ['total_transaksi']]);
    }
}
```

## Commands Berguna

```bash
php artisan test                              # semua test
php artisan test --filter=TarikTunai         # satu class
php artisan test --filter="kasir_bisa"       # satu method
php artisan test --stop-on-failure           # berhenti di error pertama
php artisan test --verbose                   # tampilkan semua nama test
php artisan test tests/Feature/KasirTest.php # satu file
```

## PHPUnit 11 Attributes

Gunakan attributes, bukan docblock (deprecated di PHPUnit 12):

```php
// ✅ Benar (PHPUnit 11+)
#[Test]
public function kasir_bisa_transaksi(): void {}

// ❌ Deprecated
/** @test */
public function kasir_bisa_transaksi(): void {}
```
