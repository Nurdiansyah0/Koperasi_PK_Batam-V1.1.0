import { useEffect, useState, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { anggotaService } from '@/services/anggotaService'
import { useAuthStore } from '@/store/authStore'
import { Barang, PaketBelanja } from '@/types'
import { formatRupiah } from '@/lib/utils'
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
  AlertTriangle,
  Sparkles,
  Zap,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface CartItem extends Barang {
  qty: number
}

export function BelanjaPage() {
  const [barangList, setBarangList] = useState<Barang[]>([])
  const [paketList, setPaketList] = useState<PaketBelanja[]>([])
  const [seringDibeli, setSeringDibeli] = useState<PaketBelanja | null>(null)

  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [metodePembayaran, setMetodePembayaran] = useState<'cash' | 'qr' | 'transfer' | 'hutang' | 'ewallet'>('cash')
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()
  
  // Carousel Ref & Auto Scroll State
  const carouselRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)

  // Pagination & Mobile View States
  const [page, setPage] = useState(1)
  const [showMobileCart, setShowMobileCart] = useState(false)
  const ITEMS_PER_PAGE = 8

  const loadData = async () => {
    try {
      const [brg, bundles] = await Promise.all([
        anggotaService.getDataBarang(),
        anggotaService.getPaketBelanja()
      ])
      setBarangList(brg)
      setPaketList(bundles.data)
      setSeringDibeli(bundles.sering_dibeli)
    } catch (e) {
      toast.error('Gagal memuat data katalog')
    }
  }

  useEffect(() => { loadData() }, [])

  // Combine personalized frequent purchase package with standard curated bundles
  const allPackages = useMemo(() => {
    const list = [...paketList]
    if (seringDibeli) {
      list.unshift(seringDibeli)
    }
    return list
  }, [paketList, seringDibeli])

  // Gentle auto-advancing carousel seliweran (runs every 4 seconds when not hovered)
  useEffect(() => {
    if (isPaused || allPackages.length === 0) return

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
  }, [isPaused, allPackages])

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const offset = direction === 'left' ? -310 : 310
      carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  // Derived state: Filtered, Sorted, and Paginated Barang
  const filteredBarang = useMemo(() => {
    let result = barangList.filter(b => b.nama_barang.toLowerCase().includes(search.toLowerCase()))
    
    // Sort logic: items with stok <= 2 bubble up to the top
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

  const addBundleToCart = (bundle: PaketBelanja) => {
    if (!bundle.is_available) {
      toast.error('Beberapa item dalam paket ini sedang habis stok')
      return
    }

    setCart(prev => {
      let updatedCart = [...prev]

      for (const bItem of bundle.items) {
        const foundItem = barangList.find(b => b.barang_id === bItem.barang_id)
        if (!foundItem) continue

        const existingIndex = updatedCart.findIndex(item => item.barang_id === bItem.barang_id)
        const requestedQty = bItem.jumlah || bItem.qty || 1

        if (existingIndex >= 0) {
          const currentQty = updatedCart[existingIndex].qty
          const maxAllowed = Math.min(foundItem.stok, currentQty + requestedQty)
          updatedCart[existingIndex] = { ...updatedCart[existingIndex], qty: maxAllowed }
        } else {
          updatedCart.push({ ...foundItem, qty: requestedQty })
        }
      }

      toast.success(`🎉 ${bundle.nama_paket} masuk ke keranjang!`)
      return updatedCart
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

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Keranjang belanja kosong'); return }

    setLoading(true)
    try {
      const res = await anggotaService.simpanTransaksi({
        metode_pembayaran: metodePembayaran,
        items: cart.map(item => ({ barang_id: item.barang_id, qty: item.qty, harga_satuan: item.harga ?? item.harga_jual ?? 0 })),
        total_harga: total
      })
      if (res.success) {
        toast.success('Pesanan berhasil dibuat! Menunggu konfirmasi kasir.')
        setCart([])
        setMetodePembayaran('cash')
        setShowMobileCart(false)
        loadData()
      } else {
        toast.error(res.error || 'Gagal membuat pesanan')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-7.5rem)] pb-16 md:pb-6">
      
      {/* Main Catalog View Area */}
      <div className={`flex-1 flex flex-col gap-4 overflow-hidden ${showMobileCart ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* 1. Search Bar */}
        <div className="shrink-0">
          <Input 
            icon={<Search className="w-4 h-4 text-slate-400" />}
            placeholder="Cari nama barang di katalog..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        {/* 2. Horizontal Scrolling Smart Bundling & AI Carousel (Seliweran & Scrollable) */}
        {allPackages.length > 0 && !search && (
          <div className="shrink-0 space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight">
                  Paket Belanja Genap & Yang Sering Anda Beli
                </h3>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  Tanpa Pecahan 500
                </span>
              </div>

              {/* Scroll Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollCarousel('left')}
                  className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                  title="Geser ke kiri"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel('right')}
                  className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                  title="Geser ke kanan"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Horizontal Ticker / Carousel Container */}
            <div
              ref={carouselRef}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              className="flex gap-3 overflow-x-auto pb-2 pt-0.5 px-0.5 snap-x snap-mandatory scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {allPackages.map((paket) => {
                const isSeringDibeli = paket.id === 'sering_dibeli'
                return (
                  <div
                    key={paket.id}
                    className={`min-w-[270px] sm:min-w-[295px] max-w-[310px] shrink-0 rounded-3xl p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-2.5 snap-start ${
                      isSeringDibeli
                        ? 'bg-emerald-50/50 dark:bg-zinc-900 border-2 border-emerald-500/70'
                        : 'bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl">{paket.icon}</span>
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight line-clamp-1">{paket.nama_paket}</h4>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              isSeringDibeli
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {paket.tag}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400 shrink-0">
                          {formatRupiah(paket.total_harga)}
                        </span>
                      </div>

                      {/* Item chips */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {paket.items.map((it, idx) => (
                          <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 text-emerald-500" />
                            {it.nama_barang} ({it.jumlah}x)
                          </span>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={() => addBundleToCart(paket)}
                      disabled={!paket.is_available}
                      size="sm"
                      className={`w-full h-8.5 rounded-xl font-bold text-xs shadow-xs transition-transform active:scale-95 ${
                        isSeringDibeli
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-amber-600 hover:bg-amber-500 text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> + Tambah Paket
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 3. Lowered Product Grid (Katalog Semua Produk) */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1 pt-1">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight">
              {search ? `Hasil Pencarian: "${search}"` : 'Semua Barang & Minuman'}
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              {filteredBarang.length} produk
            </span>
          </div>

          <div className={`flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1 ${cart.length > 0 ? 'pb-36 lg:pb-4' : 'pb-6'}`}>
            {paginatedBarang.length === 0 ? (
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
                      : 'border-slate-200/80 bg-white hover:border-blue-500/80 shadow-xs hover:shadow-md dark:border-slate-800 dark:bg-slate-900'
                  }`}
                  onClick={() => addToCart(barang)}
                >
                  <CardContent className="p-3.5 flex flex-col justify-between h-full gap-2 relative">
                    {barang.stok <= 2 && (
                      <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <AlertTriangle className="w-2.5 h-2.5" /> Sisa {barang.stok}
                      </span>
                    )}
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">#{barang.barang_id}</span>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight mt-0.5 line-clamp-2">{barang.nama_barang}</h3>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="font-black text-blue-600 dark:text-blue-400 text-sm sm:text-base">{formatRupiah(barang.harga ?? barang.harga_jual ?? 0)}</span>
                      <button 
                        type="button"
                        className="touch-manipulation p-1.5 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination Container */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2 shrink-0">
              <span className="text-xs text-slate-500">
                Halaman {page} dari {totalPages}
              </span>
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
              Keranjang
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{cart.length} item</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-72 lg:max-h-none">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
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

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase font-bold text-slate-500">Total Tagihan:</span>
              <span className="text-xl font-extrabold text-blue-600">{formatRupiah(total)}</span>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase">Pesanan Atas Nama</span>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{user?.username} (Otomatis)</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Metode Pembayaran</label>
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
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                ))}
              </div>
              {metodePembayaran === 'hutang' && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-800/40 mt-1.5 leading-tight">
                  🛡️ <strong>Jaminan Simpanan Pokok:</strong> Belanja kredit menggunakan pagu jaminan simpanan pokok Anda di koperasi.
                </p>
              )}
            </div>

            <Button 
              className="w-full h-12 text-base font-bold shadow-md mt-2" 
              onClick={handleCheckout} 
              loading={loading} 
              disabled={cart.length === 0}
            >
              Proses Pembayaran
            </Button>
          </div>
        </Card>
      </div>

      {/* Mobile Floating Cart Island */}
      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-[calc(4.2rem+env(safe-area-inset-bottom,0px))] left-4 right-4 p-3.5 bg-slate-900/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl z-40 flex justify-between items-center text-white animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xs shadow-sm">
              {cart.length}
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-300">Total Belanja</p>
              <p className="text-base font-black text-white">{formatRupiah(total)}</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowMobileCart(true)}
            className="h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 shadow-md text-xs"
          >
            Lihat Keranjang
          </Button>
        </div>
      )}
    </div>
  )
}
export default BelanjaPage
