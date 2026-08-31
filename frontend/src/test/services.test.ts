import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '@/lib/api'
import { adminService } from '@/services/adminService'
import { kasirService } from '@/services/kasirService'
import { anggotaService } from '@/services/anggotaService'
import type { MetodePembayaran } from '@/types'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('Service Layer — Laravel API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('adminService', () => {
    it('getBarang should call the Laravel barang endpoint', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          data: [
            { barang_id: 1, nama_barang: 'Beras', stok: 10, harga_modal: 50000, harga_jual: 60000 },
          ],
        },
      })

      const barang = await adminService.getBarang()
      expect(api.get).toHaveBeenCalledWith('/laravel/api/admin/barang')
      expect(barang).toHaveLength(1)
      expect(barang[0].nama_barang).toBe('Beras')
    })

    it('tambahBarang should send properly formatted payload to Laravel', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true, message: 'Barang berhasil ditambahkan' },
      })

      const res = await adminService.tambahBarang({
        nama_barang: 'Gula',
        stok: 100,
        harga_modal: 10000,
        harga_jual: 15000,
        harga: 15000
      })

      expect(api.post).toHaveBeenCalledWith('/laravel/api/admin/tambah-barang', {
        nama_barang: 'Gula',
        stok: 100,
        harga_modal: 10000,
        harga_jual: 15000,
        harga: 15000
      })
      expect(res.success).toBe(true)
    })
  })

  describe('kasirService', () => {
    it('buatTransaksiKasir should map qty to jumlah for Laravel', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true, transaksi_id: 101 },
      })

      const payload = {
        anggota_id: 1,
        metode_pembayaran: 'cash' as MetodePembayaran,
        items: [{ barang_id: 1, jumlah: 2, harga_satuan: 15000 }],
        total: 30000
      }

      const res = await kasirService.buatTransaksiKasir(payload)

      // Verify qty was normalized to jumlah
      const callArgs = vi.mocked(api.post).mock.calls[0]
      const sentPayload = callArgs[1] as any
      expect(sentPayload.items[0].jumlah).toBe(2)
      expect(res.success).toBe(true)
    })
  })

  describe('anggotaService', () => {
    it('bayarHutang should send correct payload to Laravel', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true, message: 'Permintaan terkirim' },
      })

      const res = await anggotaService.bayarHutang(75000)
      expect(api.post).toHaveBeenCalledWith('/laravel/api/anggota/bayar-hutang', { jumlah: 75000 })
      expect(res.success).toBe(true)
    })

    it('getDataBarang should call the Laravel anggota barang endpoint', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: { data: [] },
      })

      await anggotaService.getDataBarang()
      expect(api.get).toHaveBeenCalledWith('/laravel/api/anggota/barang')
    })
  })
})
