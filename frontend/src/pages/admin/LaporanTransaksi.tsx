import { useEffect, useState } from 'react'
import { adminService } from '@/services/adminService'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { LaporanTransaksi as LaporanTransaksiType, TransaksiLaporanItem } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import {
  Search, Calendar, Download, Printer, RotateCcw,
  TrendingUp, ShoppingBag, CreditCard, Wallet, Users,
  ArrowUpRight, DollarSign, Store, Eye, CheckCircle2,
  ChevronLeft, ChevronRight, Layers, FileText, BarChart3
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
  const applyPreset = (preset: string) => {
    setActivePreset(preset)
    setPage(1)
    const now = new Date()
    
    if (preset === 'today') {
      const todayStr = formatYmd(now)
      setTglMulai(todayStr)
      setTglSelesai(todayStr)
    } else if (preset === 'yesterday') {
      const yest = new Date(now)
      yest.setDate(yest.getDate() - 1)
      const yestStr = formatYmd(yest)
      setTglMulai(yestStr)
      setTglSelesai(yestStr)
    } else if (preset === '7days') {
      const past = new Date(now)
      past.setDate(past.getDate() - 6)
      setTglMulai(formatYmd(past))
      setTglSelesai(formatYmd(now))
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      setTglMulai(formatYmd(firstDay))
      setTglSelesai(formatYmd(now))
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      setTglMulai(formatYmd(firstDayLastMonth))
      setTglSelesai(formatYmd(lastDayLastMonth))
    } else if (preset === 'all') {
      setTglMulai('')
      setTglSelesai('')
    }
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

  // Refetch when dates, filters, or page change
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
        return <Badge variant="success">💵 Tunai (Cash)</Badge>
      case 'ewallet':
        return <Badge variant="info">📱 E-Wallet</Badge>
      case 'hutang':
        return <Badge variant="danger">💳 Piutang (Kredit)</Badge>
      case 'qr':
        return <Badge variant="purple">⚡ QRIS</Badge>
      case 'transfer':
        return <Badge variant="default">🏦 Transfer Bank</Badge>
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
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Laporan Transaksi & Penjualan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit keuangan POS kasir, margin laba kotor, piutang tempo, dan arsip struk penjualan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            onClick={handleExportCsv} 
            className="text-xs font-bold gap-1.5 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Export CSV
          </Button>

          <Button 
            variant="outline" 
            onClick={() => window.print()} 
            className="text-xs font-bold gap-1.5 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            Cetak Rekap
          </Button>
        </div>
      </div>

      {/* ── Quick Preset Chips ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" /> Periode:
        </span>
        {[
          { id: 'today', label: 'Hari Ini' },
          { id: 'yesterday', label: 'Kemarin' },
          { id: '7days', label: '7 Hari Terakhir' },
          { id: 'this_month', label: 'Bulan Ini' },
          { id: 'last_month', label: 'Bulan Lalu' },
          { id: 'all', label: 'Semua Data' },
        ].map(p => (
          <button
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-xs ${
              activePreset === p.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Filter Bar Card ── */}
      <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 items-end text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Tanggal Mulai</label>
            <input 
              type="date" 
              value={tglMulai} 
              onChange={e => { setTglMulai(e.target.value); setActivePreset('custom'); setPage(1); }} 
              className="w-full px-2.5 py-2 border rounded-xl bg-slate-50 dark:bg-zinc-800 font-semibold text-slate-800 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Tanggal Selesai</label>
            <input 
              type="date" 
              value={tglSelesai} 
              onChange={e => { setTglSelesai(e.target.value); setActivePreset('custom'); setPage(1); }} 
              className="w-full px-2.5 py-2 border rounded-xl bg-slate-50 dark:bg-zinc-800 font-semibold text-slate-800 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Metode Bayar</label>
            <select
              value={metode}
              onChange={e => { setMetode(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-2 border rounded-xl bg-slate-50 dark:bg-zinc-800 font-semibold text-slate-800 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Metode</option>
              <option value="cash">💵 Tunai (Cash)</option>
              <option value="ewallet">📱 E-Wallet Anggota</option>
              <option value="hutang">💳 Piutang / Hutang</option>
              <option value="qr">⚡ QRIS</option>
              <option value="transfer">🏦 Transfer Bank</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Tipe Pelanggan</label>
            <select
              value={pembeliType}
              onChange={e => { setPembeliType(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-2 border rounded-xl bg-slate-50 dark:bg-zinc-800 font-semibold text-slate-800 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Pelanggan</option>
              <option value="anggota">👥 Anggota Koperasi</option>
              <option value="umum">🚶 Pelanggan Umum</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Petugas Kasir</label>
            <select
              value={kasirId}
              onChange={e => { setKasirId(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-2 border rounded-xl bg-slate-50 dark:bg-zinc-800 font-semibold text-slate-800 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Kasir</option>
              {(data?.daftar_kasir || []).map(k => (
                <option key={k.user_id} value={k.user_id}>{k.username}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari struk / nama..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-2 border rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
            <Button type="button" variant="ghost" onClick={handleResetFilter} title="Reset Filter" className="p-2 h-auto text-slate-400 hover:text-slate-600">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </form>
      </div>

      {/* ── 6-Card Executive Financial Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Omset */}
        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Omset</span>
            <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
            {formatRupiah(summary.total_pendapatan)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">
            {summary.total_transaksi} struk selesai
          </p>
        </div>

        {/* HPP */}
        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HPP / Modal</span>
            <div className="p-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600">
              <Store className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-base font-black text-slate-700 dark:text-slate-300 leading-tight">
            {formatRupiah(summary.total_hpp)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">
            Beban pokok persediaan
          </p>
        </div>

        {/* Laba Kotor */}
        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Laba Kotor</span>
            <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-tight">
            {formatRupiah(summary.total_keuntungan)}
          </h3>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">
            Margin: {marginPercent}%
          </p>
        </div>

        {/* Kas Likuid */}
        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kas Likuid</span>
            <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-base font-black text-indigo-600 dark:text-indigo-400 leading-tight">
            {formatRupiah(kasLikuid)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">
            Tunai, E-Wallet & QRIS
          </p>
        </div>

        {/* Piutang Baru */}
        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Piutang Baru</span>
            <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-base font-black text-rose-600 dark:text-rose-400 leading-tight">
            {formatRupiah(summary.total_hutang)}
          </h3>
          <p className="text-[10px] text-rose-500 font-bold mt-1">
            Belanja tempo anggota
          </p>
        </div>

        {/* Avg Basket */}
        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata-Rata Struk</span>
            <div className="p-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-base font-black text-amber-600 dark:text-amber-400 leading-tight">
            {formatRupiah(summary.avg_transaksi)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">
            Basket size per transaksi
          </p>
        </div>
      </div>

      {/* ── Segmented Tabs ── */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('transaksi')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'transaksi'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Daftar Struk Transaksi ({pagination.total})
        </button>

        <button
          onClick={() => setActiveTab('kasir')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'kasir'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Kinerja Kasir & Metode Bayar
        </button>

        <button
          onClick={() => setActiveTab('harian')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'harian'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Rekapitulasi Harian
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
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
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
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                          {item.kasir_username || 'Kasir'}
                        </td>
                        <td className="py-3 px-4">
                          {renderMetodeBadge(item.metode_pembayaran)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white text-sm">
                          {formatRupiah(item.total_harga)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                { label: '💵 Tunai Kasir (Cash)', val: summary.total_cash, color: 'emerald' },
                { label: '📱 Saldo E-Wallet Anggota', val: summary.total_ewallet, color: 'indigo' },
                { label: '💳 Piutang Tempo / Hutang', val: summary.total_hutang, color: 'rose' },
                { label: '⚡ QRIS Digital', val: summary.total_qr, color: 'purple' },
                { label: '🏦 Transfer Bank Rekening', val: summary.total_transfer, color: 'blue' },
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
                        className={`h-full rounded-full bg-${item.color}-500 transition-all`}
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
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
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