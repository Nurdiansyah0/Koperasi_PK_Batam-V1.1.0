import React, { useEffect, useState, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  ShoppingCart,
  Receipt,
  Search,
  Copy,
  Check,
  Printer,
  Calendar,
  Flame,
  Zap,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Store,
  Warehouse,
  ArrowRight,
  TrendingUp,
  Download
} from 'lucide-react'
import { adminService } from '@/services/adminService'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatRupiah } from '@/lib/utils'
import type { PkmItem } from '@/types'

interface ShoppingCartItem {
  barang_id: number
  nama_barang: string
  total_sold: number
  stok_toko: number
  stok_gudang: number
  stok_total: number
  pkm: number
  harga_modal: number
  harga_jual: number
  jumlah_beli: number
  is_selected: boolean
}

export function ManajemenPkmPage() {
  const [items, setItems] = useState<PkmItem[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [days, setDays] = useState(7)
  const [leadTime, setLeadTime] = useState(4)
  const [viewMode, setViewMode] = useState<'checklist' | 'receipt'>('checklist')
  const [copiedSlip, setCopiedSlip] = useState(false)
  const [shoppingItems, setShoppingItems] = useState<ShoppingCartItem[]>([])
  const [autoCalculating, setAutoCalculating] = useState(false)

  const receiptRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await adminService.getPkmAnalysis({ days, lead_time_days: leadTime, search })
      if (res.success) {
        const rawData: PkmItem[] = res.data || []
        setItems(rawData)
        setSummary(res.summary || null)

        // Initialize shopping cart items
        const cart: ShoppingCartItem[] = rawData.map(item => {
          const buyQty = item.recommended_buy !== undefined ? item.recommended_buy : Math.max(0, (item.recommended_pkm * 2) - item.stok)
          return {
            barang_id: item.barang_id,
            nama_barang: item.nama_barang,
            total_sold: item.total_sold,
            stok_toko: item.stok_toko ?? Math.min(item.stok, item.pkm || 1),
            stok_gudang: item.stok_gudang ?? Math.max(0, item.stok - (item.pkm || 1)),
            stok_total: item.stok,
            pkm: item.pkm || 1,
            harga_modal: item.harga_modal,
            harga_jual: item.harga_jual,
            jumlah_beli: buyQty > 0 ? buyQty : (item.total_sold > 0 ? Math.ceil(item.ads * leadTime) : 0),
            is_selected: buyQty > 0 || (item.total_sold > 0 && item.stok < item.pkm * 2)
          }
        })
        setShoppingItems(cart)
      }
    } catch {
      toast.error('Gagal memuat rencana belanja kulakan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [days, leadTime])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadData()
  }

  // Toggle selection
  const toggleItemSelection = (barangId: number) => {
    setShoppingItems(prev => prev.map(item => 
      item.barang_id === barangId ? { ...item, is_selected: !item.is_selected } : item
    ))
  }

  // Update purchase quantity
  const updateBuyQty = (barangId: number, qty: number) => {
    setShoppingItems(prev => prev.map(item => 
      item.barang_id === barangId ? { ...item, jumlah_beli: Math.max(0, qty) } : item
    ))
  }

  // Active items selected for the shopping slip
  const activeSelectedItems = useMemo(() => {
    return shoppingItems.filter(i => i.is_selected && i.jumlah_beli > 0)
  }, [shoppingItems])

  // Budget calculations
  const totalBudgetSelected = useMemo(() => {
    return activeSelectedItems.reduce((acc, curr) => acc + (curr.jumlah_beli * curr.harga_modal), 0)
  }, [activeSelectedItems])

  const totalPiecesToBuy = useMemo(() => {
    return activeSelectedItems.reduce((acc, curr) => acc + curr.jumlah_beli, 0)
  }, [activeSelectedItems])

  // Copy shopping slip to WhatsApp
  const handleCopyWhatsAppSlip = () => {
    if (activeSelectedItems.length === 0) {
      toast.error('Pilih minimal 1 barang untuk dimasukkan ke struk')
      return
    }

    const lines = [
      `🛒 *STRUK RENCANA KULAKAN BELANJA*`,
      `*KOPERASI KARYAWAN PK BATAM*`,
      `Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`,
      `Basis Data: Penjualan ${days} Hari Terakhir (Buffer ${leadTime} Hari)`,
      `---------------------------------------`,
      ...activeSelectedItems.map((item, idx) => {
        const subtotal = item.jumlah_beli * item.harga_modal
        return `${idx + 1}. [ ] *${item.nama_barang}*\n   ├ Laku: ${item.total_sold} pcs | Sisa: ${item.stok_total} pcs (Toko: ${item.stok_toko}/Gudang: ${item.stok_gudang})\n   └ Beli: *${item.jumlah_beli} pcs* @ ${formatRupiah(item.harga_modal)} = *${formatRupiah(subtotal)}*`
      }),
      `---------------------------------------`,
      `*TOTAL BARANG DIBELI:* ${totalPiecesToBuy} pcs (${activeSelectedItems.length} SKU)`,
      `*ESTIMASI TOTAL BUDGET:* *${formatRupiah(totalBudgetSelected)}*`,
      `---------------------------------------`,
      `_Catatan: Siapkan uang kas / saldo debit koperasi sesuai estimasi._`
    ]

    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedSlip(true)
    toast.success('Struk belanja berhasil disalin ke clipboard WhatsApp!')
    setTimeout(() => setCopiedSlip(false), 3000)
  }

  // Print Receipt
  const handlePrintReceipt = () => {
    window.print()
  }

  // Auto calculate PKM backend sync
  const handleAutoCalculateAll = async () => {
    if (!window.confirm(`Kalkulasi otomatis batas PKM toko untuk seluruh produk berdasarkan penjualan ${days} hari terakhir (${leadTime} hari stok)?`)) {
      return
    }

    setAutoCalculating(true)
    try {
      const res = await adminService.autoCalculatePkm(days, leadTime)
      if (res.success) {
        toast.success(res.message || 'Batas PKM toko berhasil dihitung ulang!')
        loadData()
      } else {
        toast.error(res.error || 'Gagal menghitung PKM')
      }
    } catch {
      toast.error('Terjadi kesalahan kalkulasi')
    } finally {
      setAutoCalculating(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-20 max-w-5xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            Struk Rencana Kulakan Belanja
          </h1>
          <p className="text-xs text-slate-500">
            Daftar rekomendasi belanja kulakan ke grosir/distributor berdasarkan data barang laku & sisa stok.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex rounded-2xl bg-slate-100 dark:bg-zinc-800 p-1 text-xs w-full sm:w-auto shadow-2xs">
            <button
              onClick={() => setViewMode('checklist')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'checklist'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Lembar Kerja ({activeSelectedItems.length})
            </button>
            <button
              onClick={() => setViewMode('receipt')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'receipt'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Struk Belanja (Struk Kasir)
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Periode Analisis & Buffer Days */}
      <div className="p-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Basis Histori Penjualan:
            </span>
            {[3, 7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  days === d
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {d} Hari {d === 7 && '(Rekomendasi)'}
              </button>
            ))}
          </div>

          {/* Buffer Lead Time */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500 mr-1">Target Buffer:</span>
            {[4, 7].map(lt => (
              <button
                key={lt}
                onClick={() => setLeadTime(lt)}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  leadTime === lt
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {lt} Hari Stok {lt === 4 && '(PKM Toko)'}
              </button>
            ))}
          </div>
        </div>

        {/* Search Filter */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari rokok, sembako, atau snack..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border rounded-2xl text-xs bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="text-xs rounded-2xl px-4">
            Cari
          </Button>
          <Button 
            type="button" 
            size="sm" 
            onClick={handleAutoCalculateAll}
            disabled={autoCalculating}
            className="text-xs rounded-2xl bg-slate-800 dark:bg-zinc-700 text-white gap-1 shrink-0"
            title="Sinkronkan batas PKM display toko"
          >
            <Zap className={`w-3.5 h-3.5 ${autoCalculating ? 'animate-spin' : ''}`} />
            Sync PKM 4H
          </Button>
        </form>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-3xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">
              Estimasi Budget Modal
            </span>
            <span className="text-xl font-black text-blue-900 dark:text-blue-100">
              {formatRupiah(totalBudgetSelected)}
            </span>
          </div>
          <ShoppingCart className="w-7 h-7 text-blue-500 opacity-60" />
        </div>

        <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">
              Fisik yang Harus Dibeli
            </span>
            <span className="text-xl font-black text-emerald-900 dark:text-emerald-100">
              {totalPiecesToBuy} <span className="text-xs font-normal text-slate-500">pcs ({activeSelectedItems.length} SKU)</span>
            </span>
          </div>
          <Receipt className="w-7 h-7 text-emerald-500 opacity-60" />
        </div>

        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
              Aksi Cepat Struk
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={handleCopyWhatsAppSlip}
                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
              >
                {copiedSlip ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSlip ? 'Tersalin' : 'Salin WA'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrintReceipt}
                className="h-8 text-xs font-bold rounded-xl gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="w-8 h-8 mx-auto mb-2 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          Menganalisis pergerakan penjualan {days} hari terakhir...
        </div>
      ) : viewMode === 'checklist' ? (
        /* MODE 1: INTERACTIVE CHECKLIST TABLE */
        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-1 text-xs text-slate-500">
            <span>Daftar Barang ({shoppingItems.length} SKU ditemukan)</span>
            <span className="text-[11px]">Centang & sesuaikan jumlah sebelum belanja</span>
          </div>

          <div className="space-y-2">
            {shoppingItems.map(item => {
              const subtotal = item.jumlah_beli * item.harga_modal
              const isFastMoving = item.total_sold >= 10

              return (
                <div
                  key={item.barang_id}
                  className={`p-3.5 rounded-3xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.is_selected
                      ? 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 shadow-xs'
                      : 'bg-slate-50/60 dark:bg-zinc-900/40 border-slate-200/50 dark:border-zinc-800 opacity-60'
                  }`}
                >
                  {/* Left: Checkbox & Name */}
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleItemSelection(item.barang_id)}
                      className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0"
                    >
                      {item.is_selected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {item.nama_barang}
                        </span>
                        {isFastMoving && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-black flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5" /> Laris
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          Laku: {item.total_sold} pcs
                        </span>
                        <span>Sisa Total: <strong>{item.stok_total} pcs</strong> (Toko: {item.stok_toko} / Gudang: {item.stok_gudang})</span>
                        <span>Modal Kemarin: <strong>{formatRupiah(item.harga_modal)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity Input & Subtotal */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-7 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Beli:</span>
                      <input
                        type="number"
                        min="0"
                        value={item.jumlah_beli}
                        disabled={!item.is_selected}
                        onChange={e => updateBuyQty(item.barang_id, Number(e.target.value))}
                        className="w-16 px-2 py-1.5 border rounded-xl text-center text-xs font-black bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <span className="text-[11px] text-slate-400">pcs</span>
                    </div>

                    <div className="text-right min-w-[100px]">
                      <span className="text-[10px] text-slate-400 block">Subtotal Modal</span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {formatRupiah(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* MODE 2: STRUK BELANJA KASIR (THERMAL RECEIPT PAPER PREVIEW) */
        <div className="flex justify-center pt-2">
          <div
            ref={receiptRef}
            className="w-full max-w-md bg-white text-slate-900 p-6 rounded-3xl shadow-xl border border-slate-300 relative font-mono text-xs space-y-4 print:shadow-none print:border-none print:p-0"
          >
            {/* Receipt Header */}
            <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-300">
              <h2 className="font-black text-sm tracking-wider uppercase">
                KOPERASI KARYAWAN PT. PKPPK
              </h2>
              <p className="text-[11px] text-slate-600 font-sans">
                STRUK RENCANA KULAKAN BELANJA GROSIR
              </p>
              <div className="pt-2 text-[10px] text-slate-500 flex justify-between">
                <span>Tgl: {new Date().toLocaleDateString('id-ID', { dateStyle: 'short' })}</span>
                <span>Basis: {days} Hari Terakhir</span>
              </div>
            </div>

            {/* Receipt Items Table */}
            <div className="space-y-3 pt-1">
              {activeSelectedItems.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  Belum ada item yang dipilih untuk dibeli.
                </div>
              ) : (
                activeSelectedItems.map((item, idx) => {
                  const subtotal = item.jumlah_beli * item.harga_modal
                  return (
                    <div key={item.barang_id} className="space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>{idx + 1}. {item.nama_barang}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-600 pl-3.5">
                        <span>Laku: {item.total_sold} | Sisa: {item.stok_total} (T:{item.stok_toko}/G:{item.stok_gudang})</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold pl-3.5">
                        <span>➔ Beli {item.jumlah_beli} pcs @ {formatRupiah(item.harga_modal)}</span>
                        <span className="font-black">{formatRupiah(subtotal)}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Receipt Footer & Totals */}
            <div className="pt-3 border-t-2 border-dashed border-slate-300 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold">
                <span>TOTAL BARANG DIBELI:</span>
                <span>{totalPiecesToBuy} pcs ({activeSelectedItems.length} SKU)</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200">
                <span>ESTIMASI TOTAL BUDGET:</span>
                <span className="text-base text-blue-700">{formatRupiah(totalBudgetSelected)}</span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-4 text-center text-[10px] text-slate-500 border-t border-dashed border-slate-300 space-y-1">
              <p>*** DOKUMEN OPERASIONAL KULAKAN ***</p>
              <p>Bawa uang tunai / gunakan kartu debit koperasi sesuai total estimasi budget di atas.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManajemenPkmPage
