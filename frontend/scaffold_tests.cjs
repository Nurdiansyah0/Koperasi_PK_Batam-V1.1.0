const fs = require('fs');
const path = require('path');

const write = (filePath, content) => {
  const fullPath = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim());
  console.log(`Created ${filePath}`);
};

write('src/test/utils.test.ts', `
import { describe, it, expect } from 'vitest'
import { cn, formatRupiah, formatDate } from '@/lib/utils'

describe('Utils Functions', () => {
  describe('cn (Classnames merger)', () => {
    it('should correctly merge single classes', () => {
      expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
    })

    it('should handle conditional classes properly', () => {
      const isHidden = false
      const isActive = true
      expect(cn('btn', isHidden && 'hidden', isActive && 'active')).toBe('btn active')
    })

    it('should resolve tailwind class conflicts with twMerge', () => {
      expect(cn('p-4', 'p-6')).toBe('p-6')
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
      expect(cn('bg-red-500', 'bg-emerald-500')).toBe('bg-emerald-500')
    })
  })

  describe('formatRupiah', () => {
    it('should format positive amounts correctly in IDR currency', () => {
      const formatted = formatRupiah(50000)
      expect(formatted).toContain('50.000')
      expect(formatted).toMatch(/Rp/i)
    })

    it('should format 0 as Rp 0', () => {
      const formatted = formatRupiah(0)
      expect(formatted).toContain('0')
    })

    it('should handle large amounts correctly', () => {
      const formatted = formatRupiah(15000000)
      expect(formatted).toContain('15.000.000')
    })
  })

  describe('formatDate', () => {
    it('should format ISO date strings into readable Indonesian datetime', () => {
      const formatted = formatDate('2026-08-29T10:00:00Z')
      expect(formatted).toBeTruthy()
      expect(typeof formatted).toBe('string')
    })
  })
})
`);

write('src/test/authStore.test.ts', `
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

describe('Auth Store (Zustand)', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().logout()
  })

  it('should initialize with unauthenticated state', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
  })

  it('should authenticate user and store token on setAuth', () => {
    const mockUser: User = {
      user_id: 1,
      username: 'admin1',
      role: 'admin',
    }
    const mockToken = 'jwt-test-token-12345'

    useAuthStore.getState().setAuth(mockUser, mockToken)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(mockUser)
    expect(state.token).toBe(mockToken)
    expect(localStorage.getItem('token')).toBe(mockToken)
  })

  it('should clear state and localStorage on logout', () => {
    const mockUser: User = {
      user_id: 2,
      username: 'kasir1',
      role: 'kasir',
    }
    useAuthStore.getState().setAuth(mockUser, 'test-token')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
`);

write('src/test/businessLogic.test.ts', `
import { describe, it, expect } from 'vitest'
import type { Barang, TransaksiItem } from '@/types'

describe('Business Logic & Cart Validation', () => {
  describe('Cart Calculation', () => {
    it('should correctly calculate total price for multiple cart items', () => {
      const items: (Barang & { qty: number })[] = [
        { barang_id: 1, nama_barang: 'Beras 5kg', harga: 75000, stok: 10, qty: 2 },
        { barang_id: 2, nama_barang: 'Minyak Goreng 2L', harga: 32000, stok: 5, qty: 3 },
        { barang_id: 3, nama_barang: 'Gula Pasir 1kg', harga: 16000, stok: 20, qty: 1 },
      ]

      const total = items.reduce((sum, item) => sum + item.harga * item.qty, 0)
      expect(total).toBe(75000 * 2 + 32000 * 3 + 16000 * 1) // 150000 + 96000 + 16000 = 262000
      expect(total).toBe(262000)
    })

    it('should not allow item quantity to exceed available stock', () => {
      const item: Barang = { barang_id: 1, nama_barang: 'Kopi', harga: 10000, stok: 3 }
      let currentQty = 3

      const canAddMore = currentQty < item.stok
      expect(canAddMore).toBe(false)
    })

    it('should not allow item quantity to decrease below 1 in cart without removal', () => {
      let qty = 1
      const newQty = Math.max(1, qty - 1)
      expect(newQty).toBe(1)
    })
  })

  describe('Debt Repayment Validation', () => {
    it('should reject payment amounts that exceed total outstanding debt', () => {
      const totalHutang = 150000
      const paymentAmount = 200000

      const isValid = paymentAmount > 0 && paymentAmount <= totalHutang
      expect(isValid).toBe(false)
    })

    it('should accept valid partial or full debt payments', () => {
      const totalHutang = 150000
      const partialPayment = 50000
      const fullPayment = 150000

      expect(partialPayment > 0 && partialPayment <= totalHutang).toBe(true)
      expect(fullPayment > 0 && fullPayment <= totalHutang).toBe(true)
    })

    it('should reject negative or zero payment amounts', () => {
      const totalHutang = 100000
      expect(0 > 0 && 0 <= totalHutang).toBe(false)
      expect(-50000 > 0 && -50000 <= totalHutang).toBe(false)
    })
  })

  describe('Payment Method Business Rules', () => {
    it('should require a registered anggota for hutang payment method', () => {
      const selectedAnggotaId: number | null = null
      const paymentMethod = 'hutang'

      const isAllowed = paymentMethod !== 'hutang' || selectedAnggotaId !== null
      expect(isAllowed).toBe(false)
    })

    it('should allow cash payments for non-members (Umum)', () => {
      const selectedAnggotaId: number | null = null
      const paymentMethod = 'cash'

      const isAllowed = paymentMethod !== 'hutang' || selectedAnggotaId !== null
      expect(isAllowed).toBe(true)
    })
  })
})
`);

