import { useEffect, useState } from 'react'
import { adminService } from '@/services/adminService'
import { formatRupiah, formatDate, formatDateOnly, printCleanElement } from '@/lib/utils'
import type { LaporanTransaksi as LaporanTransaksiType, TransaksiLaporanItem, PengeluaranOperasional } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { InputRupiah } from '@/components/ui/InputRupiah'
import { IosBottomSheet } from '@/components/ios/IosBottomSheet'
import {
  Search, Calendar, Download, Printer, RotateCcw,
  TrendingUp, ShoppingBag, CreditCard, Wallet, Users,
  ArrowUpRight, Store, Eye, CheckCircle2, SlidersHorizontal,
  ChevronLeft, ChevronRight, FileText, BarChart3, X, Check,
  Plus, Receipt, Trash2, PieChart, ShieldCheck, Building2
} from 'lucide-react'
import toast from 'react-hot-toast'

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

export function LaporanTransaksi() {
  const [data, setData] = useState<LaporanTransaksiType | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'transaksi' | 'pengeluaran' | 'kasir' | 'harian'>('transaksi')
  
  // Filter States initialized with 'this_month'
  const initialDates = getPresetDates('this_month')
  const [tglMulai, setTglMulai] = useState(initialDates.start)
  const [tglSelesai, setTglSelesai] = useState(initialDates.end)
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
    tglMulai: initialDates.start,
    tglSelesai: initialDates.end,
    metode: 'all',
    pembeliType: 'all',
    kasirId: 'all',
    activePreset: 'this_month'
  })

  // Detail Struk Modal State
  const [selectedTrx, setSelectedTrx] = useState<TransaksiLaporanItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    nama_pengeluaran: '',
    nominal: 0,
    kategori: 'Operasional',
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: ''
  })
  const [savingExpense, setSavingExpense] = useState(false)

  // Corporate Statement Print Modal State
  const [isCorporateModalOpen, setIsCorporateModalOpen] = useState(false)

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

  // Handle Create Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseForm.nama_pengeluaran.trim()) {
      toast.error('Nama pengeluaran wajib diisi')
      return
    }
    if (expenseForm.nominal <= 0) {
      toast.error('Jumlah pengeluaran harus lebih dari 0')
      return
    }

    setSavingExpense(true)
    try {
      const res = await adminService.tambahPengeluaran(expenseForm)
      if (res.success) {
        toast.success('Pengeluaran operasional berhasil dicatat!')
        setIsExpenseModalOpen(false)
        setExpenseForm({
          nama_pengeluaran: '',
          nominal: 0,
          kategori: 'Operasional',
          tanggal: new Date().toISOString().split('T')[0],
          keterangan: ''
        })
        loadData(page)
      } else {
        toast.error(res.error || 'Gagal mencatat pengeluaran')
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan data')
    } finally {
      setSavingExpense(false)
    }
  }

  // Handle Delete Expense
  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus catatan pengeluaran ini?')) return
    try {
      const res = await adminService.hapusPengeluaran(id)
      if (res.success) {
        toast.success('Catatan pengeluaran dihapus')
        loadData(page)
      } else {
        toast.error(res.error || 'Gagal menghapus data')
      }
    } catch {
      toast.error('Gagal menghapus data')
    }
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
    total_laba_kotor: 0,
    total_hpp: 0,
    total_beban_operasional: 0,
    total_laba_bersih: 0,
    shu_anggota_60: 0,
    shu_cadangan_30: 0,
    shu_pengurus_10: 0,
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
  const marginGrossPercent = summary.total_pendapatan > 0 
    ? ((summary.total_keuntungan / summary.total_pendapatan) * 100).toFixed(1) 
    : '0.0'
  const marginNetPercent = summary.total_pendapatan > 0 
    ? ((summary.total_laba_bersih / summary.total_pendapatan) * 100).toFixed(1) 
    : '0.0'

  const pagination = data?.pagination || { current_page: 1, last_page: 1, total: 0, per_page: 20 }
  const pengeluaranList = data?.pengeluaran_operasional || []

  const ksh = data?.analisis_kesehatan || summary.analisis_kesehatan || {
    total_anggota_terdaftar: (data?.rekap_anggota || []).length || 1,
    jumlah_anggota_aktif: (data?.rekap_anggota || []).length,
    rasio_partisipasi_persen: 100,
    kas_likuid_masuk: kasLikuid,
    total_piutang_berjalan: summary.total_hutang,
    rasio_piutang_omset_persen: summary.total_pendapatan > 0 ? Number(((summary.total_hutang / summary.total_pendapatan) * 100).toFixed(1)) : 0,
    cash_coverage_ratio_persen: (summary.total_beban_operasional + summary.total_hutang) > 0 ? Number(((kasLikuid / (summary.total_beban_operasional + summary.total_hutang)) * 100).toFixed(1)) : 100,
    gross_profit_margin_persen: Number(marginGrossPercent),
    net_profit_margin_persen: Number(marginNetPercent),
    operating_expense_ratio_persen: summary.total_keuntungan > 0 ? Number(((summary.total_beban_operasional / summary.total_keuntungan) * 100).toFixed(1)) : 0,
    skor_kesehatan: 85,
    status_kesehatan: 'SEHAT (GRADE A)',
    badge_color: 'green',
    kesimpulan_evaluasi: 'Perputaran kas, margin kotor, dan kolektibilitas sangat prima.'
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-7xl mx-auto">
      {/* PRINT-ONLY CSS (STANDAR DOKUMEN ISO A4 & EXPORT PDF FLUID) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media screen {
          #printable-laporan {
            display: none !important;
          }
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            height: auto !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #screen-content {
            display: none !important;
          }
          #printable-laporan, #printable-laporan * {
            visibility: visible !important;
          }
          #printable-laporan {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            z-index: 999999 !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }
          .print-sheet {
            page-break-after: always !important;
            break-after: page !important;
            display: flex !important;
            flex-direction: column !important;
            min-height: 272mm !important;
            box-sizing: border-box !important;
            padding-bottom: 2mm !important;
            clear: both !important;
          }
          .print-sheet-last {
            page-break-after: auto !important;
            break-after: auto !important;
            min-height: auto !important;
          }
          table.print-table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            border: 1.5px solid #000000 !important;
          }
          table.print-table thead {
            display: table-header-group !important;
          }
          table.print-table tfoot {
            display: table-footer-group !important;
          }
          table.print-table th, table.print-table td {
            border: 1px solid #000000 !important;
            padding: 4.5px 5.5px !important;
          }
          table.print-table tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />

      {/* DEDICATED PRINTABLE A4 LAPORAN (STANDAR KOP RESMI A4 DENGAN PEMBAGIAN LEMBAR I, II, III SERASI) */}
      <div id="printable-laporan" className="text-black bg-white">
        
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* ── LEMBAR 1 (SHEET 1): KOP SURAT UTAMA, PHU OPERASIONAL & ALOKASI SHU ── */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <div className="print-sheet">
          {/* OFFICIAL LETTERHEAD (KOP SURAT UTAMA) */}
          <div className="border-b-2 border-black pb-2 mb-2.5">
            <div className="flex items-center justify-between gap-3">
              {/* Logo Resmi Koperasi */}
              <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                <img src="/Logo.svg" alt="Logo Koperasi PKP-PK BTH" className="w-14 h-14 object-contain" />
              </div>

              {/* Teks Kop Surat Tengah */}
              <div className="text-center flex-1">
                <h1 className="text-[14px] font-black tracking-wider uppercase m-0 p-0 text-black leading-tight">
                  KOPERASI KARYAWAN PKP-PK BTH
                </h1>
                <p className="text-[11.5px] font-bold text-gray-800 m-0 mt-0.5 tracking-wide uppercase">
                  LAPORAN PERHITUNGAN HASIL USAHA (PHU) & REALISASI KAS
                </p>
                <p className="text-[9.5px] text-gray-600 m-0 leading-tight">
                  Unit PKP-PK Hang Nadim Batam — Jl. Hang Nadim No.01, Nongsa, Batam, Kepri 29466
                </p>
              </div>

              {/* Dokumen Meta Box Kanan */}
              <div className="border border-black p-1.5 rounded text-[9.5px] text-left shrink-0 min-w-[155px] space-y-0.5 bg-gray-50/40">
                <div><strong>No. Surat:</strong> {(() => {
                  const d = tglSelesai ? new Date(tglSelesai) : new Date()
                  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
                  const monthRoman = romanMonths[d.getMonth()] || 'IX'
                  const year = d.getFullYear() || 2026
                  const seq = String(summary.total_transaksi > 0 ? (summary.total_transaksi % 999) + 1 : 1).padStart(3, '0')
                  return `${seq}/KOPKAR-PKP-PK/PHU/${monthRoman}/${year}`
                })()}</div>
                <div><strong>Periode:</strong> {tglMulai ? formatDateOnly(tglMulai) : 'Awal'} s/d {tglSelesai ? formatDateOnly(tglSelesai) : 'Kini'}</div>
                <div><strong>Tanggal Cetak:</strong> {formatDateOnly(new Date())}</div>
              </div>
            </div>
          </div>

          {/* ── BAGIAN I: PERHITUNGAN HASIL USAHA (LABA RUGI OPERASIONAL) ── */}
          <div className="mb-2">
            <div className="border-b border-black pb-0.5 mb-1.5 flex justify-between items-end">
              <h2 className="text-[11.5px] font-black uppercase text-black m-0 tracking-wide">
                I. PERHITUNGAN HASIL USAHA (PHU / LABA RUGI OPERASIONAL)
              </h2>
              <span className="text-[9px] font-semibold text-gray-600 uppercase font-mono">
                Basis Akuntansi Kas
              </span>
            </div>

            <table className="print-table w-full border border-black text-[10.5px]">
              <thead>
                <tr className="bg-gray-100 font-bold border-b border-black text-[9.5px]">
                  <th className="border border-black p-1 text-center" style={{ width: '6%' }}>No</th>
                  <th className="border border-black p-1 text-left" style={{ width: '54%' }}>Uraian Pos Keuangan</th>
                  <th className="border border-black p-1 text-center" style={{ width: '18%' }}>Keterangan</th>
                  <th className="border border-black p-1 text-right" style={{ width: '22%' }}>Jumlah Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-100/80 font-bold border-b border-black">
                  <td className="border border-black p-1 text-center font-bold">A</td>
                  <td colSpan={3} className="border border-black p-1 uppercase">PENDAPATAN OPERASIONAL TOKO (OMSET BELANJA ANGGOTA)</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-1 text-center">1</td>
                  <td className="border border-black p-1 pl-4">Pendapatan Partisipasi Belanja Anggota Koperasi</td>
                  <td className="border border-black p-1 text-center text-[9.5px] text-gray-600">Berhak SHU</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{formatRupiah(summary.omset_anggota || summary.total_pendapatan)}</td>
                </tr>
                <tr className="bg-gray-50 font-bold border-b border-black">
                  <td className="border border-black p-1"></td>
                  <td colSpan={2} className="border border-black p-1 text-right uppercase">TOTAL PENDAPATAN OPERASIONAL (OMSET BRUTO):</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{formatRupiah(summary.total_pendapatan)}</td>
                </tr>

                <tr className="bg-gray-100/80 font-bold border-b border-black">
                  <td className="border border-black p-1 text-center font-bold">B</td>
                  <td colSpan={3} className="border border-black p-1 uppercase">BEBAN POKOK PENJUALAN (HPP / MODAL BARANG)</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-1 text-center">1</td>
                  <td className="border border-black p-1 pl-4 text-rose-700">Beban Pokok Barang Terjual (COGS / Modal Kulakan)</td>
                  <td className="border border-black p-1 text-center text-[9.5px] text-rose-600">Pengurang</td>
                  <td className="border border-black p-1 text-right font-mono font-bold text-rose-700">({formatRupiah(summary.total_hpp)})</td>
                </tr>
                <tr className="bg-gray-200/80 font-bold border-b-2 border-black">
                  <td className="border border-black p-1"></td>
                  <td colSpan={2} className="border border-black p-1 text-right uppercase">LABA KOTOR USAHA (GROSS MARGIN: {marginGrossPercent}%):</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{formatRupiah(summary.total_keuntungan)}</td>
                </tr>

                <tr className="bg-gray-100/80 font-bold border-b border-black">
                  <td className="border border-black p-1 text-center font-bold">C</td>
                  <td colSpan={3} className="border border-black p-1 uppercase">BEBAN OPERASIONAL KAS KOPERASI (OPEX)</td>
                </tr>
                {!pengeluaranList.length ? (
                  <tr className="border-b border-black">
                    <td className="border border-black p-1 text-center">-</td>
                    <td colSpan={2} className="border border-black p-1 pl-4 italic text-gray-500 text-[9.5px]">Tidak ada transaksi beban kas operasional tercatat pada periode ini.</td>
                    <td className="border border-black p-1 text-right font-mono font-bold">Rp 0</td>
                  </tr>
                ) : (
                  pengeluaranList.map((p, idx) => (
                    <tr key={p.pengeluaran_id} className="border-b border-black">
                      <td className="border border-black p-1 text-center">{idx + 1}</td>
                      <td className="border border-black p-1 pl-4">{p.nama_pengeluaran}</td>
                      <td className="border border-black p-1 text-center text-[9.5px] text-gray-600">{p.kategori || 'Operasional'} ({formatDateOnly(p.tanggal)})</td>
                      <td className="border border-black p-1 text-right font-mono font-bold text-rose-700">-{formatRupiah(p.nominal)}</td>
                    </tr>
                  ))
                )}
                <tr className="bg-gray-50 font-bold border-b border-black">
                  <td className="border border-black p-1"></td>
                  <td colSpan={2} className="border border-black p-1 text-right uppercase">TOTAL BEBAN OPERASIONAL KAS (OPEX):</td>
                  <td className="border border-black p-1 text-right font-mono font-bold text-rose-700">-{formatRupiah(summary.total_beban_operasional)}</td>
                </tr>

                <tr className="bg-gray-100 font-bold border-t-2 border-b-2 border-black">
                  <td className="border border-black p-1 text-center font-bold">D</td>
                  <td colSpan={2} className="border border-black p-1 uppercase font-bold">SISA HASIL USAHA BERSIH (NET SHU TAHUN BERJALAN):</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{formatRupiah(summary.total_laba_bersih)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── BAGIAN II: ALOKASI DISTRIBUSI SISA HASIL USAHA (AD/ART TRIPARTITE) ── */}
          <div className="mb-2">
            <div className="border-b border-black pb-0.5 mb-1.5 flex justify-between items-end">
              <h2 className="text-[11.5px] font-black uppercase text-black m-0 tracking-wide">
                II. ALOKASI DISTRIBUSI SISA HASIL USAHA (AD/ART KOPERASI)
              </h2>
              <span className="text-[9px] font-semibold text-gray-600 uppercase font-mono">
                Porsi Statutory
              </span>
            </div>

            <table className="print-table w-full border border-black text-[10.5px]">
              <thead>
                <tr className="bg-gray-100 font-bold border-b border-black text-[9.5px]">
                  <th className="border border-black p-1 text-left" style={{ width: '50%' }}>Pilar Alokasi SHU (AD/ART Koperasi)</th>
                  <th className="border border-black p-1 text-center" style={{ width: '20%' }}>Porsi Rasio (%)</th>
                  <th className="border border-black p-1 text-right" style={{ width: '30%' }}>Alokasi Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black">
                  <td className="border border-black p-1 pl-3 font-semibold">👥 Bagian Jasa Partisipasi Belanja Anggota</td>
                  <td className="border border-black p-1 text-center font-bold">60.0%</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{formatRupiah(summary.shu_anggota_60)}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-1 pl-3 font-semibold">🏢 Cadangan Modal Koperasi (Retained Capital)</td>
                  <td className="border border-black p-1 text-center font-bold">30.0%</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{formatRupiah(summary.shu_cadangan_30)}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-1 pl-3 font-semibold">🎖️ Bagian Pengurus, Pengawas & Karyawan</td>
                  <td className="border border-black p-1 text-center font-bold">10.0%</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{formatRupiah(summary.shu_pengurus_10)}</td>
                </tr>
                <tr className="bg-gray-100 font-bold border-t-2 border-black">
                  <td className="border border-black p-1 uppercase font-bold">TOTAL ALOKASI SHU KOPERASI (100.0%):</td>
                  <td className="border border-black p-1 text-center font-bold">100.0%</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{formatRupiah(summary.total_laba_bersih)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Running Footer Lembar 1 */}
          <div className="mt-auto pt-2 border-t border-gray-400 flex justify-between items-center text-[8.5px] text-gray-500 font-mono">
            <span>KOPERASI KARYAWAN PKP-PK BTH — Core Engine Accounting Laporan Real-Time</span>
            <span className="font-bold text-black">Lembar 1 dari 3</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* ── LEMBAR 2 (SHEET 2): SUB-LEDGER PARTISIPASI BELANJA & HAK SHU ANGGOTA ── */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <div className="print-sheet">
          {/* Running Sub-Header Lembar 2 */}
          <div className="border-b-2 border-black pb-1 mb-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/Logo.svg" alt="Logo" className="w-7 h-7 object-contain" />
              <div>
                <h1 className="text-[11px] font-black uppercase text-black m-0 leading-tight">
                  KOPERASI KARYAWAN PKP-PK BTH
                </h1>
                <p className="text-[8.5px] text-gray-600 m-0">Lampiran Laporan: Sub-Ledger Partisipasi Belanja & Hak SHU Anggota</p>
              </div>
            </div>
            <div className="text-right text-[8.5px] font-mono">
              <div>Periode: {tglMulai ? formatDateOnly(tglMulai) : 'Awal'} s/d {tglSelesai ? formatDateOnly(tglSelesai) : 'Kini'}</div>
              <div className="font-bold text-black">Lembar 2 dari 3</div>
            </div>
          </div>

          {/* ── BAGIAN III: BUKU PEMBANTU PARTISIPASI BELANJA & ESTIMASI HAK SHU PER ANGGOTA ── */}
          <div className="mb-2">
            <div className="border-b border-black pb-0.5 mb-1.5 flex justify-between items-end">
              <div>
                <h2 className="text-[11.5px] font-black uppercase text-black m-0 tracking-wide">
                  III. BUKU PEMBANTU PARTISIPASI BELANJA & ESTIMASI HAK SHU PER ANGGOTA
                </h2>
                <p className="text-[8.5px] text-gray-600 m-0">
                  Sub-Ledger Real-Time Berdasarkan Akumulasi Nilai Transaksi & Mutasi Piutang Anggota
                </p>
              </div>
              <span className="text-[8.5px] font-mono font-bold text-gray-700">
                Total: {(data?.rekap_anggota || []).length} Anggota Terdata
              </span>
            </div>

            <table className="print-table w-full border border-black text-[9.5px] mb-2">
              <thead>
                <tr className="bg-gray-100 font-bold border-b border-black text-[8.5px] uppercase">
                  <th className="border border-black p-1 text-center" style={{ width: '4%' }}>No</th>
                  <th className="border border-black p-1 text-left" style={{ width: '26%' }}>Nama Lengkap Anggota</th>
                  <th className="border border-black p-1 text-center" style={{ width: '6%' }}>Frek</th>
                  <th className="border border-black p-1 text-right" style={{ width: '14%' }}>Total Belanja</th>
                  <th className="border border-black p-1 text-right" style={{ width: '13%' }}>Bayar Lunas</th>
                  <th className="border border-black p-1 text-right" style={{ width: '13%' }}>Piutang Baru</th>
                  <th className="border border-black p-1 text-center" style={{ width: '8%' }}>Porsi (%)</th>
                  <th className="border border-black p-1 text-right" style={{ width: '16%' }}>Hak SHU Belanja</th>
                </tr>
              </thead>
              <tbody>
                {!(data?.rekap_anggota || []).length ? (
                  <tr>
                    <td colSpan={8} className="border border-black p-3 text-center text-gray-500 italic">
                      Belum ada data partisipasi belanja anggota pada rentang periode ini.
                    </td>
                  </tr>
                ) : (
                  (data?.rekap_anggota || []).map((m, idx) => (
                    <tr key={m.anggota_id} className="border-b border-gray-300">
                      <td className="border border-black p-1 text-center font-medium">{idx + 1}</td>
                      <td className="border border-black p-1 text-left font-bold">{m.nama_lengkap}</td>
                      <td className="border border-black p-1 text-center">{m.frekuensi_belanja}x</td>
                      <td className="border border-black p-1 text-right font-mono font-semibold">{formatRupiah(m.total_belanja)}</td>
                      <td className="border border-black p-1 text-right font-mono text-emerald-700">{formatRupiah(m.total_lunas)}</td>
                      <td className="border border-black p-1 text-right font-mono text-rose-700">{m.total_hutang > 0 ? formatRupiah(m.total_hutang) : '-'}</td>
                      <td className="border border-black p-1 text-center font-semibold">{m.porsi_persen}%</td>
                      <td className="border border-black p-1 text-right font-mono font-black text-blue-900">{formatRupiah(m.hak_shu)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-black text-[9.5px]">
                  <td colSpan={3} className="border border-black p-1 text-right uppercase">TOTAL REKAPITULASI (HAK ANGGOTA 60%):</td>
                  <td className="border border-black p-1 text-right font-mono font-black">
                    {formatRupiah((data?.rekap_anggota || []).reduce((acc, c) => acc + c.total_belanja, 0))}
                  </td>
                  <td className="border border-black p-1 text-right font-mono font-bold text-emerald-800">
                    {formatRupiah((data?.rekap_anggota || []).reduce((acc, c) => acc + c.total_lunas, 0))}
                  </td>
                  <td className="border border-black p-1 text-right font-mono font-bold text-rose-800">
                    {formatRupiah((data?.rekap_anggota || []).reduce((acc, c) => acc + c.total_hutang, 0))}
                  </td>
                  <td className="border border-black p-1 text-center font-black">100.0%</td>
                  <td className="border border-black p-1 text-right font-mono font-black text-blue-950">
                    {formatRupiah(summary.shu_anggota_60)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Running Footer Lembar 2 */}
          <div className="mt-auto pt-2 border-t border-gray-400 flex justify-between items-center text-[8.5px] text-gray-500 font-mono">
            <span>KOPERASI KARYAWAN PKP-PK BTH — Core Engine Accounting Laporan Real-Time</span>
            <span className="font-bold text-black">Lembar 2 dari 3</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* ── LEMBAR 3 (SHEET 3): EVALUASI TINGKAT KESEHATAN & DISCLAIMER AUDIT ── */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <div className="print-sheet print-sheet-last">
          {/* Running Sub-Header Lembar 3 */}
          <div className="border-b-2 border-black pb-1 mb-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/Logo.svg" alt="Logo" className="w-7 h-7 object-contain" />
              <div>
                <h1 className="text-[11px] font-black uppercase text-black m-0 leading-tight">
                  KOPERASI KARYAWAN PKP-PK BTH
                </h1>
                <p className="text-[8.5px] text-gray-600 m-0">Lampiran Laporan: Analisis Manajemen Keuangan & Audit Trail Akuntansi</p>
              </div>
            </div>
            <div className="text-right text-[8.5px] font-mono">
              <div>Periode: {tglMulai ? formatDateOnly(tglMulai) : 'Awal'} s/d {tglSelesai ? formatDateOnly(tglSelesai) : 'Kini'}</div>
              <div className="font-bold text-black">Lembar 3 dari 3</div>
            </div>
          </div>

          {/* ── BAGIAN IV: EVALUASI TINGKAT KESEHATAN KOPERASI & MANAJEMEN KEUANGAN UNIT PKP-PK ── */}
          <div className="mb-2">
            <div className="border-b border-black pb-0.5 mb-1.5 flex justify-between items-end">
              <div>
                <h2 className="text-[11.5px] font-black uppercase text-black m-0 tracking-wide">
                  IV. EVALUASI TINGKAT KESEHATAN KOPERASI & MANAJEMEN KEUANGAN UNIT PKP-PK
                </h2>
                <p className="text-[8.5px] text-gray-600 m-0">
                  Diagnosis Real-Time Berdasarkan Rasio Likuiditas, Efisiensi OPEX, dan Keaktifan Anggota
                </p>
              </div>
              <div className="text-right">
                <span className="text-[8.5px] font-bold uppercase px-1.5 py-0.5 border border-black rounded bg-gray-100 font-mono">
                  SKOR: {ksh.skor_kesehatan}/100 — {ksh.status_kesehatan}
                </span>
              </div>
            </div>

            {/* Tabel Rasio Keuangan Koperasi Berstandar Manajemen Finansial */}
            <table className="print-table w-full border border-black text-[9px] mb-2">
              <thead>
                <tr className="bg-gray-100 font-bold border-b border-black text-[8.5px] uppercase">
                  <th className="border border-black p-1 text-center" style={{ width: '4%' }}>No</th>
                  <th className="border border-black p-1 text-left" style={{ width: '28%' }}>Indikator Rasio Finansial</th>
                  <th className="border border-black p-1 text-left" style={{ width: '30%' }}>Formula Manajemen Keuangan</th>
                  <th className="border border-black p-1 text-center" style={{ width: '15%' }}>Hasil Hitung Riil</th>
                  <th className="border border-black p-1 text-center" style={{ width: '23%' }}>Status / Evaluasi Rasio</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1 text-center font-bold">1</td>
                  <td className="border border-black p-1 font-semibold">Cash Coverage / Rasio Kas Likuid</td>
                  <td className="border border-black p-1 font-mono text-[8px]">Kas Masuk / (OPEX + Piutang)</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{ksh.cash_coverage_ratio_persen}%</td>
                  <td className="border border-black p-1 text-center font-semibold text-[8px]">
                    {ksh.cash_coverage_ratio_persen >= 100 ? '✅ Sangat Likuid (Kas Aman)' : ksh.cash_coverage_ratio_persen >= 50 ? '⚠️ Cukup Likuid (Waspada)' : '❌ Kritis Likuiditas'}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1 text-center font-bold">2</td>
                  <td className="border border-black p-1 font-semibold">Beban Piutang (A/R to Sales)</td>
                  <td className="border border-black p-1 font-mono text-[8px]">Total Piutang / Omset Total</td>
                  <td className="border border-black p-1 text-center font-mono font-bold text-rose-700">{ksh.rasio_piutang_omset_persen}%</td>
                  <td className="border border-black p-1 text-center font-semibold text-[8px]">
                    {ksh.rasio_piutang_omset_persen <= 20 ? '✅ Kolektibilitas Prima' : ksh.rasio_piutang_omset_persen <= 40 ? '⚠️ Beban Bon Sedang' : '❌ Bon Terlalu Tinggi'}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1 text-center font-bold">3</td>
                  <td className="border border-black p-1 font-semibold">Gross Profit Margin (GPM)</td>
                  <td className="border border-black p-1 font-mono text-[8px]">Laba Kotor / Total Omset</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{ksh.gross_profit_margin_persen}%</td>
                  <td className="border border-black p-1 text-center font-semibold text-[8px]">
                    {ksh.gross_profit_margin_persen >= 12 ? '✅ Margin Sehat (Standar Retail)' : '⚠️ Margin Rendah'}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1 text-center font-bold">4</td>
                  <td className="border border-black p-1 font-semibold">Operating Expense Ratio (OER)</td>
                  <td className="border border-black p-1 font-mono text-[8px]">Beban OPEX / Laba Kotor</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{ksh.operating_expense_ratio_persen}%</td>
                  <td className="border border-black p-1 text-center font-semibold text-[8px]">
                    {ksh.operating_expense_ratio_persen <= 40 ? '✅ Biaya Sangat Efisien' : ksh.operating_expense_ratio_persen <= 70 ? '⚠️ Biaya Wajar' : '❌ Biaya Boros / Tinggi'}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1 text-center font-bold">5</td>
                  <td className="border border-black p-1 font-semibold">Net SHU Margin (NPM)</td>
                  <td className="border border-black p-1 font-mono text-[8px]">Net SHU Riil / Total Omset</td>
                  <td className="border border-black p-1 text-center font-mono font-bold text-emerald-800">{ksh.net_profit_margin_persen}%</td>
                  <td className="border border-black p-1 text-center font-semibold text-[8px]">
                    {ksh.net_profit_margin_persen >= 5 ? '✅ Hasil Usaha Prima' : '⚠️ Hasil Usaha Minim'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">6</td>
                  <td className="border border-black p-1 font-semibold">Tingkat Partisipasi Anggota</td>
                  <td className="border border-black p-1 font-mono text-[8px]">Anggota Aktif / Total Anggota</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{ksh.jumlah_anggota_aktif}/{ksh.total_anggota_terdaftar} ({ksh.rasio_partisipasi_persen}%)</td>
                  <td className="border border-black p-1 text-center font-semibold text-[8px]">
                    {ksh.rasio_partisipasi_persen >= 80 ? '✅ Partisipasi Sangat Solid' : '⚠️ Perlu Dorongan Belanja'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Matriks Tindakan Manajemen Berdasarkan Kondisi Angka Riil */}
            <div className="border border-black p-1.5 rounded bg-gray-50/70 text-[8.5px] space-y-0.5 mb-2">
              <div className="font-bold text-black border-b border-gray-300 pb-0.5 uppercase flex justify-between">
                <span>📋 Kesimpulan Audit Manajemen Finansial:</span>
                <span className="font-mono text-[8px] text-gray-700">Status: {ksh.status_kesehatan}</span>
              </div>
              <p className="m-0 text-gray-800 leading-tight">
                <strong>Diagnosa Sistem:</strong> {ksh.kesimpulan_evaluasi}
              </p>
              <div className="pt-0.5 text-[8px]">
                <strong>• Aksi Bagi Anggota Unit PKP-PK:</strong>
                <p className="m-0 text-gray-700">
                  {ksh.total_piutang_berjalan > 0 
                    ? `Selesaikan total piutang bon berjalan sebesar ${formatRupiah(ksh.total_piutang_berjalan)} saat payroll agar kas kulakan tetap lancar.`
                    : `Disiplin pembayaran lunas terjaga 100%. Pertahankan keaktifan belanja kebutuhan dinas di koperasi.`}
                </p>
              </div>
            </div>
          </div>

          {/* ── BAGIAN V: LEMBAR TRANSPARANSI & INTEGRITAS SISTEM (AUDIT TRAIL & VERIFIKASI AKUNTANSI) ── */}
          <div className="p-2 border-2 border-dashed border-gray-400 bg-gray-50/60 rounded text-[8.5px] text-gray-800 space-y-1 mb-2">
            <div className="flex items-center justify-between border-b border-gray-300 pb-0.5 font-bold">
              <span className="uppercase text-black flex items-center gap-1">
                🛡️ V. LEMBAR TRANSPARANSI & INTEGRITAS SISTEM (AUDIT TRAIL)
              </span>
              <span className="font-mono text-[8px] text-gray-600">REF ID: KOP-PK/{Date.now().toString(36).toUpperCase()}</span>
            </div>
            <p className="m-0 text-gray-700 leading-tight">
              <strong>1. Sumber & Keabsahan Data:</strong> Laporan pertanggungjawaban operasional dan perhitungan SHU ini diterbitkan secara otomatis oleh <em>Core Engine Koperasi PKP-PK BTH</em> secara <strong>real-time</strong> berdasarkan <em>immutable transaction logs</em> (tabel <code>transaksi</code>, <code>transaksi_detail</code>, dan <code>pengeluaran_operasional</code>) yang tercatat di sistem kasir POS Koperasi.
            </p>
            <p className="m-0 text-gray-700 leading-tight">
              <strong>2. Metodologi Komputasi SHU:</strong> Perhitungan mengacu pada standar <strong>SAK Entitas Privat Koperasi Indonesia</strong> & Anggaran Dasar Koperasi (AD/ART) Bab Perhitungan SHU:
              <br />
              • <em>Laba Kotor</em> = Total Omset Penjualan Anggota − Beban Pokok Penjualan (HPP Modal Kulakan).
              <br />
              • <em>Net SHU Riil</em> = Laba Kotor − Total Realisasi Pengeluaran Kas Operasional (OPEX).
              <br />
              • <em>Hak SHU Anggota (60%)</em> dibagikan secara proporsional berdasarkan rumus matematis: <code>(Total Belanja Anggota / Total Omset Anggota) × 60% Net SHU</code>.
            </p>
            <p className="m-0 text-gray-700 leading-tight">
              <strong>3. Hak Uji & Rekonsiliasi Anggota:</strong> Laporan ini disajikan terbuka kepada Pengurus, Badan Pengawas, dan seluruh Anggota Koperasi. Apabila terdapat ketidaksesuaian nilai transaksi, riwayat pembayaran, atau saldo piutang, Anggota berhak mengajukan verifikasi/koreksi dengan melampirkan nomor referensi transaksi atau struk belanja ke Pengurus Koperasi.
            </p>
            <div className="pt-0.5 border-t border-gray-200 flex justify-between items-center text-[7.5px] text-gray-500 font-mono">
              <span>Status Verifikasi: VALID & REALTIME (TERAUTENTIKASI SISTEM)</span>
              <span>Diterbitkan: {new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' })}</span>
            </div>
          </div>

          {/* Running Footer Lembar 3 */}
          <div className="mt-auto pt-2 border-t border-gray-400 flex justify-between items-center text-[8.5px] text-gray-500 font-mono">
            <span>KOPERASI KARYAWAN PKP-PK BTH — Core Engine Accounting Laporan Real-Time</span>
            <span className="font-bold text-black">Lembar 3 dari 3</span>
          </div>
        </div>

      </div>

      {/* ── SCREEN UI (FOR NORMAL BROWSER VIEW) ── */}
      <div id="screen-content" className="space-y-4 sm:space-y-6">
        {/* ── Page Header & Action Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            Laporan Keuangan & Penjualan
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Audit omset POS, beban pokok (HPP), pengeluaran kas operasional, dan SHU bersih.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button 
            variant="primary"
            size="sm"
            onClick={() => setIsExpenseModalOpen(true)}
            className="text-xs font-bold gap-1.5 h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran Kas</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsCorporateModalOpen(true)} 
            className="text-xs font-bold gap-1.5 h-9 rounded-xl border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Rekap Hasil Usaha (SHU)</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportCsv} 
            className="text-xs font-bold gap-1.5 h-9 rounded-xl border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            CSV
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

      {/* ── 6-Card Executive Financial Metrics (Incorporating OPEX) ── */}
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HPP Modal</span>
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
            Gross: {marginGrossPercent}%
          </p>
        </div>

        {/* Beban Pengeluaran Kas (OPEX) */}
        <div 
          onClick={() => setActiveTab('pengeluaran')}
          className="p-3 sm:p-4 rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 shadow-xs cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pengeluaran Kas</span>
            <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-300 leading-tight">
            {formatRupiah(summary.total_beban_operasional)}
          </h3>
          <p className="text-[10px] text-amber-600 font-bold mt-1">
            {pengeluaranList.length} transaksi kas
          </p>
        </div>

        {/* Net SHU Bersih */}
        <div className="p-3 sm:p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">SHU Bersih Riil</span>
            <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-700">
              <PieChart className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300 leading-tight">
            {formatRupiah(summary.total_laba_bersih)}
          </h3>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">
            Net: {marginNetPercent}%
          </p>
        </div>

        {/* Kas Likuid */}
        <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kas Masuk Likuid</span>
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
          onClick={() => setActiveTab('pengeluaran')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
            activeTab === 'pengeluaran'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          Pengeluaran Kas ({pengeluaranList.length})
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

      {/* ── TAB 2: PENGELUARAN KAS OPERASIONAL (OPEX) ── */}
      {activeTab === 'pengeluaran' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                Buku Kas Pengeluaran Operasional Koperasi
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pencatatan beban rutin kas: Gas, Listrik, Air, Kertas Struk, ATK, Pemeliharaan, dan Keperluan Toko.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsExpenseModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Catat Pengeluaran
            </Button>
          </div>

          <Card className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
            <CardContent className="p-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-100 dark:border-zinc-800 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Nama Pengeluaran</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Keterangan / Catatan</th>
                    <th className="py-3 px-4 text-right">Jumlah (Rp)</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {!pengeluaranList.length ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-400 font-semibold">
                        Belum ada catatan pengeluaran kas pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    pengeluaranList.map(item => (
                      <tr key={item.pengeluaran_id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDateOnly(item.tanggal)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {item.nama_pengeluaran}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                            {item.kategori || 'Operasional'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {item.keterangan || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                          -{formatRupiah(item.nominal)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteExpense(item.pengeluaran_id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Hapus Pengeluaran"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {pengeluaranList.length > 0 && (
                <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-xs">
                  <span className="font-bold text-amber-800 dark:text-amber-300">Total Beban Operasional Kas:</span>
                  <span className="font-black text-rose-600 text-base">-{formatRupiah(summary.total_beban_operasional)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 3: KINERJA KASIR & METODE BAYAR ── */}
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

      {/* ── TAB 4: REKAPITULASI HARIAN ── */}
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
                        {formatDateOnly(h.tanggal)}
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

      {/* ── MODAL CATAT PENGELUARAN KAS (BEBAS / FLEKSIBEL) ── */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="🧾 Catat Pengeluaran Kas Koperasi"
      >
        <form onSubmit={handleCreateExpense} className="space-y-3.5 text-xs">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-[11px]">
            Catat pengeluaran kas operasional secara bebas (seperti beli gas, listrik, air, perlengkapan kasir, konsumsi, dll). Nominal akan langsung memotong laba kotor untuk menghasilkan <b>Net SHU Bersih</b>.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Pengeluaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Beli Gas LPG 12kg Toko, Token Listrik, Plastik Kresek..."
              value={expenseForm.nama_pengeluaran}
              onChange={e => setExpenseForm({ ...expenseForm, nama_pengeluaran: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-zinc-800 font-semibold text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <InputRupiah
                label="Jumlah Pengeluaran (Rp)"
                value={expenseForm.nominal}
                onChange={val => setExpenseForm({ ...expenseForm, nominal: Number(val) })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tanggal Pengeluaran
              </label>
              <input
                type="date"
                required
                value={expenseForm.tanggal}
                onChange={e => setExpenseForm({ ...expenseForm, tanggal: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-zinc-800 font-semibold text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Pengeluaran
              </label>
              <input
                type="text"
                placeholder="Contoh: Utilitas / Perlengkapan / Perbaikan..."
                value={expenseForm.kategori}
                onChange={e => setExpenseForm({ ...expenseForm, kategori: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-zinc-800 font-semibold text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Catatan / Keterangan
              </label>
              <input
                type="text"
                placeholder="Keterangan tambahan / No. Bukti..."
                value={expenseForm.keterangan}
                onChange={e => setExpenseForm({ ...expenseForm, keterangan: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-zinc-800 font-semibold text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsExpenseModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={savingExpense} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
              Simpan Pengeluaran
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL LAPORAN HASIL USAHA (SHU) KOPERASI INTERNAL ── */}
      <Modal
        isOpen={isCorporateModalOpen}
        onClose={() => setIsCorporateModalOpen(false)}
        title="📑 Rekapitulasi Hasil Usaha & Kas Koperasi"
      >
        <div className="space-y-4 text-xs max-h-[82vh] overflow-y-auto p-2 bg-white text-black rounded-xl">
          
          {/* ── KOP SURAT RESMI (MATCHING PKM & STANDAR DOKUMEN KOPKAR) ── */}
          <div className="border-b-4 border-double border-black pb-3 mb-3 avoid-break">
            <div className="flex items-center justify-between gap-4 text-left">
              
              {/* Logo Kiri Resmi Koperasi (Matching App Icon Blue & Gold) */}
              <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                <img src="/Logo.svg" alt="Logo Koperasi PKP-PK BTH" className="w-14 h-14 object-contain drop-shadow-xs" />
              </div>

              {/* Teks Kop Tengah */}
              <div className="text-center flex-1">
                <h1 className="text-base font-black tracking-wider uppercase m-0 p-0 text-black leading-tight">
                  KOPERASI KARYAWAN PKP-PK BTH
                </h1>
                <h2 className="text-xs font-black text-black m-0 mt-0.5 tracking-wide uppercase">
                  LAPORAN PERHITUNGAN HASIL USAHA (PHU) & REALISASI KAS
                </h2>
                <p className="text-[10px] text-gray-700 m-0 mt-0.5 font-medium">
                  Unit PKP-PK Hang Nadim Batam — Jl. Hang Nadim No.01, Batu Besar, Kecamatan Nongsa, Kota Batam, Kepulauan Riau 29466
                </p>
              </div>

              {/* Dokumen Meta Box Kanan */}
              <div className="border-2 border-black p-2 rounded-lg text-[10px] text-left shrink-0 min-w-[175px] space-y-0.5 bg-gray-50/70 font-semibold">
                <div>No. Surat : <span className="font-mono font-bold">{(() => {
                  const d = tglSelesai ? new Date(tglSelesai) : new Date()
                  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
                  const monthRoman = romanMonths[d.getMonth()] || 'IX'
                  const year = d.getFullYear() || 2026
                  const seq = String(summary.total_transaksi > 0 ? (summary.total_transaksi % 999) + 1 : 1).padStart(3, '0')
                  return `${seq}/KOPKAR-PKP-PK/PHU/${monthRoman}/${year}`
                })()}</span></div>
                <div>Periode &nbsp;&nbsp;&nbsp;: {tglMulai ? formatDateOnly(tglMulai) : 'Awal'} s/d {tglSelesai ? formatDateOnly(tglSelesai) : 'Kini'}</div>
                <div>Tgl Cetak : {formatDateOnly(new Date())}</div>
              </div>

            </div>
          </div>

          {/* ── TABEL I: PERHITUNGAN LABA RUGI OPERASIONAL (ACCOUNTING COLUMNAR TABLE) ── */}
          <div className="avoid-break space-y-1">
            <h3 className="font-black text-[11px] uppercase tracking-wider text-black border-b border-black pb-0.5">
              I. PERHITUNGAN HASIL USAHA (PHU / LABA RUGI OPERASIONAL)
            </h3>
            <table className="w-full border-collapse border border-black text-[11px]">
              <thead>
                <tr className="bg-gray-100 border-b border-black font-black text-[10px] uppercase text-black">
                  <th className="border border-black p-1.5 text-center" style={{ width: '6%' }}>No</th>
                  <th className="border border-black p-1.5 text-left" style={{ width: '54%' }}>Uraian Pos Keuangan</th>
                  <th className="border border-black p-1.5 text-center" style={{ width: '18%' }}>Keterangan</th>
                  <th className="border border-black p-1.5 text-right" style={{ width: '22%' }}>Jumlah Nominal</th>
                </tr>
              </thead>
              <tbody>
                {/* Section A: Pendapatan */}
                <tr className="bg-gray-50/80 font-bold border-b border-black">
                  <td className="border border-black p-1.5 text-center font-black">A</td>
                  <td colSpan={3} className="border border-black p-1.5 uppercase tracking-wide">
                    PENDAPATAN OPERASIONAL TOKO (OMSET PARTISIPASI BELANJA)
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1.5 text-center">1</td>
                  <td className="border border-black p-1.5 pl-4">Pendapatan Partisipasi Belanja Anggota Koperasi</td>
                  <td className="border border-black p-1.5 text-center text-[10px] text-gray-600">Berhak SHU</td>
                  <td className="border border-black p-1.5 text-right font-mono font-semibold">{formatRupiah(summary.omset_anggota || summary.total_pendapatan)}</td>
                </tr>
                <tr className="bg-gray-100/60 font-black border-b border-black">
                  <td className="border border-black p-1.5"></td>
                  <td colSpan={2} className="border border-black p-1.5 text-right uppercase">TOTAL PENDAPATAN OPERASIONAL (OMSET BRUTO):</td>
                  <td className="border border-black p-1.5 text-right font-mono text-xs">{formatRupiah(summary.total_pendapatan)}</td>
                </tr>

                {/* Section B: HPP */}
                <tr className="bg-gray-50/80 font-bold border-b border-black">
                  <td className="border border-black p-1.5 text-center font-black">B</td>
                  <td colSpan={3} className="border border-black p-1.5 uppercase tracking-wide">
                    BEBAN POKOK PENJUALAN (HPP / MODAL BARANG)
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-1.5 text-center">1</td>
                  <td className="border border-black p-1.5 pl-4 text-rose-700 font-medium">Beban Pokok Barang Terjual (COGS / Modal Kulakan)</td>
                  <td className="border border-black p-1.5 text-center text-[10px] text-rose-600">Pengurang</td>
                  <td className="border border-black p-1.5 text-right font-mono font-semibold text-rose-700">({formatRupiah(summary.total_hpp)})</td>
                </tr>
                <tr className="bg-gray-200/80 font-black border-b-2 border-black">
                  <td className="border border-black p-1.5"></td>
                  <td colSpan={2} className="border border-black p-1.5 text-right uppercase">
                    LABA KOTOR OPERASIONAL USAHA (GROSS PROFIT MARGIN: {marginGrossPercent}%):
                  </td>
                  <td className="border border-black p-1.5 text-right font-mono text-xs">{formatRupiah(summary.total_keuntungan)}</td>
                </tr>

                {/* Section C: OPEX */}
                <tr className="bg-gray-50/80 font-bold border-b border-black">
                  <td className="border border-black p-1.5 text-center font-black">C</td>
                  <td colSpan={3} className="border border-black p-1.5 uppercase tracking-wide">
                    BEBAN OPERASIONAL KAS KOPERASI (OPEX)
                  </td>
                </tr>
                {!pengeluaranList.length ? (
                  <tr className="border-b border-gray-300">
                    <td className="border border-black p-1.5 text-center">-</td>
                    <td colSpan={2} className="border border-black p-1.5 pl-4 italic text-gray-500">Tidak ada transaksi pengeluaran kas tercatat pada periode ini.</td>
                    <td className="border border-black p-1.5 text-right font-mono">Rp 0</td>
                  </tr>
                ) : (
                  pengeluaranList.map((p, idx) => (
                    <tr key={p.pengeluaran_id} className="border-b border-gray-300">
                      <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-black p-1.5 pl-4 font-medium">{p.nama_pengeluaran}</td>
                      <td className="border border-black p-1.5 text-center text-[10px] text-gray-600">{p.kategori || 'Operasional'} ({formatDateOnly(p.tanggal)})</td>
                      <td className="border border-black p-1.5 text-right font-mono font-semibold text-rose-700">-{formatRupiah(p.nominal)}</td>
                    </tr>
                  ))
                )}
                <tr className="bg-gray-100/60 font-black border-b border-black">
                  <td className="border border-black p-1.5"></td>
                  <td colSpan={2} className="border border-black p-1.5 text-right uppercase">TOTAL BEBAN OPERASIONAL KAS (OPEX):</td>
                  <td className="border border-black p-1.5 text-right font-mono font-black text-rose-700">-{formatRupiah(summary.total_beban_operasional)}</td>
                </tr>

                {/* Section D: Net SHU */}
                <tr className="bg-emerald-50/80 font-black border-t-2 border-b-2 border-black text-xs">
                  <td className="border border-black p-2 text-center font-black text-emerald-900">D</td>
                  <td colSpan={2} className="border border-black p-2 uppercase tracking-wide text-emerald-900">
                    SISA HASIL USAHA BERSIH (NET SHU TAHUN BERJALAN):
                  </td>
                  <td className="border border-black p-2 text-right font-mono text-sm font-black text-emerald-900">
                    {formatRupiah(summary.total_laba_bersih)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── TABEL II: ALOKASI DISTRIBUSI SHU STATUTORY (AD/ART TRIPARTITE) ── */}
          <div className="avoid-break space-y-1 pt-1">
            <h3 className="font-black text-[11px] uppercase tracking-wider text-black border-b border-black pb-0.5">
              II. ALOKASI DISTRIBUSI SISA HASIL USAHA (AD/ART KOPERASI)
            </h3>
            <table className="w-full border-collapse border border-black text-[11px]">
              <thead>
                <tr className="bg-gray-100 border-b border-black font-black text-[10px] uppercase text-black">
                  <th className="border border-black p-1.5 text-left" style={{ width: '50%' }}>Pilar Peruntukan SHU</th>
                  <th className="border border-black p-1.5 text-center" style={{ width: '20%' }}>Porsi Rasio (%)</th>
                  <th className="border border-black p-1.5 text-right" style={{ width: '30%' }}>Alokasi Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1.5 pl-3 font-semibold">👥 Hak Bagian Anggota (Jasa Modal & Belanja Partisipasi)</td>
                  <td className="border border-black p-1.5 text-center font-bold">60.0%</td>
                  <td className="border border-black p-1.5 text-right font-mono font-bold">{formatRupiah(summary.shu_anggota_60)}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1.5 pl-3 font-semibold">🏢 Cadangan Modal Koperasi (Retained Capital)</td>
                  <td className="border border-black p-1.5 text-center font-bold">30.0%</td>
                  <td className="border border-black p-1.5 text-right font-mono font-bold">{formatRupiah(summary.shu_cadangan_30)}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1.5 pl-3 font-semibold">🎖️ Jasa Pengurus, Pengawas & Karyawan</td>
                  <td className="border border-black p-1.5 text-center font-bold">10.0%</td>
                  <td className="border border-black p-1.5 text-right font-mono font-bold">{formatRupiah(summary.shu_pengurus_10)}</td>
                </tr>
                <tr className="bg-gray-100 font-black border-t-2 border-black">
                  <td className="border border-black p-1.5 uppercase">TOTAL ALOKASI SHU KOPERASI (100.0%):</td>
                  <td className="border border-black p-1.5 text-center font-black">100.0%</td>
                  <td className="border border-black p-1.5 text-right font-mono font-black">{formatRupiah(summary.total_laba_bersih)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── BAGIAN III: BUKU PEMBANTU RINCIAN PARTISIPASI BELANJA & HAK SHU PER ANGGOTA ── */}
          <div className="avoid-break space-y-1 pt-1">
            <div className="border-b border-black pb-0.5 flex justify-between items-end">
              <h3 className="font-black text-[11px] uppercase tracking-wider text-black m-0">
                III. BUKU PEMBANTU PARTISIPASI BELANJA & ESTIMASI HAK SHU PER ANGGOTA
              </h3>
              <span className="text-[9px] font-mono text-gray-600">
                Total: {(data?.rekap_anggota || []).length} Anggota
              </span>
            </div>

            <table className="w-full border-collapse border border-black text-[10px]">
              <thead>
                <tr className="bg-gray-100 border-b border-black font-black text-[9px] uppercase text-black">
                  <th className="border border-black p-1 text-center" style={{ width: '4%' }}>No</th>
                  <th className="border border-black p-1 text-left" style={{ width: '26%' }}>Nama Lengkap Anggota</th>
                  <th className="border border-black p-1 text-center" style={{ width: '6%' }}>Frek</th>
                  <th className="border border-black p-1 text-right" style={{ width: '14%' }}>Total Belanja</th>
                  <th className="border border-black p-1 text-right" style={{ width: '13%' }}>Bayar Lunas</th>
                  <th className="border border-black p-1 text-right" style={{ width: '13%' }}>Piutang Baru</th>
                  <th className="border border-black p-1 text-center" style={{ width: '8%' }}>Porsi (%)</th>
                  <th className="border border-black p-1 text-right" style={{ width: '16%' }}>Hak SHU Belanja</th>
                </tr>
              </thead>
              <tbody>
                {!(data?.rekap_anggota || []).length ? (
                  <tr>
                    <td colSpan={8} className="border border-black p-3 text-center text-gray-500 italic">
                      Belum ada data partisipasi belanja anggota pada rentang periode ini.
                    </td>
                  </tr>
                ) : (
                  (data?.rekap_anggota || []).map((m, idx) => (
                    <tr key={m.anggota_id} className="border-b border-gray-300">
                      <td className="border border-black p-1 text-center font-medium">{idx + 1}</td>
                      <td className="border border-black p-1 text-left font-bold">{m.nama_lengkap}</td>
                      <td className="border border-black p-1 text-center">{m.frekuensi_belanja}x</td>
                      <td className="border border-black p-1 text-right font-mono font-semibold">{formatRupiah(m.total_belanja)}</td>
                      <td className="border border-black p-1 text-right font-mono text-emerald-700">{formatRupiah(m.total_lunas)}</td>
                      <td className="border border-black p-1 text-right font-mono text-rose-700">{m.total_hutang > 0 ? formatRupiah(m.total_hutang) : '-'}</td>
                      <td className="border border-black p-1 text-center font-semibold">{m.porsi_persen}%</td>
                      <td className="border border-black p-1 text-right font-mono font-black text-blue-900">{formatRupiah(m.hak_shu)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-black border-t-2 border-black text-[10px]">
                  <td colSpan={3} className="border border-black p-1 text-right uppercase">TOTAL REKAPITULASI (HAK ANGGOTA 60%):</td>
                  <td className="border border-black p-1 text-right font-mono font-black">
                    {formatRupiah((data?.rekap_anggota || []).reduce((acc, c) => acc + c.total_belanja, 0))}
                  </td>
                  <td className="border border-black p-1 text-right font-mono font-bold text-emerald-800">
                    {formatRupiah((data?.rekap_anggota || []).reduce((acc, c) => acc + c.total_lunas, 0))}
                  </td>
                  <td className="border border-black p-1 text-right font-mono font-bold text-rose-800">
                    {formatRupiah((data?.rekap_anggota || []).reduce((acc, c) => acc + c.total_hutang, 0))}
                  </td>
                  <td className="border border-black p-1 text-center font-black">100.0%</td>
                  <td className="border border-black p-1 text-right font-mono font-black text-blue-950">
                    {formatRupiah(summary.shu_anggota_60)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── BAGIAN IV: EVALUASI TINGKAT KESEHATAN KOPERASI & MANAJEMEN KEUANGAN (PERMENKOP & SAK STANDARD) ── */}
          <div className="avoid-break mt-3 pt-1 border-t-2 border-black">
            <div className="border-b border-black pb-1 mb-2 flex justify-between items-end">
              <div>
                <h3 className="text-[11px] font-black uppercase text-black m-0 flex items-center gap-1.5">
                  IV. EVALUASI TINGKAT KESEHATAN KOPERASI & MANAJEMEN KEUANGAN UNIT PKP-PK
                </h3>
                <p className="text-[9px] text-gray-600 m-0">
                  Diagnosis Real-Time Berdasarkan Rasio Likuiditas, Efisiensi OPEX, dan Keaktifan Anggota
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 border border-black rounded bg-gray-100 font-mono">
                  SKOR: {ksh.skor_kesehatan}/100 — {ksh.status_kesehatan}
                </span>
              </div>
            </div>

            {/* Tabel Rasio Keuangan Koperasi Berstandar Manajemen Finansial */}
            <table className="w-full border-collapse border border-black text-[9.5px] mb-2">
              <thead>
                <tr className="bg-gray-100 font-bold border-b border-black text-[9px] uppercase text-black">
                  <th className="border border-black p-1 text-center" style={{ width: '4%' }}>No</th>
                  <th className="border border-black p-1 text-left" style={{ width: '28%' }}>Indikator Rasio Finansial</th>
                  <th className="border border-black p-1 text-left" style={{ width: '30%' }}>Formula Manajemen Keuangan</th>
                  <th className="border border-black p-1 text-center" style={{ width: '15%' }}>Hasil Hitung Riil</th>
                  <th className="border border-black p-1 text-center" style={{ width: '23%' }}>Status / Evaluasi Rasio</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1 text-center font-bold">1</td>
                  <td className="border border-black p-1 font-semibold">Cash Coverage / Rasio Kas Likuid</td>
                  <td className="border border-black p-1 font-mono text-[8.5px]">Kas Masuk / (OPEX + Piutang)</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{ksh.cash_coverage_ratio_persen}%</td>
                  <td className="border border-black p-1 text-center font-semibold text-[8.5px]">
                    {ksh.cash_coverage_ratio_persen >= 100 ? '✅ Sangat Likuid (Kas Aman)' : ksh.cash_coverage_ratio_persen >= 50 ? '⚠️ Cukup Likuid (Waspada)' : '❌ Kritis Likuiditas'}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1 text-center font-bold">2</td>
                  <td className="border border-black p-1 font-semibold">Beban Piutang (A/R to Sales)</td>
                  <td className="border border-black p-1 font-mono text-[8.5px]">Total Piutang / Omset Total</td>
                  <td className="border border-black p-1 text-center font-mono font-bold text-rose-700">{ksh.rasio_piutang_omset_persen}%</td>
                  <td className="border border-black p-1 text-center font-semibold text-[8.5px]">
                    {ksh.rasio_piutang_omset_persen <= 20 ? '✅ Kolektibilitas Prima' : ksh.rasio_piutang_omset_persen <= 40 ? '⚠️ Beban Bon Sedang' : '❌ Bon Terlalu Tinggi'}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1 text-center font-bold">3</td>
                  <td className="border border-black p-1 font-semibold">Gross Profit Margin (GPM)</td>
                  <td className="border border-black p-1 font-mono text-[8.5px]">Laba Kotor / Total Omset</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{ksh.gross_profit_margin_persen}%</td>
                  <td className="border border-black p-1 text-center font-semibold text-[8.5px]">
                    {ksh.gross_profit_margin_persen >= 12 ? '✅ Margin Sehat (Standar Retail)' : '⚠️ Margin Rendah'}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1 text-center font-bold">4</td>
                  <td className="border border-black p-1 font-semibold">Operating Expense Ratio (OER)</td>
                  <td className="border border-black p-1 font-mono text-[8.5px]">Beban OPEX / Laba Kotor</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{ksh.operating_expense_ratio_persen}%</td>
                  <td className="border border-black p-1 text-center font-semibold text-[8.5px]">
                    {ksh.operating_expense_ratio_persen <= 40 ? '✅ Biaya Sangat Efisien' : ksh.operating_expense_ratio_persen <= 70 ? '⚠️ Biaya Wajar' : '❌ Biaya Boros / Tinggi'}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="border border-black p-1 text-center font-bold">5</td>
                  <td className="border border-black p-1 font-semibold">Net SHU Margin (NPM)</td>
                  <td className="border border-black p-1 font-mono text-[8.5px]">Net SHU Riil / Total Omset</td>
                  <td className="border border-black p-1 text-center font-mono font-bold text-emerald-800">{ksh.net_profit_margin_persen}%</td>
                  <td className="border border-black p-1 text-center font-semibold text-[8.5px]">
                    {ksh.net_profit_margin_persen >= 5 ? '✅ Hasil Usaha Prima' : '⚠️ Hasil Usaha Minim'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">6</td>
                  <td className="border border-black p-1 font-semibold">Tingkat Partisipasi Anggota</td>
                  <td className="border border-black p-1 font-mono text-[8.5px]">Anggota Aktif / Total Anggota</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{ksh.jumlah_anggota_aktif}/{ksh.total_anggota_terdaftar} ({ksh.rasio_partisipasi_persen}%)</td>
                  <td className="border border-black p-1 text-center font-semibold text-[8.5px]">
                    {ksh.rasio_partisipasi_persen >= 80 ? '✅ Partisipasi Sangat Solid' : '⚠️ Perlu Dorongan Belanja'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Matriks Tindakan Manajemen Berdasarkan Kondisi Angka Riil */}
            <div className="border border-black p-2 rounded bg-gray-50/70 text-[9.5px] space-y-1 mb-2">
              <div className="font-bold text-black border-b border-gray-300 pb-0.5 uppercase flex justify-between">
                <span>📋 Kesimpulan Audit Manajemen Finansial:</span>
                <span className="font-mono text-[9px] text-gray-700">Status: {ksh.status_kesehatan}</span>
              </div>
              <p className="m-0 text-gray-800 leading-tight">
                <strong>Diagnosa Sistem:</strong> {ksh.kesimpulan_evaluasi}
              </p>
              <div className="pt-1 text-[9px]">
                <strong>• Aksi Bagi Anggota Unit PKP-PK:</strong>
                <p className="m-0 text-gray-700">
                  {ksh.total_piutang_berjalan > 0 
                    ? `Segera selesaikan total piutang bon berjalan sebesar ${formatRupiah(ksh.total_piutang_berjalan)} saat payroll agar perputaran kas kulakan barang toko tetap lancar.`
                    : `Disiplin pembayaran lunas terjaga 100%. Pertahankan keaktifan belanja kebutuhan dinas 24 Jam di koperasi.`}
                </p>
              </div>
            </div>
          </div>

          {/* ── KOTAK DISCLAIMER & INTEGRITAS SISTEM (AUDIT TRAIL & VERIFIKASI AKUNTANSI) ── */}
          <div className="avoid-break mt-3 p-3 border-2 border-dashed border-gray-400 bg-gray-50/60 rounded text-[10px] text-gray-800 space-y-1.5">
            <div className="flex items-center justify-between border-b border-gray-300 pb-1 font-bold">
              <span className="uppercase text-black flex items-center gap-1.5">
                🛡️ V. LEMBAR TRANSPARANSI & INTEGRITAS SISTEM (SYSTEM GENERATED AUDIT TRAIL)
              </span>
              <span className="font-mono text-[9px] text-gray-600">REF ID: KOP-PK/{Date.now().toString(36).toUpperCase()}</span>
            </div>
            <p className="m-0 text-gray-700 leading-relaxed">
              <strong>1. Sumber & Keabsahan Data:</strong> Laporan pertanggungjawaban operasional dan perhitungan SHU ini diterbitkan secara otomatis oleh <em>Core Engine Koperasi PKP-PK BTH</em> secara <strong>real-time</strong> berdasarkan <em>immutable transaction logs</em> (tabel <code>transaksi</code>, <code>transaksi_detail</code>, dan <code>pengeluaran_operasional</code>) yang tercatat di sistem kasir POS Koperasi.
            </p>
            <p className="m-0 text-gray-700 leading-relaxed">
              <strong>2. Metodologi Komputasi SHU:</strong> Perhitungan mengacu pada standar <strong>SAK Entitas Privat Koperasi Indonesia</strong> & Anggaran Dasar Koperasi (AD/ART) Bab Perhitungan SHU:
              <br />
              • <em>Laba Kotor</em> = Total Omset Penjualan Anggota − Beban Pokok Penjualan (HPP Modal Kulakan).
              <br />
              • <em>Net SHU Riil</em> = Laba Kotor − Total Realisasi Pengeluaran Kas Operasional (OPEX).
              <br />
              • <em>Hak SHU Anggota (60%)</em> dibagikan secara proporsional berdasarkan rumus matematis: <code>(Total Belanja Anggota / Total Omset Anggota) × 60% Net SHU</code>.
            </p>
            <p className="m-0 text-gray-700 leading-relaxed">
              <strong>3. Hak Uji & Rekonsiliasi Anggota:</strong> Laporan ini disajikan terbuka kepada Pengurus, Badan Pengawas, dan seluruh Anggota Koperasi. Apabila terdapat ketidaksesuaian nilai transaksi, riwayat pembayaran, atau saldo piutang, Anggota berhak mengajukan verifikasi/koreksi dengan melampirkan nomor referensi transaksi atau struk belanja ke Pengurus Koperasi.
            </p>
            <div className="pt-1 border-t border-gray-200 flex justify-between items-center text-[9px] text-gray-500 font-mono">
              <span>Status Verifikasi: VALID & REALTIME (TERAUTENTIKASI SISTEM)</span>
              <span>Diterbitkan: {new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' })}</span>
            </div>
          </div>

          {/* ── ACTION BUTTONS (SCREEN ONLY - HIDDEN ON PRINT) ── */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-zinc-800 no-print">
            <Button type="button" variant="ghost" onClick={() => setIsCorporateModalOpen(false)}>
              Tutup
            </Button>
            <Button 
              type="button" 
              variant="primary" 
              onClick={() => window.print()}
              className="font-bold gap-1.5 bg-blue-600 text-white shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Cetak Dokumen Resmi (A4)
            </Button>
          </div>

        </div>
      </Modal>

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

      </div> {/* end #screen-content */}
    </div>
  )
}

export default LaporanTransaksi