import { useEffect, useState, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { kasirService } from '@/services/kasirService'
import { Barang, Anggota } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Wallet, ShoppingCart, Plus, Minus, Trash2, Search, CreditCard, Banknote, QrCode, ArrowLeft, X } from 'lucide-react'

interface CartItem extends Barang {
  qty: number
}

export function TransaksiKasir() {
  const [barangList, setBarangList] = useState<Barang[]>([])
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [metodePembayaran, setMetodePembayaran] = useState<'cash' | 'qr' | 'transfer' | 'hutang' | 'ewallet'>('cash')
  const [loading, setLoading] = useState(false)
  const [selectedAnggota, setSelectedAnggota] = useState<number | ''>('')
  const [searchAnggota, setSearchAnggota] = useState('')
  const [showAnggotaDropdown, setShowAnggotaDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAnggotaDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [])
  
  const filteredAnggotaDropdown = useMemo(() => {
    return anggotaList.filter(a => (a.nama_lengkap || a.nama || '').toLowerCase().includes(searchAnggota.toLowerCase()))
  }, [anggotaList, searchAnggota])
  
  // Pagination & Mobile View States
  const [page, setPage] = useState(1)
  const [showMobileCart, setShowMobileCart] = useState(false)
  const ITEMS_PER_PAGE = 6

  const loadData = async () => {
    try {
      const [brg, ang] = await Promise.all([kasirService.getDataBarang(), kasirService.getAllAnggota()])
      setBarangList(brg)
      setAnggotaList(ang)
    } catch (e) {
      toast.error('Gagal memuat data')
    }
  }

  useEffect(() => { loadData() }, [])

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

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Keranjang belanja kosong'); return }
    if (metodePembayaran === 'hutang' && !selectedAnggota) { toast.error('Metode hutang wajib memilih anggota koperasi!'); return }

    setLoading(true)
    try {
      const res = await kasirService.buatTransaksiKasir({
        anggota_id: selectedAnggota ? Number(selectedAnggota) : null,
        metode_pembayaran: metodePembayaran,
        items: cart.map(item => ({ barang_id: item.barang_id, jumlah: item.qty, harga_satuan: item.harga ?? item.harga_jual ?? 0 })),
        total
      })
      if (res.success) {
        toast.success('Transaksi berhasil! No. #' + (res.transaksi_id || ''))
        setCart([])
        setSelectedAnggota('')
        setMetodePembayaran('cash')
        setShowMobileCart(false)
        loadData()
      } else {
        toast.error(res.error || 'Gagal menyimpan transaksi')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-7.5rem)] pb-16 md:pb-6">
      
      {/* Container List Barang (Hidden on mobile if Cart is shown) */}
      <div className={`flex-1 flex flex-col gap-4 overflow-hidden ${showMobileCart ? 'hidden lg:flex' : 'flex'}`}>
        <div className="flex items-center justify-between gap-4">
          <Input 
            icon={<Search className="w-4 h-4 text-slate-400" />}
            placeholder="Cari nama barang atau scan barcode..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1 pb-4">
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
                    className="w-full bg-transparent outline-none"
                    placeholder="Ketik nama anggota..."
                    value={searchAnggota}
                    onChange={(e) => {
                      setSearchAnggota(e.target.value)
                      setShowAnggotaDropdown(true)
                      if (selectedAnggota !== '') {
                        setSelectedAnggota('') // clear selection if they type
                      }
                    }}
                    onFocus={() => setShowAnggotaDropdown(true)}
                  />
                  {selectedAnggota !== '' && (
                     <button 
                       className="text-slate-400 hover:text-rose-500 p-1"
                       onClick={(e) => {
                         e.stopPropagation();
                         setSelectedAnggota('');
                         setSearchAnggota('');
                       }}
                     >
                       <X className="w-3 h-3" />
                     </button>
                  )}
                </div>
                
                {showAnggotaDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto overflow-x-hidden">
                    <div 
                      className="p-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700"
                      onClick={() => {
                        setSelectedAnggota('');
                        setSearchAnggota('');
                        setShowAnggotaDropdown(false);
                      }}
                    >
                      Umum (Bukan Anggota)
                    </div>
                    {filteredAnggotaDropdown.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500 text-center">Tidak ditemukan</div>
                    ) : (
                      filteredAnggotaDropdown.map(a => (
                        <div 
                          key={a.anggota_id} 
                          className={`p-2.5 text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 ${selectedAnggota === a.anggota_id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                          onClick={() => {
                            setSelectedAnggota(a.anggota_id);
                            setSearchAnggota(a.nama_lengkap || a.nama || '');
                            setShowAnggotaDropdown(false);
                          }}
                        >
                          {a.nama_lengkap || a.nama}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
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

      {/* Mobile Floating Cart Summary */}
      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Total ({cart.length} item)</p>
            <p className="text-lg font-extrabold text-blue-600">{formatRupiah(total)}</p>
          </div>
          <Button 
            onClick={() => setShowMobileCart(true)}
            className="h-11 px-6 shadow-md"
          >
            Lanjut Bayar
          </Button>
        </div>
      )}
    </div>
  )
}
