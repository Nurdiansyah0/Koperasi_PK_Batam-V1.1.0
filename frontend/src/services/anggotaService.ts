import api from '@/lib/api'
import type {
  Barang,
  ProfilAnggota,
  HistoriTransaksiAnggota,
  HistoriBayarHutang,
  ApiResponse,
  MetodePembayaran
} from '@/types'

export const anggotaService = {
  // ─── Profil & Dashboard ────────────────────────────────────
  getProfil: async (): Promise<ProfilAnggota> => {
    // Moved to Laravel Endpoint
    const { data } = await api.get('/laravel/api/anggota/profil')
    return data.user
  },

  updateProfile: async (username: string): Promise<ApiResponse & { user?: any, anggota?: any }> => {
    // Moved to Laravel Endpoint
    const { data } = await api.post('/laravel/api/anggota/update-profile', { username })
    return data
  },

  changePassword: async (current_password: string, new_password: string, user_id: number): Promise<ApiResponse> => {
    // Moved to Laravel Endpoint
    const { data } = await api.post('/laravel/api/anggota/change-password', {
      current_password,
      new_password,
      user_id
    })
    return data
  },

  // ─── Belanja (Shopping) & Smart Bundling ───────────────────
  getDataBarang: async (): Promise<Barang[]> => {
    // Moved to Laravel Endpoint
    const { data } = await api.get('/laravel/api/anggota/barang')
    return data.data ?? []
  },

  getPaketBelanja: async (): Promise<{ data: any[], sering_dibeli: any | null }> => {
    const { data } = await api.get('/laravel/api/anggota/paket-belanja')
    return {
      data: data.data ?? [],
      sering_dibeli: data.sering_dibeli ?? data.ai_recommendation ?? null,
    }
  },

  simpanTransaksi: async (payload: {
    items: { barang_id: number; qty: number; harga_satuan: number }[]
    metode_pembayaran: MetodePembayaran
    total_harga?: number
  }): Promise<ApiResponse & { transaksi_id?: number }> => {
    // Moved to Laravel Endpoint
    // Laravel expects 'jumlah' instead of 'qty'
    const transformedPayload = {
      ...payload,
      items: payload.items.map(item => ({ ...item, jumlah: item.qty }))
    }
    const { data } = await api.post('/laravel/api/anggota/transaksi', transformedPayload)
    return data
  },

  // ─── Histori ───────────────────────────────────────────────
  getHistoriTransaksi: async (page: number = 1): Promise<{ data: HistoriTransaksiAnggota[], current_page: number, last_page: number }> => {
    const { data } = await api.get(`/laravel/api/anggota/transaksi?page=${page}`)
    return {
      data: data.data?.data ?? [],
      current_page: data.data?.current_page ?? 1,
      last_page: data.data?.last_page ?? 1
    }
  },

  // ─── Hutang ────────────────────────────────────────────────
  bayarHutang: async (jumlah: number): Promise<ApiResponse & { pembayaran_id?: number }> => {
    // Moved to Laravel Endpoint
    const { data } = await api.post('/laravel/api/anggota/bayar-hutang', { jumlah })
    return data
  },

  getHistoriBayarHutang: async (): Promise<HistoriBayarHutang[]> => {
    // Moved to Laravel Endpoint
    const { data } = await api.get('/laravel/api/anggota/bayar-hutang')
    return data.data ?? []
  }
}
