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

export function formatDateOnly(dateStr: string | number | Date | null | undefined): string {
  if (!dateStr) return '-'
  try {
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.substring(0, 10).split('-').map(Number)
      const d = new Date(parts[0], parts[1] - 1, parts[2])
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d)
    }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
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

/**
 * Prints an isolated DOM element via an ephemeral hidden iframe.
 * Eliminates all blank pages, modal clipping, SPA layout interference, and margin overflows.
 */
export function printCleanElement(elementId: string, title = 'Dokumen Koperasi PKP-PK') {
  const content = document.getElementById(elementId)
  if (!content) {
    window.print()
    return
  }

  // Clone content and remove interactive screen-only elements
  const clone = content.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.no-print').forEach(el => el.remove())

  // Create isolated invisible iframe
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) return

  // Gather stylesheet tags from parent document
  let stylesHtml = ''
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
    stylesHtml += node.outerHTML
  })

  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        ${stylesHtml}
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            font-family: Arial, "Segoe UI", Helvetica, sans-serif !important;
            font-size: 11px !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%; max-width: 100%; margin: 0; padding: 0;">
          ${clone.innerHTML}
        </div>
      </body>
    </html>
  `)
  doc.close()

  // Allow browser time to render styles and images (Logo.svg)
  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }, 2000)
  }, 400)
}

