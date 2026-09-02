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
  AlertTriangle,
  ScanLine,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Plus,
  Wallet,
  UserCheck,
  UserPlus,
  Flame,
  Zap,
  Sparkles,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  ShieldAlert
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
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Operasional Shift Kasir</h1>
          <p className="text-sm text-slate-500 mt-1">
            Rekonsiliasi lempar shift (Serah Terima & Audit Fisik) dan setoran uang kas fisik ke Admin.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="flex-1 sm:flex-none gap-2 shrink-0 font-bold border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/30"
            onClick={() => navigate('/kasir/setoran')}
          >
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5" /> Setor Ke Admin
          </Button>
          <Button 
            variant="primary" 
            className="flex-1 sm:flex-none gap-2 shrink-0 font-bold shadow-md"
            onClick={() => navigate('/kasir/serah-terima/buat')}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Serah Terima Shift
          </Button>
        </div>
      </div>

      {/* 2 Clean Tabs */}
      <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl shadow-inner border border-slate-200/50 dark:border-slate-800/50 overflow-hidden w-full max-w-sm">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${
            activeTab === 'pending' 
              ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200/50 dark:border-slate-700' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Tugas Masuk</span>
          {pending.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-rose-500 text-white rounded-full font-bold">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${
            activeTab === 'history' 
              ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200/50 dark:border-slate-700' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Shift</span>
        </button>
      </div>

      {/* Content List */}
      <Card className="border-slate-200/80 shadow-sm bg-slate-50/50 dark:bg-slate-900">
        <CardContent className="p-0 sm:p-4">
          {loading ? (
            <div className="text-center py-16 text-slate-400">Memuat data serah terima...</div>
          ) : renderList.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <ArrowLeftRight className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-slate-500 font-medium">
                Tidak ada {activeTab === 'pending' ? 'tugas serah terima shift baru' : 'riwayat serah terima'}.
              </h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderList.map(s => {
                const opname = parseOpname(s.hasil_opname)
                const isPending = s.status === 'pending'
                const isApproved = s.status === 'approved'
                const barangSelisih = opname?.summary?.barangSelisih || 0
                const selisihKas = opname?.selisih_kas !== undefined ? opname.selisih_kas : null

                return (
                  <Card 
                    key={s.serah_id || s.serah_terima_id}
                    className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      isPending 
                        ? 'border-amber-300 dark:border-amber-700 hover:border-amber-500 bg-gradient-to-b from-white to-amber-50/20 dark:from-slate-900 dark:to-amber-950/10' 
                        : isApproved 
                        ? 'border-slate-200 dark:border-slate-700 hover:border-blue-400 bg-white dark:bg-slate-900' 
                        : 'border-rose-200 dark:border-rose-900 hover:border-rose-400 bg-white dark:bg-slate-900'
                    }`}
                    onClick={() => setSelectedItem(s)}
                  >
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant={isPending ? 'warning' : isApproved ? 'success' : 'danger'} className="text-[10px] uppercase font-bold">
                            {isPending ? 'Menunggu Validasi Anda' : isApproved ? 'Shift Diterima' : 'Shift Ditolak'}
                          </Badge>
                          <span className="text-xs text-slate-400">{formatDate(s.created_at)}</span>
                        </div>
                        
                        {/* Clear Handover Route: Dari (Pengirim) ➔ Ke (Penerima) */}
                        <div className="flex items-center justify-between gap-2 p-2 bg-slate-100/70 dark:bg-slate-800/70 rounded-xl mb-3 border border-slate-200/50 dark:border-slate-700/50">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-slate-400 block font-medium">Pengirim:</span>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate block">
                              @{s.kasir_from_name || s.kasir_from_username || 'Kasir'}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="min-w-0 flex-1 text-right">
                            <span className="text-[10px] text-slate-400 block font-medium">Penerima:</span>
                            <span className="font-bold text-xs text-blue-600 dark:text-blue-400 truncate block">
                              @{s.kasir_to_name || s.kasir_to_username || 'Anda'}
                            </span>
                          </div>
                        </div>
                        
                        {opname && (
                          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 flex items-center gap-1.5">
                                <Calculator className="w-3.5 h-3.5 text-blue-600"/> Uang Fisik Laci:
                              </span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                {formatRupiah(opname.uang_fisik || 0)}
                              </span>
                            </div>

                            {selisihKas !== null && (
                              <div className="flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                <span className="text-slate-500">Status Kas Laci:</span>
                                <span className={`font-bold text-[11px] ${selisihKas === 0 ? 'text-emerald-600' : selisihKas > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                                  {selisihKas === 0 ? '✓ Pas' : selisihKas > 0 ? `+${formatRupiah(selisihKas)}` : formatRupiah(selisihKas)}
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                              <span className="text-slate-500 flex items-center gap-1.5">
                                <ScanLine className="w-3.5 h-3.5 text-amber-500"/> Audit Fisik Barang:
                              </span>
                              <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
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
                          <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 text-[11px] text-rose-700 dark:text-rose-300">
                            <span className="font-bold">Alasan Penolakan:</span> {s.alasan_penolakan}
                          </div>
                        )}
                      </div>
                      
                      <Button variant="ghost" className="w-full mt-4 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 h-9 font-semibold text-xs border border-blue-200 dark:border-slate-700">
                        Lihat & Validasi Rincian &rarr;
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-slate-500 font-medium">Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="w-10 h-10 p-0 rounded-full"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <Button 
              variant="outline" 
              className="w-10 h-10 p-0 rounded-full"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </Button>
          </div>
        </div>
      )}

      {/* Rincian Lengkap Serah Terima Shift Modal (Full Cycle Count Report & Impact) */}
      <Modal 
        isOpen={selectedItem !== null && !showRejectModal} 
        onClose={() => setSelectedItem(null)} 
        title="Rincian Lengkap Serah Terima Shift (Tugas Masuk)"
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
                
                {/* Meta Info Header — Comprehensive Shift Handover Route (Pengirim & Penerima) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1 mb-1">
                      <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                      <span>Kasir Pengirim</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                      @{selectedItem.kasir_from_name || selectedItem.kasir_from_username || 'Kasir'}
                    </div>
                    <div className="text-[10px] text-slate-400">Shift Sebelumnya</div>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-blue-200/60 dark:border-blue-900/60">
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold flex items-center gap-1 mb-1">
                      <UserPlus className="w-3.5 h-3.5 text-blue-500" />
                      <span>Kasir Penerima</span>
                    </div>
                    <div className="font-bold text-blue-700 dark:text-blue-300 text-xs sm:text-sm truncate">
                      @{selectedItem.kasir_to_name || selectedItem.kasir_to_username || 'Anda'}
                    </div>
                    <div className="text-[10px] text-slate-400">Shift Lanjutan</div>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1 mb-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Waktu & Referensi</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      {formatDate(selectedItem.created_at)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold">Ref: #ST-{id}</div>
                  </div>
                </div>

                {/* Rekonsiliasi Kas Laci 3-Column Grid */}
                {opname && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl">
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase">Uang Fisik Laci</div>
                      <div className="font-extrabold text-base sm:text-lg text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatRupiah(opname.uang_fisik || 0)}
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-xl">
                      <div className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold uppercase">Kas Sistem</div>
                      <div className="font-extrabold text-base sm:text-lg text-blue-600 dark:text-blue-400 mt-0.5">
                        {formatRupiah(opname.saldo_kas_sistem || 0)}
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl border ${
                      (opname.selisih_kas || 0) === 0
                        ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        : (opname.selisih_kas || 0) > 0
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200'
                    }`}>
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Selisih Kas</div>
                      <div className={`font-extrabold text-base sm:text-lg mt-0.5 ${
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

                {/* Pesan Catatan Kasir */}
                {opname?.catatan && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 rounded-xl text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 mb-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Catatan / Pesan Kasir Pengirim:</span>
                    </div>
                    <p className="text-amber-800 dark:text-amber-300 italic">"{opname.catatan}"</p>
                  </div>
                )}

                {/* Alasan Penolakan (Jika ditolak sebelumnya) */}
                {selectedItem.alasan_penolakan && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Alasan Penolakan Shift:</span>
                    </div>
                    <p>{selectedItem.alasan_penolakan}</p>
                  </div>
                )}

                {/* Rincian Audit Stok (Cycle Count) Table */}
                {opname && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-2">
                        <ScanLine className="w-4 h-4 text-blue-600" /> Hasil Audit Fisik Barang (Cycle Count)
                      </h4>
                      <span className="text-xs font-semibold text-slate-500">
                        {items.length} Barang Diaudit
                      </span>
                    </div>

                    {barangSelisihCount > 0 ? (
                      <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs flex gap-2 border border-rose-200 dark:border-rose-900">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        <div>
                          <div className="font-bold">Peringatan: Terdapat {barangSelisihCount} barang yang selisih/tidak sesuai!</div>
                          {totalMinusNominal > 0 && (
                            <div className="text-[11px] mt-0.5">
                              Estimasi potensi kerugian fisik barang minus: <b>{formatRupiah(totalMinusNominal)}</b>
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
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 p-2.5 rounded-xl text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-900">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Seluruh hitungan fisik barang 100% cocok dengan stok sistem koperasi.</span>
                      </div>
                    )}

                    {/* Modal Filter Chips for Fast 1-Minute Exception Review */}
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
                        const aRok = (a.risk_badge === 'Rokok' || (a.nama_barang || '').toLowerCase().includes('rokok') || (a.nama_barang || '').toLowerCase().includes('samsu') || (a.nama_barang || '').toLowerCase().includes('surya')) ? 1 : 0
                        const bRok = (b.risk_badge === 'Rokok' || (b.nama_barang || '').toLowerCase().includes('rokok') || (b.nama_barang || '').toLowerCase().includes('samsu') || (b.nama_barang || '').toLowerCase().includes('surya')) ? 1 : 0
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
                          <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
                            <button
                              type="button"
                              onClick={() => setModalFilter('all')}
                              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                                modalFilter === 'all' 
                                  ? 'bg-blue-600 text-white shadow-xs' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              Semua ({items.length})
                            </button>
                            {barangSelisihCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setModalFilter('selisih')}
                                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                                  modalFilter === 'selisih' 
                                    ? 'bg-rose-600 text-white shadow-xs' 
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-200'
                                }`}
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                ⚠️ Selisih ({barangSelisihCount})
                              </button>
                            )}
                            {rokokCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setModalFilter('rokok')}
                                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                                  modalFilter === 'rokok' 
                                    ? 'bg-amber-600 text-white shadow-xs' 
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200'
                                }`}
                              >
                                <Flame className="w-3.5 h-3.5" />
                                🔥 Rokok ({rokokCount})
                              </button>
                            )}
                          </div>

                          {/* 1. Desktop / Tablet View (>= sm) */}
                          <div className="hidden sm:block border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                  <tr>
                                    <th className="px-3 py-2.5 font-semibold">Barang & Kategori</th>
                                    <th className="px-3 py-2.5 font-semibold text-center w-16">Sistem</th>
                                    <th className="px-3 py-2.5 font-semibold text-center w-16">Fisik</th>
                                    <th className="px-3 py-2.5 font-semibold text-center w-24">Selisih</th>
                                    <th className="px-3 py-2.5 font-semibold text-right w-24">Nominal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {filteredItems.map((item: any, idx: number) => {
                                    const badge = item.risk_badge || (item.nama_barang.toLowerCase().includes('rokok') || item.nama_barang.toLowerCase().includes('sampoerna') || item.nama_barang.toLowerCase().includes('surya') ? 'Rokok' : null)
                                    const isRokok = badge === 'Rokok'
                                    const isMinus = item.selisih < 0

                                    return (
                                      <tr key={idx} className="bg-white dark:bg-slate-900 hover:bg-slate-50/50">
                                        <td className="px-3 py-2">
                                          <div className="flex items-center gap-1 flex-wrap">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{item.nama_barang}</span>
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
                                          <div className="text-[10px] text-slate-400">
                                            {formatRupiah(item.harga_jual || item.harga || 0)}/pcs
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-center text-slate-500 font-medium">
                                          {item.stok_input}
                                        </td>
                                        <td className="px-3 py-2 text-center font-bold text-slate-800 dark:text-slate-200">
                                          {item.stok_aktual}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          {item.selisih === 0 ? (
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">
                                              Cocok
                                            </span>
                                          ) : (
                                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                              isMinus 
                                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' 
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                            }`}>
                                              {item.selisih > 0 ? `+${item.selisih}` : item.selisih}
                                            </span>
                                          )}
                                        </td>
                                        <td className={`px-3 py-2 text-right font-extrabold text-[11px] ${
                                          item.selisih === 0 ? 'text-slate-400' : isMinus ? 'text-rose-600' : 'text-blue-600'
                                        }`}>
                                          {item.selisih_nominal ? formatRupiah(item.selisih_nominal) : item.selisih === 0 ? 'Rp 0' : formatRupiah((item.harga_jual || item.harga || 0) * item.selisih)}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* 2. Mobile Card List (< sm) — Ultra Responsive for Small Screens */}
                          <div className="sm:hidden space-y-2">
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
                                  {/* Line 1: Nama Barang + Status Badge */}
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

                                  {/* Line 2: Sistem vs Fisik & Nominal Selisih */}
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
                <div className="pt-3 mt-auto border-t border-slate-200 dark:border-slate-700 flex gap-3 bg-white dark:bg-slate-900 sticky bottom-0">
                  <Button 
                    className="flex-1 text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 h-11 font-bold shadow-xs text-xs"
                    variant="ghost"
                    loading={processingId === id}
                    onClick={() => setShowRejectModal(true)}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Tolak Shift
                  </Button>
                  <Button 
                    className="flex-1 shadow-md h-11 font-bold text-xs" 
                    variant="primary"
                    loading={processingId === id}
                    onClick={() => handleApprove(id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Terima & Sinkronkan Shift
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
