import { useEffect, useState, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { kasirService } from '@/services/kasirService'
import { Barang, Anggota, PaketBelanja } from '@/types'
import { formatRupiah, formatThousands, parseThousands } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import {
  Wallet,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  CreditCard,
  Banknote,
  QrCode,
  ArrowLeft,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  Coins,
  HandCoins,
  CheckCircle2
} from 'lucide-react'

interface CartItem extends Barang {
  qty: number
}

export function TransaksiKasir() {
  const [barangList, setBarangList] = useState<Barang[]>([])
  const [paketList, setPaketList] = useState<PaketBelanja[]>([])
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [metodePembayaran, setMetodePembayaran] = useState<'cash' | 'qr' | 'transfer' | 'hutang' | 'ewallet'>('cash')
  const [uangDiterima, setUangDiterima] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [selectedAnggota, setSelectedAnggota] = useState<number | ''>('')
  const [searchAnggota, setSearchAnggota] = useState('')
  const [showAnggotaDropdown, setShowAnggotaDropdown] = useState(false)
  const [sertakanTarikTunai, setSertakanTarikTunai] = useState(false)
  const [tarikTunaiNominal, setTarikTunaiNominal] = useState<number | ''>('')
  const [tarikTunaiSumber, setTarikTunaiSumber] = useState<'shu' | 'saldo'>('shu')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Carousel Ref & Auto Scroll State
  const carouselRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)

  // Pagination & Mobile View States
  const [page, setPage] = useState(1)
  const [showMobileCart, setShowMobileCart] = useState(false)
  const ITEMS_PER_PAGE = 8

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAnggotaDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedAnggotaObj = useMemo(() => {
    if (!selectedAnggota) return null
    return anggotaList.find(a => a.anggota_id === Number(selectedAnggota)) || null
  }, [selectedAnggota, anggotaList])

  const filteredAnggotaDropdown = useMemo(() => {
    const q = searchAnggota.trim().toLowerCase()
    const isSelectedName = selectedAnggotaObj && (selectedAnggotaObj.nama_lengkap || selectedAnggotaObj.nama || '').toLowerCase() === q

    if (!q || isSelectedName) {
      return anggotaList
    }

    return anggotaList.filter(a => {
      const nama = (a.nama_lengkap || a.nama || '').toLowerCase()
      const uname = (a.username || '').toLowerCase()
      const idStr = String(a.anggota_id)
      return nama.includes(q) || uname.includes(q) || idStr.includes(q)
    })
  }, [anggotaList, searchAnggota, selectedAnggotaObj])

  const loadData = async () => {
    setIsInitialLoad(true)
    try {
      const [brg, ang, bundles] = await Promise.all([
        kasirService.getDataBarang(),
        kasirService.getAllAnggota(),
        kasirService.getPaketBelanja()
      ])

      // Normalize: MySQL decimal dikirim sebagai string ("4000.00") → number
      // Juga pastikan nama_barang selalu string (bukan undefined/null)
      const normalizedBrg = (brg || []).map((b: any) => ({
        ...b,
        nama_barang: b.nama_barang ?? '',
        stok: Number(b.stok ?? 0),
        harga_jual: Number(b.harga_jual ?? 0),
        harga: Number(b.harga ?? b.harga_jual ?? 0),
      }))

      setBarangList(normalizedBrg)
      setAnggotaList(ang || [])
      setPaketList(bundles?.data || [])
    } catch (e) {
      toast.error('Gagal memuat data katalog POS')
    } finally {
      setIsInitialLoad(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Gentle auto-advancing carousel for bundles (runs every 4.2 seconds when not hovered)
  useEffect(() => {
    if (isPaused || paketList.length === 0) return

    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current
        const cardWidth = 310
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' })
        } else {
          carouselRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' })
        }
      }
    }, 4200)

    return () => clearInterval(interval)
  }, [isPaused, paketList])

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const offset = direction === 'left' ? -310 : 310
      carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  // 1-Click Add Entire Bundle to Cart
  const addBundleToCart = (paket: PaketBelanja) => {
    let hasStockIssue = false

    setCart(prev => {
      const newCart = [...prev]

      for (const item of paket.items) {
        const matchedBarang = barangList.find(b => b.barang_id === item.barang_id)
        const availableStock = matchedBarang ? matchedBarang.stok : item.stok_tersedia

        if (availableStock < item.qty) {
          hasStockIssue = true
          toast.error(`Stok ${item.nama_barang} tidak mencukupi untuk paket ini!`)
          return prev
        }

        const existingIndex = newCart.findIndex(c => c.barang_id === item.barang_id)
        if (existingIndex > -1) {
          const currentQty = newCart[existingIndex].qty
          if (currentQty + item.qty > availableStock) {
            hasStockIssue = true
            toast.error(`Stok maksimal untuk ${item.nama_barang} tercapai!`)
            return prev
          }
          newCart[existingIndex] = {
            ...newCart[existingIndex],
            qty: currentQty + item.qty
          }
        } else {
          newCart.push({
            barang_id: item.barang_id,
            nama_barang: item.nama_barang,
            harga: item.harga_satuan,
            harga_jual: item.harga_satuan,
            stok: availableStock,
            qty: item.qty
          })
        }
      }

      return newCart
    })

    if (!hasStockIssue) {
      toast.success(`${paket.nama_paket} berhasil dimasukkan ke keranjang!`)
    }
  }

  // Derived state: Filtered, Sorted, and Paginated Barang
  const filteredBarang = useMemo(() => {
    const q = search.toLowerCase()
    const result = barangList.filter(b =>
      b.stok > 0 &&                                        // guard stale cache
      (b.nama_barang ?? '').toLowerCase().includes(q)     // guard null nama
    )
    
    // Sort: stok <= 2 naik ke atas (warning stok menipis)
    result.sort((a, b) => {
      if (a.stok <= 2 && b.stok > 2) return -1
      if (b.stok <= 2 && a.stok > 2) return 1
      return 0
    })
    
    return result
  }, [barangList, search])

  const totalPages = Math.ceil(filteredBarang.length / ITEMS_PER_PAGE) || 1
  const paginatedBarang = filteredBarang.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Reset page when searching
  useEffect(() => { setPage(1) }, [search])

  const addToCart = (barang: Barang) => {
    if (barang.stok <= 0) { toast.error('Stok barang habis'); return }
    setCart(prev => {
      const existing = prev.find(item => item.barang_id === barang.barang_id)
      if (existing) {
        if (existing.qty >= barang.stok) { toast.error('Stok tidak mencukupi'); return prev }
        return prev.map(item => item.barang_id === barang.barang_id ? { ...item, qty: item.qty + 1 } : item)
      }
      if (barang.stok < 1) { toast.error('Stok habis'); return prev }
      return [...prev, { ...barang, qty: 1 }]
    })
  }

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.barang_id === id) {
        const newQty = item.qty + delta
        if (newQty < 1) return item
        if (newQty > item.stok) { toast.error('Stok maksimal tercapai'); return item }
        return { ...item, qty: newQty }
      }
      return item
    }))
  }

  const removeFromCart = (id: number) => setCart(prev => prev.filter(item => item.barang_id !== id))

  const total = cart.reduce((sum, item) => sum + ((item.harga ?? item.harga_jual ?? 0) * item.qty), 0)

  // Validation Flags for Debt & Saldo Limits
  const isHutangExceeded = useMemo(() => {
    if (metodePembayaran !== 'hutang') return false
    if (!selectedAnggotaObj) return true
    const sisaLimit = selectedAnggotaObj.sisa_limit_hutang ?? 0
    return total > sisaLimit
  }, [metodePembayaran, selectedAnggotaObj, total])

  const isSaldoInsufficient = useMemo(() => {
    if (metodePembayaran !== 'ewallet') return false
    if (!selectedAnggotaObj) return true
    const saldo = selectedAnggotaObj.saldo ?? 0
    return total > saldo
  }, [metodePembayaran, selectedAnggotaObj, total])

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Keranjang belanja kosong'); return }
    if (!selectedAnggota) {
      toast.error('Wajib memilih Anggota Koperasi! Semua transaksi belanja khusus anggota koperasi.')
      setShowAnggotaDropdown(true)
      return
    }
    
    if (sertakanTarikTunai) {
      if ((selectedAnggotaObj?.hutang ?? 0) > 0) {
        toast.error(`Gagal: Anggota memiliki tagihan hutang berjalan (${formatRupiah(selectedAnggotaObj?.hutang ?? 0)}). Wajib lunasi hutang terlebih dahulu!`)
        return
      }
      if (total < 25000) {
        toast.error(`Syarat Tarik Tunai: Minimal belanja saat ini Rp 25.000 (Belanja saat ini: ${formatRupiah(total)})`)
        return
      }
      const nominalTarik = Number(tarikTunaiNominal) || 0
      if (nominalTarik < total) {
        toast.error(`Nominal penarikan minimal harus sebesar nilai belanja (${formatRupiah(total)}) agar belanja dapat dipotong otomatis!`)
        return
      }
      const maxPlafon = Math.min(100000, total * 2)
      if (nominalTarik > maxPlafon) {
        toast.error(`Nominal tarik tunai melebihi batas kuota proporsional (${formatRupiah(maxPlafon)})`)
        return
      }
      const available = tarikTunaiSumber === 'shu' ? (selectedAnggotaObj?.shu ?? 0) : (selectedAnggotaObj?.saldo ?? 0)
      if (nominalTarik > available) {
        toast.error(`Saldo ${tarikTunaiSumber.toUpperCase()} tidak mencukupi (${formatRupiah(available)})`)
        return
      }
    } else {
      if (metodePembayaran === 'hutang') {
        if (!selectedAnggota) { toast.error('Metode hutang wajib memilih anggota koperasi!'); return }
        if (isHutangExceeded) {
          toast.error(`Limit hutang tidak mencukupi! Sisa limit: ${formatRupiah(selectedAnggotaObj?.sisa_limit_hutang ?? 0)}`)
          return
        }
      }
      if (metodePembayaran === 'ewallet') {
        if (!selectedAnggota) { toast.error('Metode Saldo wajib memilih anggota koperasi!'); return }
        if (isSaldoInsufficient) {
          toast.error(`Saldo anggota tidak mencukupi! Saldo: ${formatRupiah(selectedAnggotaObj?.saldo ?? 0)}`)
          return
        }
      }
    }

    setLoading(true)
    try {
      const res = await kasirService.buatTransaksiKasir({
        anggota_id: selectedAnggota ? Number(selectedAnggota) : null,
        metode_pembayaran: sertakanTarikTunai ? 'potong_tarik_tunai' : metodePembayaran,
        items: cart.map(item => ({ barang_id: item.barang_id, jumlah: item.qty, harga_satuan: item.harga ?? item.harga_jual ?? 0 })),
        total,
        sertakan_tarik_tunai: sertakanTarikTunai,
        tarik_tunai_nominal: sertakanTarikTunai && tarikTunaiNominal ? Number(tarikTunaiNominal) : undefined,
        tarik_tunai_sumber: tarikTunaiSumber,
        persetujuan_shu: true,
      })
      if (res.success) {
        if (res.tarik_tunai) {
          toast.success(
            `Transaksi Sukses! Serahkan Kas Bersih sebesar ${formatRupiah(res.tarik_tunai.uang_bersih_diserahkan)} ke pembeli.`,
            { duration: 6000 }
          )
        } else {
          toast.success('Transaksi berhasil! No. #' + (res.transaksi_id || ''))
        }
        setCart([])
        setSelectedAnggota('')
        setSearchAnggota('')
        setUangDiterima('')
        setSertakanTarikTunai(false)
        setTarikTunaiNominal('')
        setMetodePembayaran('cash')
        setShowMobileCart(false)
        loadData()
      } else {
        toast.error(res.error || 'Gagal menyimpan transaksi')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || 'Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-9.5rem)] lg:h-[calc(100vh-7.5rem)] pb-36 md:pb-6">
      
      {/* Container List Barang (Hidden on mobile if Cart is shown) */}
      <div className={`flex-1 flex flex-col gap-4 overflow-hidden ${showMobileCart ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <Input 
            icon={<Search className="w-4 h-4 text-slate-400" />}
            placeholder="Cari nama barang atau scan barcode..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        {/* Horizontal Auto-Advancing Smart Carousel: Paket Belanja Genap */}
        {isInitialLoad && !search ? (
          <div className="h-[90px] mb-3 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl w-full border border-slate-200 dark:border-slate-700" />
        ) : paketList.length > 0 && !search && (
          <div 
            className="relative group/carousel -mx-1 px-1 mb-3"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-zinc-200">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Paket Belanja Genap (1-Klik Tambah)</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold ml-1">
                  Tanpa Uang 500an
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollCarousel('left')}
                  className="p-1 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 active:scale-95 shadow-xs"
                  aria-label="Scroll Kiri"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel('right')}
                  className="p-1 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 active:scale-95 shadow-xs"
                  aria-label="Scroll Kanan"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Row */}
            <div
              ref={carouselRef}
              className="flex gap-3 overflow-x-auto no-scrollbar pb-1.5 scroll-smooth snap-x snap-mandatory"
            >
              {paketList.map((paket) => {
                return (
                  <div
                    key={paket.id}
                    className="shrink-0 w-[275px] sm:w-[300px] snap-start rounded-2xl bg-gradient-to-br from-white to-slate-50/80 dark:from-zinc-900 dark:to-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 p-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{paket.icon || '🛍️'}</span>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                              {paket.nama_paket}
                            </h4>
                            <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 mt-0.5">
                              {paket.tag}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mb-2">
                        {paket.deskripsi}
                      </p>

                      <div className="space-y-1 bg-slate-100/60 dark:bg-zinc-800/50 p-2 rounded-xl text-[10px] text-slate-600 dark:text-zinc-300 mb-2">
                        {paket.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="truncate pr-1">
                              • {item.qty}x {item.nama_barang}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-zinc-200 shrink-0">
                              {formatRupiah(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block -mb-0.5">Total Paket</span>
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                          {formatRupiah(paket.total_harga)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        disabled={!paket.is_available}
                        onClick={() => addBundleToCart(paket)}
                        className={`h-8 px-3 text-xs font-bold gap-1 rounded-xl shadow-xs active:scale-95 ${
                          paket.is_available
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {paket.is_available ? (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Tambah Paket
                          </>
                        ) : (
                          'Stok Habis'
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Product Catalog Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1 pb-4">
          {isInitialLoad ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-[148px] rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-700 flex flex-col justify-between p-3.5">
                <div className="w-full h-20 rounded-xl bg-slate-200 dark:bg-slate-700 mb-2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-1" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            ))
          ) : paginatedBarang.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              Barang tidak ditemukan
            </div>
          ) : (
            paginatedBarang.map(barang => (
              <Card 
                key={barang.barang_id} 
                className={`cursor-pointer transition-all active:scale-[0.98] group flex flex-col justify-between ${
                  barang.stok <= 2 
                    ? 'border-amber-400 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-900/10 hover:shadow-amber-200/50' 
                    : 'border-slate-200/80 bg-white hover:border-blue-500/80 shadow-sm hover:shadow-md dark:border-slate-800 dark:bg-slate-900'
                }`}
                onClick={() => addToCart(barang)}
              >
                <CardContent className="p-3.5 flex flex-col justify-between h-full gap-2 relative">
                  {barang.stok <= 2 && (
                    <span className="absolute top-2 right-2 bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10">
                      Stok Menipis
                    </span>
                  )}
                  <div>
                    <div className={`w-full h-20 rounded-xl flex items-center justify-center mb-2 transition-colors ${
                      barang.stok <= 2 ? 'bg-amber-100/50 dark:bg-amber-900/30' : 'bg-blue-50/50 dark:bg-slate-800 group-hover:bg-blue-100/60'
                    }`}>
                      <ShoppingCart className={`w-7 h-7 ${barang.stok <= 2 ? 'text-amber-500' : 'text-blue-600 dark:text-blue-400'}`} />
                    </div>
                    <h4 className="font-semibold text-xs sm:text-sm line-clamp-2 text-slate-800 dark:text-slate-200">{barang.nama_barang}</h4>
                  </div>
                  <div>
                    <p className="text-blue-600 font-bold text-sm sm:text-base">{formatRupiah(barang.harga ?? barang.harga_jual ?? 0)}</p>
                    <p className={`text-[11px] font-medium ${barang.stok <= 2 ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400'}`}>
                      Stok: {barang.stok} {barang.satuan || 'pcs'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination UI for Catalog */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500">Halaman {page} dari {totalPages}</span>
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
      </div>

      {/* Keranjang & POS Checkout */}
      <div id="keranjang-section" className={`w-full lg:w-96 flex-col gap-4 ${showMobileCart ? 'flex' : 'hidden lg:flex'}`}>
        
        {/* Mobile Back Button inside Cart View */}
        <div className="lg:hidden flex items-center justify-start pb-2">
          <Button variant="ghost" onClick={() => setShowMobileCart(false)} className="gap-2 h-9 px-2 text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
          </Button>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden border-slate-200/90 shadow-md">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold flex items-center justify-between bg-slate-50/50">
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              Keranjang POS
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{cart.length} item</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-60 lg:max-h-none">
            {cart.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Belum ada barang di keranjang
              </div>
            ) : (
              cart.map(item => (
                <div key={item.barang_id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold truncate text-slate-800 dark:text-slate-200">{item.nama_barang}</p>
                    <p className="text-xs text-blue-600 font-bold">{formatRupiah((item.harga ?? item.harga_jual ?? 0) * item.qty)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.barang_id, -1)} className="touch-manipulation p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"><Minus className="w-3.5 h-3.5"/></button>
                    <span className="text-xs font-bold w-6 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.barang_id, 1)} className="touch-manipulation p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"><Plus className="w-3.5 h-3.5"/></button>
                    <button onClick={() => removeFromCart(item.barang_id)} className="touch-manipulation p-1 rounded-lg text-rose-500 hover:bg-rose-50 ml-1"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 space-y-3.5">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase font-bold text-slate-500">Total Tagihan:</span>
              <span className="text-xl font-extrabold text-blue-600">{formatRupiah(total)}</span>
            </div>
            
            {/* Pembeli Selection (Anggota autocomplete) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pembeli (Anggota Koperasi)</label>
              <div className="relative" ref={dropdownRef}>
                <div 
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-base sm:text-xs font-medium text-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 flex items-center cursor-text"
                  onClick={() => setShowAnggotaDropdown(true)}
                >
                  <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none text-xs"
                    placeholder="Ketik nama anggota..."
                    value={searchAnggota}
                    onChange={(e) => {
                      setSearchAnggota(e.target.value)
                      setShowAnggotaDropdown(true)
                      if (selectedAnggota !== '') {
                        setSelectedAnggota('')
                      }
                    }}
                    onFocus={() => setShowAnggotaDropdown(true)}
                  />
                  {(selectedAnggota !== '' || searchAnggota !== '') && (
                     <button 
                       type="button"
                       className="text-slate-400 hover:text-rose-500 p-1 rounded-md"
                       onClick={(e) => {
                         e.stopPropagation()
                         setSelectedAnggota('')
                         setSearchAnggota('')
                         setShowAnggotaDropdown(true)
                       }}
                       title="Hapus / Reset Pilihan"
                     >
                       <X className="w-3.5 h-3.5" />
                     </button>
                  )}
                </div>
                
                {showAnggotaDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 animate-in fade-in-50 duration-150">
                    {filteredAnggotaDropdown.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500 text-center">
                        Anggota dengan kata kunci "{searchAnggota}" tidak ditemukan.
                      </div>
                    ) : (
                      filteredAnggotaDropdown.map(a => {
                        const isSelected = selectedAnggota === a.anggota_id
                        return (
                          <div 
                            key={a.anggota_id} 
                            className={`p-3 text-xs cursor-pointer hover:bg-blue-50/80 dark:hover:bg-blue-900/30 transition-colors ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/30 font-bold' : 'text-slate-700 dark:text-slate-300'
                            }`}
                            onClick={() => {
                              setSelectedAnggota(a.anggota_id)
                              setSearchAnggota(a.nama_lengkap || a.nama || '')
                              setShowAnggotaDropdown(false)
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                                  isSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                }`}>
                                  {(a.nama_lengkap || a.nama || 'A').charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {a.nama_lengkap || a.nama}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    ID: #{a.anggota_id} {a.username ? `• @${a.username}` : ''}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right text-[11px]">
                                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                  Sisa Plafon: {formatRupiah(a.sisa_limit_hutang ?? (400000 - (a.hutang ?? 0)))}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  SHU: {formatRupiah(a.shu ?? 0)}
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 pl-9 border-t border-slate-100 dark:border-slate-800/80 pt-1">
                              <span>Hutang: {formatRupiah(a.hutang ?? 0)}</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                Limit: {formatRupiah(a.limit_hutang ?? 400000)}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Selected Member Financial Overview Card */}
              {selectedAnggotaObj && (
                <div className="mt-2 p-2.5 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{selectedAnggotaObj.nama_lengkap || selectedAnggotaObj.nama}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1 text-[10px]">
                    <div className="bg-white/80 dark:bg-zinc-800 p-1.5 rounded-lg border border-blue-100 dark:border-blue-900/50">
                      <div className="text-slate-400">SHU Belanja</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 truncate">{formatRupiah(selectedAnggotaObj.shu ?? 0)}</div>
                    </div>
                    <div className="bg-white/80 dark:bg-zinc-800 p-1.5 rounded-lg border border-blue-100 dark:border-blue-900/50">
                      <div className="text-slate-400">Hutang Aktif</div>
                      <div className="font-bold text-rose-500 truncate">{formatRupiah(selectedAnggotaObj.hutang ?? 0)}</div>
                    </div>
                    <div className="bg-white/80 dark:bg-zinc-800 p-1.5 rounded-lg border border-blue-100 dark:border-blue-900/50">
                      <div className="text-slate-400">Sisa Plafon</div>
                      <div className={`font-black truncate ${(selectedAnggotaObj.sisa_limit_hutang ?? 0) >= total ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatRupiah(selectedAnggotaObj.sisa_limit_hutang ?? (400000 - (selectedAnggotaObj.hutang ?? 0)))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* OPSI PENARIKAN TUNAI SAAT BELANJA (POTONG BELANJA LANGSUNG) */}
            {selectedAnggotaObj && (
              <div className={`p-3.5 rounded-2xl border transition-all ${
                sertakanTarikTunai 
                  ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/50 shadow-xs' 
                  : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sertakanTarikTunai}
                      onChange={(e) => {
                        setSertakanTarikTunai(e.target.checked)
                        if (e.target.checked && !tarikTunaiNominal) {
                          setTarikTunaiNominal(Math.min(100000, Math.max(50000, total * 2)))
                        }
                      }}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Sertakan Tarik Tunai SHU
                      </span>
                    </div>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Potong Belanja
                  </span>
                </div>

                {sertakanTarikTunai && (
                  <div className="mt-3 space-y-3 pt-2.5 border-t border-emerald-200/50 dark:border-emerald-800/50">
                    {/* Validation Warnings */}
                    {total < 25000 ? (
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Syarat belanja min. <strong>Rp 25.000</strong> (Belanja saat ini: {formatRupiah(total)})</span>
                      </div>
                    ) : (selectedAnggotaObj.hutang ?? 0) > 0 ? (
                      <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-xl text-[11px] text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Anggota punya hutang <strong>{formatRupiah(selectedAnggotaObj.hutang ?? 0)}</strong>. Wajib lunasi terlebih dahulu.</span>
                      </div>
                    ) : (
                      <>
                        {/* Sumber Dana & Input Nominal */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-600 dark:text-zinc-400">Sumber Dana:</span>
                            <div className="flex gap-2 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="sumberTarik"
                                  checked={tarikTunaiSumber === 'shu'}
                                  onChange={() => setTarikTunaiSumber('shu')}
                                  className="text-emerald-600"
                                />
                                <span>SHU ({formatRupiah(selectedAnggotaObj.shu ?? 0)})</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="sumberTarik"
                                  checked={tarikTunaiSumber === 'saldo'}
                                  onChange={() => setTarikTunaiSumber('saldo')}
                                  className="text-emerald-600"
                                />
                                <span>Saldo ({formatRupiah(selectedAnggotaObj.saldo ?? 0)})</span>
                              </label>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-700 dark:text-zinc-300">Nominal Penarikan:</span>
                              <span className="text-[10px] text-slate-400">
                                Plafon: {formatRupiah(Math.min(100000, total * 2))}
                              </span>
                            </div>
                            <input
                              type="number"
                              min={total}
                              max={Math.min(100000, total * 2, (tarikTunaiSumber === 'shu' ? (selectedAnggotaObj.shu ?? 0) : (selectedAnggotaObj.saldo ?? 0)))}
                              placeholder="0"
                              value={tarikTunaiNominal}
                              onChange={(e) => setTarikTunaiNominal(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700 rounded-xl text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            
                            {/* Preset Buttons */}
                            <div className="flex gap-1 pt-1 flex-wrap">
                              {[50000, 75000, 100000].map(amt => (
                                <button
                                  key={amt}
                                  type="button"
                                  disabled={amt > Math.min(100000, total * 2, (tarikTunaiSumber === 'shu' ? (selectedAnggotaObj.shu ?? 0) : (selectedAnggotaObj.saldo ?? 0)))}
                                  onClick={() => setTarikTunaiNominal(amt)}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 disabled:opacity-40"
                                >
                                  {formatRupiah(amt)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Live Net Cash Settlement Box */}
                          {Number(tarikTunaiNominal) > 0 && (
                            <div className="p-3 bg-emerald-500/15 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 space-y-1.5 text-xs">
                              <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                                <span>🪙 Hak {tarikTunaiSumber.toUpperCase()} Ditarik:</span>
                                <span className="font-bold">{formatRupiah(Number(tarikTunaiNominal))}</span>
                              </div>
                              <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                                <span>🛍️ Potong Biaya Belanja:</span>
                                <span className="font-bold text-rose-600">-{formatRupiah(total)}</span>
                              </div>
                              <div className="pt-1.5 border-t border-emerald-300/60 dark:border-emerald-800/60 flex justify-between items-center font-black">
                                <span className="text-emerald-900 dark:text-emerald-200">💵 Kasir Serahkan Kas:</span>
                                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                  {formatRupiah(Math.max(0, Number(tarikTunaiNominal) - total))}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Metode Pembayaran */}
            {!sertakanTarikTunai && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'cash', label: 'Tunai', icon: Banknote },
                    { id: 'ewallet', label: 'Saldo', icon: Wallet },
                    { id: 'qr', label: 'QRIS', icon: QrCode },
                    { id: 'transfer', label: 'Transfer', icon: CreditCard },
                    { id: 'hutang', label: 'Hutang', icon: CreditCard },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetodePembayaran(m.id as any)}
                      className={`touch-manipulation p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        metodePembayaran === m.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <m.icon className="w-3.5 h-3.5" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Real-Time Limit Warning: Plafon Hutang */}
            {metodePembayaran === 'hutang' && (
              <div className="space-y-1.5">
                {!selectedAnggota ? (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Pilih Anggota Koperasi untuk transaksi kredit / hutang.</span>
                  </div>
                ) : isHutangExceeded ? (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-rose-800 dark:text-rose-200">Plafon Hutang Melebihi Batas!</div>
                      <div className="text-[11px] mt-0.5 text-rose-600 dark:text-rose-400">
                        Tagihan <b>{formatRupiah(total)}</b> melebihi sisa limit hutang <b>{formatRupiah(selectedAnggotaObj?.sisa_limit_hutang ?? 0)}</b>.
                        <span className="block font-semibold mt-0.5">Kekurangan: {formatRupiah(total - (selectedAnggotaObj?.sisa_limit_hutang ?? 0))}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span>Sisa Plafon Aman:</span>
                    <span className="font-extrabold">{formatRupiah((selectedAnggotaObj?.sisa_limit_hutang ?? 0) - total)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Real-Time Saldo Warning */}
            {metodePembayaran === 'ewallet' && (
              <div className="space-y-1.5">
                {!selectedAnggota ? (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Pilih Anggota Koperasi untuk pembayaran saldo.</span>
                  </div>
                ) : isSaldoInsufficient && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-rose-800 dark:text-rose-200">Saldo Tidak Mencukupi!</div>
                      <div className="text-[11px] mt-0.5 text-rose-600 dark:text-rose-400">
                        Tagihan <b>{formatRupiah(total)}</b> melebihi saldo anggota <b>{formatRupiah(selectedAnggotaObj?.saldo ?? 0)}</b>.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Smart Cash Kembalian Calculator */}
            {metodePembayaran === 'cash' && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700 dark:text-zinc-300">Uang Diterima:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatThousands(uangDiterima)}
                    onChange={(e) => {
                      const val = parseThousands(e.target.value)
                      setUangDiterima(val > 0 ? val : '')
                    }}
                    placeholder="0"
                    className="w-36 text-right px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
                  <button
                    type="button"
                    onClick={() => setUangDiterima(total)}
                    className="text-[10px] font-bold px-2 py-1 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 active:scale-95"
                  >
                    Uang Pas
                  </button>
                  {[20000, 50000, 100000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setUangDiterima(val)}
                      className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 active:scale-95"
                    >
                      {formatRupiah(val)}
                    </button>
                  ))}
                </div>

                {typeof uangDiterima === 'number' && uangDiterima > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200/50 dark:border-blue-900/50 text-xs">
                    <span className="font-bold text-slate-600 dark:text-zinc-400">Kembalian:</span>
                    <span className={`font-black text-sm ${uangDiterima >= total ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {uangDiterima >= total ? formatRupiah(uangDiterima - total) : `Kurang ${formatRupiah(total - uangDiterima)}`}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Button 
              className={`w-full h-12 text-base font-bold shadow-md mt-2 ${
                sertakanTarikTunai ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' : ''
              }`}
              onClick={handleCheckout} 
              loading={loading} 
              disabled={
                cart.length === 0 ||
                !selectedAnggota ||
                (sertakanTarikTunai && (
                  (selectedAnggotaObj?.hutang ?? 0) > 0 ||
                  total < 25000 ||
                  !tarikTunaiNominal ||
                  Number(tarikTunaiNominal) < total ||
                  Number(tarikTunaiNominal) > Math.min(100000, total * 2, (tarikTunaiSumber === 'shu' ? (selectedAnggotaObj?.shu ?? 0) : (selectedAnggotaObj?.saldo ?? 0)))
                )) ||
                (!sertakanTarikTunai && (
                  (metodePembayaran === 'hutang' && isHutangExceeded) ||
                  (metodePembayaran === 'ewallet' && isSaldoInsufficient)
                ))
              }
            >
              {!selectedAnggota
                ? 'Pilih Anggota Terlebih Dahulu'
                : sertakanTarikTunai
                ? `Bayar & Serahkan Kas ${formatRupiah(Math.max(0, (Number(tarikTunaiNominal) || 0) - total))}`
                : metodePembayaran === 'hutang' && isHutangExceeded
                ? 'Limit Hutang Tidak Cukup'
                : metodePembayaran === 'ewallet' && isSaldoInsufficient
                ? 'Saldo Anggota Tidak Cukup'
                : 'Proses Pembayaran'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Floating Cart Island for Mobile */}
      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-[max(calc(4.5rem+env(safe-area-inset-bottom,0px)),72px)] left-3 right-3 z-30 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="bg-slate-900/95 dark:bg-white/95 backdrop-blur-xl text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700/50 dark:border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                {cart.reduce((sum, item) => sum + item.qty, 0)}
              </div>
              <div>
                <div className="text-[10px] text-slate-300 dark:text-slate-600 font-semibold uppercase tracking-wider">
                  Total Keranjang POS
                </div>
                <div className="text-base font-extrabold tracking-tight">
                  {formatRupiah(total)}
                </div>
              </div>
            </div>
            <Button
              onClick={() => {
                setShowMobileCart(true)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-md active:scale-95"
            >
              Lanjut Bayar &rarr;
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransaksiKasir
