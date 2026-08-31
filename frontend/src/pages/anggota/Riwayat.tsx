import React, { useEffect, useState } from 'react'
import { anggotaService } from '@/services/anggotaService'
import { IosListSection, IosListItem } from '@/components/ios/IosList'
import { IosBottomSheet } from '@/components/ios/IosBottomSheet'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { HistoriTransaksiAnggota } from '@/types'
import { Button } from '@/components/ui/Button'
import { ShoppingBag, Receipt, CheckCircle2, Clock } from 'lucide-react'

export function RiwayatTransaksiAnggota() {
  const [transaksi, setTransaksi] = useState<HistoriTransaksiAnggota[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTx, setSelectedTx] = useState<HistoriTransaksiAnggota | null>(null)
  
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadData = (pageNum: number) => {
    setLoading(true)
    anggotaService.getHistoriTransaksi(pageNum)
      .then((res) => {
        setTransaksi(res.data)
        setPage(res.current_page)
        setTotalPages(res.last_page)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData(1)
  }, [])

  if (loading && transaksi.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 max-w-lg mx-auto">
      <div className="px-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Riwayat Transaksi</h1>
        <p className="text-xs text-slate-500 mt-0.5">Daftar semua pembelian barang di Koperasi PK</p>
      </div>

      <IosListSection title="Aktivitas Belanja">
        {transaksi.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Belum ada histori transaksi
          </div>
        ) : (
          transaksi.map((t) => (
            <IosListItem
              key={t.transaksi_id}
              icon={<ShoppingBag className="w-4 h-4" />}
              iconBgColor={t.metode_pembayaran === 'hutang' ? 'bg-rose-500' : 'bg-blue-600'}
              title={`Transaksi #${t.transaksi_id}`}
              subtitle={formatDate(t.created_at)}
              value={
                <div className="text-right">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{formatRupiah(t.total_harga)}</p>
                  <span className={`text-[10px] font-semibold capitalize ${t.status === 'selesai' ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {t.metode_pembayaran} &bull; {t.status}
                  </span>
                </div>
              }
              hasChevron
              onClick={() => setSelectedTx(t)}
            />
          ))
        )}
      </IosListSection>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <span className="text-xs font-semibold text-slate-500">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || loading}
              onClick={() => loadData(page - 1)}
              className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages || loading}
              onClick={() => loadData(page + 1)}
              className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* iOS Receipt Modal */}
      <IosBottomSheet isOpen={Boolean(selectedTx)} onClose={() => setSelectedTx(null)} title="Struk Pembelian">
        {selectedTx && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-slate-200/50 space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>No. Transaksi</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{selectedTx.transaksi_id}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Waktu</span>
                <span>{formatDate(selectedTx.created_at)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Metode Pembayaran</span>
                <span className="font-bold uppercase text-blue-600">{selectedTx.metode_pembayaran}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Status</span>
                <span className="font-bold capitalize text-emerald-600">{selectedTx.status}</span>
              </div>
            </div>

            {selectedTx.items && selectedTx.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Rincian Barang</p>
                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {selectedTx.items.map((item: any, idx: number) => (
                    <div key={idx} className="py-2 flex justify-between items-center text-xs sm:text-sm">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{item.nama_barang}</p>
                        <p className="text-slate-400 text-xs">{item.jumlah || item.qty} x {formatRupiah(item.harga_satuan)}</p>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(item.subtotal || (item.jumlah || item.qty) * item.harga_satuan)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600">Total Transaksi</span>
              <span className="text-xl font-extrabold text-blue-600">{formatRupiah(selectedTx.total_harga)}</span>
            </div>
          </div>
        )}
      </IosBottomSheet>
    </div>
  )
}
export default RiwayatTransaksiAnggota