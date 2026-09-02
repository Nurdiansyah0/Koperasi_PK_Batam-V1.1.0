import React, { useEffect, useState, useMemo } from 'react'
import { kasirService } from '@/services/kasirService'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { Transaksi } from '@/types'
import { 
  Filter, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  ShoppingBag, 
  Receipt, 
  User, 
  Search, 
  Printer, 
  Share2, 
  X,
  UserCheck,
  TrendingUp,
  ReceiptText,
  BadgeCheck
} from 'lucide-react'
import toast from 'react-hot-toast'

export function RiwayatTransaksiKasir() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([])
  const [loading, setLoading] = useState(true)
  const [tglAwal, setTglAwal] = useState('')
  const [tglAkhir, setTglAkhir] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMetode, setSelectedMetode] = useState<string>('semua')
  const [activeDateFilter, setActiveDateFilter] = useState<string>('semua')
  const [showCustomDate, setShowCustomDate] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Track expanded transaction IDs
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

  const loadData = async (currentPage: number = page, awal: string = tglAwal, akhir: string = tglAkhir) => {
    setLoading(true)
    try {
      const response = await kasirService.getHistoryTransaksi({
        tanggal_awal: awal,
        tanggal_akhir: akhir,
        page: currentPage
      })
      setTransaksi(response.data || [])
      setTotalPages(response.last_page || 1)
      setPage(response.current_page || 1)
      setExpandedRows({})
    } catch (e) {
      toast.error('Gagal memuat riwayat transaksi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    loadData(1, '', '') 
  }, [])

  const handleDatePreset = (preset: string) => {
    setActiveDateFilter(preset)
    const today = new Date()
    const formatDateStr = (d: Date) => d.toISOString().split('T')[0]

    let awal = ''
    let akhir = ''

    if (preset === 'hari_ini') {
      awal = formatDateStr(today)
      akhir = formatDateStr(today)
      setShowCustomDate(false)
    } else if (preset === 'kemarin') {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      awal = formatDateStr(yesterday)
      akhir = formatDateStr(yesterday)
      setShowCustomDate(false)
    } else if (preset === '7_hari') {
      const past7 = new Date(today)
      past7.setDate(past7.getDate() - 7)
      awal = formatDateStr(past7)
      akhir = formatDateStr(today)
      setShowCustomDate(false)
    } else if (preset === 'bulan_ini') {
      const startMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      awal = formatDateStr(startMonth)
      akhir = formatDateStr(today)
      setShowCustomDate(false)
    } else if (preset === 'kustom') {
      setShowCustomDate(true)
      return
    } else {
      awal = ''
      akhir = ''
      setShowCustomDate(false)
    }

    setTglAwal(awal)
    setTglAkhir(akhir)
    loadData(1, awal, akhir)
  }

  const toggleExpand = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Client-side filtering for rapid search and payment method filtering
  const filteredTransaksi = useMemo(() => {
    return transaksi.filter(t => {
      // Payment method match
      if (selectedMetode !== 'semua') {
        const met = (t.metode_pembayaran || '').toLowerCase()
        if (selectedMetode === 'tunai' && met !== 'cash' && met !== 'tunai') return false
        if (selectedMetode === 'saldo' && met !== 'saldo') return false
        if (selectedMetode === 'hutang' && met !== 'hutang') return false
      }

      // Search query match (by ID or Member Name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const idMatch = t.transaksi_id.toString().includes(q)
        const nameMatch = (t.nama_anggota || '').toLowerCase().includes(q)
        const kasirMatch = (t.nama_kasir || '').toLowerCase().includes(q)
        if (!idMatch && !nameMatch && !kasirMatch) return false
      }

      return true
    })
  }, [transaksi, selectedMetode, searchQuery])

  // Summary Metrics of current filtered list
  const totalOmsetFiltered = useMemo(() => {
    return filteredTransaksi.reduce((sum, t) => sum + (Number(t.total_harga || t.total || 0)), 0)
  }, [filteredTransaksi])

  const handlePrint = (e: React.MouseEvent, t: Transaksi) => {
    e.stopPropagation()
    window.print()
  }

  const handleShare = (e: React.MouseEvent, t: Transaksi) => {
    e.stopPropagation()
    if (navigator.share) {
      navigator.share({
        title: `Struk Transaksi #${t.transaksi_id}`,
        text: `Struk Koperasi PK Batam #${t.transaksi_id} - Total: ${formatRupiah(t.total_harga)} (${t.metode_pembayaran})`,
        url: window.location.href,
      }).catch(() => {})
    } else {
      toast.success('Rincian transaksi siap dibagikan')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 max-w-lg md:max-w-4xl mx-auto px-1 sm:px-0">
      
      {/* ─── HEADER & TITLE ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Riwayat Transaksi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit dan cetak ulang bukti penjualan kasir POS harian.
          </p>
        </div>
        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto border border-slate-200/60 dark:border-slate-700">
          Total Halaman: {totalPages}
        </span>
      </div>

      {/* ─── KPI SUMMARY RIBBON (OMSET & STRUK) ─── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Omset Terfilter</span>
            <div className="p-1.5 rounded-xl bg-white/20">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black mt-1 text-white truncate">
            {formatRupiah(totalOmsetFiltered)}
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Struk</span>
            <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black mt-1 text-slate-900 dark:text-white">
            {filteredTransaksi.length} <span className="text-xs font-normal text-slate-400">struk</span>
          </p>
        </div>
      </div>

      {/* ─── ERGONOMIC FILTER & SEARCH CARD ─── */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        
        {/* Search Bar with Instant Clear */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari No. ID Transaksi atau Nama Anggota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter Quick Chips (Scrollable on Mobile) */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rentang Waktu</p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'semua', label: 'Semua' },
              { id: 'hari_ini', label: 'Hari Ini' },
              { id: 'kemarin', label: 'Kemarin' },
              { id: '7_hari', label: '7 Hari Terakhir' },
              { id: 'bulan_ini', label: 'Bulan Ini' },
              { id: 'kustom', label: '📅 Kustom' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => handleDatePreset(chip.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 ${
                  activeDateFilter === chip.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Form (Appears only if Kustom is clicked) */}
        {showCustomDate && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Dari Tanggal</label>
                <input
                  type="date"
                  value={tglAwal}
                  onChange={(e) => setTglAwal(e.target.value)}
                  className="w-full mt-0.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Sampai Tanggal</label>
                <input
                  type="date"
                  value={tglAkhir}
                  onChange={(e) => setTglAkhir(e.target.value)}
                  className="w-full mt-0.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>
            </div>
            <button
              onClick={() => loadData(1, tglAwal, tglAkhir)}
              className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              Terapkan Filter Tanggal
            </button>
          </div>
        )}

        {/* Payment Method Pills */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Metode Pembayaran</p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'semua', label: 'Semua Metode' },
              { id: 'tunai', label: '💵 Tunai' },
              { id: 'saldo', label: '💳 Saldo' },
              { id: 'hutang', label: '📝 Hutang' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMetode(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 ${
                  selectedMetode === m.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ─── TRANSACTION LIST WITH DIGITAL THERMAL RECEIPT BREAKDOWN ─── */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-slate-400">Memuat riwayat transaksi kasir...</p>
          </div>
        ) : filteredTransaksi.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 flex flex-col items-center">
            <Receipt className="w-12 h-12 text-slate-300 mb-2" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak Ada Transaksi Ditemukan</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Coba sesuaikan kata kunci pencarian atau ubah rentang tanggal filter.
            </p>
          </div>
        ) : (
          filteredTransaksi.map((t) => {
            const isExpanded = !!expandedRows[t.transaksi_id]
            const isCash = t.metode_pembayaran === 'cash' || t.metode_pembayaran === 'tunai'
            const isSaldo = t.metode_pembayaran === 'saldo'
            const isHutang = t.metode_pembayaran === 'hutang'
            const isCancelled = t.status === 'batal'

            return (
              <div 
                key={t.transaksi_id}
                className="overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-all hover:border-blue-300 dark:hover:border-blue-700"
              >
                {/* Transaction Header Row (Tap to expand receipt) */}
                <div 
                  onClick={() => toggleExpand(t.transaksi_id)}
                  className="p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center active:bg-slate-50 dark:active:bg-slate-850/50 transition-colors"
                >
                  <div className="flex items-start gap-3.5 w-full sm:w-auto min-w-0">
                    <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-2xs ${
                      isCash ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' :
                      isSaldo ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400' :
                      isHutang ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400' :
                      'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400'
                    }`}>
                      {isCash ? '💵' : isSaldo ? '💳' : isHutang ? '📝' : '📱'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                          #{t.transaksi_id}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isCash ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' :
                          isSaldo ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300' :
                          isHutang ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                        }`}>
                          {t.metode_pembayaran}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 truncate">
                        <span>{formatDate(t.created_at)}</span>
                        <span>&bull;</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {t.nama_anggota || 'Pelanggan Toko'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Expand Indicator */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Struk</div>
                      <div className={`font-black text-base sm:text-lg tracking-tight ${
                        isCancelled ? 'line-through text-rose-500' : 'text-slate-900 dark:text-white'
                      }`}>
                        {formatRupiah(t.total_harga || t.total || 0)}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* ─── DIGITAL THERMAL RECEIPT SUB-PANE (EXPANDED) ─── */}
                {isExpanded && (
                  <div className="bg-slate-50 dark:bg-slate-850 p-3 sm:p-5 border-t border-slate-100 dark:border-slate-800">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 max-w-lg mx-auto space-y-3 font-mono">
                      
                      <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-2.5">
                        <p className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          STRUK PENJUALAN KASIR POS
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          KOPERASI PKPPK BTH &bull; REF #{t.transaksi_id}
                        </p>
                      </div>

                      {/* Itemized list */}
                      {(!t.details || t.details.length === 0) ? (
                        <p className="text-center text-xs text-slate-400 py-3 italic font-sans">
                          Rincian barang transaksi ini tidak tersedia.
                        </p>
                      ) : (
                        <div className="space-y-2 text-xs divide-y divide-dashed divide-slate-100 dark:divide-slate-800">
                          {t.details.map((d: any, idx: number) => (
                            <div key={idx} className="pt-2 flex justify-between items-start gap-2">
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{d.nama_barang}</p>
                                <p className="text-[10px] text-slate-400">{d.jumlah} x {formatRupiah(d.harga_satuan)}</p>
                              </div>
                              <p className="font-bold text-slate-900 dark:text-white shrink-0">
                                {formatRupiah(d.subtotal)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Receipt Summary Totals */}
                      <div className="border-t-2 border-dashed border-slate-300 dark:border-slate-700 pt-2.5 space-y-1 text-xs">
                        <div className="flex justify-between font-bold text-slate-900 dark:text-white text-sm">
                          <span>TOTAL</span>
                          <span>{formatRupiah(t.total_harga || t.total || 0)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>METODE BAYAR</span>
                          <span className="uppercase font-bold">{t.metode_pembayaran}</span>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center text-[10px] text-slate-400 font-sans">
                        <span>Kasir: <strong>@{t.nama_kasir || 'kasir'}</strong></span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                          {t.status || 'SELESAI'}
                        </span>
                      </div>

                      {/* Print & Share Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 font-sans">
                        <button
                          onClick={(e) => handlePrint(e, t)}
                          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Cetak Struk
                        </button>
                        <button
                          onClick={(e) => handleShare(e, t)}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
                          title="Bagikan Struk"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ─── ERGONOMIC THUMB PAGINATION CONTROLS ─── */}
      {totalPages > 1 && !loading && (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <button
            onClick={() => {
              loadData(page - 1)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 active:scale-95 transition-all"
          >
            &larr; Prev
          </button>

          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
            Halaman {page} dari {totalPages}
          </span>

          <button
            onClick={() => {
              loadData(page + 1)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 text-white disabled:opacity-40 active:scale-95 transition-all"
          >
            Next &rarr;
          </button>
        </div>
      )}

    </div>
  )
}

export default RiwayatTransaksiKasir
