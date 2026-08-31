// ============================================================
// TYPES — Synced 100% with public_html/api/ backend responses
// ============================================================

export interface User {
  user_id: number
  username: string
  role: 'admin' | 'kasir' | 'anggota'
  nama_lengkap?: string
  // Anggota-only fields (merged on login)
  anggota_id?: number
  saldo?: number
  hutang?: number
  shu?: number
}

export interface LoginResponse {
  success: boolean
  token: string
  user: User
  error?: string
  message?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  error?: string
  message?: string
  data?: T
}

// ─── Barang ─────────────────────────────────────────────────
export interface Barang {
  barang_id: number
  nama_barang: string
  stok: number
  harga_modal?: number
  harga_jual?: number
  harga?: number // Normalized selling price (fallback: harga_jual)
  satuan?: string
}

export type BarangKasir = Barang

// ─── Anggota ────────────────────────────────────────────────
export interface Anggota {
  anggota_id: number
  user_id: number
  nama: string
  nama_lengkap?: string
  username: string
  email?: string
  saldo: number
  hutang: number
  shu: number
  created_at?: string
}

export type AnggotaAdmin = Anggota
export type AnggotaKasir = Anggota

// ─── Transaksi Item ─────────────────────────────────────────
export interface TransaksiItem {
  barang_id: number
  nama_barang?: string
  jumlah?: number
  qty?: number
  harga_satuan: number
  subtotal?: number
}

export type MetodePembayaran = 'cash' | 'qr' | 'ewallet' | 'transfer' | 'hutang' | 'tunai' | 'saldo'

// ─── Transaksi ──────────────────────────────────────────────
export interface Transaksi {
  details?: any[];
  transaksi_id: number
  id?: number
  anggota_id: number | null
  nama_anggota?: string
  nama_kasir?: string
  total_harga: number
  total?: number
  total_keuntungan?: number
  metode_pembayaran: string
  status: string
  created_at: string
  tanggal?: string
  items?: TransaksiItem[]
}

export type TransaksiKasir = Transaksi
export type TransaksiTerbaru = Transaksi
export type HistoriTransaksiAnggota = Transaksi
export type PesananAnggota = Transaksi

// ─── Dashboard Kasir ────────────────────────────────────────
export interface DashboardKasir {
  total_transaksi_hari_ini: number
  total_pendapatan_hari_ini: number
  saldo_kas: number
  pending_serah_terima: number
  totalPenjualanHariIni?: number
  totalTransaksiHariIni?: number
  hutangBelumLunas?: number
  stokMenipis?: number
}

export type DashboardKasirData = DashboardKasir

// ─── Pembayaran Hutang ──────────────────────────────────────
export interface PembayaranHutang {
  pembayaran_id: number
  anggota_id: number
  kasir_id?: number | null
  nama_anggota: string
  nama_kasir?: string | null
  nominal: number
  jumlah: number // normalized alias for nominal
  status: 'pending' | 'approved' | 'rejected'
  approved_at?: string | null
  created_at: string
}

// ─── Setoran Kasir ──────────────────────────────────────────
export interface SetoranKasir {
  id: number
  nominal: number
  nama_kasir: string
  tanggal: string
  status: 'pending' | 'approved'
}

// ─── SHU Distribusi ──────────────────────────────────────────
export interface ShuDistribusi {
  shu_id: number
  anggota_id: number
  tahun: string
  nama_anggota: string
  shu_60_percent: number
  shu_10_percent: number
  shu_30_percent: number
  total_shu: number
  created_at: string
}

// ─── Daftar Kasir ────────────────────────────────────────────
export interface DaftarKasir {
  user_id: number
  username: string
  nama_lengkap: string
}

// ─── Serah Terima ───────────────────────────────────────────
export interface SerahTerima {
  serah_terima_id: number
  serah_id?: number
  dari_kasir_id?: number
  ke_kasir_id?: number
  kasir_from?: number
  kasir_to?: number
  kasir_from_username?: string
  kasir_from_name?: string
  kasir_to_username?: string
  hasil_opname?: any
  jumlah?: number
  nominal?: number
  catatan?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  items?: any[]
}

// ─── Admin Dashboard ─────────────────────────────────────────
export interface DashboardAdmin {
  total_anggota: number
  total_transaksi_hari_ini: number
  total_pendapatan_hari_ini: number
  total_keuntungan_hari_ini: number
  total_hutang_beredar: number
  total_saldo_anggota: number
  total_shu_tersedia: number
  total_shu_pengurus: number
  total_shu_koperasi: number
  total_aset_barang: number
}

// ─── Laporan Transaksi ───────────────────────────────────────
export interface LaporanTransaksi {
  summary?: {
    total_transaksi: number
    total_pendapatan: number
    total_hutang: number
  }
  total_transaksi?: number
  total_pendapatan?: number
  breakdown_pembayaran?: Record<string, number>
  transaksi_harian?: {
    tanggal: string
    jumlah_transaksi: number
    total_pendapatan: number
  }[]
  data?: Transaksi[]
}

// ─── Profil Anggota ──────────────────────────────────────────
export interface ProfilAnggota {
  anggota_id: number
  user_id: number
  nama?: string
  nama_lengkap: string
  username?: string
  saldo: number
  hutang: number
  shu: number
}

// ─── Histori Bayar Hutang Anggota ────────────────────────────
export interface HistoriBayarHutang {
  pembayaran_id: number
  anggota_id: number
  kasir_id?: number | null
  nominal: number
  jumlah?: number
  status: 'pending' | 'approved' | 'rejected'
  approved_at?: string | null
  created_at: string
}
