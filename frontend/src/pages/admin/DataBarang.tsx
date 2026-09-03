import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Zap, AlertTriangle, AlertCircle, Calendar,
  CheckSquare, Square, Copy, Check, Printer, ExternalLink
} from 'lucide-react'

const ITEMS_PER_PAGE = 12

interface RefillDraftItem {
  barang_id: number
  nama_barang: string
  stok_toko: number
  pkm: number
  stok_gudang: number
  tgl_kadaluarsa_gudang?: string | null
  jumlah_ambil: number
  is_selected: boolean
}

export function DataBarang() {
  const navigate = useNavigate()
  const [barang, setBarang] = useState<Barang[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'expired' | 'near_expiry' | 'refill'>('all')
  const [page, setPage] = useState(1)

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Barang>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Refill Picking Slip State (Work Order)
  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false)
  const [refillModalTab, setRefillModalTab] = useState<'available' | 'out_of_stock'>('available')
  const [refillItems, setRefillItems] = useState<RefillDraftItem[]>([])
  const [isConfirmingRefill, setIsConfirmingRefill] = useState(false)
  const [copiedSlip, setCopiedSlip] = useState(false)

  // Restock State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)
  const [restockData, setRestockData] = useState({
    barang_id: 0,
    nama_barang: '',
    jumlah_tambah: 1,
    harga_beli_satuan: 0,
    sumber_dana: 'kas_koperasi',
    alokasi: 'gudang' as 'gudang' | 'toko' | 'auto',
    tanggal_kadaluarsa: '',
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

  // Write-Off Expired State
  const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false)
  const [selectedWriteOffBarang, setSelectedWriteOffBarang] = useState<Barang | null>(null)
  const [writeOffForm, setWriteOffForm] = useState({
    lokasi: 'toko' as 'toko' | 'gudang' | 'semua',
    jumlah: 1,
    alasan: 'Barang kadaluarsa / rusak'
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

  // Expiry & Refill Counters
  const expiredCount = useMemo(() => {
    return barang.filter(b => (b.status_kadaluarsa_toko === 'expired' && (b.stok_toko || 0) > 0) || (b.status_kadaluarsa_gudang === 'expired' && (b.stok_gudang || 0) > 0)).length
  }, [barang])

  const nearExpiryCount = useMemo(() => {
    return barang.filter(b => (b.status_kadaluarsa_toko === 'near_expiry' && (b.stok_toko || 0) > 0) || (b.status_kadaluarsa_gudang === 'near_expiry' && (b.stok_gudang || 0) > 0)).length
  }, [barang])

  // All items where display toko < PKM (Total Deficit)
  const allDeficitItems = useMemo(() => {
    return barang.filter(b => {
      const currentToko = b.stok_toko ?? Math.min(b.stok, b.pkm || 1)
      const pkm = b.pkm || 1
      return currentToko < pkm
    })
  }, [barang])

  // Items with deficit AND available warehouse stock (Can be refilled)
  const refillAvailableItems = useMemo(() => {
    return allDeficitItems.filter(b => {
      const gudang = b.stok_gudang ?? Math.max(0, b.stok - (b.pkm || 1))
      return gudang > 0
    })
  }, [allDeficitItems])

  // Items with deficit BUT warehouse stock is empty (Needs distributor restock)
  const outOfStockGudangItems = useMemo(() => {
    return allDeficitItems.filter(b => {
      const gudang = b.stok_gudang ?? Math.max(0, b.stok - (b.pkm || 1))
      return gudang <= 0
    })
  }, [allDeficitItems])

  const filteredBarang = useMemo(() => {
    let result = barang
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(b => b.nama_barang.toLowerCase().includes(q))
    }

    if (filterTab === 'expired') {
      result = result.filter(b => (b.status_kadaluarsa_toko === 'expired' && (b.stok_toko || 0) > 0) || (b.status_kadaluarsa_gudang === 'expired' && (b.stok_gudang || 0) > 0))
    } else if (filterTab === 'near_expiry') {
      result = result.filter(b => (b.status_kadaluarsa_toko === 'near_expiry' && (b.stok_toko || 0) > 0) || (b.status_kadaluarsa_gudang === 'near_expiry' && (b.stok_gudang || 0) > 0))
    } else if (filterTab === 'refill') {
      result = result.filter(b => (b.stok_toko ?? Math.min(b.stok, b.pkm || 1)) < (b.pkm || 1))
    }

    return result
  }, [barang, search, filterTab])

  const totalPages = Math.ceil(filteredBarang.length / ITEMS_PER_PAGE) || 1
  const paginatedBarang = filteredBarang.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => { setPage(1) }, [search, filterTab])

  // Open Picking Slip / Refill Modal
  const handleOpenRefillModal = () => {
    if (allDeficitItems.length === 0) {
      toast.success('Semua display toko sudah optimal terisi sesuai batas PKM 4 hari.', { icon: '✨' })
      return
    }

    const initialList: RefillDraftItem[] = refillAvailableItems.map(item => {
      const currentToko = item.stok_toko ?? Math.min(item.stok, item.pkm || 1)
      const pkm = item.pkm || 1
      const gudang = item.stok_gudang ?? Math.max(0, item.stok - pkm)
      const deficit = pkm - currentToko
      const recommendQty = Math.min(deficit, gudang)

      return {
        barang_id: item.barang_id,
        nama_barang: item.nama_barang,
        stok_toko: currentToko,
        pkm: pkm,
        stok_gudang: gudang,
        tgl_kadaluarsa_gudang: item.tgl_kadaluarsa_gudang,
        jumlah_ambil: recommendQty,
        is_selected: true
      }
    })

    setRefillItems(initialList)
    setRefillModalTab(refillAvailableItems.length > 0 ? 'available' : 'out_of_stock')
    setIsRefillModalOpen(true)
  }

  // Toggle selection in picking list
  const toggleRefillItem = (id: number) => {
    setRefillItems(prev => prev.map(item => 
      item.barang_id === id ? { ...item, is_selected: !item.is_selected } : item
    ))
  }

  // Update physical count taken
  const updateRefillQty = (id: number, qty: number) => {
    setRefillItems(prev => prev.map(item => {
      if (item.barang_id === id) {
        const safeQty = Math.max(1, Math.min(qty, item.stok_gudang))
        return { ...item, jumlah_ambil: safeQty }
      }
      return item
    }))
  }

  // Copy picking slip text to clipboard
  const handleCopyPickingSlip = () => {
    const activeItems = refillItems.filter(i => i.is_selected)
    if (activeItems.length === 0) return

    const lines = [
      `📋 *DAFTAR PICKING REFILL TOKO (KOPERASI PK)*`,
      `Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' })}`,
      `Total Item Siap Refill: ${activeItems.length} SKU`,
      `---------------------------------------`,
      ...activeItems.map((item, idx) => 
        `${idx + 1}. [ ] ${item.nama_barang} ➔ Ambil: *${item.jumlah_ambil} pcs* (Rak: ${item.stok_toko}/${item.pkm}, Sisa Gudang: ${item.stok_gudang})`
      ),
      `---------------------------------------`,
      `*Instruksi:* Ambil barang dari gudang, cek fisik/expired, pajang di rak toko, lalu konfirmasi di sistem.`
    ]

    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedSlip(true)
    toast.success('Daftar picking berhasil disalin ke clipboard!')
    setTimeout(() => setCopiedSlip(false), 3000)
  }

  // Submit confirmed picking list
  const handleConfirmRefill = async () => {
    const selected = refillItems.filter(i => i.is_selected && i.jumlah_ambil > 0)
    if (selected.length === 0) {
      toast.error('Pilih minimal 1 barang untuk dipindahkan ke display toko')
      return
    }

    setIsConfirmingRefill(true)
    try {
      const payload = {
        items: selected.map(i => ({
          barang_id: i.barang_id,
          jumlah: i.jumlah_ambil
        }))
      }
      const res = await adminService.autoRefillDisplay(payload)
      if (res.success) {
        toast.success(res.message || 'Pemindahan stok rak berhasil dikonfirmasi!')
        setIsRefillModalOpen(false)
        loadData()
      } else {
        toast.error(res.message || 'Gagal memproses konfirmasi refill')
      }
    } catch {
      toast.error('Terjadi kesalahan saat memproses konfirmasi')
    } finally {
      setIsConfirmingRefill(false)
    }
  }

  const handleOpenModal = (item?: Barang) => {
    if (item) {
      setFormData({
        ...item,
        harga_modal: Number(item.harga_modal),
        harga_jual: Number(item.harga_jual),
        stok_toko: item.stok_toko ?? Math.min(item.stok, item.pkm || 1),
        stok_gudang: item.stok_gudang ?? Math.max(0, item.stok - (item.pkm || 1)),
        pkm: item.pkm || 1,
        tgl_kadaluarsa_toko: item.tgl_kadaluarsa_toko ? item.tgl_kadaluarsa_toko.split('T')[0] : '',
        tgl_kadaluarsa_gudang: item.tgl_kadaluarsa_gudang ? item.tgl_kadaluarsa_gudang.split('T')[0] : ''
      })
      setIsEditing(true)
    } else {
      setFormData({
        nama_barang: '',
        harga_modal: '' as any,
        harga_jual: '' as any,
        stok: '' as any,
        stok_toko: '' as any,
        stok_gudang: '' as any,
        pkm: 4,
        tgl_kadaluarsa_toko: '',
        tgl_kadaluarsa_gudang: ''
      })
      setIsEditing(false)
    }
    setIsModalOpen(true)
  }

  const handleOpenRestock = (item: Barang) => {
    setRestockData({
      barang_id: item.barang_id,
      nama_barang: item.nama_barang,
      jumlah_tambah: '' as any, // Dikosongkan agar diisi manual oleh user
      harga_beli_satuan: Number(item.harga_modal) || 0,
      sumber_dana: 'kas_koperasi',
      alokasi: 'gudang',
      tanggal_kadaluarsa: item.tgl_kadaluarsa_gudang ? item.tgl_kadaluarsa_gudang.split('T')[0] : '',
      catatan: `Kulakan pengadaan ${item.nama_barang}`
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

  const handleOpenWriteOff = (item: Barang) => {
    setSelectedWriteOffBarang(item)
    const isTokoExpired = item.status_kadaluarsa_toko === 'expired'
    setWriteOffForm({
      lokasi: isTokoExpired ? 'toko' : 'gudang',
      jumlah: isTokoExpired ? (item.stok_toko || 1) : (item.stok_gudang || 1),
      alasan: 'Pemusnahan barang kadaluarsa'
    })
    setIsWriteOffModalOpen(true)
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
    } catch {
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

  const handleWriteOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWriteOffBarang) return
    setSaving(true)
    try {
      const res = await adminService.writeOffExpired({
        barang_id: selectedWriteOffBarang.barang_id,
        lokasi: writeOffForm.lokasi,
        jumlah: Number(writeOffForm.jumlah),
        alasan: writeOffForm.alasan
      })
      if (res.success) {
        toast.success(res.message || 'Pemusnahan stok berhasil dicatat!')
        setIsWriteOffModalOpen(false)
        loadData()
      } else {
        toast.error(res.message || 'Gagal memproses write-off')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Terjadi kesalahan write-off')
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
      Memuat katalog inventori & catatan expired...
    </div>
  )

  const selectedRefillCount = refillItems.filter(i => i.is_selected).length
  const totalRefillPieces = refillItems.filter(i => i.is_selected).reduce((acc, curr) => acc + curr.jumlah_ambil, 0)

  return (
    <div className="space-y-4 sm:space-y-5 flex flex-col h-[calc(100vh-7.5rem)]">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Katalog & Expired Radar</h1>
          <p className="text-xs text-slate-500">Pemisahan Stok Toko & Gudang dengan Lembar Kerja Picking Fisik</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button 
            onClick={handleOpenRefillModal} 
            className="flex-1 sm:flex-none h-10 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Rencanakan Refill ({allDeficitItems.length})
          </Button>
          <Button onClick={handleOpenHistory} variant="secondary" className="flex-1 sm:flex-none h-10 text-xs font-semibold">
            <History className="w-3.5 h-3.5 mr-1.5" /> Riwayat Kulakan
          </Button>
          <Button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Barang
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-2.5 shrink-0">
        {/* Quick Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 ${
              filterTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700'
            }`}
          >
            Semua ({barang.length})
          </button>

          <button
            onClick={() => setFilterTab('expired')}
            className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 flex items-center gap-1 ${
              filterTab === 'expired'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            🔴 Kadaluarsa ({expiredCount})
          </button>

          <button
            onClick={() => setFilterTab('near_expiry')}
            className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 flex items-center gap-1 ${
              filterTab === 'near_expiry'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900'
            }`}
          >
            <Calendar className="w-3 h-3" />
            🟠 Kritis &le;30H ({nearExpiryCount})
          </button>

          <button
            onClick={() => setFilterTab('refill')}
            className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 flex items-center gap-1 ${
              filterTab === 'refill'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
            }`}
          >
            <Zap className="w-3 h-3" />
            ⚡ Butuh Refill ({allDeficitItems.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="w-full p-2.5 sm:p-3 border border-slate-200 rounded-2xl bg-white text-sm font-medium text-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 flex items-center shadow-2xs">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent outline-none placeholder:text-slate-400 text-xs sm:text-sm"
            placeholder="Cari nama barang, rokok, atau sembako..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid Layout Cards */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pr-1 pb-4">
        {paginatedBarang.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm">
            Tidak ada barang pada kategori ini
          </div>
        ) : (
          paginatedBarang.map(item => {
            const stokToko = item.stok_toko ?? Math.min(item.stok, item.pkm || 1)
            const stokGudang = item.stok_gudang ?? Math.max(0, item.stok - (item.pkm || 1))
            const pkmDisplay = item.pkm || 1
            const isTokoUnderPkm = stokToko < pkmDisplay

            const isTokoExpired = item.status_kadaluarsa_toko === 'expired' && stokToko > 0
            const isGudangExpired = item.status_kadaluarsa_gudang === 'expired' && stokGudang > 0
            const isAnyExpired = isTokoExpired || isGudangExpired

            const isTokoNear = item.status_kadaluarsa_toko === 'near_expiry' && stokToko > 0
            const isGudangNear = item.status_kadaluarsa_gudang === 'near_expiry' && stokGudang > 0

            return (
              <Card 
                key={item.barang_id} 
                className={`group flex flex-col justify-between rounded-3xl transition-all ${
                  isAnyExpired
                    ? 'border-rose-400 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20'
                    : isTokoNear || isGudangNear
                    ? 'border-orange-300 dark:border-orange-900 bg-orange-50/20 dark:bg-orange-950/10'
                    : isTokoUnderPkm 
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
                    <div className="flex items-center gap-1">
                      {isAnyExpired && (
                        <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-2.5 h-2.5" /> KADALUARSA
                        </span>
                      )}
                      {!isAnyExpired && (isTokoNear || isGudangNear) && (
                        <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" /> &le;30 Hari
                        </span>
                      )}
                      {isTokoUnderPkm && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          stokGudang > 0 
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' 
                            : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                        }`}>
                          <AlertTriangle className="w-2.5 h-2.5" /> {stokGudang > 0 ? 'Refill' : 'Gudang OOS'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Item Info */}
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-2 leading-snug line-clamp-2">
                      {item.nama_barang}
                    </h4>
                    
                    {/* 2-Tier Stock Breakdown with Expiry Dates */}
                    <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/70 rounded-2xl border border-slate-100 dark:border-zinc-700/60 space-y-2 mb-2.5">
                      {/* Toko Tier */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                            <Store className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Display Toko:
                          </span>
                          <span className={`font-black ${isTokoUnderPkm ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {stokToko} <span className="text-[10px] text-slate-400 font-normal">/ PKM {pkmDisplay}</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pl-4.5">
                          <span>Expired Rak:</span>
                          <span className={`font-bold ${
                            isTokoExpired ? 'text-rose-600' : isTokoNear ? 'text-orange-600' : 'text-slate-600 dark:text-slate-300'
                          }`}>
                            {item.tgl_kadaluarsa_toko ? `${item.tgl_kadaluarsa_toko.split('T')[0]} (${item.hari_kadaluarsa_toko ?? 0}h)` : 'Belum diisi'}
                          </span>
                        </div>
                      </div>

                      {/* Gudang Tier */}
                      <div className="space-y-0.5 pt-1 border-t border-slate-200/50 dark:border-zinc-700/50">
                        <div className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                            <Warehouse className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Cadangan Gudang:
                          </span>
                          <span className={`font-bold ${stokGudang === 0 ? 'text-rose-500 font-black' : 'text-slate-700 dark:text-slate-200'}`}>
                            {stokGudang === 0 ? '0 pcs (Habis)' : `${stokGudang} pcs`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pl-4.5">
                          <span>Expired Gudang:</span>
                          <span className={`font-bold ${
                            isGudangExpired ? 'text-rose-600' : isGudangNear ? 'text-orange-600' : 'text-slate-600 dark:text-slate-300'
                          }`}>
                            {item.tgl_kadaluarsa_gudang ? `${item.tgl_kadaluarsa_gudang.split('T')[0]} (${item.hari_kadaluarsa_gudang ?? 0}h)` : 'Belum diisi'}
                          </span>
                        </div>
                      </div>

                      {/* Total Persediaan */}
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
                    {isAnyExpired ? (
                      <Button 
                        variant="secondary" 
                        className="flex-1 h-8.5 text-xs font-black px-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700" 
                        onClick={() => handleOpenWriteOff(item)}
                        title="Tarik / musnahkan barang kadaluarsa"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Tarik Expired
                      </Button>
                    ) : (
                      <Button 
                        variant="secondary" 
                        className="flex-1 h-8.5 text-xs font-bold px-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 hover:bg-blue-100" 
                        onClick={() => handleOpenMutasi(item)}
                        title="Pindahkan stok antara toko dan gudang"
                      >
                        <ArrowRightLeft className="w-3 h-3 mr-1" /> Pindah Rak
                      </Button>
                    )}
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

      {/* MODAL 2-LANGKAH: LEMBAR KERJA PICKING & REFILL TOKO (DENGAN TABS ERROR HANDLING) */}
      <Modal 
        isOpen={isRefillModalOpen} 
        onClose={() => setIsRefillModalOpen(false)} 
        title="📋 Lembar Kerja Picking & Refill Display Toko"
      >
        <div className="space-y-4">
          {/* Subtabs: Siap Refill vs Gudang Kosong */}
          <div className="flex rounded-2xl bg-slate-100 dark:bg-zinc-800 p-1 text-xs">
            <button
              type="button"
              onClick={() => setRefillModalTab('available')}
              className={`flex-1 py-2 rounded-xl font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                refillModalTab === 'available'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Siap Diambil dari Gudang ({refillAvailableItems.length})
            </button>
            <button
              type="button"
              onClick={() => setRefillModalTab('out_of_stock')}
              className={`flex-1 py-2 rounded-xl font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                refillModalTab === 'out_of_stock'
                  ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Gudang Kosong / Butuh Kulakan ({outOfStockGudangItems.length})
            </button>
          </div>

          {refillModalTab === 'available' ? (
            <>
              {/* Petunjuk Operasional */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <Zap className="w-4 h-4 text-amber-600" /> SOP Pemindahan Fisik Barang:
                </div>
                <p className="text-[11px] leading-relaxed">
                  1. Salin checklist / bawa daftar ini saat staf menuju ke gudang belakang.<br />
                  2. Ambil barang dari kardus gudang sesuai jumlah yang tertera.<br />
                  3. Tata barang di rak display etalase kasir.<br />
                  4. Tekan tombol <strong>"Konfirmasi Selesai Ditata di Rak"</strong> untuk menyinkronkan stok sistem.
                </p>
              </div>

              {refillItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700">
                  Tidak ada barang yang memiliki cadangan di gudang saat ini.
                  <p className="mt-1 text-slate-500">Silakan cek tab <strong>"Gudang Kosong / Butuh Kulakan"</strong> untuk order ke supplier.</p>
                </div>
              ) : (
                <>
                  {/* Quick Action Top Bar */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-2xl text-xs">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      Terpilih: <strong className="text-blue-600 dark:text-blue-400">{selectedRefillCount} SKU</strong> ({totalRefillPieces} pcs fisik)
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCopyPickingSlip}
                      className="h-7 text-xs font-bold gap-1 rounded-xl"
                    >
                      {copiedSlip ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSlip ? 'Tersalin' : 'Salin Checklist'}
                    </Button>
                  </div>

                  {/* Picking Items Table / Checklist */}
                  <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-1">
                    {refillItems.map(item => (
                      <div 
                        key={item.barang_id}
                        className={`p-3 rounded-2xl border text-xs transition-all ${
                          item.is_selected 
                            ? 'border-blue-300 dark:border-blue-900 bg-white dark:bg-zinc-800 shadow-2xs' 
                            : 'border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button 
                            type="button"
                            onClick={() => toggleRefillItem(item.barang_id)}
                            className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0"
                          >
                            {item.is_selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                          </button>

                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                              <span className="font-extrabold text-slate-900 dark:text-white leading-tight">
                                {item.nama_barang}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                              <span>Rak Toko: <strong className="text-amber-600">{item.stok_toko} / PKM {item.pkm}</strong></span>
                              <span>Gudang: <strong className="text-slate-700 dark:text-slate-300">{item.stok_gudang} pcs</strong></span>
                              {item.tgl_kadaluarsa_gudang && (
                                <span className="text-[10px] text-orange-600 font-semibold">
                                  Exp: {item.tgl_kadaluarsa_gudang.split('T')[0]}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quantity Input */}
                          <div className="shrink-0 text-right">
                            <span className="text-[10px] text-slate-400 block mb-0.5">Ambil Fisik:</span>
                            <input 
                              type="number" 
                              min="1" 
                              max={item.stok_gudang}
                              value={item.jumlah_ambil}
                              disabled={!item.is_selected}
                              onChange={e => updateRefillQty(item.barang_id, Number(e.target.value))}
                              className="w-16 px-2 py-1 border rounded-xl text-center text-xs font-black bg-slate-50 dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Footer */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <Button type="button" variant="ghost" onClick={() => setIsRefillModalOpen(false)}>
                      Batal
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleConfirmRefill} 
                      loading={isConfirmingRefill}
                      disabled={selectedRefillCount === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4"
                    >
                      <Check className="w-4 h-4 mr-1.5" /> Konfirmasi Selesai Ditata ({totalRefillPieces} pcs)
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            /* TAB 2: GUDANG KOSONG / BUTUH KULAKAN DISTRIBUTOR */
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200">
                Barang-barang di bawah ini stok display tokonya defisit (&lt; PKM) namun <strong>stok cadangan gudang habis (0 pcs)</strong>. Silakan klik tombol <strong>"Kulakan"</strong> untuk restock satuan, atau buka <strong>Rencana Belanja PKM</strong> untuk pengadaan faktur massal.
              </div>

              {/* Shortcut Banner to /admin/pkm */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-blue-900 dark:text-blue-200 block">Butuh belanja banyak barang sekaligus?</span>
                  <span className="text-[11px] text-blue-700 dark:text-blue-300">Buka Rencana Belanja PKM untuk cetak struk A4 / WA & catat faktur nota grosir.</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsRefillModalOpen(false)
                    navigate('/admin/pkm')
                  }}
                  className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shrink-0 gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Buka Rencana Belanja PKM
                </Button>
              </div>

              <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
                {outOfStockGudangItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Tidak ada barang defisit yang gudangnya kosong. Semua cadangan gudang aman!
                  </div>
                ) : (
                  outOfStockGudangItems.map(item => {
                    const currentToko = item.stok_toko ?? Math.min(item.stok, item.pkm || 1)
                    const pkm = item.pkm || 1
                    return (
                      <div 
                        key={item.barang_id}
                        className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-zinc-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <h5 className="font-extrabold text-slate-900 dark:text-white mb-0.5">{item.nama_barang}</h5>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span>Display Toko: <strong className="text-amber-600">{currentToko} / PKM {pkm}</strong></span>
                            <span>Gudang: <strong className="text-rose-600 font-bold">0 pcs (Kosong)</strong></span>
                          </div>
                        </div>

                        <Button 
                          size="sm"
                          onClick={() => {
                            setIsRefillModalOpen(false)
                            handleOpenRestock(item)
                          }}
                          className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shrink-0"
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" /> Kulakan Satuan
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="flex justify-end pt-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsRefillModalOpen(false)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL TARIK / WRITE-OFF BARANG EXPIRED */}
      <Modal isOpen={isWriteOffModalOpen} onClose={() => setIsWriteOffModalOpen(false)} title="🔴 Pemusnahan / Tarik Barang Expired">
        {selectedWriteOffBarang && (
          <form onSubmit={handleWriteOffSubmit} className="space-y-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200">
              Barang yang kadaluarsa akan dipotong langsung dari sistem agar tidak terjual di kasir POS dan dicatat sebagai kerugian penyusutan (*Waste*).
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">{selectedWriteOffBarang.nama_barang}</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Stok Display Toko:</span>
                  <span className="font-bold text-blue-600">{selectedWriteOffBarang.stok_toko ?? 0} pcs</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Stok Cadangan Gudang:</span>
                  <span className="font-bold text-amber-600">{selectedWriteOffBarang.stok_gudang ?? 0} pcs</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Lokasi Penarikan</label>
              <select 
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white dark:bg-zinc-800 font-semibold focus:ring-2 focus:ring-rose-500 outline-none"
                value={writeOffForm.lokasi}
                onChange={e => setWriteOffForm({...writeOffForm, lokasi: e.target.value as any})}
              >
                <option value="toko">🏪 Tarik dari Display Toko</option>
                <option value="gudang">📦 Tarik dari Cadangan Gudang</option>
                <option value="semua">💥 Tarik dari Seluruh Lokasi (Toko + Gudang)</option>
              </select>
            </div>

            <Input 
              label="Jumlah yang Ditarik (Pcs)" 
              type="number" min="1" 
              value={writeOffForm.jumlah ?? ''} 
              onChange={e => setWriteOffForm({ ...writeOffForm, jumlah: e.target.value === '' ? '' as any : Math.max(1, Number(e.target.value)) })} 
              required 
            />

            <Input 
              label="Alasan Penarikan / Keterangan" 
              value={writeOffForm.alasan} 
              onChange={e => setWriteOffForm({ ...writeOffForm, alasan: e.target.value })} 
              placeholder="Contoh: Melewati tanggal kadaluarsa kemasan"
              required
            />

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsWriteOffModalOpen(false)}>Batal</Button>
              <Button type="submit" loading={saving} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">Eksekusi Penarikan</Button>
            </div>
          </form>
        )}
      </Modal>

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
              value={mutasiForm.jumlah ?? ''} 
              onChange={e => setMutasiForm({ ...mutasiForm, jumlah: e.target.value === '' ? '' as any : Math.max(1, Number(e.target.value)) })} 
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Barang & Expired' : 'Tambah Barang & Expired'}>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input label="Nama Barang" value={formData.nama_barang || ''} onChange={e => setFormData({ ...formData, nama_barang: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <InputRupiah label="Harga Modal" value={formData.harga_modal ?? ''} onChange={val => setFormData({ ...formData, harga_modal: val === '' ? '' as any : Number(val) })} required />
            <InputRupiah label="Harga Jual" value={formData.harga_jual ?? ''} onChange={val => setFormData({ ...formData, harga_jual: val === '' ? '' as any : Number(val) })} required />
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Stok Display</label>
              <input
                type="number" min="0"
                className="w-full px-2.5 py-1.5 border rounded-xl text-xs bg-white dark:bg-zinc-900 font-bold"
                value={formData.stok_toko ?? ''}
                onChange={e => setFormData({ ...formData, stok_toko: e.target.value === '' ? '' as any : Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Stok Gudang</label>
              <input
                type="number" min="0"
                className="w-full px-2.5 py-1.5 border rounded-xl text-xs bg-white dark:bg-zinc-900 font-bold"
                value={formData.stok_gudang ?? ''}
                onChange={e => setFormData({ ...formData, stok_gudang: e.target.value === '' ? '' as any : Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Batas Pajang Rak (4H)</label>
              <input
                type="number" min="1"
                className="w-full px-2.5 py-1.5 border rounded-xl text-xs bg-white dark:bg-zinc-900 font-bold"
                value={formData.pkm ?? ''}
                onChange={e => setFormData({ ...formData, pkm: e.target.value === '' ? '' as any : Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Expired Display Toko</label>
              <input
                type="date"
                className="w-full px-2.5 py-1.5 border rounded-xl text-xs bg-white dark:bg-zinc-900 font-semibold"
                value={formData.tgl_kadaluarsa_toko || ''}
                onChange={e => setFormData({ ...formData, tgl_kadaluarsa_toko: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Expired Cadangan Gudang</label>
              <input
                type="date"
                className="w-full px-2.5 py-1.5 border rounded-xl text-xs bg-white dark:bg-zinc-900 font-semibold"
                value={formData.tgl_kadaluarsa_gudang || ''}
                onChange={e => setFormData({ ...formData, tgl_kadaluarsa_gudang: e.target.value })}
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
      <Modal isOpen={isRestockModalOpen} onClose={() => setIsRestockModalOpen(false)} title={`🛒 Restock & Tanggal Kadaluarsa: ${restockData.nama_barang || ''}`}>
        <form onSubmit={handleRestockSubmit} className="space-y-3.5">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
            Penambahan stok akan otomatis memperbarui harga modal dasar, mencatat buku pengeluaran kas, dan menyinkronkan tanggal expired batch baru.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Jumlah Tambah (Pcs)" 
              type="number" min="1" 
              placeholder="0"
              value={restockData.jumlah_tambah ?? ''} 
              onChange={e => setRestockData({ ...restockData, jumlah_tambah: e.target.value === '' ? '' as any : Number(e.target.value) })} 
              required 
            />
            <InputRupiah 
              label="Harga Beli Satuan" 
              value={restockData.harga_beli_satuan ?? ''} 
              onChange={val => setRestockData({ ...restockData, harga_beli_satuan: val === '' ? '' as any : Number(val) })} 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Alokasi Stok Masuk</label>
              <select 
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white dark:bg-zinc-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                value={restockData.alokasi}
                onChange={e => setRestockData({...restockData, alokasi: e.target.value as any})}
              >
                <option value="gudang">📦 Masuk ke Gudang</option>
                <option value="toko">🏪 Langsung ke Display Toko</option>
                <option value="auto">⚡ Isi Rak Dulu (Sisa Gudang)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Kadaluarsa Batch</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white dark:bg-zinc-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                value={restockData.tanggal_kadaluarsa}
                onChange={e => setRestockData({...restockData, tanggal_kadaluarsa: e.target.value})}
              />
            </div>
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
            placeholder="Contoh: Faktur Grosir PT. Surya Makmur Batam"
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
                  {h.tanggal_kadaluarsa && (
                    <div className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-1 font-semibold">
                      <Calendar className="w-2.5 h-2.5" /> Expired: {h.tanggal_kadaluarsa}
                    </div>
                  )}
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
