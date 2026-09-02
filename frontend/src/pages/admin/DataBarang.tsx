import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '@/services/adminService'
import { Barang } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { InputRupiah } from '@/components/ui/InputRupiah'
import {
  Plus, Edit, Trash2, ShoppingCart, History,
  Search, Box, Store, Warehouse, ArrowRightLeft,
  Zap, RefreshCw, AlertTriangle, Layers
} from 'lucide-react'

const ITEMS_PER_PAGE = 12

export function DataBarang() {
  const [barang, setBarang] = useState<Barang[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isAutoRefilling, setIsAutoRefilling] = useState(false)

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Barang>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Restock State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)
  const [restockData, setRestockData] = useState({
    barang_id: 0,
    jumlah_tambah: 1,
    harga_beli_satuan: 0,
    sumber_dana: 'kas_koperasi',
    alokasi: 'gudang' as 'gudang' | 'toko' | 'auto',
    catatan: ''
  })

  // Mutasi Stok State (Pindah Rak Toko <-> Gudang)
  const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false)
  const [selectedMutasiBarang, setSelectedMutasiBarang] = useState<Barang | null>(null)
  const [mutasiForm, setMutasiForm] = useState({
    tipe: 'gudang_ke_toko' as 'gudang_ke_toko' | 'toko_ke_gudang',
    jumlah: 1,
    catatan: ''
  })
  
  // History State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [totalPengeluaran, setTotalPengeluaran] = useState(0)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await adminService.getBarang()
      setBarang(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredBarang = useMemo(() => {
    let result = barang
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(b => b.nama_barang.toLowerCase().includes(q))
    }
    return result
  }, [barang, search])

  const totalPages = Math.ceil(filteredBarang.length / ITEMS_PER_PAGE) || 1
  const paginatedBarang = filteredBarang.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => { setPage(1) }, [search])

  const handleOpenModal = (item?: Barang) => {
    if (item) {
      setFormData({
        ...item,
        stok_toko: item.stok_toko ?? Math.min(item.stok, item.pkm || 1),
        stok_gudang: item.stok_gudang ?? Math.max(0, item.stok - (item.pkm || 1)),
        pkm: item.pkm || 1
      })
      setIsEditing(true)
    } else {
      setFormData({ nama_barang: '', harga_modal: 0, harga_jual: 0, stok: 0, stok_toko: 0, stok_gudang: 0, pkm: 4 })
      setIsEditing(false)
    }
    setIsModalOpen(true)
  }

  const handleOpenRestock = (item: Barang) => {
    setRestockData({
      barang_id: item.barang_id,
      jumlah_tambah: 1,
      harga_beli_satuan: item.harga_modal || 0,
      sumber_dana: 'kas_koperasi',
      alokasi: 'gudang',
      catatan: ''
    })
    setIsRestockModalOpen(true)
  }

  const handleOpenMutasi = (item: Barang) => {
    setSelectedMutasiBarang(item)
    setMutasiForm({
      tipe: (item.stok_gudang ?? 0) > 0 ? 'gudang_ke_toko' : 'toko_ke_gudang',
      jumlah: 1,
      catatan: ''
    })
    setIsMutasiModalOpen(true)
  }

  const handleOpenHistory = async () => {
    setIsHistoryModalOpen(true)
    setLoadingHistory(true)
    try {
      const res = await adminService.getRiwayatRestock()
      if(res.success) {
        setHistoryData(res.data)
        setTotalPengeluaran(res.total_pengeluaran)
      }
    } catch {
      toast.error("Gagal memuat riwayat restock")
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleAutoRefill = async () => {
    if (isAutoRefilling) return
    setIsAutoRefilling(true)
    try {
      const res = await adminService.autoRefillDisplay()
      if (res.success) {
        toast.success(res.message || 'Auto-Refill display toko berhasil!')
        loadData()
      } else {
        toast.error(res.message || 'Gagal melakukan auto-refill')
      }
    } catch {
      toast.error('Terjadi kesalahan saat memproses auto-refill')
    } finally {
      setIsAutoRefilling(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEditing && formData.barang_id) {
        await adminService.updateBarang(formData as any)
      } else {
        await adminService.tambahBarang(formData as any)
      }
      toast.success(isEditing ? 'Barang berhasil diupdate!' : 'Barang berhasil ditambahkan!')
      setIsModalOpen(false)
      loadData()
    } catch (error: any) {
      toast.error('Gagal menyimpan barang')
    } finally {
      setSaving(false)
    }
  }

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await adminService.restockBarang(restockData as any)
      if(res.success) {
        toast.success(res.message || 'Restock berhasil dicatat!')
        setIsRestockModalOpen(false)
        loadData()
      } else {
        toast.error(res.message || 'Gagal restock')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Terjadi kesalahan saat restock')
    } finally {
      setSaving(false)
    }
  }

  const handleMutasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMutasiBarang) return
    setSaving(true)
    try {
      const res = await adminService.mutasiStok({
        barang_id: selectedMutasiBarang.barang_id,
        tipe: mutasiForm.tipe,
        jumlah: Number(mutasiForm.jumlah),
        catatan: mutasiForm.catatan
      })
      if (res.success) {
        toast.success(res.message || 'Mutasi stok berhasil!')
        setIsMutasiModalOpen(false)
        loadData()
      } else {
        toast.error(res.message || 'Gagal mutasi stok')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal memproses mutasi stok')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    toast.loading('Menghapus barang...', { id: 'delete' })
    try {
      await adminService.hapusBarang(id)
      toast.success('Barang berhasil dihapus!', { id: 'delete' })
      loadData()
    } catch {
      toast.error('Gagal menghapus barang', { id: 'delete' })
    }
  }

  if (loading) return (
    <div className="p-8 text-center text-slate-500">
      <div className="w-8 h-8 mx-auto mb-2 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      Memuat katalog inventori 2-Tier...
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-5 flex flex-col h-[calc(100vh-7.5rem)]">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Katalog Inventori 2-Tier</h1>
          <p className="text-xs text-slate-500">Pemisahan Stok Etalase Toko vs Stok Gudang Cadangan</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button 
            onClick={handleAutoRefill} 
            disabled={isAutoRefilling}
            className="flex-1 sm:flex-none h-10 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs"
          >
            <Zap className={`w-3.5 h-3.5 mr-1.5 ${isAutoRefilling ? 'animate-spin' : ''}`} />
            Auto-Refill Toko
          </Button>
          <Button onClick={handleOpenHistory} variant="secondary" className="flex-1 sm:flex-none h-10 text-xs font-semibold">
            <History className="w-3.5 h-3.5 mr-1.5" /> Riwayat Kulakan
          </Button>
          <Button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Barang
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative shrink-0">
        <div className="w-full p-2.5 sm:p-3 border border-slate-200 rounded-2xl bg-white text-sm font-medium text-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 flex items-center shadow-2xs">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent outline-none placeholder:text-slate-400 text-xs sm:text-sm"
            placeholder="Cari nama barang atau rokok..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid Layout Cards */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pr-1 pb-4">
        {paginatedBarang.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm">
            Barang tidak ditemukan
          </div>
        ) : (
          paginatedBarang.map(item => {
            const stokToko = item.stok_toko ?? Math.min(item.stok, item.pkm || 1)
            const stokGudang = item.stok_gudang ?? Math.max(0, item.stok - (item.pkm || 1))
            const pkmDisplay = item.pkm || 1
            const isTokoUnderPkm = stokToko < pkmDisplay

            return (
              <Card 
                key={item.barang_id} 
                className={`group flex flex-col justify-between rounded-3xl transition-all ${
                  isTokoUnderPkm 
                    ? 'border-amber-300 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/10' 
                    : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full gap-3 relative">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      ID: #{item.barang_id}
                    </span>
                    {isTokoUnderPkm && (
                      <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> Butuh Refill
                      </span>
                    )}
                  </div>
                  
                  {/* Item Info */}
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-2 leading-snug line-clamp-2">
                      {item.nama_barang}
                    </h4>
                    
                    {/* 2-Tier Stock Breakdown */}
                    <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/70 rounded-2xl border border-slate-100 dark:border-zinc-700/60 space-y-1.5 mb-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                          <Store className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Display Toko:
                        </span>
                        <span className={`font-black ${isTokoUnderPkm ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {stokToko} <span className="text-[10px] text-slate-400 font-normal">/ PKM {pkmDisplay}</span>
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                          <Warehouse className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Cadangan Gudang:
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {stokGudang} pcs
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/60 dark:border-zinc-700/60 text-xs">
                        <span className="text-[11px] font-semibold text-slate-400">Total Persediaan:</span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {item.stok} pcs
                        </span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex justify-between items-center text-xs px-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Harga Jual POS</span>
                        <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{formatRupiah(item.harga_jual)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Harga Modal</span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{formatRupiah(item.harga_modal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <div className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
                    <Button 
                      variant="secondary" 
                      className="flex-1 h-8.5 text-xs font-bold px-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 hover:bg-blue-100" 
                      onClick={() => handleOpenMutasi(item)}
                      title="Pindahkan stok antara toko dan gudang"
                    >
                      <ArrowRightLeft className="w-3 h-3 mr-1" /> Pindah Rak
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="flex-1 h-8.5 text-xs font-bold px-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200" 
                      onClick={() => handleOpenRestock(item)}
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" /> Restock
                    </Button>
                    <Button variant="outline" className="w-8.5 h-8.5 p-0 shrink-0 rounded-xl" onClick={() => handleOpenModal(item)}>
                      <Edit className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    </Button>
                    <Button variant="outline" className="w-8.5 h-8.5 p-0 shrink-0 rounded-xl hover:bg-red-50 hover:border-red-200" onClick={() => { if(confirm('Hapus barang ini dari katalog?')) handleDelete(item.barang_id) }}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <span className="text-xs text-slate-500">Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs"
            >
              Sebelumnya
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* MODAL PINDAH RAK (MUTASI STOK TOKO <-> GUDANG) */}
      <Modal isOpen={isMutasiModalOpen} onClose={() => setIsMutasiModalOpen(false)} title="⇄ Mutasi Stok Internal (Pindah Rak)">
        {selectedMutasiBarang && (
          <form onSubmit={handleMutasiSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{selectedMutasiBarang.nama_barang}</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  <span className="block text-[10px] font-semibold text-blue-500">Stok Display Toko</span>
                  <span className="text-base font-black">{selectedMutasiBarang.stok_toko ?? 0} pcs</span>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                  <span className="block text-[10px] font-semibold text-amber-500">Stok Cadangan Gudang</span>
                  <span className="text-base font-black">{selectedMutasiBarang.stok_gudang ?? 0} pcs</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Arah Pemindahan</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMutasiForm({ ...mutasiForm, tipe: 'gudang_ke_toko' })}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    mutasiForm.tipe === 'gudang_ke_toko'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-zinc-800 border-slate-200 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>Gudang ➔ Toko (Refill)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMutasiForm({ ...mutasiForm, tipe: 'toko_ke_gudang' })}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    mutasiForm.tipe === 'toko_ke_gudang'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white dark:bg-zinc-800 border-slate-200 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Warehouse className="w-4 h-4" />
                  <span>Toko ➔ Gudang (Simpan)</span>
                </button>
              </div>
            </div>

            <Input 
              label="Jumlah yang Dipindahkan (Pcs)" 
              type="number" min="1" 
              max={mutasiForm.tipe === 'gudang_ke_toko' ? (selectedMutasiBarang.stok_gudang ?? 0) : (selectedMutasiBarang.stok_toko ?? 0)}
              value={mutasiForm.jumlah} 
              onChange={e => setMutasiForm({ ...mutasiForm, jumlah: Math.max(1, Number(e.target.value)) })} 
              required 
            />

            <Input 
              label="Catatan Mutasi (Opsional)" 
              value={mutasiForm.catatan} 
              onChange={e => setMutasiForm({ ...mutasiForm, catatan: e.target.value })} 
              placeholder="Contoh: Refill etalase rokok shift pagi"
            />

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsMutasiModalOpen(false)}>Batal</Button>
              <Button type="submit" loading={saving} className="bg-blue-600 text-white font-bold">Eksekusi Mutasi</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL CRUD BARANG */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Barang 2-Tier' : 'Tambah Barang 2-Tier'}>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input label="Nama Barang" value={formData.nama_barang || ''} onChange={e => setFormData({ ...formData, nama_barang: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <InputRupiah label="Harga Modal" value={formData.harga_modal || ''} onChange={val => setFormData({ ...formData, harga_modal: Number(val) })} required />
            <InputRupiah label="Harga Jual" value={formData.harga_jual || ''} onChange={val => setFormData({ ...formData, harga_jual: Number(val) })} required />
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Stok Display</label>
              <input
                type="number" min="0"
                className="w-full px-2.5 py-1.5 border rounded-xl text-xs bg-white dark:bg-zinc-900 font-bold"
                value={formData.stok_toko ?? 0}
                onChange={e => setFormData({ ...formData, stok_toko: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Stok Gudang</label>
              <input
                type="number" min="0"
                className="w-full px-2.5 py-1.5 border rounded-xl text-xs bg-white dark:bg-zinc-900 font-bold"
                value={formData.stok_gudang ?? 0}
                onChange={e => setFormData({ ...formData, stok_gudang: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Batas PKM (4H)</label>
              <input
                type="number" min="1"
                className="w-full px-2.5 py-1.5 border rounded-xl text-xs bg-white dark:bg-zinc-900 font-bold"
                value={formData.pkm ?? 4}
                onChange={e => setFormData({ ...formData, pkm: Number(e.target.value) })}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving} className="bg-blue-600 text-white font-bold">Simpan Katalog</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL RESTOCK / KULAKAN */}
      <Modal isOpen={isRestockModalOpen} onClose={() => setIsRestockModalOpen(false)} title="🛒 Restock / Pembelian Pengadaan">
        <form onSubmit={handleRestockSubmit} className="space-y-3.5">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
            Penambahan stok akan otomatis memperbarui harga modal dasar dan mencatat buku pengeluaran kas.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Jumlah Tambah (Pcs)" 
              type="number" min="1" 
              value={restockData.jumlah_tambah} 
              onChange={e => setRestockData({ ...restockData, jumlah_tambah: Number(e.target.value) })} 
              required 
            />
            <InputRupiah 
              label="Harga Beli Satuan" 
              value={restockData.harga_beli_satuan} 
              onChange={val => setRestockData({ ...restockData, harga_beli_satuan: Number(val) })} 
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Alokasi Stok Baru Masuk</label>
            <select 
              className="w-full px-3 py-2 border rounded-xl text-xs bg-white dark:bg-zinc-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              value={restockData.alokasi}
              onChange={e => setRestockData({...restockData, alokasi: e.target.value as any})}
            >
              <option value="gudang">📦 Masuk ke Gudang Cadangan (Direkomendasikan)</option>
              <option value="toko">🏪 Langsung ke Display Toko / Etalase</option>
              <option value="auto">⚡ Auto-Refill (Penuhi Toko sesuai PKM, sisanya ke Gudang)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Sumber Dana Pembelian</label>
            <select 
              className="w-full px-3 py-2 border rounded-xl text-xs bg-white dark:bg-zinc-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              value={restockData.sumber_dana}
              onChange={e => setRestockData({...restockData, sumber_dana: e.target.value})}
            >
              <option value="kas_koperasi">Kas Tunai Koperasi</option>
              <option value="rekening_bank">Rekening Bank Koperasi</option>
              <option value="dana_talangan">Dana Talangan Pengurus</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-zinc-800 border rounded-2xl flex justify-between items-center">
            <span className="text-xs text-slate-500">Total Biaya Pengadaan:</span>
            <p className="text-base font-black text-rose-600">{formatRupiah(restockData.jumlah_tambah * restockData.harga_beli_satuan)}</p>
          </div>

          <Input 
            label="Catatan Pembelian (Opsional)" 
            value={restockData.catatan} 
            onChange={e => setRestockData({ ...restockData, catatan: e.target.value })} 
            placeholder="Contoh: Grosir PT. Surya Makmur Batam"
          />
          
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsRestockModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving} className="bg-blue-600 text-white font-bold">Proses Restock Masuk</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL HISTORY KULAKAN */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Riwayat Kulakan & Pengadaan Toko">
        {loadingHistory ? (
          <div className="py-8 text-center text-slate-500">Memuat riwayat pengeluaran...</div>
        ) : (
          <div className="space-y-3.5">
            <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-100 dark:border-rose-900">
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Total Pengeluaran Kulakan Bulan Ini</span>
              <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-0.5">{formatRupiah(totalPengeluaran)}</p>
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {historyData.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">Belum ada riwayat pembelian.</div>
              ) : historyData.map(h => (
                <div key={h.restock_id} className="p-3 border border-slate-100 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-800 text-xs space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-slate-900 dark:text-white">{h.nama_barang}</span>
                    <span className="text-[10px] text-slate-400">{h.tanggal}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>+{h.jumlah_tambah} pcs @ {formatRupiah(h.harga_beli_satuan)}</span>
                    <span className="font-black text-rose-600">-{formatRupiah(h.total_biaya)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-zinc-700 flex justify-between">
                    <span>Admin: {h.nama_admin}</span>
                    <span className="capitalize">{h.sumber_dana.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default DataBarang
