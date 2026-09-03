---
name: koperasi-pk
description: >-
  Panduan lengkap proyek Koperasi PK Batam — sistem manajemen koperasi berbasis
  Laravel 12 API + React frontend. Aktifkan skill ini saat bekerja pada
  backend-laravel (models, controllers, modules, migrations, tests), atau saat
  butuh konteks domain bisnis koperasi (kasir, anggota, SHU, tarik tunai,
  inventori, serah terima). Berisi arsitektur, aturan bisnis, dan panduan
  pengembangan.
---

# Koperasi PK Batam — Developer Skill

Proyek manajemen koperasi simpan pinjam + toko. Stack: **Laravel 12 REST API** (backend) + **React/TypeScript** (frontend).

## Struktur Proyek

```
Koperasi_PK_V.02.x.x/
├── backend-laravel/          ← Laravel 12 REST API (PHP 8.2)
│   ├── app/
│   │   ├── Modules/          ← Fitur utama (modular)
│   │   │   ├── Auth/         ← Login, token, reset password
│   │   │   ├── Finance/      ← SHU, tarik tunai, konversi, hutang
│   │   │   ├── Inventory/    ← Barang, stok toko/gudang, opname, restock
│   │   │   ├── Members/      ← Anggota, jabatan, mandat
│   │   │   └── Pos/          ← Kasir, transaksi, pesanan, serah terima
│   │   ├── Http/Controllers/ ← Controller utama (thin, delegasi ke Modules)
│   │   ├── Models/           ← Eloquent models
│   │   └── Services/         ← GeminiService (AI analysis)
│   ├── routes/api.php        ← Semua endpoint REST (auth:sanctum)
│   ├── tests/Feature/        ← 144 feature tests (DatabaseTransactions)
│   └── database/migrations/  ← SQLite untuk dev/test, MySQL untuk production
├── frontend/                 ← React + TypeScript + Vite
├── public_html/              ← Build output frontend
└── .agents/skills/           ← Skill ini
```

## Models & Relasi Utama

| Model | Relasi Penting |
|---|---|
| `User` | hasOne Anggota, hasManyTokens |
| `Anggota` | belongsTo User, hasManyTransaksi |
| `Barang` | hasManyTransaksiDetail, hasManyRiwayatRestock |
| `Transaksi` | belongsTo User(kasir), hasManyDetail |
| `TarikTunai` | belongsTo Anggota |
| `ShuDistribusi` | belongsTo Anggota |
| `KonversiShu` | belongsTo Anggota |
| `SerahTerimaKasir` | belongsTo User(penyerah), belongsTo User(penerima) |

## Role Pengguna

```
admin   → akses penuh: laporan, SHU, manajemen anggota, opname, PKM
kasir   → POS transaksi, serah terima, setoran, lihat stok
anggota → lihat saldo, hutang, SHU, ajukan tarik tunai, pesanan online
```

## Aturan Bisnis Kritis

Detail lengkap: [references/business-rules.md](./references/business-rules.md)

**Tarik Tunai:** Butuh persetujuan SHU + min. pembelian Rp25.000 + tidak ada hutang aktif
**SHU:** Distribusi per anggota, bisa konversi ke wallet atau offset hutang
**Stok dua tingkat:** stok_toko + stok_gudang — tidak boleh negatif
**Serah Terima Kasir:** Draft oleh penyerah → approve oleh penerima

## Development Commands

```bash
cd backend-laravel
php artisan test                        # semua test (144 test)
php artisan test --filter=NamaTest      # filter spesifik
php artisan test --stop-on-failure      # berhenti di error pertama
php artisan migrate                     # jalankan migrasi
php artisan route:list --path=api       # lihat semua route
```

## Testing

- Semua Feature test: `DatabaseTransactions` (bukan `RefreshDatabase`)
- DB: SQLite file `backend-laravel/database/database.sqlite`
- `DB_URL` harus kosong — jika tidak, config SQLite rusak
- Gunakan PHPUnit 11 attributes `#[Test]` bukan docblock `@test`

Detail: [references/testing-guide.md](./references/testing-guide.md)

## API Conventions

```
POST /api/login          → public, rate limit 10/menit
GET  /api/me             → auth:sanctum
GET  /api/admin/*        → role: admin
GET  /api/kasir/*        → role: kasir
GET  /api/anggota/*      → role: anggota
```

Response selalu JSON: `{ "data": {...}, "message": "...", "status": 200 }`
