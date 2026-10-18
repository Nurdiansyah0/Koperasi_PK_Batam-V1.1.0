import React, { useEffect, useState, useMemo } from 'react'
import { kasirService } from '@/services/kasirService'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputRupiah } from '@/components/ui/InputRupiah'
import { 
  Send, 
  AlertTriangle, 
  ScanLine, 
  Flame, 
  Lock,
  Search,
  Plus,
  X,
  Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { DaftarKasir, Barang } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface CycleCountBarang extends Barang {
  audit_reason?: string
  risk_badge?: string
  is_manually_added?: boolean
  is_hidden_default?: boolean
}

interface PendingCashOrders {
  count: number
  nominal: number
  total_pending_count?: number
}

const BuatSerahTerimaPage = () => {
  const navigate = useNavigate()
  const [kasirList, setKasirList] = useState<DaftarKasir[]>([])
  const [cycleItems, setCycleItems] = useState<CycleCountBarang[]>([])
  const [allItems, setAllItems] = useState<CycleCountBarang[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [saldoKasSistem, setSaldoKasSistem] = useState<number>(0)
  const [pendingOrders, setPendingOrders] = useState<PendingCashOrders | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form State
  const [kasirTo, setKasirTo] = useState<number | ''>('')
  const [uangFisik, setUangFisik] = useState<string>('')
  const [catatan, setCatatan] = useState<string>('')
  const [stokFisik, setStokFisik] = useState<Record<number, string>>({})

  useEffect(() => {
    const fetchDraft = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await kasirService.getSerahTerimaDraft()
        if (res.success && res.data) {
          setKasirList((res.data as any).kasir_list || [])
          setCycleItems((res.data as any).cycle_count_items || [])
          setAllItems((res.data as any).all_items || (res.data as any).cycle_count_items || [])
          setSaldoKasSistem(Number((res.data as any).saldo_kas_sistem || 0))
          if ((res.data as any).pending_cash_orders) {
            setPendingOrders((res.data as any).pending_cash_orders)
          }
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Gagal memuat data draft serah terima'
        setLoadError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchDraft()
  }, [])

  const cycleItemIds = useMemo(() => {
    return new Set(cycleItems.map(i => i.barang_id))
  }, [cycleItems])

  const filteredSearchResults = useMemo(() => {
    if (!searchTerm.trim()) return []
    const q = searchTerm.toLowerCase().trim()
    return allItems.filter(item => 
      item.nama_barang.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [allItems, searchTerm])

  const handleAddItem = (item: CycleCountBarang) => {
    if (cycleItemIds.has(item.barang_id)) {
      toast('Barang ini sudah ada dalam daftar hitungan', { icon: 'ℹ️' })
      return
    }

    const newItem: CycleCountBarang = {
      ...item,
      is_manually_added: true,
    }

    setCycleItems(prev => [newItem, ...prev])
    setStokFisik(prev => ({
      ...prev,
      [item.barang_id]: ''
    }))
    setSearchTerm('')
    toast.success(`"${item.nama_barang}" ditambahkan ke hitungan fisik toko`)
  }

  const handleRemoveItem = (barangId: number) => {
    const itemToRemove = cycleItems.find(i => i.barang_id === barangId)
    setCycleItems(prev => prev.filter(i => i.barang_id !== barangId))
    setStokFisik(prev => {
      const copy = { ...prev }
      delete copy[barangId]
      return copy
    })
    if (itemToRemove) {
      toast(`"${itemToRemove.nama_barang}" dihapus dari hitungan fisik`, { icon: '🗑️' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kasirTo) return toast.error('Pilih Kasir tujuan penerima shift')
    if (!uangFisik) return toast.error('Masukkan jumlah uang kas fisik di laci')
    
    // Strict Validation: Physical count required for ALL items in store
    for (const item of cycleItems) {
      if (stokFisik[item.barang_id] === undefined || stokFisik[item.barang_id] === '') {
        return toast.error(`Harap isi hitungan fisik toko untuk barang: ${item.nama_barang}`)
      }
    }

    setSubmitting(true)
    
    // Construct rich item payload with financial calculation
    const itemsPayload = cycleItems.map(item => {
      const aktual = parseInt(stokFisik[item.barang_id] || '0', 10)
      const input = item.stok_toko || 0
      const selisih = aktual - input
      const hargaJual = Number(item.harga_jual || item.harga || 0)
      const selisihNominal = selisih * hargaJual

      return {
        barang_id: item.barang_id,
        nama_barang: item.nama_barang,
        harga_jual: hargaJual,
        stok_aktual: aktual,
        stok_input: input,
        selisih: selisih,
        selisih_nominal: selisihNominal,
        status: selisih === 0 ? 'sesuai' : 'selisih',
        audit_reason: item.audit_reason || `PKM Display: ${item.pkm || 1} pcs`,
        risk_badge: item.risk_badge || 'Cycle Count'
      }
    })

    const barangSelisihCount = itemsPayload.filter(i => i.status === 'selisih').length
    const totalSelisihQty = itemsPayload.reduce((acc, curr) => acc + curr.selisih, 0)
    const totalSelisihNominal = itemsPayload.reduce((acc, curr) => acc + curr.selisih_nominal, 0)
    const totalMinusNominal = itemsPayload
      .filter(i => i.selisih < 0)
      .reduce((acc, curr) => acc + Math.abs(curr.selisih_nominal), 0)

    const nominalUangFisik = parseInt(uangFisik, 10) || 0
    const selisihKas = nominalUangFisik - saldoKasSistem

    const hasilOpname = {
      summary: {
        totalBarang: cycleItems.length,
        barangSesuai: cycleItems.length - barangSelisihCount,
        barangSelisih: barangSelisihCount,
        totalSelisihQty: totalSelisihQty,
        totalSelisihNominal: totalSelisihNominal,
        totalMinusNominal: totalMinusNominal,
        pendingCashOrdersCount: pendingOrders?.count || 0,
        pendingCashOrdersNominal: pendingOrders?.nominal || 0,
      },
      pending_cash_orders: pendingOrders,
      saldo_kas_sistem: saldoKasSistem,
      uang_fisik: nominalUangFisik,
      selisih_kas: selisihKas,
      catatan: catatan,
      items: itemsPayload,
      type: 'hybrid_cycle_count',
      timestamp: new Date().toISOString()
    }

    try {
      const res = await kasirService.createSerahTerima(Number(kasirTo), hasilOpname)
      if (res.success) {
        toast.success(res.message || 'Serah terima shift berhasil dikirim untuk divalidasi Kasir Penerima!')
        navigate('/kasir/serah-terima')
      } else {
        toast.error(res.message || res.error || 'Gagal membuat serah terima')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat memproses serah terima')
    } finally {
      setSubmitting(false)
    }
  }

  const nominalUangFisikInput = parseInt(uangFisik, 10) || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 font-semibold">Menyiapkan draft serah terima shift...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Formulir Serah Terima Shift</h1>
          <p className="text-sm text-slate-500">
            Hitung kas fisik dan stok fisik nyata di toko untuk rekonsiliasi dan akuntabilitas serah terima shift.
          </p>
        </div>
      </div>

      {loadError ? (
        <Card className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 sm:p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-rose-900 dark:text-rose-200">
              Tidak Dapat Membuka Formulir Serah Terima
            </h3>
            <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 mt-2 max-w-lg mx-auto leading-relaxed">
              {loadError}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/kasir/pesanan')}
              className="text-xs font-bold"
            >
              Buka Pesanan Kasir &rarr;
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/kasir/serah-terima')}
              className="text-xs font-bold"
            >
              Kembali
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Pending Cash Orders Status Banner */}
          {pendingOrders && pendingOrders.count > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800 flex items-start gap-3.5">
              <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1 text-amber-950 dark:text-amber-200">
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>Status Transaksi Pending:</span>
                  <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full font-black">
                    {pendingOrders.count} Transaksi Tunai ({formatRupiah(pendingOrders.nominal)})
                  </span>
                </div>
                <p>
                  Terdapat <b>{pendingOrders.count} transaksi tunai pending</b> senilai <b>{formatRupiah(pendingOrders.nominal)}</b> di dalam sistem.
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                  Status ini telah dicatat otomatis ke dalam berkas serah terima agar kasir penerima shift mengetahui adanya transaksi pending tersebut.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tahap 1: Kasir Penerima & Rekonsiliasi Kas Laci */}
        <Card className="border-t-4 border-t-blue-600 shadow-sm">
          <CardHeader>
            <CardTitle>1. Rekonsiliasi Uang Kas Laci</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Serahkan Ke Kasir (Penerima Shift) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={kasirTo}
                  onChange={(e) => setKasirTo(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">-- Pilih Kasir Penerima --</option>
                  {kasirList.map(k => (
                    <option key={k.user_id} value={k.user_id}>
                      {k.nama_lengkap || k.username} (@{k.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <InputRupiah
                  label="Jumlah Uang Fisik Di Laci Kasir (Rp)"
                  required
                  placeholder="0"
                  value={uangFisik}
                  onChange={setUangFisik}
                />
              </div>
            </div>

            <Input
              label="Catatan / Pesan Kasir (Opsional)"
              placeholder="Contoh: Ada uang koin pecahan 500an dipisah, atau titipan bon belanja..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Tahap 2: Hitungan Fisik Stok Toko (Cycle Count) */}
        <Card className="border-t-4 border-t-amber-500 shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-amber-500" />
                  <CardTitle>2. Hitungan Fisik Stok Toko (Area Display Kasir)</CardTitle>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Hitung kuantitas fisik riil barang di etalase kasir / rak display toko. <b className="text-slate-700 dark:text-slate-300">Hanya stok toko yang dihitung</b> (stok gudang ditampilkan sebagai informasi referensi stok cadangan).
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-900">
                  {cycleItems.length} Item Masuk Hitungan
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Searchbar to find or add items */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari & tambahkan barang ke hitungan fisik toko... (contoh: rokok, susu, mie)"
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {searchTerm.trim().length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                    {filteredSearchResults.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Tidak menemukan barang dengan nama "{searchTerm}"
                      </div>
                    ) : (
                      filteredSearchResults.map(item => {
                        const isAlreadyAdded = cycleItemIds.has(item.barang_id)
                        return (
                          <div
                            key={item.barang_id}
                            className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {item.nama_barang}
                              </div>
                              <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                                <span>
                                  Stok Toko (Dihitung): <b className="text-blue-600 dark:text-blue-400">{item.stok_toko ?? 0}</b> pcs
                                </span>
                                <span>•</span>
                                <span className="text-slate-400">
                                  Gudang (Ref): <b>{item.stok_gudang ?? 0}</b> pcs
                                </span>
                                <span>•</span>
                                <span>{formatRupiah(item.harga_jual || item.harga || 0)}</span>
                              </div>
                            </div>

                            <div>
                              {isAlreadyAdded ? (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                                  ✓ Sudah di Daftar
                                </span>
                              ) : (
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleAddItem(item)}
                                  className="text-xs font-bold gap-1 py-1 px-3"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Tambah
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex-wrap gap-1">
                <span>Menampilkan <b>{cycleItems.length}</b> barang aktif di toko. Barang stok toko &amp; gudang 0 (&gt; 3 hari) disembunyikan otomatis.</span>
                {allItems.length > cycleItems.length && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {allItems.length - cycleItems.length} barang stok 0 tersembunyi
                  </span>
                )}
              </div>
            </div>

            {cycleItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Memuat item toko...</div>
            ) : (
              <>
                {/* 1. Desktop Table View (>= sm) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3.5 font-bold">Barang & Kategori</th>
                        <th className="px-4 py-3.5 font-bold text-center w-32">
                          <div>Stok Toko</div>
                          <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 block -mt-0.5">(Dihitung)</span>
                        </th>
                        <th className="px-4 py-3.5 font-bold text-center w-28 text-slate-400">
                          <div>Stok Gudang</div>
                          <span className="text-[10px] font-normal text-slate-400 block -mt-0.5">(Ref)</span>
                        </th>
                        <th className="px-4 py-3.5 font-bold text-center w-28">PKM Toko</th>
                        <th className="px-4 py-3.5 font-bold text-center w-52">
                          Hitung Fisik Toko <span className="text-rose-500">*</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {cycleItems.map((item, idx) => {
                        const badgeType = item.risk_badge || 'Display Toko'
                        const isRokok = badgeType.toLowerCase().includes('rokok')
                        const val = stokFisik[item.barang_id]
                        const hasInput = val !== undefined && val !== ''
                        const selisih = hasInput ? Number(val) - (item.stok_toko || 0) : null

                        return (
                          <tr key={item.barang_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <span className="text-slate-400 font-mono text-[10px] w-5">#{idx + 1}</span>
                                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{item.nama_barang}</span>
                                {isRokok && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-0.5">
                                    <Flame className="w-2.5 h-2.5" /> Rokok
                                  </span>
                                )}
                                {item.is_manually_added && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                    + Ditambahkan
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 ml-6">
                                Harga: {formatRupiah(item.harga_jual || item.harga || 0)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900 px-2.5 py-1 rounded-lg text-xs">
                                {item.stok_toko ?? 0} pcs
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-xs">
                                {item.stok_gudang ?? 0} pcs
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                                Max {item.pkm || 1} pcs
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  placeholder="Fisik toko..."
                                  className="w-24 px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-black focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs bg-white dark:bg-slate-900"
                                  value={stokFisik[item.barang_id] ?? ''}
                                  onChange={(e) => setStokFisik({...stokFisik, [item.barang_id]: e.target.value})}
                                />
                                <span className="text-[10px] text-slate-400">pcs</span>

                                {hasInput && selisih !== null && (
                                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                    selisih === 0
                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                      : selisih > 0
                                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                  }`}>
                                    {selisih === 0 ? '✓ Pas' : selisih > 0 ? `+${selisih}` : selisih}
                                  </span>
                                )}

                                {item.is_manually_added && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(item.barang_id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="Hapus dari hitungan fisik"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 2. Mobile Responsive Card List (< sm) */}
                <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
                  {cycleItems.map((item, idx) => {
                    const badgeType = item.risk_badge || 'Display Toko'
                    const isRokok = badgeType.toLowerCase().includes('rokok')
                    const val = stokFisik[item.barang_id]
                    const hasInput = val !== undefined && val !== ''
                    const selisih = hasInput ? Number(val) - (item.stok_toko || 0) : null

                    return (
                      <div 
                        key={item.barang_id} 
                        className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-slate-400 font-mono text-[10px]">#{idx + 1}</span>
                              <span className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                                {item.nama_barang}
                              </span>
                              {isRokok && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5" /> Rokok
                                </span>
                              )}
                              {item.is_manually_added && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                  + Ditambahkan
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Harga: {formatRupiah(item.harga_jual || item.harga || 0)}/pcs
                            </div>
                          </div>

                          {item.is_manually_added && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.barang_id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Stock Badges Row */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className="px-2 py-0.5 rounded-lg font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                            Stok Toko (Dihitung): <b>{item.stok_toko ?? 0}</b> pcs
                          </span>
                          <span className="px-2 py-0.5 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Gudang (Ref): <b>{item.stok_gudang ?? 0}</b> pcs
                          </span>
                          <span className="text-[10px] text-slate-400">
                            PKM: {item.pkm || 1}
                          </span>
                        </div>

                        {/* Input Row for Mobile */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-600 dark:text-slate-400 text-xs">
                              Fisik Toko <span className="text-rose-500">*</span>:
                            </span>
                            {hasInput && selisih !== null && (
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                selisih === 0
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200'
                                  : selisih > 0
                                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200'
                                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200'
                              }`}>
                                {selisih === 0 ? '✓ Pas' : selisih > 0 ? `+${selisih}` : selisih}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              required
                              min="0"
                              placeholder="0"
                              className="w-24 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-center font-black focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                              value={stokFisik[item.barang_id] ?? ''}
                              onChange={(e) => setStokFisik({...stokFisik, [item.barang_id]: e.target.value})}
                            />
                            <span className="text-xs text-slate-500 font-semibold">pcs</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <p>
                Hasil hitungan fisik stok toko Anda akan dicatat dan disinkronkan ke stok toko setelah divalidasi oleh Kasir Penerima. Stok gudang tidak ikut dihitung dan tidak terpengaruh oleh serah terima shift ini.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" type="button" onClick={() => navigate('/kasir/serah-terima')}>Batal</Button>
          <Button variant="primary" type="submit" loading={submitting} className="gap-2 px-8 font-bold shadow-md">
            <Send className="w-4 h-4" /> Kirim Serah Terima Shift
          </Button>
        </div>

      </form>
      </>
      )}
    </div>
  )
}

export default BuatSerahTerimaPage
