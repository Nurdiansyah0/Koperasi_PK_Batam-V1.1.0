# 🏛️ Arsitektur Modular Monolith — Koperasi PKPPK BTH

Sistem aplikasi Koperasi Karyawan PKPPK BTH dirancang dengan arsitektur **Modular Monolith** (Domain-Driven Monolith). Arsitektur ini menyatukan kemudahan deployment monolitik dengan keunggulan pemisahan domain bisnis yang rapi, independen, dan terisolasi (*low coupling, high cohesion*).

---

## 🏗️ 1. Struktur Domain Backend (`backend-laravel/app/Modules/`)

```
backend-laravel/app/Modules/
├── Auth/                   # Domain Autentikasi & Akun
│   ├── Controllers/        # AuthController (Login, Logout, Me, Reset Password Challenge)
│   └── Services/           # AuthService (Validasi Sanctum, Security Challenge)
│
├── Members/                # Domain Manajemen Anggota & Rekening
│   ├── Controllers/        # MemberController
│   └── Services/           # MemberService (Profil, Buku Hutang, Cari Anggota)
│
├── Inventory/              # Domain Inventaris & Gudang
│   ├── Controllers/        # InventoryController
│   └── Services/           # InventoryService (CRUD Barang, Restock, Stock Opname)
│
├── Pos/                    # Domain Point of Sale & Kasir
│   ├── Controllers/        # PosController
│   └── Services/           # PosCheckoutService (Checkout Kasir, Pesanan Anggota, SHU Split)
│
├── Finance/                # Domain Finansial, SHU & Kasir
│   ├── Controllers/        # FinanceController
│   └── Services/           # FinanceService (Alokasi 60-30-10, Setoran Kasir, Serah Terima)
│
└── Ai/                     # Domain AI & Machine Vision
    ├── Controllers/        # AiController
    └── Services/           # GeminiService (Vision Invoice OCR, Chat Assistant, Insights)
```

---

## 🎨 2. Struktur Domain Frontend (`frontend/src/modules/`)

```
frontend/src/
├── modules/
│   ├── auth/               # LoginPage, ResetPasswordPage, authStore, authService
│   ├── landing/            # LandingPage, Hero, Interactive SHU Simulator
│   ├── pos/                # TransaksiKasir, PesananAnggota, PembayaranHutang, RiwayatKasir
│   ├── inventory/          # DataBarang, OpnamePage, RestockScanner
│   ├── members/            # AnggotaDashboard, Belanja, ProfilPage, IosMemberCard
│   ├── finance/            # AdminDashboard, LaporanTransaksi, SetoranKasir, SerahTerima
│   └── ai/                 # Gemini Chatbot, Smart Invoice Scanner
│
├── components/
│   ├── ui/                 # Atomic primitives (Button, Input, Card, Modal, Sheet)
│   ├── layout/             # AppLayout, Sidebar, Navbar
│   └── ios/                # Apple Wallet Native Card Widgets
│
└── lib/                    # Axios API client, Formatters, State stores
```

---

## 🔒 3. Keunggulan Arsitektur Modular Monolith Ini:
1. **Pemisahan Tanggung Jawab (*Single Responsibility*):** Logika kalkulasi bisnis (seperti pembagian profit 60%-30%-10%) berada dalam `Services/`, bukan bercampur di Controller.
2. **Kesiapan Skalabilitas (*Microservices Ready*):** Setiap modul domain (`Inventory`, `Pos`, `Finance`) dapat diekstrak menjadi microservice terpisah di masa depan tanpa refactor besar.
3. **Kemudahan Pengujian (*100% Testable*):** Unit test dapat menargetkan service spesifik secara terisolasi tanpa efek samping.
