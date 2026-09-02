import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number | null | undefined): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0)
}

export function formatDate(dateStr: string | number | Date | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return String(dateStr)
  }
}

/**
 * Formats a number or numeric string with thousand separator dots (e.g. 50000 -> "50.000")
 */
export function formatThousands(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return ''
  const cleanStr = val.toString().replace(/\D/g, '')
  if (!cleanStr) return ''
  return new Intl.NumberFormat('id-ID').format(Number(cleanStr))
}

/**
 * Parses a string with thousand separators back to a plain integer (e.g. "50.000" -> 50000)
 */
export function parseThousands(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0
  const cleanStr = val.toString().replace(/\D/g, '')
  return cleanStr ? Number(cleanStr) : 0
}
