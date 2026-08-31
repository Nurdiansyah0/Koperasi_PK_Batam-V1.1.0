import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, ArrowLeftRight, History, Clock, FileText, AlertTriangle, ScanLine, Calculator, ChevronLeft, ChevronRight, Plus, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { kasirService } from '@/services/kasirService'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { SerahTerima } from '@/types'

export function SerahTerimaPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<SerahTerima[]>([])
  const [history, setHistory] = useState<SerahTerima[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [processingId, setProcessingId] = useState<number | null>(null)
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState<SerahTerima | null>(null)

  // Pagination states
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadData = async (currentPage: number, type: 'pending' | 'history') => {
    setLoading(true)
    try {
      // The API returns paginated data: { data: { data: [], last_page: 1 } }
      const res = await kasirService.getSerahTerimaForMe(type, currentPage)
      // kasirService already unwraps the Laravel paginator
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

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (action === 'reject' && !window.confirm('Yakin ingin menolak operasional shift ini? Anda harus memberikan alasan ke pengirim secara manual.')) return
    
    setProcessingId(id)
    try {
      const res = await (action === 'approve' ? kasirService.approveSerahTerima(id) : kasirService.rejectSerahTerima(id, 'Ditolak oleh penerima'))
      if (res.success) {
        toast.success(action === 'approve' ? 'Shift Operasional Diterima!' : 'Shift Ditolak.')
        setSelectedItem(null)
        loadData(page, activeTab)
      } else {
        toast.error(res.error ?? 'Gagal memproses serah terima.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    } finally {
      setProcessingId(null)
    }
  }

  const parseOpname = (val: any) => {
    if (!val) return null
    if (typeof val === 'string') {
      try { return JSON.parse(val) } catch { return null }
    }
    return val
  }

  const renderList = activeTab === 'pending' ? pending : history

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Operasional Shift</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola lempar shift (Serah Terima) dan serahkan uang fisik ke Admin (Setoran).</p>
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

      {/* Tabs */}
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
          Tugas Masuk
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
          Riwayat
        </button>
      </div>

      {/* Content */}
      <Card className="border-slate-200/80 shadow-sm bg-slate-50/50 dark:bg-slate-900">
        <CardContent className="p-0 sm:p-4">
          {loading ? (
            <div className="text-center py-16 text-slate-400">Memuat data...</div>
          ) : renderList.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <ArrowLeftRight className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-slate-500 font-medium">Tidak ada {activeTab === 'pending' ? 'tugas serah terima shift baru' : 'riwayat serah terima'}.</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderList.map(s => {
                const opname = parseOpname(s.hasil_opname)
                const isPending = s.status === 'pending'
                const isApproved = s.status === 'approved'

                return (
                  <Card 
                    key={s.serah_id || s.serah_terima_id}
                    className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${isPending ? 'border-amber-200 dark:border-amber-900 hover:border-amber-400' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                    onClick={() => setSelectedItem(s)}
                  >
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <Badge variant={isPending ? 'warning' : isApproved ? 'success' : 'danger'} className="text-[10px] uppercase">
                            {isPending ? 'Menunggu Anda' : isApproved ? 'Selesai' : 'Ditolak'}
                          </Badge>
                          <span className="text-xs text-slate-400">{formatDate(s.created_at)}</span>
                        </div>
                        
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Dari: @{s.kasir_from_name || 'Kasir'}</h3>
                        
                        {opname && (
                          <div className="mt-3 space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5"/> Uang Fisik:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(opname.uang_fisik || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 flex items-center gap-1.5"><ScanLine className="w-3.5 h-3.5"/> Selisih Barang:</span>
                              <span className={`font-semibold ${opname.summary?.barangSelisih > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {opname.summary?.barangSelisih || 0} item
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Button variant="ghost" className="w-full mt-4 text-blue-600 hover:bg-blue-50 h-9 font-semibold text-xs border border-blue-200">
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

      {/* Rincian Serah Terima Modal */}
      <Modal 
        isOpen={selectedItem !== null} 
        onClose={() => setSelectedItem(null)} 
        title="Rincian Serah Terima Shift"
      >
        {selectedItem && (() => {
          const opname = parseOpname(selectedItem.hasil_opname)
          const isPending = selectedItem.status === 'pending'
          const id = selectedItem.serah_id || selectedItem.serah_terima_id || 0

          return (
            <div className="flex flex-col h-full max-h-[75vh]">
              <div className="overflow-y-auto pr-1 pb-4 space-y-5">
                
                {/* Meta Info */}
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Pengirim</div>
                    <div className="font-bold text-slate-900 dark:text-white">@{selectedItem.kasir_from_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-0.5">Waktu Kirim</div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{formatDate(selectedItem.created_at)}</div>
                  </div>
                </div>

                {/* Uang Fisik & Catatan */}
                {opname && (
                  <div className="space-y-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Calculator className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Uang Fisik Kas Laci</h4>
                      </div>
                      <p className="text-xs text-emerald-700/80 mb-2">Kasir pengirim mengklaim uang fisik yang ditinggalkan sejumlah:</p>
                      <div className="font-extrabold text-2xl text-emerald-600">
                        {formatRupiah(opname.uang_fisik || 0)}
                      </div>
                    </div>

                    {opname.catatan && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-amber-600" />
                          <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">Pesan / Catatan Pengirim</h4>
                        </div>
                        <p className="text-sm text-amber-800 italic">"{opname.catatan}"</p>
                      </div>
                    )}

                    {/* Rincian Audit Stok (Cycle Count) */}
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2 flex items-center gap-2">
                        <ScanLine className="w-4 h-4" /> Hasil Audit Fisik Barang (Cycle Count)
                      </h4>
                      
                      {opname.summary?.barangSelisih > 0 && (
                        <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs flex gap-2 mb-3 border border-rose-200">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <p>Peringatan: Terdapat <strong>{opname.summary.barangSelisih} barang</strong> yang jumlah fisiknya tidak sesuai dengan sistem!</p>
                        </div>
                      )}

                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="px-3 py-2 font-medium">Barang</th>
                              <th className="px-3 py-2 font-medium text-center">Fisik</th>
                              <th className="px-3 py-2 font-medium text-center">Selisih</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(opname.items || []).map((item: any, idx: number) => (
                              <tr key={idx} className="bg-white dark:bg-slate-900">
                                <td className="px-3 py-2 text-xs">
                                  <div className="font-medium text-slate-800 dark:text-slate-200">{item.nama_barang}</div>
                                  <div className="text-[10px] text-slate-400">Sistem: {item.stok_input}</div>
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300">
                                  {item.stok_aktual}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {item.selisih === 0 ? (
                                    <Badge variant="success" className="text-[10px]">Sesuai</Badge>
                                  ) : (
                                    <Badge variant="danger" className="text-[10px]">{item.selisih > 0 ? '+' : ''}{item.selisih}</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Sticky Footer */}
              {isPending && (
                <div className="pt-4 mt-auto border-t border-slate-200 dark:border-slate-700 flex gap-3 bg-white dark:bg-slate-900 sticky bottom-0">
                  <Button 
                    className="flex-1 text-rose-600 bg-rose-50 hover:bg-rose-100 h-12 font-bold shadow-sm"
                    variant="ghost"
                    loading={processingId === id}
                    onClick={() => handleAction(id, 'reject')}
                  >
                    <XCircle className="w-5 h-5 mr-2" /> Tolak
                  </Button>
                  <Button 
                    className="flex-1 shadow-md h-12 font-bold text-base" 
                    variant="primary"
                    loading={processingId === id}
                    onClick={() => handleAction(id, 'approve')}
                  >
                    <CheckCircle className="w-5 h-5 mr-2" /> Terima Shift
                  </Button>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

    </div>
  )
}
export default SerahTerimaPage
