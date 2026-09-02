import React, { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  ShoppingCart,
  Search,
  Copy,
  Check,
  Printer,
  Calendar,
  Flame,
  Zap,
  CheckSquare,
  Square,
  FileCheck2,
  Trash2,
  HelpCircle,
  ArrowRight
} from 'lucide-react'
import { adminService } from '@/services/adminService'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
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

interface InboundItem {
  barang_id: number
  nama_barang: string
  jumlah_tambah: number
  harga_beli_satuan: number
  alokasi: 'gudang' | 'toko' | 'auto'
  tanggal_kadaluarsa: string
}

export function ManajemenPkmPage() {
  const [items, setItems] = useState<PkmItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [days, setDays] = useState(7)
  const [leadTime, setLeadTime] = useState(4)
  const [copiedSlip, setCopiedSlip] = useState(false)
  const [shoppingItems, setShoppingItems] = useState<ShoppingCartItem[]>([])
  const [autoCalculating, setAutoCalculating] = useState(false)

  // Inbound Receiving Modal State (Catat Faktur Masuk Pasca Belanja)
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false)
  const [inboundItems, setInboundItems] = useState<InboundItem[]>([])
  const [inboundForm, setInboundForm] = useState({
    nomor_faktur: '',
    nama_supplier: '',
    sumber_dana: 'kas_koperasi',
    catatan: ''
  })
  const [savingInbound, setSavingInbound] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await adminService.getPkmAnalysis({ days, lead_time_days: leadTime, search })
      if (res.success) {
        const rawData: PkmItem[] = res.data || []
        setItems(rawData)

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
      toast.error('Gagal memuat rencana belanja')
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

  // Select / Deselect All
  const handleToggleSelectAll = () => {
    const allSelected = shoppingItems.every(i => i.is_selected)
    setShoppingItems(prev => prev.map(item => ({ ...item, is_selected: !allSelected })))
  }

  // Update purchase quantity
  const updateBuyQty = (barangId: number, qty: number) => {
    setShoppingItems(prev => prev.map(item => 
      item.barang_id === barangId ? { ...item, jumlah_beli: Math.max(0, qty) } : item
    ))
  }

  // Active items selected for the shopping list
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
      toast.error('Pilih minimal 1 barang untuk dimasukkan ke daftar belanja')
      return
    }

    const lines = [
      `🛒 *DAFTAR RENCANA KULAKAN BELANJA*`,
      `*KOPERASI KARYAWAN PT. PKPPK BATAM*`,
      `Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`,
      `Dasar Perhitungan: Penjualan ${days} Hari Terakhir`,
      `---------------------------------------`,
      ...activeSelectedItems.map((item, idx) => {
        const subtotal = item.jumlah_beli * item.harga_modal
        return `${idx + 1}. [ ] *${item.nama_barang}*\n   ├ Laku: ${item.total_sold} pcs | Sisa: ${item.stok_total} pcs (Toko: ${item.stok_toko} / Gudang: ${item.stok_gudang})\n   └ ➔ Beli: *${item.jumlah_beli} pcs* @ ${formatRupiah(item.harga_modal)} = *${formatRupiah(subtotal)}*`
      }),
      `---------------------------------------`,
      `*TOTAL BARANG DIBELI:* ${totalPiecesToBuy} pcs (${activeSelectedItems.length} SKU)`,
      `*ESTIMASI UANG BELANJA:* *${formatRupiah(totalBudgetSelected)}*`,
      `---------------------------------------`,
      `_Catatan: Siapkan uang kas tunai / debit sesuai estimasi di atas._`
    ]

    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedSlip(true)
    toast.success('Daftar belanja berhasil disalin ke clipboard WhatsApp!')
    setTimeout(() => setCopiedSlip(false), 3000)
  }

  // Print Shopping List
  const handlePrintReceipt = () => {
    window.print()
  }

  // Open Inbound Receiving Modal (Pre-filled from Shopping List)
  const handleOpenInboundModal = () => {
    if (activeSelectedItems.length === 0) {
      toast.error('Pilih minimal 1 barang yang dibeli untuk dicatat faktur masuknya')
      return
    }

    const initialInbound: InboundItem[] = activeSelectedItems.map(item => ({
      barang_id: item.barang_id,
      nama_barang: item.nama_barang,
      jumlah_tambah: item.jumlah_beli,
      harga_beli_satuan: item.harga_modal,
      alokasi: 'gudang',
      tanggal_kadaluarsa: ''
    }))

    setInboundItems(initialInbound)
    setInboundForm({
      nomor_faktur: `FAK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
      nama_supplier: '',
      sumber_dana: 'kas_koperasi',
      catatan: `Kulakan ${initialInbound.length} SKU per ${new Date().toLocaleDateString('id-ID')}`
    })
    setIsInboundModalOpen(true)
  }

  // Update Inbound Item Row
  const updateInboundRow = (barangId: number, field: keyof InboundItem, val: any) => {
    setInboundItems(prev => prev.map(item => 
      item.barang_id === barangId ? { ...item, [field]: val } : item
    ))
  }

  // Remove row from inbound
  const removeInboundRow = (barangId: number) => {
    setInboundItems(prev => prev.filter(item => item.barang_id !== barangId))
  }

  // Total Real Cost in Inbound Modal
  const totalInboundCost = useMemo(() => {
    return inboundItems.reduce((acc, curr) => acc + (curr.jumlah_tambah * curr.harga_beli_satuan), 0)
  }, [inboundItems])

  const totalInboundPieces = useMemo(() => {
    return inboundItems.reduce((acc, curr) => acc + curr.jumlah_tambah, 0)
  }, [inboundItems])

  // Submit Inbound Faktur (Bulk Restock)
  const handleSubmitInbound = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inboundItems.length === 0) {
      toast.error('Daftar barang masuk tidak boleh kosong')
      return
    }

    setSavingInbound(true)
    try {
      const payload = {
        nomor_faktur: inboundForm.nomor_faktur,
        nama_supplier: inboundForm.nama_supplier,
        sumber_dana: inboundForm.sumber_dana,
        catatan: inboundForm.catatan,
        items: inboundItems.map(item => ({
          barang_id: item.barang_id,
          jumlah_tambah: Number(item.jumlah_tambah),
          harga_beli_satuan: Number(item.harga_beli_satuan),
          alokasi: item.alokasi,
          tanggal_kadaluarsa: item.tanggal_kadaluarsa || undefined
        }))
      }

      const res = await adminService.bulkRestock(payload)
      if (res.success) {
        toast.success(res.message || 'Faktur kulakan berhasil dicatat dan stok bertambah!')
        setIsInboundModalOpen(false)
        loadData()
      } else {
        toast.error(res.message || 'Gagal mencatat faktur kulakan')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Terjadi kesalahan sistem saat mencatat faktur')
    } finally {
      setSavingInbound(false)
    }
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
            Rencana Belanja Kulakan
          </h1>
          <p className="text-xs text-slate-500">
            Daftar otomatis barang yang perlu dibeli ke supplier berdasarkan barang laku & sisa stok.
          </p>
        </div>

        {/* Action Button: Catat Faktur Masuk Pasca Belanja */}
        <Button
          onClick={handleOpenInboundModal}
          className="h-10 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl gap-2 shadow-sm w-full sm:w-auto"
        >
          <FileCheck2 className="w-4 h-4" />
          📥 Catat Barang Masuk ({activeSelectedItems.length} SKU)
        </Button>
      </div>

      {/* Panduan 3 Langkah Singkat (Zero-Confusion Guide) */}
      <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-3xl text-xs space-y-1 text-slate-700 dark:text-slate-300">
        <div className="font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-300">
          <HelpCircle className="w-4 h-4 text-blue-600" /> Cara Pakai Halaman Ini:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
          <div className="p-2 bg-white/80 dark:bg-zinc-900/80 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <strong className="text-blue-600 block">1. Cek & Sesuaikan</strong>
            Lihat daftar di bawah. Centang barang yang mau dibeli hari ini dan sesuaikan jumlah pcs-nya.
          </div>
          <div className="p-2 bg-white/80 dark:bg-zinc-900/80 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <strong className="text-blue-600 block">2. Bawa ke Pasar Grosir</strong>
            Klik tombol <strong>"Salin ke WA"</strong> atau <strong>"Cetak"</strong> untuk membawa daftar di HP.
          </div>
          <div className="p-2 bg-white/80 dark:bg-zinc-900/80 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <strong className="text-emerald-600 block">3. Pulang & Catat Stok</strong>
            Setelah barang fisik tiba, klik tombol hijau <strong>"📥 Catat Barang Masuk"</strong> untuk menambah stok sistem.
          </div>
        </div>
      </div>

      {/* Control Bar: Periode Analisis & Buffer Days */}
      <div className="p-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Hitung Penjualan:
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
                {d} Hari {d === 7 && '(Standar)'}
              </button>
            ))}
          </div>

          {/* Buffer Lead Time */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500 mr-1">Target Stok:</span>
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
                {lt} Hari {lt === 4 && '(PKM Toko)'}
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
              placeholder="Cari nama barang..."
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

      {/* Summary Banner (Estimasi Budget & Total Fisik) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-3xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">
              Estimasi Uang Modal Dibawa
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
              Total Fisik yang Harus Dibeli
            </span>
            <span className="text-xl font-black text-emerald-900 dark:text-emerald-100">
              {totalPiecesToBuy} <span className="text-xs font-normal text-slate-500">pcs ({activeSelectedItems.length} SKU)</span>
            </span>
          </div>
          <CheckSquare className="w-7 h-7 text-emerald-500 opacity-60" />
        </div>

        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
          <div className="space-y-1.5 w-full">
            <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
              Bawa Daftar Belanja:
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleCopyWhatsAppSlip}
                className="flex-1 h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
              >
                {copiedSlip ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSlip ? 'Tersalin!' : 'Salin ke WA'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrintReceipt}
                className="flex-1 h-8 text-xs font-bold rounded-xl gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Kertas
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: DAFTAR BARANG BELANJA */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="w-8 h-8 mx-auto mb-2 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          Menganalisis penjualan {days} hari terakhir...
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-1 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {shoppingItems.every(i => i.is_selected) ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
              <span>•</span>
              <span>{shoppingItems.length} SKU terdaftar</span>
            </div>
            <span className="text-[11px]">Centang & ubah angka beli sebelum belanja</span>
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
                        <span>Sisa: <strong>{item.stok_total} pcs</strong> (Toko: {item.stok_toko} / Gudang: {item.stok_gudang})</span>
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
      )}

      {/* MODAL INBOUND: CATAT PENERIMAAN BARANG MASUK (FAKTUR KULAKAN) */}
      <Modal
        isOpen={isInboundModalOpen}
        onClose={() => setIsInboundModalOpen(false)}
        title="📥 Catat Penerimaan Barang Masuk (Faktur Kulakan)"
      >
        <form onSubmit={handleSubmitInbound} className="space-y-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <FileCheck2 className="w-4 h-4 text-emerald-600" /> Verifikasi Faktur Grosir & Stok Masuk:
            </div>
            <p className="text-[11px] leading-relaxed">
              Sesuaikan jumlah riil yang dibeli, harga modal baru dari nota, dan tanggal expired lot. Stok sistem akan otomatis bertambah dan pengeluaran kas dicatat.
            </p>
          </div>

          {/* Global Invoice Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-zinc-800/80 rounded-2xl border border-slate-200 dark:border-zinc-700 text-xs">
            <Input
              label="Nomor Faktur / Nota Pembelian"
              value={inboundForm.nomor_faktur}
              onChange={e => setInboundForm({ ...inboundForm, nomor_faktur: e.target.value })}
              placeholder="Contoh: FAK-20260902-01"
              required
            />

            <Input
              label="Nama Toko Grosir / Supplier"
              value={inboundForm.nama_supplier}
              onChange={e => setInboundForm({ ...inboundForm, nama_supplier: e.target.value })}
              placeholder="Contoh: Indomarco / PT Surya Makmur Batam"
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sumber Dana Pengeluaran
              </label>
              <select
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white dark:bg-zinc-900 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                value={inboundForm.sumber_dana}
                onChange={e => setInboundForm({ ...inboundForm, sumber_dana: e.target.value })}
              >
                <option value="kas_koperasi">Kas Tunai Koperasi</option>
                <option value="rekening_bank">Rekening Bank Koperasi</option>
                <option value="dana_talangan">Dana Talangan Pengurus</option>
              </select>
            </div>

            <Input
              label="Catatan Tambahan (Opsional)"
              value={inboundForm.catatan}
              onChange={e => setInboundForm({ ...inboundForm, catatan: e.target.value })}
              placeholder="Contoh: Pembelian sembako promo distributor"
            />
          </div>

          {/* Items Inbound Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300 px-1">
              <span>Rincian Barang Diterima ({inboundItems.length} SKU)</span>
              <span>Total Fisik: {totalInboundPieces} pcs</span>
            </div>

            <div className="max-h-[35vh] overflow-y-auto space-y-2.5 pr-1">
              {inboundItems.map((item, idx) => {
                const subtotal = item.jumlah_tambah * item.harga_beli_satuan

                return (
                  <div
                    key={item.barang_id}
                    className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xs space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {idx + 1}. {item.nama_barang}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeInboundRow(item.barang_id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Hapus item dari faktur"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Jumlah (Pcs)</label>
                        <input
                          type="number"
                          min="1"
                          value={item.jumlah_tambah}
                          onChange={e => updateInboundRow(item.barang_id, 'jumlah_tambah', Math.max(1, Number(e.target.value)))}
                          className="w-full px-2 py-1 border rounded-xl text-xs font-black bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Harga Beli Satuan</label>
                        <input
                          type="number"
                          min="0"
                          value={item.harga_beli_satuan}
                          onChange={e => updateInboundRow(item.barang_id, 'harga_beli_satuan', Math.max(0, Number(e.target.value)))}
                          className="w-full px-2 py-1 border rounded-xl text-xs font-semibold bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Alokasi Stok</label>
                        <select
                          value={item.alokasi}
                          onChange={e => updateInboundRow(item.barang_id, 'alokasi', e.target.value)}
                          className="w-full px-2 py-1 border rounded-xl text-[11px] font-semibold bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 outline-none"
                        >
                          <option value="gudang">📦 Gudang</option>
                          <option value="toko">🏪 Toko</option>
                          <option value="auto">⚡ Auto PKM</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Expired Batch</label>
                        <input
                          type="date"
                          value={item.tanggal_kadaluarsa}
                          onChange={e => updateInboundRow(item.barang_id, 'tanggal_kadaluarsa', e.target.value)}
                          className="w-full px-2 py-1 border rounded-xl text-[11px] bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-zinc-800 text-[11px]">
                      <span className="text-slate-400">Subtotal:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{formatRupiah(subtotal)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Inbound Summary & Actions */}
          <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-2xl flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500 block">Total Pengeluaran Faktur:</span>
              <span className="text-base font-black text-rose-600 dark:text-rose-400">{formatRupiah(totalInboundCost)}</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsInboundModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" loading={savingInbound} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4">
                <Check className="w-4 h-4 mr-1.5" /> Simpan Faktur Masuk
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ManajemenPkmPage
