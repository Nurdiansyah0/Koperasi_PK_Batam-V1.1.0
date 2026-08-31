import React, { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, CreditCard, History, AlertCircle, Clock, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { kasirService } from '@/services/kasirService'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { PembayaranHutang } from '@/types'

export function PembayaranHutangPage() {
  const [list, setList] = useState<PembayaranHutang[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState<number | null>(null)
  
  // UI States
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 8

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await kasirService.getAllPembayaranHutang()
      setList(data)
    } catch {
      setError('Gagal memuat data pembayaran hutang.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Reset page when tab or search changes
  useEffect(() => { setPage(1) }, [activeTab, search])

  const handleAction = async (id: number, action: 'approve' | 'reject', metode: 'cash'|'transfer' = 'cash') => {
    if (action === 'reject' && !window.confirm('Yakin ingin menolak pembayaran hutang ini?')) return
    
    setProcessingId(id)
    try {
      const res = await kasirService.approvePembayaranHutang(id, action, metode)
      if (res.success) {
        toast.success(action === 'approve' ? 'Pembayaran hutang disetujui!' : 'Pembayaran ditolak.')
        loadData()
      } else {
        toast.error(res.error ?? 'Gagal memproses pembayaran.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    } finally {
      setProcessingId(null)
    }
  }

  // Derived Data
  const pending = list.filter(p => p.status === 'pending')
  const history = list.filter(p => p.status !== 'pending')

  const currentList = activeTab === 'pending' ? pending : history
  const filteredList = useMemo(() => {
    if (!search) return currentList
    const q = search.toLowerCase()
    return currentList.filter(p => (p.nama_anggota || '').toLowerCase().includes(q))
  }, [currentList, search])

  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE) || 1
  const paginatedList = filteredList.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pembayaran Hutang</h1>
        <p className="text-sm text-slate-500 mt-1">Konfirmasi pembayaran cicilan hutang dari anggota.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-600 p-4 bg-rose-50 rounded-xl border border-rose-200">
          <AlertCircle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

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
          Menunggu ({pending.length})
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

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Cari nama anggota..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-0 sm:p-4">
          {loading ? (
            <div className="text-center py-16 text-slate-400">Memuat data...</div>
          ) : paginatedList.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <CreditCard className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-slate-500 font-medium">Tidak ada data pembayaran {activeTab === 'pending' ? 'menunggu' : 'ditemukan'}</h3>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {paginatedList.map(p => (
                <div 
                  key={p.pembayaran_id}
                  className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-blue-200 dark:hover:border-blue-900 hover:shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      p.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                      p.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{p.nama_anggota}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">{formatDate(p.created_at)}</div>
                      {activeTab === 'history' && (
                        <Badge variant={p.status === 'approved' ? 'success' : 'danger'} className="mt-2 text-[10px] px-2 py-0.5 uppercase tracking-wide">
                          {p.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t border-slate-100 dark:border-slate-700 sm:border-0 pt-3 sm:pt-0">
                    <div className="font-extrabold text-blue-600 dark:text-blue-400 text-lg sm:text-base sm:mb-2">
                      {formatRupiah(p.jumlah || p.nominal || 0)}
                    </div>
                    
                    {activeTab === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={processingId === p.pembayaran_id}
                          disabled={processingId !== null && processingId !== p.pembayaran_id}
                          onClick={() => handleAction(p.pembayaran_id, 'reject')}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 h-9"
                        >
                          <XCircle className="w-4 h-4 mr-1.5" /> Tolak
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={processingId === p.pembayaran_id}
                          disabled={processingId !== null && processingId !== p.pembayaran_id}
                          onClick={() => handleAction(p.pembayaran_id, 'approve', 'cash')}
                          className="px-3 h-9 font-bold bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5" /> Cash
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={processingId === p.pembayaran_id}
                          disabled={processingId !== null && processingId !== p.pembayaran_id}
                          onClick={() => handleAction(p.pembayaran_id, 'approve', 'transfer')}
                          className="px-3 h-9 font-bold bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5" /> Transfer
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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

    </div>
  )
}
export default PembayaranHutangPage
