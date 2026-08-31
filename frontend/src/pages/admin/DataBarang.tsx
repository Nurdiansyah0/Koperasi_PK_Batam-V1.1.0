import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '@/services/adminService'
import { Barang } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Plus, Edit, Trash2, ShoppingCart, History, Search, Box } from 'lucide-react'

const ITEMS_PER_PAGE = 12

export function DataBarang() {
  const [barang, setBarang] = useState<Barang[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Barang>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Restock State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)
  const [restockData, setRestockData] = useState({ barang_id: 0, jumlah_tambah: 1, harga_beli_satuan: 0, sumber_dana: 'kas_koperasi', catatan: '' })
  
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
      setFormData(item)
      setIsEditing(true)
    } else {
      setFormData({ nama_barang: '', harga_modal: 0, harga_jual: 0, stok: 0 })
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
        catatan: ''
    })
    setIsRestockModalOpen(true)
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
      } catch (e) {
          toast.error("Gagal memuat riwayat restock")
      } finally {
          setLoadingHistory(false)
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
          const res = await adminService.restockBarang(restockData)
          if(res.success) {
              toast.success('Restock berhasil dicatat!')
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

  const handleDelete = async (id: number) => {
    toast.loading('Menghapus barang...', { id: 'delete' })
    try {
      await adminService.hapusBarang(id)
      toast.success('Barang berhasil dihapus!', { id: 'delete' })
      loadData()
    } catch (error) {
      toast.error('Gagal menghapus barang', { id: 'delete' })
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat data barang...</div>

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Data Barang</h1>
          <p className="text-sm text-slate-500">Kelola stok dan riwayat kulakan Koperasi</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleOpenHistory} variant="secondary" className="flex-1 sm:flex-none h-11">
              <History className="w-4 h-4 mr-2" /> Riwayat Kulakan
            </Button>
            <Button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none h-11 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Tambah Barang
            </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative shrink-0">
        <div className="w-full p-3 border border-slate-200 rounded-xl bg-white text-base font-medium text-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 flex items-center">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
            placeholder="Cari nama barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid Layout (Same as Transaksi) */}
      <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1 pb-4">
        {paginatedBarang.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            Barang tidak ditemukan
          </div>
        ) : (
          paginatedBarang.map(item => (
            <Card 
              key={item.barang_id} 
              className={`group flex flex-col justify-between ${
                item.stok <= 5 
                  ? 'border-amber-400 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-900/10' 
                  : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <CardContent className="p-3.5 flex flex-col justify-between h-full gap-3 relative">
                {item.stok <= 5 && (
                  <span className="absolute top-2 right-2 bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10">
                    Stok Menipis
                  </span>
                )}
                
                {/* Item Info */}
                <div>
                  <div className={`w-full h-24 rounded-xl flex items-center justify-center mb-3 ${
                    item.stok <= 5 ? 'bg-amber-100/50' : 'bg-slate-50 dark:bg-slate-800'
                  }`}>
                    <Box className={`w-8 h-8 ${item.stok <= 5 ? 'text-amber-500' : 'text-slate-400'}`} />
                  </div>
                  <h4 className="font-semibold text-sm line-clamp-2 text-slate-800 dark:text-slate-200 mb-1 leading-snug">{item.nama_barang}</h4>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Harga Jual:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{formatRupiah(item.harga_jual)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Harga Modal:</span>
                      <span className="text-slate-700 dark:text-slate-300">{formatRupiah(item.harga_modal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Stok Tersisa:</span>
                      <span className={`font-bold ${item.stok <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {item.stok} pcs
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <Button variant="secondary" className="flex-1 h-9 text-xs px-0" onClick={() => handleOpenRestock(item)}>
                    <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Restock
                  </Button>
                  <Button variant="outline" className="w-9 h-9 p-0 shrink-0" onClick={() => handleOpenModal(item)}>
                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                  </Button>
                  <Button variant="outline" className="w-9 h-9 p-0 shrink-0 hover:bg-red-50 hover:border-red-200" onClick={() => { if(confirm('Hapus barang ini?')) handleDelete(item.barang_id) }}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <span className="text-sm text-slate-500">Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Sebelumnya
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* MODAL CRUD BARANG */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Barang' : 'Tambah Barang'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nama Barang" value={formData.nama_barang || ''} onChange={e => setFormData({ ...formData, nama_barang: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Harga Modal" type="number" value={formData.harga_modal || ''} onChange={e => setFormData({ ...formData, harga_modal: Number(e.target.value) })} required />
            <Input label="Harga Jual" type="number" value={formData.harga_jual || ''} onChange={e => setFormData({ ...formData, harga_jual: Number(e.target.value) })} required />
          </div>
          <Input label="Stok Awal" type="number" value={formData.stok || ''} onChange={e => setFormData({ ...formData, stok: Number(e.target.value) })} required disabled={isEditing} />
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving}>Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL RESTOCK / KULAKAN */}
      <Modal isOpen={isRestockModalOpen} onClose={() => setIsRestockModalOpen(false)} title="🛒 Restock / Pembelian Barang">
        <form onSubmit={handleRestockSubmit} className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800 mb-4">
                Fitur ini akan menambah stok barang sekaligus mencatat pengeluaran uang Koperasi untuk pembelian (kulakan).
            </div>
          <Input 
            label="Jumlah Tambah (Pcs)" 
            type="number" min="1" 
            value={restockData.jumlah_tambah} 
            onChange={e => setRestockData({ ...restockData, jumlah_tambah: Number(e.target.value) })} 
            required 
          />
          <Input 
            label="Harga Beli Satuan (Rp)" 
            type="number" min="0" 
            value={restockData.harga_beli_satuan} 
            onChange={e => setRestockData({ ...restockData, harga_beli_satuan: Number(e.target.value) })} 
            required 
          />
          <p className="text-xs text-slate-500 -mt-2 mb-2">Harga modal otomatis diperbarui mengikuti harga beli terbaru ini.</p>
          
          <div className="p-3 bg-slate-50 border rounded-lg">
              <span className="text-sm text-slate-500">Total Biaya Kulakan</span>
              <p className="text-lg font-bold text-slate-800">{formatRupiah(restockData.jumlah_tambah * restockData.harga_beli_satuan)}</p>
          </div>

          <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sumber Dana</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={restockData.sumber_dana}
                onChange={e => setRestockData({...restockData, sumber_dana: e.target.value})}
              >
                  <option value="kas_koperasi">Kas Koperasi (Tunai)</option>
                  <option value="rekening_bank">Rekening Bank Koperasi</option>
                  <option value="dana_talangan">Dana Talangan Pribadi</option>
              </select>
          </div>

          <Input 
            label="Catatan (Opsional)" 
            value={restockData.catatan} 
            onChange={e => setRestockData({ ...restockData, catatan: e.target.value })} 
            placeholder="Misal: Beli di Grosir Makmur"
          />
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsRestockModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving}>Proses Restock</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL HISTORY KULAKAN */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Riwayat Kulakan Koperasi">
          {loadingHistory ? (
              <div className="py-8 text-center text-slate-500">Memuat riwayat...</div>
          ) : (
              <div className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900">
                      <span className="text-sm text-red-600 dark:text-red-400">Total Uang Keluar (Expense)</span>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatRupiah(totalPengeluaran)}</p>
                  </div>
                  
                  <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                      {historyData.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">Belum ada riwayat pembelian.</div>
                      ) : historyData.map(h => (
                          <div key={h.restock_id} className="p-3 border rounded-lg bg-white dark:bg-zinc-800">
                              <div className="flex justify-between items-start mb-1">
                                  <span className="font-bold">{h.nama_barang}</span>
                                  <span className="text-xs text-slate-500">{h.tanggal}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">+{h.jumlah_tambah} pcs x {formatRupiah(h.harga_beli_satuan)}</span>
                                  <span className="font-bold text-red-600">-{formatRupiah(h.total_biaya)}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-2 flex justify-between">
                                  <span>Oleh: {h.nama_admin}</span>
                                  <span>Dana: {h.sumber_dana.replace('_', ' ')}</span>
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