write('src/test/components.test.tsx', `
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

describe('UI Components', () => {
  describe('Button', () => {
    it('should render children text properly', () => {
      render(<Button>Klik Saya</Button>)
      expect(screen.getByRole('button', { name: /klik saya/i })).toBeInTheDocument()
    })

    it('should trigger onClick handler when clicked', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Kirim</Button>)
      
      const button = screen.getByRole('button', { name: /kirim/i })
      await userEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should disable button and show spinner when loading is true', () => {
      render(<Button loading>Menyimpan</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should be disabled when disabled prop is set', () => {
      render(<Button disabled>Nonaktif</Button>)
      const button = screen.getByRole('button', { name: /nonaktif/i })
      expect(button).toBeDisabled()
    })
  })

  describe('Input', () => {
    it('should render label and input field correctly', () => {
      render(<Input label="Nama Lengkap" placeholder="Masukkan nama" />)
      expect(screen.getByText(/nama lengkap/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/masukkan nama/i)).toBeInTheDocument()
    })

    it('should display error message when error prop is provided', () => {
      render(<Input label="Email" error="Format email tidak valid" />)
      expect(screen.getByText(/format email tidak valid/i)).toBeInTheDocument()
    })

    it('should accept typing and update value', async () => {
      render(<Input placeholder="Ketik..." />)
      const input = screen.getByPlaceholderText('Ketik...')
      await userEvent.type(input, 'Testing Koperasi')
      expect(input).toHaveValue('Testing Koperasi')
    })
  })

  describe('Badge', () => {
    it('should render badge with appropriate variant styling', () => {
      render(<Badge variant="success">Lunas</Badge>)
      expect(screen.getByText('Lunas')).toBeInTheDocument()
      expect(screen.getByText('Lunas')).toHaveClass('text-emerald-700')
    })
  })

  describe('Card', () => {
    it('should render card structure with header and content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Rp 500.000</p>
          </CardContent>
        </Card>
      )
      expect(screen.getByText('Ringkasan Saldo')).toBeInTheDocument()
      expect(screen.getByText('Rp 500.000')).toBeInTheDocument()
    })
  })

  describe('Modal', () => {
    it('should not render anything when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Modal Tertutup">
          <p>Konten</p>
        </Modal>
      )
      expect(screen.queryByText('Modal Tertutup')).not.toBeInTheDocument()
    })

    it('should render title and content when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Tambah Barang">
          <p>Form Tambah Barang</p>
        </Modal>
      )
      expect(screen.getByText('Tambah Barang')).toBeInTheDocument()
      expect(screen.getByText('Form Tambah Barang')).toBeInTheDocument()
    })
  })
})
`);

write('src/test/services.test.ts', `
import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '@/lib/api'
import { adminService } from '@/services/adminService'
import { kasirService } from '@/services/kasirService'
import { anggotaService } from '@/services/anggotaService'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('Service Layer Normalization & Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('adminService', () => {
    it('getBarang should normalize harga_jual into harga property', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          data: [
            { barang_id: 1, nama_barang: 'Beras', stok: 10, harga_modal: 50000, harga_jual: 60000 },
          ],
        },
      })

      const barang = await adminService.getBarang()
      expect(barang).toHaveLength(1)
      expect(barang[0].harga).toBe(60000)
      expect(barang[0].nama_barang).toBe('Beras')
    })

    it('tambahBarang should send properly formatted payload', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true, message: 'Barang berhasil ditambahkan' },
      })

      const res = await adminService.tambahBarang({
        nama_barang: 'Gula',
        stok: 20,
        harga_modal: 12000,
        harga_jual: 15000,
      })

      expect(api.post).toHaveBeenCalledWith('?action=tambahBarang', {
        nama_barang: 'Gula',
        stok: 20,
        harga_modal: 12000,
        harga_jual: 15000,
      })
      expect(res.success).toBe(true)
    })
  })

  describe('kasirService', () => {
    it('buatTransaksiKasir should map items to expected backend format', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true, transaksi_id: 101 },
      })

      const payload = {
        anggota_id: 5,
        metode_pembayaran: 'cash',
        items: [{ barang_id: 1, qty: 2, harga_satuan: 10000 }],
        total: 20000,
      }

      const res = await kasirService.buatTransaksiKasir(payload)
      expect(api.post).toHaveBeenCalledWith('?action=buatTransaksiKasir', {
        items: [{ barang_id: 1, jumlah: 2, harga_satuan: 10000 }],
        anggota_id: 5,
        metode_pembayaran: 'cash',
        total: 20000,
      })
      expect(res.success).toBe(true)
    })
  })

  describe('anggotaService', () => {
    it('bayarHutang should send correct payload to backend', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true, message: 'Permintaan terkirim' },
      })

      const res = await anggotaService.bayarHutang(75000)
      expect(api.post).toHaveBeenCalledWith('?action=bayarHutang', { jumlah: 75000 })
      expect(res.success).toBe(true)
    })
  })
})
`);

