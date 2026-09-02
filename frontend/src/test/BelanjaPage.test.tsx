import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BelanjaPage } from '@/pages/anggota/Belanja'
import { anggotaService } from '@/services/anggotaService'

vi.mock('@/services/anggotaService', () => ({
  anggotaService: {
    getDataBarang: vi.fn(),
    getPaketBelanja: vi.fn(),
    simpanTransaksi: vi.fn(),
    cekKelayakanTarikTunai: vi.fn().mockResolvedValue({ success: true, data: { saldo_shu: 100000, saldo_ewallet: 50000, hutang: 0 } }),
  }
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: { username: 'nurdiansyah', anggota_id: 1 }
  })
}))

window.matchMedia = window.matchMedia || function() {
  return { matches: false, addListener: function() {}, removeListener: function() {} };
};

describe('Fitur Belanja Anggota & Paket Genap', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(anggotaService.getDataBarang).mockResolvedValue([
      { barang_id: 53, nama_barang: 'Kopi', stok: 10, harga_jual: 3500, harga: 3500 },
      { barang_id: 57, nama_barang: 'Gula sachet', stok: 20, harga_jual: 500, harga: 500 },
      { barang_id: 40, nama_barang: 'Indomie Goreng', stok: 15, harga_jual: 4000, harga: 4000 },
    ] as any)

    vi.mocked(anggotaService.getPaketBelanja).mockResolvedValue({
      data: [
        {
          id: 'ngopi_manis',
          nama_paket: 'Paket Ngopi Manis Pas',
          deskripsi: 'Kopi seduh hitam + gula sachet pas.',
          tag: 'Genap Pas Rp 4.000',
          icon: '☕',
          total_harga: 4000,
          items: [
            { barang_id: 53, nama_barang: 'Kopi', jumlah: 1, qty: 1, harga_satuan: 3500, subtotal: 3500, stok_tersedia: 10 },
            { barang_id: 57, nama_barang: 'Gula sachet', jumlah: 1, qty: 1, harga_satuan: 500, subtotal: 500, stok_tersedia: 20 }
          ],
          is_available: true
        }
      ],
      sering_dibeli: {
        id: 'sering_dibeli',
        nama_paket: 'Yang Sering Anda Beli',
        deskripsi: 'Kombinasi barang yang sering dibeli.',
        tag: 'Sering Anda Beli',
        icon: '⭐',
        total_harga: 4000,
        items: [
          { barang_id: 53, nama_barang: 'Kopi', jumlah: 1, qty: 1, harga_satuan: 3500, subtotal: 3500, stok_tersedia: 10 }
        ],
        is_available: true
      }
    } as any)
  })

  it('menampilkan carousel paket belanja genap & sering dibeli di bawah search bar', async () => {
    render(<BelanjaPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/Paket Belanja Genap & Yang Sering Anda Beli/i)).toBeInTheDocument()
      expect(screen.getByText('Paket Ngopi Manis Pas')).toBeInTheDocument()
      expect(screen.getByText('Yang Sering Anda Beli')).toBeInTheDocument()
    })
  })

  it('bisa menambahkan seluruh item paket ke keranjang dalam 1 klik', async () => {
    const user = userEvent.setup()
    render(<BelanjaPage />)

    await waitFor(() => {
      expect(screen.getByText('Paket Ngopi Manis Pas')).toBeInTheDocument()
    })

    const tambahButtons = screen.getAllByRole('button', { name: /\+ Tambah Paket/i })
    await user.click(tambahButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Total Tagihan:')).toBeInTheDocument()
    })
  })
})
