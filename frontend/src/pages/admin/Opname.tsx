import React, { useEffect, useState } from 'react'
import { adminService } from '@/services/adminService'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatRupiah } from '@/lib/utils'
import { Save, AlertTriangle, CheckCircle, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Barang } from '@/types'

const OpnamePage = () => {
  const [barang, setBarang] = useState<Barang[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [stokFisik, setStokFisik] = useState<Record<number, string>>({})
  const [search, setSearch] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await adminService.getBarang()
      setBarang(res)
    } catch {
      toast.error('Gagal memuat data barang')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async () => {
    // Collect all items where physical stock was entered and is different from system stock
    const adjustments = []
    
    for (const b of barang) {
      if (stokFisik[b.barang_id] !== undefined && stokFisik[b.barang_id] !== '') {
        const fisik = parseInt(stokFisik[b.barang_id], 10)
        if (fisik !== b.stok) {
          adjustments.push({
            barang_id: b.barang_id,
            stok_awal: b.stok,
            stok_akhir: fisik,
            selisih: fisik - b.stok,
            keterangan: 'Penyesuaian Opname Massal'
          })
        }
      }
    }

    if (adjustments.length === 0) {
      return toast.error('Tidak ada selisih stok yang perlu disesuaikan.')
    }

    if (!window.confirm(`Anda akan menyesuaikan stok untuk ${adjustments.length} barang. Lanjutkan?`)) return

    setSubmitting(true)
    try {
      // Create this endpoint in AdminController
      const res = await adminService.submitOpnameMassal(adjustments)
      if (res.success) {
        toast.success('Opname berhasil diselesaikan!')
        setStokFisik({})
        loadData()
      } else {
        toast.error(res.error || 'Gagal menyimpan opname')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan sistem')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredBarang = barang.filter(b => 
    b.nama_barang.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Opname Stok Massal</h1>
          <p className="text-sm text-slate-500 mt-1">Lakukan audit fisik seluruh barang untuk penyesuaian stok bulanan.</p>
        </div>
        <Button onClick={handleSubmit} loading={submitting} className="gap-2 shrink-0">
          <Save className="w-4 h-4" /> Simpan Hasil Opname
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Hanya isi kolom "Fisik" jika ada selisih stok. Kosongkan jika stok sesuai.
          </div>
          <div className="w-full sm:w-64">
            <Input 
              placeholder="Cari nama barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-10 text-slate-400">Memuat data barang...</div>
          ) : (
            <>
              {/* Mobile-First Card View (sm:hidden) */}
              <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBarang.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">Barang tidak ditemukan</div>
                ) : (
                  filteredBarang.map(item => {
                    const fisikRaw = stokFisik[item.barang_id]
                    const fisik = fisikRaw !== undefined && fisikRaw !== '' ? parseInt(fisikRaw, 10) : item.stok
                    const selisih = fisik - item.stok

                    return (
                      <div key={item.barang_id} className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                              {item.nama_barang}
                            </h4>
                            <span className="text-[11px] text-slate-400">
                              {formatRupiah(item.harga_jual || item.harga || 0)}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Stok Sistem</span>
                            <span className="font-black text-xs font-mono bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg">
                              {item.stok}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <input
                              type="number"
                              min="0"
                              placeholder={`Fisik (Sistem: ${item.stok})`}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-center font-bold bg-slate-50 dark:bg-zinc-800/80 focus:ring-2 focus:ring-blue-500 outline-none"
                              value={stokFisik[item.barang_id] ?? ''}
                              onChange={(e) => setStokFisik({...stokFisik, [item.barang_id]: e.target.value})}
                            />
                          </div>

                          <div className="w-24 text-center">
                            {selisih === 0 ? (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-lg flex items-center justify-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Pas
                              </span>
                            ) : selisih > 0 ? (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded-lg block">
                                +{selisih} Lebih
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-1 rounded-lg block">
                                {selisih} Hilang
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Desktop Table (hidden sm:block) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-y border-slate-200 text-sm">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-700">Nama Barang</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Harga Jual</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-center">Stok Sistem</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 w-40">Stok Fisik (Aktual)</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 w-32 text-center">Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBarang.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">Barang tidak ditemukan</td>
                      </tr>
                    ) : (
                      filteredBarang.map(item => {
                        const fisikRaw = stokFisik[item.barang_id]
                        const fisik = fisikRaw !== undefined && fisikRaw !== '' ? parseInt(fisikRaw, 10) : item.stok
                        const selisih = fisik - item.stok
                        
                        return (
                          <tr key={item.barang_id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-800">{item.nama_barang}</td>
                            <td className="px-4 py-3 text-slate-600">{formatRupiah(item.harga_jual || item.harga || 0)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded">{item.stok}</span>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                placeholder="Sesuai..."
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={stokFisik[item.barang_id] ?? ''}
                                onChange={(e) => setStokFisik({...stokFisik, [item.barang_id]: e.target.value})}
                              />
                            </td>
                            <td className="px-4 py-3 text-center font-bold">
                              {selisih === 0 ? (
                                <span className="text-emerald-500 flex items-center justify-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> 0</span>
                              ) : selisih > 0 ? (
                                <span className="text-blue-600">+{selisih}</span>
                              ) : (
                                <span className="text-rose-600">{selisih}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default OpnamePage
