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

  getLaporanTransaksi: async (tanggal_awal: string, tanggal_akhir: string): Promise<LaporanTransaksi> => {
    const { data } = await api.post('/laravel/api/admin/laporan-transaksi', { tanggal_awal, tanggal_akhir })
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

  restockBarang: async (payload: { barang_id: number, jumlah_tambah: number, harga_beli_satuan: number, sumber_dana: string, catatan?: string }): Promise<any> => {
    const { data } = await api.post('/laravel/api/admin/barang/restock', payload)
    return data
  },

  getRiwayatRestock: async (): Promise<any> => {
    const { data } = await api.get('/laravel/api/admin/barang/restock')
    return data
  }
}
