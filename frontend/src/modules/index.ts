/**
 * Modular Monolith Domain Index for Koperasi PKPPK BTH
 * Provides clean domain boundaries across all application features.
 */

// 1. Auth Module
export { LoginPage } from '@/pages/LoginPage'
export { ResetPasswordPage } from '@/pages/ResetPasswordPage'
export { authService } from '@/services/authService'
export { useAuthStore } from '@/store/authStore'

// 2. POS & Cashier Module
export { KasirDashboard } from '@/pages/kasir/Dashboard'
export { TransaksiKasir } from '@/pages/kasir/Transaksi'
export { PembayaranHutangPage } from '@/pages/kasir/PembayaranHutang'
export { default as PesananAnggotaPage } from '@/pages/kasir/PesananAnggota'
export { RiwayatTransaksiKasir } from '@/pages/kasir/Riwayat'
export { kasirService } from '@/services/kasirService'

// 4. Inventory Module
export { DataBarang } from '@/pages/admin/DataBarang'
export { default as OpnamePage } from '@/pages/admin/Opname'
export { adminService } from '@/services/adminService'

// 5. Members Module
export { DataAnggota } from '@/pages/admin/DataAnggota'
export { default as AnggotaDashboard } from '@/pages/anggota/Dashboard'
export { default as Belanja } from '@/pages/anggota/Belanja'
export { default as BayarHutang } from '@/pages/anggota/BayarHutang'
export { RiwayatTransaksiAnggota } from '@/pages/anggota/Riwayat'
export { default as ProfilPage } from '@/pages/anggota/Profil'
export { IosMemberCard } from '@/components/ios/IosMemberCard'
export { anggotaService } from '@/services/anggotaService'

// 6. Finance & Administration Module
export { AdminDashboard } from '@/pages/admin/Dashboard'
export { LaporanTransaksi } from '@/pages/admin/LaporanTransaksi'
export { LaporanSelisihKasir } from '@/pages/admin/LaporanSelisihKasir'
export { default as PersetujuanSetoranPage } from '@/pages/admin/PersetujuanSetoran'
export { default as SetoranKasirPage } from '@/pages/kasir/SetoranKasir'
export { SerahTerimaPage } from '@/pages/kasir/SerahTerima'
export { default as BuatSerahTerimaPage } from '@/pages/kasir/BuatSerahTerima'
