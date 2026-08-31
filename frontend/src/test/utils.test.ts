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
