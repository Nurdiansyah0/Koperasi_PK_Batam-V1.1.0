import React, { useEffect, useState } from 'react'
import { kasirService } from '@/services/kasirService'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { Transaksi } from '@/types'
import { Filter, Calendar, ChevronDown, ChevronUp, ShoppingBag, Receipt, User } from 'lucide-react'
import toast from 'react-hot-toast'

export function RiwayatTransaksiKasir() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([])
  const [loading, setLoading] = useState(true)
  const [tglAwal, setTglAwal] = useState('')
  const [tglAkhir, setTglAkhir] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Track expanded transaction IDs
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

  const loadData = async (currentPage: number = page) => {
    setLoading(true)
    try {
      const response = await kasirService.getHistoryTransaksi({
        tanggal_awal: tglAwal,
        tanggal_akhir: tglAkhir,
        page: currentPage
      })
      // The API returns the paginated data directly or wrapped in data based on previous modifications
      setTransaksi(response.data || [])
      setTotalPages(response.last_page || 1)
      setPage(response.current_page || 1)
      
      // Reset expansions when loading new page
      setExpandedRows({})
    } catch (e) {
      toast.error('Gagal memuat riwayat transaksi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData(1) }, [])

  const toggleExpand = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat Transaksi</h1>
        <p className="text-sm text-slate-500 mt-1">Lacak dan audit riwayat penjualan POS harian.</p>
      </div>

      {/* Filter Section */}
      <Card className="border-t-4 border-t-blue-500 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full">
              <Input 
                type="date" 
                label="Dari Tanggal" 
                value={tglAwal} 
                onChange={e => setTglAwal(e.target.value)} 
              />
            </div>
            <div className="w-full">
              <Input 
                type="date" 
                label="Sampai Tanggal" 
                value={tglAkhir} 
                onChange={e => setTglAkhir(e.target.value)} 
              />
            </div>
            <Button onClick={() => loadData(1)} loading={loading} className="w-full sm:w-auto h-[42px] gap-2 font-bold px-8">
              <Filter className="w-4 h-4" />
              Terapkan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 text-slate-400 font-medium">Memuat riwayat transaksi...</div>
        ) : transaksi.length === 0 ? (
          <div className="text-center py-16 text-slate-500 flex flex-col items-center">
            <Receipt className="w-12 h-12 text-slate-300 mb-3" />
            <p>Tidak ada transaksi ditemukan pada rentang tanggal tersebut.</p>
          </div>
        ) : (
          transaksi.map((t) => {
            const isExpanded = !!expandedRows[t.transaksi_id]
            const isCash = t.metode_pembayaran === 'cash' || t.metode_pembayaran === 'tunai'
            const isSaldo = t.metode_pembayaran === 'saldo'
            const isHutang = t.metode_pembayaran === 'hutang'

            return (
              <Card key={t.transaksi_id} className="overflow-hidden transition-all hover:border-blue-300 hover:shadow-md">
                <div 
                  className="p-4 sm:p-5 bg-white dark:bg-slate-900 cursor-pointer flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center"
                  onClick={() => toggleExpand(t.transaksi_id)}
                >
                  {/* Main Info */}
                  <div className="flex items-start gap-4 w-full sm:w-auto">
                    <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      isCash ? 'bg-emerald-100 text-emerald-600' : 
                      isSaldo ? 'bg-blue-100 text-blue-600' : 
                      'bg-rose-100 text-rose-600'
                    }`}>
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 dark:text-white text-lg">
                          #{t.transaksi_id}
                        </span>
                        <Badge variant={isCash ? 'success' : isSaldo ? 'info' : 'danger'} className="text-[10px] uppercase">
                          {t.metode_pembayaran}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(t.created_at)}</span>
                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {t.nama_anggota || 'Pelanggan Umum'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-0.5">Total Belanja</div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-lg">
                        {formatRupiah(t.total_harga || t.total || 0)}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="p-2 h-auto text-slate-400 hover:bg-slate-100 rounded-full">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details Sub-pane */}
                {isExpanded && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 p-4 sm:p-5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Rincian Barang</h4>
                    
                    {(!t.details || t.details.length === 0) ? (
                      <p className="text-sm text-slate-400 italic">Data rincian barang tidak tersedia untuk transaksi lama ini.</p>
                    ) : (
                      <div className="space-y-3">
                        {t.details.map((d: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600">
                                {d.jumlah}x
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{d.nama_barang}</div>
                                <div className="text-xs text-slate-500">@ {formatRupiah(d.harga_satuan)}</div>
                              </div>
                            </div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                              {formatRupiah(d.subtotal)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <span className="text-xs text-slate-500">Dilayani oleh: <strong>@{t.nama_kasir || 'kasir'}</strong></span>
                      <Badge variant={t.status === 'batal' ? 'danger' : 'success'}>
                        {t.status === 'batal' ? 'Transaksi Dibatalkan' : 'Transaksi Selesai'}
                      </Badge>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between pt-4 pb-10">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-800">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="bg-white shadow-sm font-bold"
              onClick={() => loadData(page - 1)} 
              disabled={page === 1}
            >
              &larr; Prev
            </Button>
            <Button 
              variant="outline" 
              className="bg-white shadow-sm font-bold"
              onClick={() => loadData(page + 1)} 
              disabled={page === totalPages}
            >
              Next &rarr;
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
export default RiwayatTransaksiKasir
