// ============================================================
// TYPES — Synced 100% with public_html/api/ backend responses
// ============================================================

export interface User {
  user_id: number
  username: string
  role: 'admin' | 'kasir' | 'anggota' | 'pengurus'
  nama_lengkap?: string
  active_roles?: string[]
  is_admin?: boolean
  is_kasir?: boolean
  // Anggota fields (merged on login)
  anggota_id?: number
  saldo?: number
  hutang?: number
  shu?: number
  persetujuan_shu_master_at?: string | null
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

export interface Barang {
  barang_id: number
  nama_barang: string
  stok: number
  stok_toko?: number
  stok_gudang?: number
  tgl_kadaluarsa_toko?: string | null
  tgl_kadaluarsa_gudang?: string | null
  hari_kadaluarsa_toko?: number | null
  status_kadaluarsa_toko?: 'expired' | 'near_expiry' | 'aman' | 'tidak_ada'
  hari_kadaluarsa_gudang?: number | null
  status_kadaluarsa_gudang?: 'expired' | 'near_expiry' | 'aman' | 'tidak_ada'
  pkm?: number
  harga_modal?: number
  harga_jual?: number
  harga?: number // Normalized selling price (fallback: harga_jual)
  satuan?: string
  risk_badge?: string
  audit_reason?: string
}

export interface PkmItem {
  barang_id: number
  nama_barang: string
  stok: number
  stok_toko?: number
  stok_gudang?: number
  harga_modal: number
  harga_jual: number
  sales_period_days: number
  total_sold: number
  ads: number
  lead_time_days: number
  recommended_pkm: number
  recommended_buy?: number
  estimasi_biaya_kulakan?: number
  pkm: number
  status_pkm: string
}

export type BarangKasir = Barang

// ─── Paket Belanja & Smart Bundling ─────────────────────────
export interface PaketBelanjaItem {
  barang_id: number
  nama_barang: string
  jumlah: number
  qty: number
  harga_satuan: number
  subtotal: number
  stok_tersedia: number
}

export interface PaketBelanja {
  id: string
  nama_paket: string
  deskripsi: string
  tag: string
  icon: string
  total_harga: number
  items: PaketBelanjaItem[]
  is_available: boolean
}

// ─── Anggota ────────────────────────────────────────────────
export interface Anggota {
  anggota_id: number
  user_id: number
  nama: string
  nama_lengkap?: string
  username: string
  email?: string
  saldo: number
  simpanan_pokok?: number
  allowance_hutang?: number
  simpanan_wajib?: number
  limit_hutang?: number
  sisa_limit_hutang?: number
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
  tarik_tunai?: {
    tarik_id: number
    kode_penarikan: string
    nominal: number
    sumber_dana: string
    uang_bersih_diserahkan: number
  } | null
}

export type TransaksiKasir = Transaksi
export type TransaksiTerbaru = Transaksi
export type HistoriTransaksiAnggota = Transaksi
export type PesananAnggota = Transaksi

// ─── Dashboard Kasir ────────────────────────────────────────
export interface DashboardKasir {
  total_transaksi_hari_ini: number
  total_item_terjual_hari_ini?: number
  total_pendapatan_hari_ini: number
  total_transaksi_dilayani?: number
  saldo_kas: number
  pending_serah_terima: number
  pending_pesanan?: number
  pending_hutang?: number
  totalPenjualanHariIni?: number
  totalTransaksiHariIni?: number
  totalTransaksiDilayani?: number
  totalItemTerjualHariIni?: number
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
  kasir_to_name?: string
  hasil_opname?: any
  jumlah?: number
  nominal?: number
  catatan?: string
  status: 'pending' | 'approved' | 'rejected'
  alasan_penolakan?: string
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
  stok_kritis_count?: number
  stok_kritis_items?: Array<{
    barang_id: number
    nama_barang: string
    stok: number
    pkm?: number
    harga_modal: number
  }>
  setoran_pending_count?: number
  setoran_pending_nominal?: number
  anggota_limit_kritis_count?: number
  total_restock_bulan_ini?: number
  expired_count?: number
  near_expiry_count?: number
}

// ─── Laporan Transaksi ───────────────────────────────────────
export interface ItemLaporanTransaksi {
  detail_id: number
  barang_id: number
  nama_barang: string
  satuan: string
  jumlah: number
  harga_satuan: number
  subtotal: number
  keuntungan: number
}

export interface TransaksiLaporanItem {
  transaksi_id: number
  created_at: string
  anggota_id?: number | null
  nama_anggota: string
  nomor_anggota?: string | null
  metode_pembayaran: string
  total_harga: number
  total_keuntungan: number
  kasir_id?: number | null
  kasir_username?: string
  status: string
  items?: ItemLaporanTransaksi[]
}

export interface PengeluaranOperasional {
  pengeluaran_id: number
  nama_pengeluaran: string
  nominal: number
  kategori?: string | null
  tanggal: string
  keterangan?: string | null
  created_by?: number | null
  user?: {
    user_id: number
    username: string
  }
  created_at?: string
  updated_at?: string
}

export interface LaporanTransaksi {
  success?: boolean
  summary?: {
    total_transaksi: number
    total_pendapatan: number
    total_keuntungan: number
    total_laba_kotor: number
    total_hpp: number
    total_beban_operasional: number
    total_laba_bersih: number
    shu_anggota_60: number
    shu_cadangan_30: number
    shu_pengurus_10: number
    total_hutang: number
    total_cash: number
    total_ewallet: number
    total_qr: number
    total_transfer: number
    omset_anggota: number
    omset_umum: number
    avg_transaksi: number
    analisis_kesehatan?: {
      total_anggota_terdaftar: number
      jumlah_anggota_aktif: number
      rasio_partisipasi_persen: number
      kas_likuid_masuk: number
      total_piutang_berjalan: number
      rasio_piutang_omset_persen: number
      cash_coverage_ratio_persen: number
      gross_profit_margin_persen: number
      net_profit_margin_persen: number
      operating_expense_ratio_persen: number
      skor_kesehatan: number
      status_kesehatan: string
      badge_color: string
      kesimpulan_evaluasi: string
    }
  }
  analisis_kesehatan?: {
    total_anggota_terdaftar: number
    jumlah_anggota_aktif: number
    rasio_partisipasi_persen: number
    kas_likuid_masuk: number
    total_piutang_berjalan: number
    rasio_piutang_omset_persen: number
    cash_coverage_ratio_persen: number
    gross_profit_margin_persen: number
    net_profit_margin_persen: number
    operating_expense_ratio_persen: number
    skor_kesehatan: number
    status_kesehatan: string
    badge_color: string
    kesimpulan_evaluasi: string
  }
  total_transaksi?: number
  total_pendapatan?: number
  breakdown_pembayaran?: Record<string, number>
  breakdown_kasir?: {
    kasir_id: number | null
    kasir_username: string
    total_transaksi: number
    total_omset: number
    total_laba: number
  }[]
  transaksi_harian?: {
    tanggal: string
    jumlah_transaksi: number
    total_pendapatan: number
    total_keuntungan: number
  }[]
  daftar_kasir?: {
    user_id: number
    username: string
  }[]
  data?: TransaksiLaporanItem[]
  pengeluaran_operasional?: PengeluaranOperasional[]
  rekap_anggota?: {
    anggota_id: number
    nama_lengkap: string
    frekuensi_belanja: number
    total_belanja: number
    total_lunas: number
    total_hutang: number
    saldo_hutang_koperasi: number
    porsi_persen: number
    hak_shu: number
  }[]
  rekap_bulanan?: {
    periode_bulan: string
    total_transaksi: number
    omset_bulan: number
    margin_bulan: number
    piutang_bulan: number
  }[]
  pagination?: {
    current_page: number
    last_page: number
    total: number
    per_page: number
  }
  periode?: {
    tanggal_awal: string
    tanggal_akhir: string
  }
}

export interface ProfilAnggota {
  anggota_id: number
  user_id: number
  nama?: string
  nama_lengkap: string
  username?: string
  saldo: number
  simpanan_pokok?: number
  allowance_hutang?: number
  limit_hutang?: number
  sisa_limit_hutang?: number
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

// ─── Tarik Tunai & SHU ───────────────────────────────────────
export interface TarikTunaiItem {
  tarik_id: number
  kode_penarikan?: string
  status?: string
  anggota_id?: number
  nama_anggota?: string
  kasir_name?: string
  nominal: number
  sumber_dana: 'shu' | 'saldo'
  transaksi_id?: number | null
  belanja_nominal?: number
  persetujuan_shu?: boolean
  alasan_tolak?: string | null
  approved_at?: string | null
  keterangan?: string
  created_at: string
}

export interface KelayakanTarikTunai {
  anggota_id: number
  nama_lengkap: string
  saldo_ewallet: number
  saldo_shu: number
  transaksi_valid_hari_ini: {
    transaksi_id: number
    total_harga: number
    metode_pembayaran?: string
    created_at: string
  }[]
  has_qualifying_purchase: boolean
  min_belanja_required: number
}

export interface LaporanTarikTunaiData {
  data: TarikTunaiItem[]
  summary: {
    total_penarikan_count: number
    total_nominal_keluar: number
    total_sales_kontribusi: number
    rasio_sales_to_tarik: number
  }
}

// ─── Manajemen Jabatan & Mandat ─────────────────────────────
export interface JabatanAnggotaItem {
  jabatan_id: number
  user_id: number
  username: string
  nama_lengkap: string
  role: 'admin' | 'kasir' | 'pengurus' | 'anggota'
  status: 'aktif' | 'nonaktif'
  catatan?: string | null
  assigned_at: string | null
  revoked_at: string | null
  ditugaskan_oleh: string
}

export interface JabatanSummary {
  admin_aktif: number
  kasir_aktif: number
  pengurus_aktif: number
  total_riwayat: number
  total_nonaktif: number
}

