import api from '@/lib/api'
import type {
  AnggotaAdmin,
  Barang,
  SetoranKasir,
  LaporanTransaksi,
  ShuDistribusi,
  ApiResponse,
} from '@/types'

export const adminService = {

  async postCashAdjustment(payload: {
    adjustment_date: string;
    type: string;
    amount: number;
    direction: 'IN'|'OUT';
    source: string;
    reason: string;
    reference?: string;
  }): Promise<any> {
    const res = await api.post('/api/cash-adjustments', payload)
    return res.data
  },

  submitOpnameMassal: async (adjustments: any[]) => {
    const { data } = await api.post('/laravel/api/admin/opname', { adjustments })
    return data
  },
  getDashboard: async () => {
    const { data } = await api.get('/laravel/api/admin/dashboard-stats')
    return data
  },

  getBarang: async (): Promise<Barang[]> => {
    const { data } = await api.get('/laravel/api/admin/barang')
    return data.data ?? []
  },

  tambahBarang: async (barang: Omit<Barang, 'barang_id'>): Promise<ApiResponse> => {
    const { data } = await api.post<ApiResponse>('/laravel/api/admin/tambah-barang', barang)
    return data
  },

  updateBarang: async (barang: Barang): Promise<ApiResponse> => {
    const { data } = await api.post<ApiResponse>('/laravel/api/admin/update-barang', barang)
    return data
  },

  hapusBarang: async (barang_id: number): Promise<ApiResponse> => {
    const { data } = await api.post<ApiResponse>('/laravel/api/admin/hapus-barang', { barang_id })
    return data
  },

  getAnggota: async (): Promise<AnggotaAdmin[]> => {
    const { data } = await api.get('/laravel/api/admin/anggota')
    return data.data ?? []
  },

  tambahUser: async (payload: {
    username: string
    password: string
    role: 'kasir' | 'anggota' | 'admin'
  }): Promise<ApiResponse> => {
    const { data } = await api.post<ApiResponse>('/laravel/api/admin/tambah-user', payload)
    return data
  },

  updateUser: async (payload: {
    user_id: number
    username: string
    role: string
    password?: string
  }): Promise<ApiResponse> => {
    const { data } = await api.post<ApiResponse>('/laravel/api/admin/update-user', payload)
    return data
  },

  hapusUser: async (user_id: number): Promise<ApiResponse> => {
    const { data } = await api.post<ApiResponse>('/laravel/api/admin/hapus-user', { user_id })
    return data
  },




  getSetoranKasir: async (): Promise<any[]> => {
    const { data } = await api.get('/laravel/api/admin/setoran-kasir')
    return data.data || []
  },
  approveSetoranKasir: async (setoran_id: number, action: 'approve' | 'reject'): Promise<ApiResponse> => {
    const { data } = await api.post<ApiResponse>('/laravel/api/admin/approve-setoran-kasir', { setoran_id, action })
    return data
  },
  topupSHU: async (nama_anggota: string, nominal: number): Promise<ApiResponse> => {
    const { data } = await api.post<ApiResponse>('/laravel/api/admin/topup-shu', { nama_anggota, nominal })
    return data
  },

  getLaporanTransaksi: async (params?: {
    tanggal_awal?: string
    tanggal_akhir?: string
    metode_pembayaran?: string
    kasir_id?: string | number
    pembeli_type?: string
    search?: string
    page?: number
    per_page?: number | string
  } | string, tanggal_akhir?: string): Promise<LaporanTransaksi> => {
    let payload: any = {}
    if (typeof params === 'object') {
      payload = params
    } else {
      payload = { tanggal_awal: params, tanggal_akhir }
    }
    const { data } = await api.post('/laravel/api/admin/laporan-transaksi', payload)
    return data
  },

  getPengeluaran: async (params?: { tanggal_awal?: string; tanggal_akhir?: string; search?: string }): Promise<{ success: boolean; total_pengeluaran: number; data: any[] }> => {
    const { data } = await api.get('/laravel/api/admin/pengeluaran', { params })
    return data
  },

  tambahPengeluaran: async (payload: { nama_pengeluaran: string; nominal: number; tanggal?: string; kategori?: string; keterangan?: string }): Promise<ApiResponse> => {
    const { data } = await api.post<ApiResponse>('/laravel/api/admin/pengeluaran', payload)
    return data
  },

  hapusPengeluaran: async (id: number): Promise<ApiResponse> => {
    const { data } = await api.delete<ApiResponse>(`/laravel/api/admin/pengeluaran/${id}`)
    return data
  },

  getMonitorBarang: async (params?: {
    tanggal_awal?: string
    tanggal_akhir?: string
    barang_id?: string
    group_by?: 'daily' | 'monthly'
  }) => {
    const { data } = await api.get('/laravel/api/admin/monitor-barang', { params })
    return data
  },

  getShuDistribusi: async (params?: { tahun?: string; anggota_id?: string }): Promise<{
    data: ShuDistribusi[]
    summary: {
      totalShu60: number
      totalShu10: number
      totalShu30: number
      totalAllShu: number
      totalDistribusi: number
      tahunAktif: string
    }
  }> => {
    const { data } = await api.get('/laravel/api/admin/shu-distribusi', { params })
    return data
  },

  
  getDataKasir: async () => {
    const { data } = await api.get('/laravel/api/admin/data-kasir')
    return data.data ?? []
  },

  restockBarang: async (payload: {
    barang_id: number
    jumlah_tambah: number
    harga_beli_satuan: number
    sumber_dana: string
    alokasi?: 'gudang' | 'toko' | 'auto'
    tanggal_kadaluarsa?: string
    catatan?: string
  }): Promise<any> => {
    const { data } = await api.post('/laravel/api/admin/restock-barang', payload)
    return data
  },

  bulkRestock: async (payload: {
    items: Array<{
      barang_id: number
      jumlah_tambah: number
      harga_beli_satuan: number
      alokasi?: 'gudang' | 'toko' | 'auto'
      tanggal_kadaluarsa?: string
    }>
    sumber_dana: string
    nomor_faktur?: string
    nama_supplier?: string
    catatan?: string
  }): Promise<any> => {
    const { data } = await api.post('/laravel/api/admin/bulk-restock', payload)
    return data
  },

  getRiwayatRestock: async (): Promise<any> => {
    const { data } = await api.get('/laravel/api/admin/riwayat-restock')
    return data
  },

  getPkmAnalysis: async (params?: { days?: number, lead_time_days?: number, search?: string }) => {
    const { data } = await api.get('/laravel/api/admin/pkm-analysis', { params })
    return data
  },

  updatePkm: async (barang_id: number, pkm: number): Promise<ApiResponse> => {
    const { data } = await api.post('/laravel/api/admin/update-pkm', { barang_id, pkm })
    return data
  },

  autoCalculatePkm: async (days: number = 30, lead_time_days: number = 4): Promise<ApiResponse> => {
    const { data } = await api.post('/laravel/api/admin/auto-calculate-pkm', { days, lead_time_days })
    return data
  },

  getLaporanSelisihKasir: async (): Promise<any> => {
    const { data } = await api.get('/laravel/api/admin/laporan-selisih-kasir')
    return data
  },

  getLaporanTarikTunai: async (): Promise<any> => {
    const { data } = await api.get('/laravel/api/admin/laporan-tarik-tunai')
    return data
  },

  getShuManagement: async (): Promise<any> => {
    const { data } = await api.get('/laravel/api/admin/shu-management')
    return data
  },

  prosesKonversiShu: async (payload: {
    mode: 'individual' | 'pelunasan_hutang' | 'massal_ke_saldo'
    anggota_id?: number
    nominal?: number
    persentase?: number
    keterangan?: string
  }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/laravel/api/admin/konversi-shu', payload)
    return data
  },

  getDaftarJabatan: async (): Promise<{ data: any[]; summary: any }> => {
    const { data } = await api.get('/laravel/api/admin/jabatan')
    return data
  },

  assignJabatan: async (payload: {
    user_id: number
    role: 'admin' | 'kasir' | 'pengurus'
    catatan?: string
  }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/laravel/api/admin/jabatan/assign', payload)
    return data
  },

  revokeJabatan: async (payload: {
    jabatan_id: number
    alasan?: string
  }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/laravel/api/admin/jabatan/revoke', payload)
    return data
  },

  mutasiStok: async (payload: {
    barang_id: number
    tipe: 'gudang_ke_toko' | 'toko_ke_gudang'
    jumlah: number
    catatan?: string
  }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/laravel/api/admin/mutasi-stok', payload)
    return data
  },

  autoRefillDisplay: async (payload?: {
    items?: Array<{ barang_id: number; jumlah: number }>
  }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/laravel/api/admin/auto-refill-display', payload || {})
    return data
  },

  writeOffExpired: async (payload: {
    barang_id: number
    lokasi: 'toko' | 'gudang' | 'semua'
    jumlah: number
    alasan?: string
  }): Promise<ApiResponse<any>> => {
    const { data } = await api.post('/laravel/api/admin/write-off-expired', payload)
    return data
  }
}
