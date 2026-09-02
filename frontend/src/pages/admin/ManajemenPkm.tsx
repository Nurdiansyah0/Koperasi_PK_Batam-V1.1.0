import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Layers,
  Sparkles,
  Search,
  Save,
  RefreshCw,
  Info,
  ArrowUpDown,
  TrendingUp,
  PackageCheck,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Flame
} from 'lucide-react'
import { adminService } from '@/services/adminService'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah } from '@/lib/utils'
import type { PkmItem } from '@/types'

export function ManajemenPkmPage() {
  const [items, setItems] = useState<PkmItem[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [days, setDays] = useState(30)
  const [leadTime, setLeadTime] = useState(4)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [autoCalculating, setAutoCalculating] = useState(false)
  const [editedPkm, setEditedPkm] = useState<Record<number, number>>({})

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await adminService.getPkmAnalysis({ days, lead_time_days: leadTime, search })
      if (res.success) {
        setItems(res.data || [])
        setSummary(res.summary || null)
      }
    } catch {
      toast.error('Gagal memuat analisis PKM')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [days, leadTime])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadData()
  }

  const handlePkmChange = (barangId: number, val: number) => {
    setEditedPkm(prev => ({
      ...prev,
      [barangId]: Math.max(1, val)
    }))
  }

  const handleSaveIndividualPkm = async (item: PkmItem) => {
    const newPkm = editedPkm[item.barang_id] ?? item.pkm
    setSavingId(item.barang_id)
    try {
      const res = await adminService.updatePkm(item.barang_id, newPkm)
      if (res.success) {
        toast.success(res.message || 'PKM berhasil diperbarui')
        setEditedPkm(prev => {
          const next = { ...prev }
          delete next[item.barang_id]
          return next
        })
        loadData()
      } else {
        toast.error(res.error || 'Gagal memperbarui PKM')
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    } finally {
      setSavingId(null)
    }
  }

  const handleAutoCalculateAll = async () => {
    if (!window.confirm(`Kalkulasi otomatis PKM untuk seluruh produk display toko berdasarkan penjualan ${days} hari terakhir (${leadTime} hari stok toko)?`)) {
      return
    }

    setAutoCalculating(true)
    try {
      const res = await adminService.autoCalculatePkm(days, leadTime)
      if (res.success) {
        toast.success(res.message || 'Seluruh PKM toko berhasil dihitung ulang!')
        setEditedPkm({})
        loadData()
      } else {
        toast.error(res.error || 'Gagal menghitung PKM')
      }
    } catch {
      toast.error('Terjadi kesalahan kalkulasi')
    } finally {
      setAutoCalculating(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-7 h-7 text-blue-600" />
            Manajemen PKM & Display Toko
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Penetapan Kuantitas Maksimum display toko etalase kasir berbasis laju penjualan harian (Stok 4 Hari).
          </p>
        </div>
        <Button
          variant="primary"
          className="gap-2 shadow-md font-bold"
          loading={autoCalculating}
          onClick={handleAutoCalculateAll}
        >
          <Sparkles className="w-4 h-4" />
          Kalkulasi Otomatis Semua PKM (4 Hari)
        </Button>
      </div>

      {/* Info Teori PKM Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 shadow-xs flex items-start gap-3.5">
        <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
          <Info className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
          <div className="font-bold text-slate-900 dark:text-white text-sm">
            Prinsip Efisiensi Cycle Count Kasir dengan Teori PKM:
          </div>
          <p>
            Kasir toko <b>hanya menata dan menghitung barang di etalase kasir sesuai batas PKM</b> (stok display 4 hari). 
            Jika barang jarang laku (misal laku 1 pcs/minggu), PKM diset 1 pcs sehingga kasir tidak perlu menghitung tumpukan stok banyak saat serah terima shift.
          </p>
          <div className="font-mono text-[11px] text-blue-700 dark:text-blue-300 pt-0.5">
            Formula: <b>PKM Toko = ceil(Average Daily Sales &times; 4 Hari)</b>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200/80 shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Total Produk</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {summary?.total_barang || items.length} Item
              </div>
            </div>
            <PackageCheck className="w-6 h-6 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Target Display Toko</div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {summary?.total_pkm_units || items.reduce((acc, i) => acc + (i.pkm || 1), 0)} Pcs
              </div>
            </div>
            <SlidersHorizontal className="w-6 h-6 text-indigo-500" />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Rata-rata PKM/Item</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {summary?.avg_pkm || (items.length ? (items.reduce((acc, i) => acc + (i.pkm || 1), 0) / items.length).toFixed(1) : 1)} Pcs
              </div>
            </div>
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Lead Time Toko</div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {leadTime} Hari
              </div>
            </div>
            <Layers className="w-6 h-6 text-amber-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search */}
      <Card className="border-slate-200/80 shadow-xs bg-white dark:bg-slate-900">
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama barang atau rokok..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="submit" variant="primary" className="text-xs h-9 px-4 font-bold flex-1 sm:flex-none">
                Cari
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="text-xs h-9 px-3 gap-1"
                onClick={() => { setSearch(''); loadData() }}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* PKM Table */}
      <Card className="border-slate-200/80 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3.5 font-bold">Barang</th>
                <th className="px-4 py-3.5 font-bold text-center w-28">30D Terjual</th>
                <th className="px-4 py-3.5 font-bold text-center w-28">Laju/Hari (ADS)</th>
                <th className="px-4 py-3.5 font-bold text-center w-28">Rekomendasi PKM</th>
                <th className="px-4 py-3.5 font-bold text-center w-36">PKM Toko Aktif</th>
                <th className="px-4 py-3.5 font-bold text-center w-24">Stok Total</th>
                <th className="px-4 py-3.5 font-bold text-center w-36">Status Display</th>
                <th className="px-4 py-3.5 font-bold text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    Memuat data PKM & laju penjualan...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    Tidak ada data barang yang ditemukan.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const currentVal = editedPkm[item.barang_id] ?? item.pkm
                  const isModified = editedPkm[item.barang_id] !== undefined && editedPkm[item.barang_id] !== item.pkm
                  const isRokok = item.nama_barang.toLowerCase().includes('rokok') || 
                                  item.nama_barang.toLowerCase().includes('sampoerna') || 
                                  item.nama_barang.toLowerCase().includes('surya') || 
                                  item.nama_barang.toLowerCase().includes('samsu') || 
                                  item.nama_barang.toLowerCase().includes('camel')

                  return (
                    <tr key={item.barang_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white">{item.nama_barang}</span>
                          {isRokok && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5" /> Rokok
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatRupiah(item.harga_jual)}/pcs
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {item.total_sold} pcs
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        {item.ads.toFixed(2)}/hari
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg text-xs">
                          {item.recommended_pkm} pcs
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            value={currentVal}
                            onChange={(e) => handlePkmChange(item.barang_id, parseInt(e.target.value) || 1)}
                            className={`w-16 px-2 py-1 text-center font-black rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isModified 
                                ? 'border-amber-400 bg-amber-50/60 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                            }`}
                          />
                          <span className="text-[10px] text-slate-400">pcs</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {item.stok}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.stok >= currentVal
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {item.stok >= currentVal ? 'Display Cukup' : 'Perlu Restock'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant={isModified ? 'primary' : 'ghost'}
                          className="h-8 px-2.5 text-[11px] font-bold"
                          disabled={!isModified && savingId !== item.barang_id}
                          loading={savingId === item.barang_id}
                          onClick={() => handleSaveIndividualPkm(item)}
                        >
                          <Save className="w-3 h-3 mr-1" /> Simpan
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default ManajemenPkmPage
