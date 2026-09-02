import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  CheckCircle,
  XCircle,
  ArrowLeftRight,
  ArrowRight,
  History,
  Clock,
  FileText,
  ScanLine,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Plus,
  Wallet,
  UserCheck,
  UserPlus,
  Flame,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { kasirService } from '@/services/kasirService'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { SerahTerima } from '@/types'

export function SerahTerimaPage() {
  const navigate = useNavigate()
  const [pending, setPending] = useState<SerahTerima[]>([])
  const [history, setHistory] = useState<SerahTerima[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [processingId, setProcessingId] = useState<number | null>(null)
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState<SerahTerima | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [alasanPenolakan, setAlasanPenolakan] = useState('')
  const [modalFilter, setModalFilter] = useState<'all' | 'selisih' | 'rokok'>('all')

  // Pagination states
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadData = async (currentPage: number, type: 'pending' | 'history') => {
    setLoading(true)
    try {
      const res = await kasirService.getSerahTerimaForMe(type, currentPage)
      const items = res.data || []
      const lastPage = res.last_page || 1
      
      if (type === 'pending') {
        setPending(items)
      } else {
        setHistory(items)
      }
      setTotalPages(lastPage)
    } catch {
      toast.error('Gagal memuat data serah terima')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    loadData(1, activeTab)
  }, [activeTab])

  useEffect(() => {
    loadData(page, activeTab)
  }, [page])

  const handleApprove = async (id: number) => {
    setProcessingId(id)
    try {
      const res = await kasirService.approveSerahTerima(id)
      if (res.success) {
        toast.success(res.message || 'Shift operasional berhasil diterima dan stok fisik disinkronkan!')
        setSelectedItem(null)
        loadData(page, activeTab)
      } else {
        toast.error(res.message || res.error || 'Gagal menerima shift.')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem saat menyetujui shift.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    const id = selectedItem.serah_id || selectedItem.serah_terima_id || 0
    if (!alasanPenolakan.trim()) {
      return toast.error('Harap masukkan alasan penolakan secara spesifik!')
    }

    setProcessingId(id)
    try {
      const res = await kasirService.rejectSerahTerima(id, alasanPenolakan.trim())
      if (res.success) {
        toast.success(res.message || 'Serah terima shift telah ditolak.')
        setShowRejectModal(false)
        setAlasanPenolakan('')
        setSelectedItem(null)
        loadData(page, activeTab)
      } else {
        toast.error(res.message || res.error || 'Gagal menolak serah terima.')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem saat menolak shift.')
    } finally {
      setProcessingId(null)
    }
  }

  const parseOpname = (val: any) => {
    if (!val) return null
    if (typeof val === 'string') {
      try {
        let parsed = JSON.parse(val)
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed)
        }
        return parsed
      } catch {
        return null
      }
    }
    return val
  }

  const renderList = activeTab === 'pending' ? pending : history

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-lg md:max-w-4xl mx-auto px-1 sm:px-0">
      
      {/* ─── HEADER & PRIMARY ACTION BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Operasional Shift Kasir
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekonsiliasi serah terima shift, audit stok fisik, dan setoran kas toko.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/kasir/setoran')}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all"
          >
            <Wallet className="w-4 h-4 text-indigo-500" />
            <span>Setor Kas Admin</span>
          </button>

          <button 
            onClick={() => navigate('/kasir/serah-terima/buat')}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Serah Terima</span>
          </button>
        </div>
      </div>

      {/* ─── SEGMENTED PILL TAB SWITCHER (THUMB-FRIENDLY) ─── */}
      <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${
            activeTab === 'pending'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Tugas Masuk</span>
          {pending.length > 0 && (
            <span className="px-2 py-0.2 text-[10px] bg-rose-500 text-white rounded-full font-black animate-pulse">
              {pending.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat Shift</span>
        </button>
      </div>

      {/* ─── SHIFT HANDOVER CARDS LIST ─── */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-slate-400">Memuat data serah terima shift...</p>
          </div>
        ) : renderList.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 flex flex-col items-center">
            <ArrowLeftRight className="w-12 h-12 text-slate-300 mb-2" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {activeTab === 'pending' ? 'Tidak Ada Tugas Masuk' : 'Belum Ada Riwayat Shift'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {activeTab === 'pending' 
                ? 'Semua serah terima shift telah Anda validasi.' 
                : 'Riwayat serah terima pergantian shift akan tersimpan di sini.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {renderList.map(s => {
              const opname = parseOpname(s.hasil_opname)
              const isPending = s.status === 'pending'
              const isApproved = s.status === 'approved'
              const barangSelisih = opname?.summary?.barangSelisih || 0
              const selisihKas = opname?.selisih_kas !== undefined ? opname.selisih_kas : null

              return (
                <div 
                  key={s.serah_id || s.serah_terima_id}
                  onClick={() => setSelectedItem(s)}
                  className={`p-4 sm:p-5 rounded-3xl cursor-pointer border shadow-xs transition-all active:scale-[0.98] ${
                    isPending 
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-700/60 hover:border-amber-500 ring-2 ring-amber-500/20' 
                      : isApproved 
                      ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-400' 
                      : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 hover:border-rose-400'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isPending 
                        ? 'bg-amber-500 text-white shadow-xs' 
                        : isApproved 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {isPending ? 'Menunggu Validasi Anda' : isApproved ? 'Shift Diterima' : 'Shift Ditolak'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatDate(s.created_at)}
                    </span>
                  </div>

                  {/* Handover Route: Pengirim -> Penerima */}
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pengirim</span>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate block mt-0.5">
                        @{s.kasir_from_name || s.kasir_from_username || 'Kasir'}
                      </span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Penerima</span>
                      <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400 truncate block mt-0.5">
                        @{s.kasir_to_name || s.kasir_to_username || 'Anda'}
                      </span>
                    </div>
                  </div>

                  {/* Telemetry Stack: Uang Fisik, Selisih Kas, Cycle Count */}
                  {opname && (
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1.5 font-medium text-[11px]">
                          <Calculator className="w-3.5 h-3.5 text-blue-600" /> Uang Fisik Laci:
                        </span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {formatRupiah(opname.uang_fisik || 0)}
                        </span>
                      </div>

                      {selisihKas !== null && (
                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-slate-500 text-[11px]">Status Kas:</span>
                          <span className={`font-bold text-[11px] ${
                            selisihKas === 0 ? 'text-emerald-600' : selisihKas > 0 ? 'text-blue-600' : 'text-rose-600'
                          }`}>
                            {selisihKas === 0 ? '✓ Pas (Rp 0)' : selisihKas > 0 ? `+${formatRupiah(selisihKas)} (Lebih)` : `${formatRupiah(selisihKas)} (Kurang)`}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-slate-500 flex items-center gap-1.5 text-[11px]">
                          <ScanLine className="w-3.5 h-3.5 text-amber-500" /> Audit Fisik Barang:
                        </span>
                        <span className={`font-bold text-[10px] px-2 py-0.5 rounded-md ${
                          barangSelisih > 0 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' 
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}>
                          {barangSelisih > 0 ? `${barangSelisih} Item Selisih` : '100% Sesuai'}
                        </span>
                      </div>
                    </div>
                  )}

                  {s.alasan_penolakan && (
                    <div className="mt-2.5 p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-[11px] text-rose-700 dark:text-rose-300">
                      <span className="font-bold">Alasan Tolak:</span> {s.alasan_penolakan}
                    </div>
                  )}

                  <div className="mt-3 text-right">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-end gap-1">
                      {isPending ? 'Validasi Sekarang →' : 'Lihat Rincian →'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── THUMB PAGINATION CONTROLS ─── */}
      {totalPages > 1 && !loading && (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <button
            onClick={() => {
              setPage(p => Math.max(1, p - 1))
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
              setPage(p => Math.min(totalPages, p + 1))
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 text-white disabled:opacity-40 active:scale-95 transition-all"
          >
            Next &rarr;
          </button>
        </div>
      )}

      {/* ─── FULL VERIFICATION SHEET MODAL (AUDIT & CYCLE COUNT) ─── */}
      <Modal 
        isOpen={selectedItem !== null && !showRejectModal} 
        onClose={() => setSelectedItem(null)} 
        title="Rincian Validasi Serah Terima Shift"
        maxWidth="max-w-3xl"
      >
        {selectedItem && (() => {
          const opname = parseOpname(selectedItem.hasil_opname)
          const isPending = selectedItem.status === 'pending'
          const isApproved = selectedItem.status === 'approved'
          const id = selectedItem.serah_id || selectedItem.serah_terima_id || 0
          const items = opname?.items || []
          const barangSelisihCount = opname?.summary?.barangSelisih || items.filter((i: any) => i.status === 'selisih').length
          const totalMinusNominal = opname?.summary?.totalMinusNominal || 0

          return (
            <div className="flex flex-col h-full max-h-[80vh]">
              <div className="overflow-y-auto pr-1 pb-4 space-y-4">
                
                {/* Route Header */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1 mb-0.5">
                      <UserCheck className="w-3 h-3 text-slate-500" />
                      <span>Pengirim</span>
                    </div>
                    <div className="font-black text-slate-900 dark:text-white text-xs truncate">
                      @{selectedItem.kasir_from_name || selectedItem.kasir_from_username || 'Kasir'}
                    </div>
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-blue-200/60 dark:border-blue-900/60">
                    <div className="text-[9px] text-blue-600 dark:text-blue-400 uppercase font-bold flex items-center gap-1 mb-0.5">
                      <UserPlus className="w-3 h-3 text-blue-500" />
                      <span>Penerima</span>
                    </div>
                    <div className="font-black text-blue-700 dark:text-blue-300 text-xs truncate">
                      @{selectedItem.kasir_to_name || selectedItem.kasir_to_username || 'Anda'}
                    </div>
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1 mb-0.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Waktu</span>
                    </div>
                    <div className="font-black text-slate-900 dark:text-white text-[11px] truncate">
                      {formatDate(selectedItem.created_at)}
                    </div>
                  </div>
                </div>

                {/* Cash Drawer Reconciliation Stack */}
                {opname && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-2xl">
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase">Uang Fisik Laci</div>
                      <div className="font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                        {formatRupiah(opname.uang_fisik || 0)}
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-2xl">
                      <div className="text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase">Kas Sistem</div>
                      <div className="font-black text-sm sm:text-base text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                        {formatRupiah(opname.saldo_kas_sistem || 0)}
                      </div>
                    </div>

                    <div className={`p-3 rounded-2xl border ${
                      (opname.selisih_kas || 0) === 0
                        ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        : (opname.selisih_kas || 0) > 0
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200'
                    }`}>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Selisih Kas</div>
                      <div className={`font-black text-sm sm:text-base mt-0.5 truncate ${
                        (opname.selisih_kas || 0) === 0 
                          ? 'text-emerald-600' 
                          : (opname.selisih_kas || 0) > 0 
                          ? 'text-blue-600' 
                          : 'text-rose-600'
                      }`}>
                        {(opname.selisih_kas || 0) === 0 ? 'Pas (Rp 0)' : formatRupiah(opname.selisih_kas || 0)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cashier Message / Note */}
                {opname?.catatan && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 rounded-2xl text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 mb-0.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Catatan Kasir Pengirim:</span>
                    </div>
                    <p className="text-amber-800 dark:text-amber-300 italic">"{opname.catatan}"</p>
                  </div>
                )}

                {/* Stock Cycle Count Table */}
                {opname && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                        <ScanLine className="w-4 h-4 text-blue-600" /> Hasil Audit Fisik Barang (Cycle Count)
                      </h4>
                      <span className="text-xs font-semibold text-slate-500">
                        {items.length} Barang Diaudit
                      </span>
                    </div>

                    {barangSelisihCount > 0 ? (
                      <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-3 rounded-2xl text-xs flex gap-2.5 border border-rose-200 dark:border-rose-900">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        <div>
                          <div className="font-black">Peringatan: Terdapat {barangSelisihCount} barang selisih!</div>
                          {totalMinusNominal > 0 && (
                            <div className="text-[11px] mt-0.5 font-bold">
                              Estimasi potensi kerugian fisik barang minus: {formatRupiah(totalMinusNominal)}
                            </div>
                          )}
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-semibold">
                            {isApproved
                              ? '✓ Stok fisik di sistem telah otomatis diselaraskan dengan hasil hitungan di atas.'
                              : '*Saat Anda menerima shift ini, sistem akan otomatis menyesuaikan stok fisik barang di inventori.'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 p-3 rounded-2xl text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-900 font-semibold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Seluruh hitungan fisik barang 100% cocok dengan stok sistem koperasi.</span>
                      </div>
                    )}

                    {/* Filter chips for modal */}
                    {(() => {
                      const rokokCount = items.filter((i: any) => 
                        i.risk_badge === 'Rokok' || 
                        (i.nama_barang || '').toLowerCase().includes('rokok') || 
                        (i.nama_barang || '').toLowerCase().includes('samsu') || 
                        (i.nama_barang || '').toLowerCase().includes('surya') || 
                        (i.nama_barang || '').toLowerCase().includes('mild')
                      ).length

                      const sortedItems = [...items].sort((a: any, b: any) => {
                        const aSel = a.selisih !== 0 ? 1 : 0
                        const bSel = b.selisih !== 0 ? 1 : 0
                        if (aSel !== bSel) return bSel - aSel
                        const aRok = (a.risk_badge === 'Rokok' || (a.nama_barang || '').toLowerCase().includes('rokok')) ? 1 : 0
                        const bRok = (b.risk_badge === 'Rokok' || (b.nama_barang || '').toLowerCase().includes('rokok')) ? 1 : 0
                        return bRok - aRok
                      })

                      const filteredItems = sortedItems.filter((it: any) => {
                        if (modalFilter === 'selisih') return it.selisih !== 0
                        if (modalFilter === 'rokok') {
                          return it.risk_badge === 'Rokok' || 
                            (it.nama_barang || '').toLowerCase().includes('rokok') || 
                            (it.nama_barang || '').toLowerCase().includes('samsu') || 
                            (it.nama_barang || '').toLowerCase().includes('surya')
                        }
                        return true
                      })

                      return (
                        <>
                          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
                            <button
                              type="button"
                              onClick={() => setModalFilter('all')}
                              className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                                modalFilter === 'all' 
                                  ? 'bg-blue-600 text-white shadow-xs' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              Semua ({items.length})
                            </button>
                            {barangSelisihCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setModalFilter('selisih')}
                                className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1 transition-colors ${
                                  modalFilter === 'selisih' 
                                    ? 'bg-rose-600 text-white shadow-xs' 
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}
                              >
                                ⚠️ Selisih ({barangSelisihCount})
                              </button>
                            )}
                            {rokokCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setModalFilter('rokok')}
                                className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1 transition-colors ${
                                  modalFilter === 'rokok' 
                                    ? 'bg-amber-600 text-white shadow-xs' 
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                }`}
                              >
                                🔥 Rokok ({rokokCount})
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            {filteredItems.map((item: any, idx: number) => {
                              const badge = item.risk_badge || (item.nama_barang.toLowerCase().includes('rokok') || item.nama_barang.toLowerCase().includes('sampoerna') || item.nama_barang.toLowerCase().includes('surya') ? 'Rokok' : null)
                              const isRokok = badge === 'Rokok'
                              const isMinus = item.selisih < 0
                              const isSelisih = item.selisih !== 0

                              return (
                                <div 
                                  key={idx} 
                                  className={`p-3 rounded-2xl border transition-colors ${
                                    isSelisih 
                                      ? isMinus 
                                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
                                        : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                                          {item.nama_barang}
                                        </span>
                                        {badge && (
                                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                            isRokok 
                                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' 
                                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                          }`}>
                                            {badge}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        Harga: {formatRupiah(item.harga_jual || item.harga || 0)}/pcs
                                      </div>
                                    </div>

                                    <div className="shrink-0 text-right">
                                      {item.selisih === 0 ? (
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/80 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                                          ✓ Cocok
                                        </span>
                                      ) : (
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                          isMinus 
                                            ? 'bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200' 
                                            : 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                        }`}>
                                          {item.selisih > 0 ? `+${item.selisih}` : item.selisih} pcs
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                                        Sistem: <b className="text-slate-800 dark:text-slate-200">{item.stok_input}</b>
                                      </span>
                                      <span className="text-slate-300 dark:text-slate-600">&rarr;</span>
                                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                                        Fisik: <b className="text-slate-900 dark:text-white font-black">{item.stok_aktual}</b>
                                      </span>
                                    </div>

                                    <div className={`font-black text-xs ${
                                      item.selisih === 0 
                                        ? 'text-slate-400' 
                                        : isMinus 
                                        ? 'text-rose-600 dark:text-rose-400' 
                                        : 'text-blue-600 dark:text-blue-400'
                                    }`}>
                                      {item.selisih_nominal 
                                        ? formatRupiah(item.selisih_nominal) 
                                        : item.selisih === 0 
                                        ? 'Rp 0' 
                                        : formatRupiah((item.harga_jual || item.harga || 0) * item.selisih)}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Action Buttons for Pending Handover */}
              {isPending && (
                <div className="pt-3 mt-auto border-t border-slate-200 dark:border-slate-700 flex gap-2.5 bg-white dark:bg-slate-900 sticky bottom-0">
                  <Button 
                    className="flex-1 text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 h-11 font-bold rounded-2xl shadow-2xs text-xs"
                    variant="ghost"
                    loading={processingId === id}
                    onClick={() => setShowRejectModal(true)}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Tolak Shift
                  </Button>
                  <Button 
                    className="flex-2 shadow-md h-11 font-black text-xs rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white" 
                    variant="primary"
                    loading={processingId === id}
                    onClick={() => handleApprove(id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Terima & Mulai Shift
                  </Button>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* Modal Alasan Penolakan Shift */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Konfirmasi Penolakan Serah Terima Shift"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Tuliskan rincian alasan mengapa Anda menolak serah terima shift ini (misalnya uang fisik di laci kurang atau barang rokok tidak sesuai).
          </p>
          <Input
            label="Alasan Penolakan"
            required
            placeholder="Contoh: Uang fisik kurang Rp 50.000 dan Sampoerna Mild kurang 2 bungkus"
            value={alasanPenolakan}
            onChange={(e) => setAlasanPenolakan(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowRejectModal(false)}>
              Batal
            </Button>
            <Button variant="danger" type="submit" loading={processingId !== null}>
              Kirim Penolakan
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}

export default SerahTerimaPage
