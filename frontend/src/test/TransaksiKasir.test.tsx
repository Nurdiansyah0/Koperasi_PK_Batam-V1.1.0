import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransaksiKasir } from '@/pages/kasir/Transaksi'
import { kasirService } from '@/services/kasirService'

vi.mock('@/services/kasirService', () => ({
  kasirService: {
    getDataBarang: vi.fn(),
    getAllAnggota: vi.fn(),
    getPaketBelanja: vi.fn(),
    buatTransaksiKasir: vi.fn(),
  }
}))

window.matchMedia = window.matchMedia || function() {
    return { matches: false, addListener: function() {}, removeListener: function() {} };
};

describe('Fitur Keranjang Kasir (Transaksi POS)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(kasirService.getPaketBelanja).mockResolvedValue({ data: [], sering_dibeli: null } as any)

    vi.mocked(kasirService.getDataBarang).mockResolvedValue([
      { barang_id: 1, nama_barang: 'Kopi Kapal Api', stok: 10, harga_modal: 1000, harga_jual: 2000, harga: 2000 },
      { barang_id: 2, nama_barang: 'Indomie Goreng', stok: 5, harga_modal: 2000, harga_jual: 3000, harga: 3000 }
    ] as any)
    
    vi.mocked(kasirService.getAllAnggota).mockResolvedValue([
      { anggota_id: 1, nama: 'Budi Santoso', nama_lengkap: 'Budi Santoso', saldo: 50000, hutang: 10000, sisa_limit_hutang: 390000, user: { username: 'budi' } }
    ] as any)
  })

  it('bisa menampilkan daftar barang dari API', async () => {
    render(<TransaksiKasir />)
    await waitFor(() => {
      expect(screen.getByText('Kopi Kapal Api')).toBeInTheDocument()
      expect(screen.getByText('Indomie Goreng')).toBeInTheDocument()
    })
  })

  it('bisa menambahkan barang ke keranjang', async () => {
    const user = userEvent.setup()
    render(<TransaksiKasir />)
    
    await waitFor(() => expect(screen.getByText('Kopi Kapal Api')).toBeInTheDocument())
    await user.click(screen.getByText('Kopi Kapal Api'))
    
    await waitFor(() => {
      const allText = screen.getAllByText(/2\.000/i)
      expect(allText.length).toBeGreaterThan(0)
    })
  })
  
  it('mencegah checkout jika keranjang kosong', async () => {
    const user = userEvent.setup()
    render(<TransaksiKasir />)
    
    await waitFor(() => expect(screen.getByText('Kopi Kapal Api')).toBeInTheDocument())
    
    // Select Anggota
    const anggotaInput = screen.getByPlaceholderText('Ketik nama anggota...')
    await user.type(anggotaInput, 'Budi Santoso')
    const anggotaOption = await screen.findByText('Budi Santoso')
    await user.click(anggotaOption)

    const checkoutBtn = screen.getByText(/Proses Pembayaran/i)
    expect(checkoutBtn).toBeDisabled()
    await user.click(checkoutBtn)
    
    expect(kasirService.buatTransaksiKasir).not.toHaveBeenCalled()
  })

  it('bisa checkout dengan metode cash sukses', async () => {
    const user = userEvent.setup()
    vi.mocked(kasirService.buatTransaksiKasir).mockResolvedValue({ success: true, transaksi_id: 999 } as any)
    
    render(<TransaksiKasir />)
    await waitFor(() => expect(screen.getByText('Kopi Kapal Api')).toBeInTheDocument())
    
    await user.click(screen.getByText('Kopi Kapal Api'))
    
    await waitFor(() => {
      const allText = screen.getAllByText(/2\.000/i)
      expect(allText.length).toBeGreaterThan(0)
    })

    // Select Anggota
    const anggotaInput = screen.getByPlaceholderText('Ketik nama anggota...')
    await user.type(anggotaInput, 'Budi Santoso')
    const anggotaOption = await screen.findByText('Budi Santoso')
    await user.click(anggotaOption)

    const checkoutBtn = screen.getByText(/Proses Pembayaran/i)
    await user.click(checkoutBtn)
    
    await waitFor(() => {
      expect(kasirService.buatTransaksiKasir).toHaveBeenCalledWith(expect.objectContaining({
        anggota_id: 1,
        metode_pembayaran: 'cash',
        total: 2000
      }))
    })
  })

  it('bisa checkout dengan metode hutang jika anggota dipilih', async () => {
    const user = userEvent.setup()
    vi.mocked(kasirService.buatTransaksiKasir).mockResolvedValue({ success: true, transaksi_id: 100 } as any)
    
    render(<TransaksiKasir />)
    await waitFor(() => expect(screen.getByText('Kopi Kapal Api')).toBeInTheDocument())
    
    await user.click(screen.getByText('Kopi Kapal Api'))
    
    // Select Anggota
    const anggotaInput = screen.getByPlaceholderText('Ketik nama anggota...')
    await user.type(anggotaInput, 'Budi Santoso')
    const anggotaOption = await screen.findByText('Budi Santoso')
    await user.click(anggotaOption)
    
    // Select Metode Hutang
    await user.click(screen.getByText('Hutang'))
    
    const checkoutBtn = screen.getByText(/Proses Pembayaran/i)
    await user.click(checkoutBtn)
    
    await waitFor(() => {
      expect(kasirService.buatTransaksiKasir).toHaveBeenCalledWith(expect.objectContaining({
        anggota_id: 1,
        metode_pembayaran: 'hutang',
        total: 2000
      }))
    })
  })

  it('menonaktifkan checkout dan menampilkan peringatan jika plafon hutang tidak mencukupi', async () => {
    const user = userEvent.setup()
    // Anggota with 0 remaining debt limit
    vi.mocked(kasirService.getAllAnggota).mockResolvedValue([
      { anggota_id: 2, nama: 'Agus Zero Limit', nama_lengkap: 'Agus Zero Limit', saldo: 0, hutang: 400000, sisa_limit_hutang: 0, user: { username: 'agus' } }
    ] as any)

    render(<TransaksiKasir />)
    await waitFor(() => expect(screen.getByText('Kopi Kapal Api')).toBeInTheDocument())
    
    await user.click(screen.getByText('Kopi Kapal Api'))
    
    // Select Anggota
    const anggotaInput = screen.getByPlaceholderText('Ketik nama anggota...')
    await user.type(anggotaInput, 'Agus')
    const anggotaOption = await screen.findByText('Agus Zero Limit')
    await user.click(anggotaOption)
    
    // Select Metode Hutang
    await user.click(screen.getByText('Hutang'))
    
    // Should show Limit warning and disable submit
    expect(screen.getByText(/Plafon Hutang Melebihi Batas/i)).toBeInTheDocument()
    expect(screen.getByText(/Limit Hutang Tidak Cukup/i)).toBeDisabled()
  })
})
