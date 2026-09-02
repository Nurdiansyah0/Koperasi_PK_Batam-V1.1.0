import { useEffect, useState } from 'react'
import { adminService } from '@/services/adminService'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { LaporanTransaksi as LaporanTransaksiType, TransaksiLaporanItem } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { IosBottomSheet } from '@/components/ios/IosBottomSheet'
import {
  Search, Calendar, Download, Printer, RotateCcw,
  TrendingUp, ShoppingBag, CreditCard, Wallet, Users,
  ArrowUpRight, Store, Eye, CheckCircle2, SlidersHorizontal,
  ChevronLeft, ChevronRight, FileText, BarChart3, X, Check
} from 'lucide-react'
import toast from 'react-hot-toast'

export function LaporanTransaksi() {
  const [data, setData] = useState<LaporanTransaksiType | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'transaksi' | 'kasir' | 'harian'>('transaksi')
  
  // Filter States
  const [tglMulai, setTglMulai] = useState('')
  const [tglSelesai, setTglSelesai] = useState('')
  const [metode, setMetode] = useState('all')
  const [pembeliType, setPembeliType] = useState('all')
  const [kasirId, setKasirId] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(20)
  const [activePreset, setActivePreset] = useState<string>('this_month')

  // Mobile Filter Sheet State
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // Temporary filter state for bottom sheet before applying
  const [draftFilters, setDraftFilters] = useState({
    tglMulai: '',
    tglSelesai: '',
    metode: 'all',
    pembeliType: 'all',
    kasirId: 'all',
    activePreset: 'this_month'
  })

  // Detail Modal State
  const [selectedTrx, setSelectedTrx] = useState<TransaksiLaporanItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Helper date formatting YYYY-MM-DD
  const formatYmd = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Set Preset Dates
  const getPresetDates = (preset: string) => {
    const now = new Date()
    if (preset === 'today') {
      const todayStr = formatYmd(now)
      return { start: todayStr, end: todayStr }
    } else if (preset === 'yesterday') {
      const yest = new Date(now)
      yest.setDate(yest.getDate() - 1)
      const yestStr = formatYmd(yest)
      return { start: yestStr, end: yestStr }
    } else if (preset === '7days') {
      const past = new Date(now)
      past.setDate(past.getDate() - 6)
      return { start: formatYmd(past), end: formatYmd(now) }
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: formatYmd(firstDay), end: formatYmd(now) }
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: formatYmd(firstDayLastMonth), end: formatYmd(lastDayLastMonth) }
    }
    return { start: '', end: '' }
  }

  const applyPreset = (preset: string) => {
    setActivePreset(preset)
    setPage(1)
    const dates = getPresetDates(preset)
    setTglMulai(dates.start)
    setTglSelesai(dates.end)
  }

  const loadData = async (targetPage = page) => {
    setLoading(true)
    try {
      const res = await adminService.getLaporanTransaksi({
        tanggal_awal: tglMulai || undefined,
        tanggal_akhir: tglSelesai || undefined,
        metode_pembayaran: metode !== 'all' ? metode : undefined,
        pembeli_type: pembeliType !== 'all' ? pembeliType : undefined,
        kasir_id: kasirId !== 'all' ? kasirId : undefined,
        search: search.trim() || undefined,
        page: targetPage,
        per_page: perPage
      })
      setData(res)
    } catch (e) {
      console.error(e)
      toast.error('Gagal memuat laporan transaksi')
    } finally {
      setLoading(false)
    }
  }

  // Load default preset on initial mount
  useEffect(() => {
    applyPreset('this_month')
  }, [])

  // Refetch when filters or page change
  useEffect(() => {
    loadData(page)
  }, [tglMulai, tglSelesai, metode, pembeliType, kasirId, page, perPage])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadData(1)
  }

  const handleResetFilter = () => {
    setSearch('')
    setMetode('all')
    setPembeliType('all')
    setKasirId('all')
    applyPreset('this_month')
  }

  // Open Filter Bottom Sheet and sync draft state
  const handleOpenFilterSheet = () => {
    setDraftFilters({
      tglMulai,
      tglSelesai,
      metode,
      pembeliType,
      kasirId,
      activePreset
    })
    setIsFilterSheetOpen(true)
  }

  // Apply filters from Bottom Sheet
  const handleApplyDraftFilters = () => {
    setTglMulai(draftFilters.tglMulai)
    setTglSelesai(draftFilters.tglSelesai)
    setMetode(draftFilters.metode)
    setPembeliType(draftFilters.pembeliType)
    setKasirId(draftFilters.kasirId)
    setActivePreset(draftFilters.activePreset)
    setPage(1)
    setIsFilterSheetOpen(false)
  }

  // Count active non-default filters
  let activeFilterCount = 0
  if (metode !== 'all') activeFilterCount++
  if (pembeliType !== 'all') activeFilterCount++
  if (kasirId !== 'all') activeFilterCount++
  if (activePreset === 'custom' || (tglMulai && activePreset !== 'this_month')) activeFilterCount++
  if (search.trim()) activeFilterCount++

  // Export to CSV
  const handleExportCsv = async () => {
    try {
      toast.loading('Menyiapkan file ekspor...', { id: 'export' })
      const res = await adminService.getLaporanTransaksi({
        tanggal_awal: tglMulai || undefined,
        tanggal_akhir: tglSelesai || undefined,
        metode_pembayaran: metode !== 'all' ? metode : undefined,
        pembeli_type: pembeliType !== 'all' ? pembeliType : undefined,
        kasir_id: kasirId !== 'all' ? kasirId : undefined,
        search: search.trim() || undefined,
        per_page: 'all'
      })

      const items = res.data || []
      if (!items.length) {
        toast.error('Tidak ada data transaksi untuk diekspor', { id: 'export' })
        return
      }

      // Build CSV String with UTF-8 BOM for Excel
      const headers = [
        'ID Transaksi',
        'Tanggal & Waktu',
        'Tipe Pembeli',
        'Nama Pelanggan',
        'Nomor Anggota',
        'Kasir',
        'Metode Pembayaran',
        'Status',
        'Total Belanja (Rp)',
        'Estimasi Laba (Rp)',
        'Rincian Barang'
      ]

      const rows = items.map(t => {
        const itemDetails = (t.items || []).map(i => `${i.nama_barang} (${i.jumlah} ${i.satuan || 'pcs'} @ Rp ${i.harga_satuan})`).join('; ')
        return [
          `#${t.transaksi_id}`,
          `"${t.created_at ? formatDate(t.created_at) : '-'}"`,
          t.anggota_id ? 'Anggota' : 'Umum',
          `"${(t.nama_anggota || 'Pelanggan Umum').replace(/"/g, '""')}"`,
          t.nomor_anggota ? `"${t.nomor_anggota}"` : '-',
          `"${t.kasir_username || 'Kasir'}"`,
          t.metode_pembayaran.toUpperCase(),
          t.status || 'selesai',
          t.total_harga,
          t.total_keuntungan || 0,
          `"${itemDetails.replace(/"/g, '""')}"`
        ].join(',')
      })

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const fileName = `Laporan_Transaksi_${tglMulai || 'Awal'}_sd_${tglSelesai || 'Akhir'}.csv`
      link.setAttribute('href', url)
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Ekspor data berhasil diunduh!', { id: 'export' })
    } catch {
      toast.error('Gagal mengekspor data laporan', { id: 'export' })
    }
  }

  // Method Badge Render Helper
  const renderMetodeBadge = (m: string) => {
    switch (m?.toLowerCase()) {
      case 'cash':
        return <Badge variant="success">💵 Tunai</Badge>
      case 'ewallet':
        return <Badge variant="info">📱 E-Wallet</Badge>
      case 'hutang':
        return <Badge variant="danger">💳 Piutang</Badge>
      case 'qr':
        return <Badge variant="purple">⚡ QRIS</Badge>
      case 'transfer':
        return <Badge variant="default">🏦 Transfer</Badge>
      default:
        return <Badge variant="default">{m || '-'}</Badge>
    }
  }

  const summary = data?.summary || {
    total_transaksi: 0,
    total_pendapatan: 0,
    total_keuntungan: 0,
    total_hpp: 0,
    total_hutang: 0,
    total_cash: 0,
    total_ewallet: 0,
    total_qr: 0,
    total_transfer: 0,
    omset_anggota: 0,
    omset_umum: 0,
    avg_transaksi: 0
  }

  const kasLikuid = (summary.total_cash || 0) + (summary.total_ewallet || 0) + (summary.total_qr || 0) + (summary.total_transfer || 0)
  const marginPercent = summary.total_pendapatan > 0 
    ? ((summary.total_keuntungan / summary.total_pendapatan) * 100).toFixed(1) 
    : '0.0'

  const pagination = data?.pagination || { current_page: 1, last_page: 1, total: 0, per_page: 20 }

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-7xl mx-auto">
      
      {/* ── Page Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            Laporan Transaksi & Omset
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Audit omset POS, HPP, margin laba kotor, dan arsip struk penjualan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportCsv} 
            className="text-xs font-bold gap-1.5 h-9 rounded-xl border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden xs:inline">Export</span> CSV
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.print()} 
            className="text-xs font-bold gap-1.5 h-9 rounded-xl border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            Cetak
          </Button>
        </div>
      </div>

      {/* ── Mobile-First Unified Search & Filter Bar ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {/* Main Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari no. struk / nama / kasir..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Trigger Filter Bottom Sheet */}
          <button
            onClick={handleOpenFilterSheet}
            className={`h-[42px] px-3.5 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all shrink-0 active:scale-95 ${
              activeFilterCount > 0
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Swipeable Horizontal Filter Pills (Thumb-friendly) ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: 'yesterday', label: 'Kemarin' },
            { id: '7days', label: '7 Hari' },
            { id: 'this_month', label: 'Bulan Ini' },
            { id: 'last_month', label: 'Bulan Lalu' },
            { id: 'all', label: 'Semua Waktu' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-[11px] shrink-0 active:scale-95 ${
                activePreset === p.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}

          <div className="w-px h-5 bg-slate-200 dark:bg-zinc-800 shrink-0 mx-0.5" />

          {/* Quick Payment Method Pills */}
          {[
            { id: 'all', label: 'Semua Bayar' },
            { id: 'cash', label: '💵 Tunai' },
            { id: 'ewallet', label: '📱 E-Wallet' },
            { id: 'hutang', label: '💳 Piutang' },
            { id: 'qr', label: '⚡ QRIS' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => { setMetode(m.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-[11px] shrink-0 active:scale-95 ${
                metode === m.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* ── Active Filter Tags (Dismissible) ── */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-400 text-[10px] font-bold uppercase">Filter Aktif:</span>

            {metode !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900">
                Bayar: {metode.toUpperCase()}
                <X className="w-3 h-3 cursor-pointer hover:text-blue-900" onClick={() => setMetode('all')} />
              </span>
            )}

            {pembeliType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-900">
                Tipe: {pembeliType === 'anggota' ? 'Anggota' : 'Umum'}
                <X className="w-3 h-3 cursor-pointer hover:text-purple-900" onClick={() => setPembeliType('all')} />
              </span>
            )}

            {kasirId !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-900">
                Kasir: {(data?.daftar_kasir || []).find(k => String(k.user_id) === String(kasirId))?.username || kasirId}
                <X className="w-3 h-3 cursor-pointer hover:text-emerald-900" onClick={() => setKasirId('all')} />
              </span>
            )}

            {activePreset === 'custom' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-900">
                {tglMulai || 'Awal'} s/d {tglSelesai || 'Kini'}
                <X className="w-3 h-3 cursor-pointer hover:text-amber-900" onClick={() => applyPreset('this_month')} />
              </span>
            )}

            <button
              onClick={handleResetFilter}
              className="text-[10px] text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded transition-colors"
            >
              Reset Semua
            </button>
          </div>
        )}
      </div>

      {/* ── 6-Card Executive Financial Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Omset */}
        <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Omset</span>
            <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
            {formatRupiah(summary.total_pendapatan)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">
            {summary.total_transaksi} struk selesai
          </p>
        </div>

        {/* HPP */}
        <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HPP / Modal</span>
            <div className="p-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600">
              <Store className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300 leading-tight">
            {formatRupiah(summary.total_hpp)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">
            Beban pokok barang
          </p>
        </div>

        {/* Laba Kotor */}
        <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Laba Kotor</span>
            <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 leading-tight">
            {formatRupiah(summary.total_keuntungan)}
          </h3>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">
            Margin: {marginPercent}%
          </p>
        </div>

        {/* Kas Likuid */}
        <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kas Likuid</span>
            <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 leading-tight">
            {formatRupiah(kasLikuid)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">
            Tunai, E-Wallet, QRIS
          </p>
        </div>

        {/* Piutang Baru */}
        <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Piutang Baru</span>
            <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 leading-tight">
            {formatRupiah(summary.total_hutang)}
          </h3>
          <p className="text-[10px] text-rose-500 font-bold mt-1">
            Belanja tempo anggota
          </p>
        </div>

        {/* Avg Basket */}
        <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata-Rata Struk</span>
            <div className="p-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 leading-tight">
            {formatRupiah(summary.avg_transaksi)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">
            Basket size per struk
          </p>
        </div>
      </div>

      {/* ── Segmented Tabs ── */}
      <div className="flex gap-1.5 border-b border-slate-200 dark:border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('transaksi')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
            activeTab === 'transaksi'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Struk Penjualan ({pagination.total})
        </button>

        <button
          onClick={() => setActiveTab('kasir')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
            activeTab === 'kasir'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Kinerja Kasir & Metode
        </button>

        <button
          onClick={() => setActiveTab('harian')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
            activeTab === 'harian'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Rekap Harian
        </button>
      </div>

      {/* ── TAB 1: DAFTAR TRANSAKSI ── */}
      {activeTab === 'transaksi' && (
        <Card className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-100 dark:border-zinc-800 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">No. Struk</th>
                    <th className="py-3 px-4">Waktu Transaksi</th>
                    <th className="py-3 px-4">Pelanggan / Anggota</th>
                    <th className="py-3 px-4">Kasir</th>
                    <th className="py-3 px-4">Metode Bayar</th>
                    <th className="py-3 px-4 text-right">Total Belanja</th>
                    <th className="py-3 px-4 text-right">Estimasi Laba</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-400">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                        Memuat data transaksi...
                      </td>
                    </tr>
                  ) : !data?.data?.length ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-400 font-semibold">
                        Tidak ada transaksi yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    data.data.map(item => (
                      <tr 
                        key={item.transaksi_id}
                        className="hover:bg-blue-50/40 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                        onClick={() => { setSelectedTrx(item); setIsDetailOpen(true); }}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          #{item.transaksi_id}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.nama_anggota}
                          </div>
                          {item.nomor_anggota ? (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                              NIA: {item.nomor_anggota}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Non-Anggota
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
                          {item.kasir_username || 'Kasir'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderMetodeBadge(item.metode_pembayaran)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white text-sm whitespace-nowrap">
                          {formatRupiah(item.total_harga)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap">
                          +{formatRupiah(item.total_keuntungan)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedTrx(item)
                              setIsDetailOpen(true)
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                            title="Lihat Struk Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total > 0 && (
              <div className="p-4 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Tampilkan</span>
                  <select
                    value={perPage}
                    onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                    className="px-2 py-1 border rounded-lg bg-slate-50 dark:bg-zinc-800 font-semibold outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>dari <b>{pagination.total}</b> transaksi</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1.5 h-auto text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="px-2 font-bold text-slate-800 dark:text-slate-200">
                    Halaman {pagination.current_page} dari {pagination.last_page || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.last_page}
                    onClick={() => setPage(page + 1)}
                    className="p-1.5 h-auto text-xs"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 2: KINERJA KASIR & METODE BAYAR ── */}
      {activeTab === 'kasir' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Kasir Breakdown */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Produktivitas & Omset per Kasir</h3>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                {(data?.breakdown_kasir || []).map(k => (
                  <div key={k.kasir_id || 'system'} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {k.kasir_username}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {k.total_transaksi} Transaksi Dilayani
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900 dark:text-white text-sm">
                        {formatRupiah(k.total_omset)}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-bold">
                        Laba: +{formatRupiah(k.total_laba)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Breakdown */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Distribusi Jalur Pembayaran</h3>
            </div>
            <CardContent className="p-4 space-y-3">
              {[
                { label: '💵 Tunai Kasir (Cash)', val: summary.total_cash, color: 'bg-emerald-500' },
                { label: '📱 Saldo E-Wallet Anggota', val: summary.total_ewallet, color: 'bg-indigo-500' },
                { label: '💳 Piutang Tempo / Hutang', val: summary.total_hutang, color: 'bg-rose-500' },
                { label: '⚡ QRIS Digital', val: summary.total_qr, color: 'bg-purple-500' },
                { label: '🏦 Transfer Bank Rekening', val: summary.total_transfer, color: 'bg-blue-500' },
              ].map(item => {
                const pct = summary.total_pendapatan > 0 ? ((item.val / summary.total_pendapatan) * 100).toFixed(1) : '0.0'
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupiah(item.val)} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.color} transition-all`}
                        style={{ width: `${Math.min(100, Number(pct))}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-400">Total Arus Kas Masuk:</span>
                <span className="font-black text-blue-600 text-sm">{formatRupiah(summary.total_pendapatan)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 3: REKAPITULASI HARIAN ── */}
      {activeTab === 'harian' && (
        <Card className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
          <CardContent className="p-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-100 dark:border-zinc-800 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Tanggal Transaksi</th>
                  <th className="py-3 px-4 text-center">Jumlah Transaksi</th>
                  <th className="py-3 px-4 text-right">Total Omset Harian</th>
                  <th className="py-3 px-4 text-right">Laba Kotor Harian</th>
                  <th className="py-3 px-4 text-right">Margin (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {(data?.transaksi_harian || []).map(h => {
                  const mPct = h.total_pendapatan > 0 ? ((h.total_keuntungan / h.total_pendapatan) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={h.tanggal} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatDate(h.tanggal)}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-600 dark:text-slate-300">
                        {h.jumlah_transaksi} Struk
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                        {formatRupiah(h.total_pendapatan)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatRupiah(h.total_keuntungan)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-600 dark:text-slate-400">
                        {mPct}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── MOBILE FILTER BOTTOM SHEET DRAWER (iOS / Material Design) ── */}
      <IosBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filter Laporan Transaksi"
      >
        <div className="space-y-5 text-xs pb-4">
          
          {/* Section 1: Quick Presets */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Periode Waktu Cepat
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'today', label: 'Hari Ini' },
                { id: 'yesterday', label: 'Kemarin' },
                { id: '7days', label: '7 Hari' },
                { id: 'this_month', label: 'Bulan Ini' },
                { id: 'last_month', label: 'Bulan Lalu' },
                { id: 'all', label: 'Semua Data' },
              ].map(p => {
                const isSelected = draftFilters.activePreset === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const dates = getPresetDates(p.id)
                      setDraftFilters({
                        ...draftFilters,
                        activePreset: p.id,
                        tglMulai: dates.start,
                        tglSelesai: dates.end
                      })
                    }}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 2: Custom Date Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Atur Rentang Tanggal Manual
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Mulai:</span>
                <input
                  type="date"
                  value={draftFilters.tglMulai}
                  onChange={e => setDraftFilters({ ...draftFilters, tglMulai: e.target.value, activePreset: 'custom' })}
                  className="w-full px-2.5 py-2 border rounded-xl bg-slate-50 dark:bg-zinc-800 font-semibold text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Sampai:</span>
                <input
                  type="date"
                  value={draftFilters.tglSelesai}
                  onChange={e => setDraftFilters({ ...draftFilters, tglSelesai: e.target.value, activePreset: 'custom' })}
                  className="w-full px-2.5 py-2 border rounded-xl bg-slate-50 dark:bg-zinc-800 font-semibold text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Metode Pembayaran */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'Semua Metode' },
                { id: 'cash', label: '💵 Tunai' },
                { id: 'ewallet', label: '📱 E-Wallet' },
                { id: 'hutang', label: '💳 Piutang' },
                { id: 'qr', label: '⚡ QRIS' },
                { id: 'transfer', label: '🏦 Transfer' },
              ].map(m => {
                const isSelected = draftFilters.metode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDraftFilters({ ...draftFilters, metode: m.id })}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 4: Tipe Pelanggan */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Tipe Pelanggan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'anggota', label: '👥 Anggota' },
                { id: 'umum', label: '🚶 Umum' },
              ].map(t => {
                const isSelected = draftFilters.pembeliType === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDraftFilters({ ...draftFilters, pembeliType: t.id })}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 5: Petugas Kasir */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Petugas Kasir
            </label>
            <select
              value={draftFilters.kasirId}
              onChange={e => setDraftFilters({ ...draftFilters, kasirId: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-zinc-800 font-bold text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Kasir</option>
              {(data?.daftar_kasir || []).map(k => (
                <option key={k.user_id} value={k.user_id}>{k.username}</option>
              ))}
            </select>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const resetDates = getPresetDates('this_month')
                setDraftFilters({
                  tglMulai: resetDates.start,
                  tglSelesai: resetDates.end,
                  metode: 'all',
                  pembeliType: 'all',
                  kasirId: 'all',
                  activePreset: 'this_month'
                })
              }}
              className="flex-1 font-bold text-slate-600 dark:text-slate-400"
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleApplyDraftFilters}
              className="flex-2 font-bold bg-blue-600 text-white"
            >
              Terapkan Filter
            </Button>
          </div>

        </div>
      </IosBottomSheet>

      {/* ── MODAL STRUK ELEKTRONIK (RECEIPT DRILL-DOWN) ── */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`🧾 Struk Transaksi #${selectedTrx?.transaksi_id || ''}`}
      >
        {selectedTrx && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 rounded-2xl border border-slate-100 dark:border-zinc-700 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Waktu:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(selectedTrx.created_at)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Pelanggan:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedTrx.nama_anggota} {selectedTrx.nomor_anggota ? `(NIA: ${selectedTrx.nomor_anggota})` : ''}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Petugas Kasir:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTrx.kasir_username || 'Kasir'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Metode Bayar:</span>
                <span>{renderMetodeBadge(selectedTrx.metode_pembayaran)}</span>
              </div>
            </div>

            {/* Items table */}
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-zinc-800 text-[11px] font-bold text-slate-500">
                    <th className="p-2.5">Item Barang</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Harga</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {(selectedTrx.items || []).map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                      <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                        {it.nama_barang}
                      </td>
                      <td className="p-2.5 text-center font-semibold text-slate-600 dark:text-slate-300">
                        {it.jumlah} {it.satuan}
                      </td>
                      <td className="p-2.5 text-right text-slate-600 dark:text-slate-400">
                        {formatRupiah(it.harga_satuan)}
                      </td>
                      <td className="p-2.5 text-right font-black text-slate-900 dark:text-white">
                        {formatRupiah(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase">Total Pembayaran</span>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  Estimasi Laba Bersih: +{formatRupiah(selectedTrx.total_keuntungan)}
                </p>
              </div>
              <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                {formatRupiah(selectedTrx.total_harga)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsDetailOpen(false)}>
                Tutup
              </Button>
              <Button 
                type="button" 
                variant="primary" 
                onClick={() => window.print()}
                className="font-bold gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Cetak Struk
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}

export default LaporanTransaksi