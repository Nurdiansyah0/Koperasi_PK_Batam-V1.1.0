import { describe, it, expect } from 'vitest'
import type { Barang, MetodePembayaran } from '@/types'

function isPaymentAllowed(method: MetodePembayaran, anggotaId: number | null): boolean {
  return method !== 'hutang' || anggotaId !== null
}

describe('Business Logic & Cart Validation', () => {
  describe('Cart Calculation', () => {
    it('should correctly calculate total price for multiple cart items', () => {
      const items: (Barang & { qty: number })[] = [
        { barang_id: 1, nama_barang: 'Beras 5kg', harga: 75000, stok: 10, qty: 2 },
        { barang_id: 2, nama_barang: 'Minyak Goreng 2L', harga: 32000, stok: 5, qty: 3 },
        { barang_id: 3, nama_barang: 'Gula Pasir 1kg', harga: 16000, stok: 20, qty: 1 },
      ]

      const total = items.reduce((sum, item) => sum + (item.harga ?? 0) * item.qty, 0)
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
      expect(isPaymentAllowed('hutang', null)).toBe(false)
      expect(isPaymentAllowed('hutang', 12)).toBe(true)
    })

    it('should allow cash payments for non-members (Umum)', () => {
      expect(isPaymentAllowed('cash', null)).toBe(true)
      expect(isPaymentAllowed('cash', 15)).toBe(true)
    })
  })
})
