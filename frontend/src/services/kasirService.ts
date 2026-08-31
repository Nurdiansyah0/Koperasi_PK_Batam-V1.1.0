import api from '@/lib/api'
import type {
  BarangKasir,
  PesananAnggota,
  AnggotaKasir,
  PembayaranHutang,
  TransaksiKasir,
  SerahTerima,
  DashboardKasirData,
  TransaksiTerbaru,
  DaftarKasir,
  ApiResponse,
  TransaksiItem,
  MetodePembayaran
} from '@/types'

export const kasirService = {
  getDashboard: async (): Promise<DashboardKasirData> => {
    const { data } = await api.get('/laravel/api/kasir/dashboard')
    return data.data
  },

  getTransaksiTerbaru: async (): Promise<TransaksiTerbaru[]> => {
    const { data } = await api.get('/laravel/api/kasir/transaksi-terbaru')
    return data.data ?? []
  },

  getDataBarang: async (): Promise<BarangKasir[]> => {
    const { data } = await api.get('/laravel/api/kasir/barang-belanja')
    return data.data ?? []
  },

  buatTransaksiKasir: async (payload: {
    items: { barang_id: number; jumlah: number; harga_satuan?: number }[]
    anggota_id?: number | null
    metode_pembayaran: MetodePembayaran
    total: number
  }): Promise<ApiResponse & { transaksi_id?: number, total?: number, total_keuntungan?: number }> => {
    const transformedPayload = {
      ...payload,
      // No mapping needed if payload already has jumlah
    }
    const { data } = await api.post('/laravel/api/kasir/buat-transaksi', transformedPayload)
    return data
  },

  
  tolakPesananAnggota: async (transaksiId: number | number[], alasan?: string): Promise<ApiResponse> => {
    const response = await api.post('/kasir/tolak-pesanan-anggota', { 
      transaksi_ids: Array.isArray(transaksiId) ? transaksiId : [transaksiId], 
      alasan 
    })
    return response.data
  },

  getPesananAnggota: async (): Promise<PesananAnggota[]> => {
    const { data } = await api.get('/laravel/api/kasir/pesanan-anggota')
    return data.data ?? []
  },

  simpanTransaksiKasir: async (transaksiList: { transaksi_id: number }[]): Promise<ApiResponse> => {
    const { data } = await api.post('/laravel/api/kasir/simpan-transaksi-kasir', { transaksi: transaksiList })
    return data
  },

  getAllAnggota: async (): Promise<AnggotaKasir[]> => {
    const { data } = await api.get('/laravel/api/kasir/all-anggota')
    return data.data ?? []
  },

  cariProfilAnggota: async (searchOrId: string | number) => {
    const { data } = await api.get(`/laravel/api/kasir/cari-profil-anggota?search=${searchOrId}&anggota_id=${searchOrId}`)
    return data.profil
  },

  getAllPembayaranHutang: async (): Promise<PembayaranHutang[]> => {
    const { data } = await api.get('/laravel/api/kasir/all-pembayaran-hutang')
    return data.data ?? []
  },

  approvePembayaranHutang: async (pembayaran_id: number, action: 'approve' | 'reject', metode_pembayaran: 'cash' | 'transfer' = 'cash'): Promise<ApiResponse> => {
    const { data } = await api.post('/laravel/api/kasir/approve-pembayaran-hutang', { pembayaran_id, action, metode_pembayaran })
    return data
  },

  getHistoryTransaksi: async (params?: {
    tanggal_awal?: string
    tanggal_akhir?: string
    jenis_transaksi?: string
    status?: string
    page?: number
  }): Promise<{ data: TransaksiKasir[], current_page: number, last_page: number, total: number }> => {
    const { data } = await api.post('/laravel/api/kasir/history-transaksi', params)
    return {
      data: data.data?.data ?? [],
      current_page: data.data?.current_page ?? 1,
      last_page: data.data?.last_page ?? 1,
      total: data.data?.total ?? 0
    }
  },

  setorAdmin: async (nominal: number): Promise<ApiResponse> => {
    const { data } = await api.post('/laravel/api/kasir/setor-admin', { nominal })
    return data
  },

  tarikTunai: async (nominal: number, anggota_id: number): Promise<ApiResponse> => {
    const { data } = await api.post('/laravel/api/kasir/tarik-tunai', { nominal, anggota_id })
    return data
  },

  getDaftarKasir: async (): Promise<DaftarKasir[]> => {
    const { data } = await api.get('/laravel/api/kasir/daftar-kasir')
    return data.data ?? []
  },

  getSerahTerimaDraft: async (): Promise<ApiResponse> => {
    const { data } = await api.get('/laravel/api/kasir/serah-terima-draft')
    return data
  },

  getSerahTerimaForMe: async (type: 'pending' | 'history' | 'all' = 'all', page: number = 1): Promise<{ data: SerahTerima[], current_page: number, last_page: number }> => {
    const { data } = await api.get(`/laravel/api/kasir/serah-terima-for-me?type=${type}&page=${page}`)
    return { data: data.data?.data ?? [], current_page: data.data?.current_page ?? 1, last_page: data.data?.last_page ?? 1 }
  },


  createSetoranKasir: async (nominal: number): Promise<ApiResponse> => {
    const { data } = await api.post('/laravel/api/kasir/setor-admin', { nominal })
    return data
  },
  getRiwayatSetoran: async (): Promise<any[]> => {
    const { data } = await api.get('/laravel/api/kasir/setoran-history')
    return data.data || []
  },
  createSerahTerima: async (kasir_to: number, hasil_opname: any): Promise<ApiResponse> => {
    const { data } = await api.post('/laravel/api/kasir/create-serah-terima', { kasir_to, hasil_opname })
    return data
  },

  approveSerahTerima: async (serah_id: number): Promise<ApiResponse> => {
    const { data } = await api.post('/laravel/api/kasir/approve-serah-terima', { serah_id })
    return data
  },

  rejectSerahTerima: async (serah_id: number, alasan: string): Promise<ApiResponse> => {
    const { data } = await api.post('/laravel/api/kasir/reject-serah-terima', { serah_id, alasan })
    return data
  }
}
