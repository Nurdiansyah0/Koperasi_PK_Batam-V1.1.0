import React, { useEffect, useState, useMemo } from 'react'
import { kasirService } from '@/services/kasirService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { formatRupiah, formatDate } from '@/lib/utils'
import { ShoppingBag, CheckCircle, XCircle, UserCircle2, CheckSquare, Square, ArrowLeft, CheckCircle2, PackageSearch } from 'lucide-react'
import toast from 'react-hot-toast'
import type { PesananAnggota } from '@/types'

const PesananAnggotaPage = () => {
  const [pesanan, setPesanan] = useState<PesananAnggota[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | string | null>(null)
  
  // Master-Detail State
  const [selectedAnggotaId, setSelectedAnggotaId] = useState<number | null>(null)
  const [showMobileDetail, setShowMobileDetail] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await kasirService.getPesananAnggota()
      setPesanan(res)
      setSelectedIds(new Set()) 
      
      // If detail view is open, check if they still have orders.
      if (selectedAnggotaId !== null) {
        const stillHasOrders = res.some(p => (p.anggota_id || -1) === selectedAnggotaId)
        if (!stillHasOrders) {
            setSelectedAnggotaId(null)
            setShowMobileDetail(false)
        }
      }
    } catch {
      toast.error('Gagal memuat pesanan anggota')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Group by Anggota
  const groupedPesanan = useMemo(() => {
    const groups: Record<number, { nama: string, totalHarga: number, orders: PesananAnggota[] }> = {}
    const UNKNOWN_ID = -1

    pesanan.forEach(p => {
      const gId = p.anggota_id || UNKNOWN_ID
      if (!groups[gId]) {
        groups[gId] = {
          nama: p.nama_anggota || 'Pembeli Umum',
          totalHarga: 0,
          orders: []
        }
      }
      groups[gId].orders.push(p)
      groups[gId].totalHarga += (p.total_harga || p.total || 0)
    })
    
    return Object.entries(groups).map(([id, data]) => ({
      anggota_id: Number(id),
      nama: data.nama,
      totalHarga: data.totalHarga,
      orders: data.orders
    }))
  }, [pesanan])

  const toggleSelection = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleApprove = async (ids: number[], processingKey: string) => {
    if (ids.length === 0) return
    setProcessingId(processingKey)
    try {
      const payload = ids.map(id => ({ transaksi_id: id }))
      const res = await kasirService.simpanTransaksiKasir(payload)
      if (res.success) {
        toast.success(ids.length > 1 ? `${ids.length} Pesanan berhasil diselesaikan!` : 'Pesanan berhasil diselesaikan!')
        loadData()
      } else {
        toast.error(res.error || 'Gagal menyelesaikan pesanan')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan sistem')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (ids: number[], processingKey: string) => {
    if (ids.length === 0) return
    setProcessingId(processingKey)
    try {
      const res = await kasirService.tolakPesananAnggota(ids)
      if (res.success) {
        toast.success(ids.length > 1 ? `${ids.length} Pesanan berhasil dibatalkan!` : 'Pesanan berhasil dibatalkan dan stok dikembalikan!')
        loadData()
      } else {
        toast.error(res.error || res.message || 'Gagal membatalkan pesanan')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan sistem saat membatalkan')
    } finally {
      setProcessingId(null)
    }
  }

  const activeGroup = useMemo(() => {
    if (selectedAnggotaId === null) return null
    return groupedPesanan.find(g => g.anggota_id === selectedAnggotaId)
  }, [selectedAnggotaId, groupedPesanan])

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-7.5rem)] pb-16 md:pb-6">
      
      {/* Container List Anggota (Hidden on mobile if Detail is shown) */}
      <div className={`flex-1 flex flex-col gap-4 overflow-hidden ${showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pesanan Anggota</h1>
          <p className="text-sm text-slate-500 mt-1">Antrean pesanan yang menunggu diproses.</p>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 pb-4 mt-2">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-400">Memuat pesanan...</div>
          ) : groupedPesanan.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Tidak Ada Pesanan</h3>
              <p className="text-sm text-slate-500 mt-1">Antrean kosong.</p>
            </div>
          ) : (
            groupedPesanan.map((group) => {
              const isActive = selectedAnggotaId === group.anggota_id
              return (
                <Card 
                  key={group.anggota_id} 
                  className={`cursor-pointer transition-all hover:shadow-md flex flex-col justify-between ${
                    isActive
                      ? 'border-blue-500/80 bg-blue-50/50 shadow-sm dark:bg-blue-900/10'
                      : 'border-slate-200/80 bg-white hover:border-blue-300 shadow-sm dark:border-slate-800 dark:bg-slate-900'
                  }`}
                  onClick={() => {
                    setSelectedAnggotaId(group.anggota_id)
                    setSelectedIds(new Set())
                    setShowMobileDetail(true)
                  }}
                >
                  <CardContent className="p-4 flex flex-col h-full gap-4 justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                        <UserCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-base truncate pr-2 max-w-[180px]">{group.nama}</h3>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Total: {formatRupiah(group.totalHarga)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/60">
                      <Badge variant="warning" className="text-[10px] px-2 py-0.5">
                        {group.orders.length} Pesanan
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:bg-blue-100 px-2 font-semibold text-xs">
                        Lihat Rincian &rarr;
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Rincian Pesanan (Detail Panel) */}
      <div className={`w-full lg:w-[450px] flex-col gap-4 ${showMobileDetail ? 'flex' : 'hidden lg:flex'}`}>
        
        {/* Mobile Back Button */}
        <div className="lg:hidden flex items-center justify-start pb-2">
          <Button variant="ghost" onClick={() => setShowMobileDetail(false)} className="gap-2 h-9 px-2 text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Antrean
          </Button>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden border-slate-200/90 shadow-md h-full">
          {!activeGroup ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 p-6 text-center">
              <PackageSearch className="w-12 h-12 mb-4 text-slate-300" />
              <p className="font-medium">Pilih anggota di sebelah kiri<br/>untuk melihat rincian pesanan.</p>
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Memproses</div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                    {activeGroup.nama}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Total Tagihan</div>
                  <div className="font-extrabold text-blue-600 text-lg">{formatRupiah(activeGroup.totalHarga)}</div>
                </div>
              </div>

              {/* Scrollable Order List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                {activeGroup.orders.map((p) => {
                  const isSelected = selectedIds.has(p.transaksi_id)
                  return (
                    <div 
                      key={p.transaksi_id} 
                      className={`p-3 rounded-xl border shadow-sm flex flex-col gap-2 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-200'
                      }`}
                      onClick={() => toggleSelection(p.transaksi_id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 shrink-0" />
                          )}
                          <div>
                            <span className="text-xs font-bold text-slate-700">#{p.transaksi_id}</span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {p.created_at ? formatDate(p.created_at) : p.tanggal ? formatDate(p.tanggal) : ''}
                            </div>
                          </div>
                        </div>
                        <Badge variant={
                          p.metode_pembayaran === 'cash' || p.metode_pembayaran === 'tunai' ? 'success' :
                          p.metode_pembayaran === 'hutang' ? 'danger' : 'info'
                        } className="uppercase text-[9px] px-1.5 py-0">
                          {p.metode_pembayaran}
                        </Badge>
                      </div>

                      <div className="space-y-1 pl-8">
                        {p.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-300 truncate pr-2">
                              {(item.qty || item.jumlah || 0)}x {item.nama_barang}
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 shrink-0">
                              {formatRupiah(item.subtotal || ((item.qty || item.jumlah || 0) * item.harga_satuan))}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 pl-8 mt-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {formatRupiah(p.total_harga || p.total || 0)}
                        </span>
                        
                        {/* Only show inline buttons if NOTHING is selected globally */}
                        {selectedIds.size === 0 && (
                          <div className="flex gap-1.5">
                            <Button 
                              size="sm"
                              variant="ghost"
                              className="text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 h-7 px-2 text-[11px]"
                              loading={processingId === `reject_${p.transaksi_id}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (window.confirm('Tolak pesanan ini?')) {
                                  handleReject([p.transaksi_id], `reject_${p.transaksi_id}`)
                                }
                              }}
                            >
                              Tolak
                            </Button>
                            <Button 
                              size="sm"
                              variant="primary"
                              className="h-7 px-2.5 text-[11px] font-bold"
                              loading={processingId === `approve_${p.transaksi_id}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleApprove([p.transaksi_id], `approve_${p.transaksi_id}`)
                              }}
                            >
                              Selesai
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-10">
                {selectedIds.size > 0 ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center px-1 mb-1 border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-500">{selectedIds.size} Pesanan Terpilih</span>
                      <span className="font-extrabold text-blue-600 text-base">
                        {formatRupiah(Array.from(selectedIds).reduce((sum, id) => {
                          const o = activeGroup.orders.find(o => o.transaksi_id === id)
                          return sum + (o?.total_harga || o?.total || 0)
                        }, 0))}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 text-rose-600 bg-rose-50 hover:bg-rose-100 h-11 font-bold shadow-sm"
                        variant="ghost"
                        loading={processingId === `reject_partial_${activeGroup.anggota_id}`}
                        onClick={() => {
                          if (window.confirm(`Yakin ingin menolak ${selectedIds.size} pesanan terpilih?`)) {
                            handleReject(Array.from(selectedIds), `reject_partial_${activeGroup.anggota_id}`)
                          }
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Tolak
                      </Button>
                      <Button 
                        className="flex-1 shadow-md h-11 font-bold text-sm" 
                        variant="primary"
                        loading={processingId === `approve_partial_${activeGroup.anggota_id}`}
                        onClick={() => handleApprove(Array.from(selectedIds), `approve_partial_${activeGroup.anggota_id}`)}
                      >
                        <CheckCircle2 className="w-5 h-5 mr-1" /> Selesai
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    className="w-full gap-2 shadow-md h-12 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white" 
                    variant="primary"
                    loading={processingId === `group_${activeGroup.anggota_id}`}
                    onClick={() => handleApprove(activeGroup.orders.map(o => o.transaksi_id), `group_${activeGroup.anggota_id}`)}
                  >
                    <CheckCircle2 className="w-5 h-5" /> Selesaikan Semua ({activeGroup.orders.length})
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

    </div>
  )
}

export default PesananAnggotaPage
