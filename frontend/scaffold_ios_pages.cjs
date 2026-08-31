const fs = require('fs');
const path = require('path');

const write = (filePath, content) => {
  const fullPath = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim());
  console.log(`Created ${filePath}`);
};

write('src/pages/anggota/Dashboard.tsx', `
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { anggotaService } from '@/services/anggotaService'
import { useAuthStore } from '@/store/authStore'
import { IosMemberCard } from '@/components/ios/IosMemberCard'
import { IosListSection, IosListItem } from '@/components/ios/IosList'
import { IosBottomSheet } from '@/components/ios/IosBottomSheet'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { ProfilAnggota, HistoriTransaksiAnggota } from '@/types'
import { ShoppingBag, CreditCard, History, UserCircle, ArrowUpRight, CheckCircle2, QrCode } from 'lucide-react'

export function AnggotaDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [profil, setProfil] = useState<ProfilAnggota | null>(null)
  const [transaksi, setTransaksi] = useState<HistoriTransaksiAnggota[]>([])
  const [loading, setLoading] = useState(true)
  const [showQrModal, setShowQrModal] = useState(false)

  useEffect(() => {
    Promise.all([
      anggotaService.getProfil(),
      anggotaService.getHistoriTransaksi()
    ])
      .then(([p, t]) => {
        setProfil(p)
        setTransaksi(t.slice(0, 5))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  const quickActions = [
    { label: 'Belanja', icon: ShoppingBag, color: 'bg-blue-600', to: '/anggota/belanja' },
    { label: 'Bayar Hutang', icon: CreditCard, color: 'bg-rose-500', to: '/anggota/bayar-hutang' },
    { label: 'Riwayat', icon: History, color: 'bg-amber-500', to: '/anggota/riwayat' },
    { label: 'Profil Saya', icon: UserCircle, color: 'bg-slate-700', to: '/anggota/profil' },
  ]

  return (
    <div className="space-y-6 pb-16 max-w-lg mx-auto">
      {/* 1. Apple Wallet Membership Card */}
      <IosMemberCard
        nama={profil?.nama_lengkap || user?.username || 'Anggota'}
        username={user?.username || ''}
        saldo={profil?.saldo || 0}
        hutang={profil?.hutang || 0}
        shu={profil?.shu || 0}
        anggotaId={profil?.anggota_id || user?.anggota_id}
        onShowQR={() => setShowQrModal(true)}
      />

      {/* 2. iOS Quick Actions Bar */}
      <div className="grid grid-cols-4 gap-3 px-1">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.to)}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group"
            >
              <div className={\`w-14 h-14 rounded-2xl \${action.color} text-white flex items-center justify-center shadow-sm shadow-slate-300 dark:shadow-none group-hover:brightness-105 transition-all\`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-center tracking-tight leading-tight">
                {action.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* 3. Inset Grouped Recent Activity */}
      <IosListSection title="Transaksi Terbaru" footer="Menampilkan 5 transaksi terakhir">
        {transaksi.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Belum ada transaksi
          </div>
        ) : (
          transaksi.map((t) => (
            <IosListItem
              key={t.transaksi_id}
              icon={<ShoppingBag className="w-4 h-4" />}
              iconBgColor={t.metode_pembayaran === 'hutang' ? 'bg-rose-500' : 'bg-blue-600'}
              title={\`Belanja #\${t.transaksi_id}\`}
              subtitle={formatDate(t.created_at)}
              value={
                <div className="text-right">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{formatRupiah(t.total_harga)}</p>
                  <span className={\`text-[10px] font-semibold capitalize \${t.status === 'selesai' ? 'text-emerald-600' : 'text-amber-500'}\`}>
                    {t.metode_pembayaran} &bull; {t.status}
                  </span>
                </div>
              }
              hasChevron
              onClick={() => navigate('/anggota/riwayat')}
            />
          ))
        )}
      </IosListSection>

      {/* QR Code Member Sheet */}
      <IosBottomSheet isOpen={showQrModal} onClose={() => setShowQrModal(false)} title="Kartu Digital Anggota">
        <div className="flex flex-col items-center text-center p-4 space-y-4">
          <div className="p-6 bg-white rounded-3xl shadow-md border border-slate-100 flex flex-col items-center">
            <QrCode className="w-44 h-44 text-slate-900" />
            <p className="font-mono font-bold text-sm text-slate-700 mt-3">#{profil?.anggota_id || user?.anggota_id || user?.username}</p>
          </div>
          <div>
            <h4 className="font-bold text-base text-slate-900">{profil?.nama_lengkap || user?.username}</h4>
            <p className="text-xs text-slate-400 mt-0.5">Tunjukkan QR ini ke kasir saat berbelanja di Koperasi</p>
          </div>
        </div>
      </IosBottomSheet>
    </div>
  )
}
export default AnggotaDashboard
`);

write('src/pages/anggota/Belanja.tsx', `
import React, { useEffect, useState, useCallback } from 'react'
import { anggotaService } from '@/services/anggotaService'
import { IosBottomSheet } from '@/components/ios/IosBottomSheet'
import { formatRupiah } from '@/lib/utils'
import type { Barang, MetodePembayaran } from '@/types'
import { Search, Plus, Minus, Trash2, ShoppingBag, CreditCard, Banknote, QrCode, CheckCircle2 } from 'lucide-react'

interface CartItem extends Barang {
  qty: number
}

export function BelanjaPage() {
  const [barangList, setBarangList] = useState<Barang[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [metode, setMetode] = useState<MetodePembayaran>('cash')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showCartSheet, setShowCartSheet] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const data = await anggotaService.getDataBarang()
      setBarangList(data)
    } catch {
      alert('Gagal memuat daftar barang.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = barangList.filter((b) =>
    b.nama_barang.toLowerCase().includes(search.toLowerCase())
  )

  const getItemQtyInCart = (id: number) => cart.find(c => c.barang_id === id)?.qty || 0

  const addToCart = (barang: Barang) => {
    if (barang.stok <= 0) return
    setCart((prev) => {
      const existing = prev.find((c) => c.barang_id === barang.barang_id)
      if (existing) {
        if (existing.qty >= barang.stok) {
          alert('Stok maksimal tercapai')
          return prev
        }
        return prev.map((c) =>
          c.barang_id === barang.barang_id ? { ...c, qty: c.qty + 1 } : c
        )
      }
      return [...prev, { ...barang, qty: 1 }]
    })
  }

  const updateQty = (barang_id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.barang_id === barang_id ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    )
  }

  const totalHarga = cart.reduce((sum, c) => sum + (c.harga || c.harga_jual || 0) * c.qty, 0)
  const totalItemCount = cart.reduce((sum, c) => sum + c.qty, 0)

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    try {
      const payload = {
        metode_pembayaran: metode,
        items: cart.map((c) => ({
          barang_id: c.barang_id,
          qty: c.qty,
          harga_satuan: c.harga || c.harga_jual || 0,
        })),
        total_harga: totalHarga,
      }
      const res = await anggotaService.simpanTransaksi(payload)
      if (res.success) {
        alert('Pesanan berhasil dibuat! Menunggu konfirmasi kasir.')
        setCart([])
        setShowCartSheet(false)
        loadData()
      } else {
        alert(res.error || 'Transaksi gagal.')
      }
    } catch {
      alert('Terjadi kesalahan koneksi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-28 max-w-lg mx-auto">
      {/* 1. iOS Search Bar */}
      <div className="sticky top-16 z-20 bg-[#f2f2f7]/95 dark:bg-black/95 backdrop-blur-md pt-1 pb-3 px-1">
        <div className="relative flex items-center bg-slate-200/80 dark:bg-zinc-800/80 rounded-xl px-3 h-10 shadow-inner">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari barang kebutuhan..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* 2. iOS Product Grid (App Store / Retail style) */}
      <div className="grid grid-cols-2 gap-3 px-1">
        {filtered.map((b) => {
          const qtyInCart = getItemQtyInCart(b.barang_id)
          return (
            <div
              key={b.barang_id}
              className="bg-white dark:bg-zinc-900 rounded-[22px] p-3.5 flex flex-col justify-between shadow-xs border border-slate-200/40 dark:border-zinc-800/40 active:scale-[0.98] transition-all"
            >
              <div>
                <div className="w-full h-24 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-800/60 rounded-2xl flex items-center justify-center mb-3">
                  <ShoppingBag className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                  {b.nama_barang}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Stok: {b.stok} {b.satuan || 'pcs'}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-extrabold text-blue-600 dark:text-blue-400">
                  {formatRupiah(b.harga || b.harga_jual || 0)}
                </span>

                {qtyInCart === 0 ? (
                  <button
                    onClick={() => addToCart(b)}
                    disabled={b.stok <= 0}
                    className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full px-1.5 py-0.5">
                    <button onClick={() => updateQty(b.barang_id, -1)} className="text-slate-600 dark:text-slate-300">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{qtyInCart}</span>
                    <button onClick={() => updateQty(b.barang_id, 1)} className="text-slate-600 dark:text-slate-300">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 3. Sticky Bottom Cart Bar (iOS Native Retail Style) */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 p-3 max-w-lg mx-auto">
          <div 
            onClick={() => setShowCartSheet(true)}
            className="bg-slate-900/95 dark:bg-zinc-800/95 backdrop-blur-xl text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center relative shadow-inner">
                <ShoppingBag className="w-5 h-5 text-white" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center border-2 border-slate-900">
                  {totalItemCount}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-300">Total Pembayaran</p>
                <p className="text-base font-extrabold text-white">{formatRupiah(totalHarga)}</p>
              </div>
            </div>

            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-md">
              Bayar &bull; Checkout
            </button>
          </div>
        </div>
      )}

      {/* 4. Checkout Bottom Sheet */}
      <IosBottomSheet isOpen={showCartSheet} onClose={() => setShowCartSheet(false)} title="Keranjang Belanja">
        <div className="space-y-4">
          <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-60 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.barang_id} className="py-2.5 flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white">{item.nama_barang}</h5>
                  <p className="text-xs text-blue-600 font-semibold">{formatRupiah((item.harga || item.harga_jual || 0) * item.qty)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.barang_id, -1)} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                  <button onClick={() => updateQty(item.barang_id, 1)} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Tagihan</span>
              <span className="text-xl font-extrabold text-blue-600">{formatRupiah(totalHarga)}</span>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Metode Pembayaran</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Tunai', icon: Banknote },
                  { id: 'saldo', label: 'Saldo', icon: CreditCard },
                  { id: 'hutang', label: 'Hutang', icon: QrCode },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMetode(opt.id as MetodePembayaran)}
                    className={\`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all \${
                      metode === opt.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                    }\`}
                  >
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? 'Memproses...' : 'Konfirmasi Pesanan'}
            </button>
          </div>
        </div>
      </IosBottomSheet>
    </div>
  )
}
export default BelanjaPage
`);

write('src/pages/anggota/BayarHutang.tsx', `
import React, { useEffect, useState } from 'react'
import { anggotaService } from '@/services/anggotaService'
import { IosListSection, IosListItem } from '@/components/ios/IosList'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { ProfilAnggota, HistoriBayarHutang } from '@/types'
import { CreditCard, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'

export function BayarHutangPage() {
  const [profil, setProfil] = useState<ProfilAnggota | null>(null)
  const [history, setHistory] = useState<HistoriBayarHutang[]>([])
  const [jumlah, setJumlah] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const loadData = async () => {
    try {
      const [p, h] = await Promise.all([
        anggotaService.getProfil(),
        anggotaService.getHistoriBayarHutang()
      ])
      setProfil(p)
      setHistory(h)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handlePreset = (amount: number) => {
    setJumlah(amount.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg('')
    setErrorMsg('')
    const val = Number(jumlah)
    if (!val || val <= 0) {
      setErrorMsg('Nominal bayar harus lebih dari 0')
      return
    }
    if (val > (profil?.hutang || 0)) {
      setErrorMsg('Nominal bayar melebihi total hutang')
      return
    }

    setSubmitting(true)
    try {
      const res = await anggotaService.bayarHutang(val)
      if (res.success) {
        setSuccessMsg('Pengajuan bayar hutang terkirim! Silakan serahkan uang ke kasir.')
        setJumlah('')
        loadData()
      } else {
        setErrorMsg(res.error || 'Gagal mengirim pembayaran')
      }
    } catch {
      setErrorMsg('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  const totalHutang = profil?.hutang || 0

  return (
    <div className="space-y-6 pb-20 max-w-lg mx-auto">
      {/* 1. Apple Pay Style Debt Summary Card */}
      <div className="rounded-[28px] bg-gradient-to-br from-rose-500 to-red-600 text-white p-6 shadow-xl shadow-rose-600/20 text-center">
        <p className="text-xs font-semibold text-rose-100 uppercase tracking-wider flex items-center justify-center gap-1">
          <CreditCard className="w-4 h-4" />
          Total Hutang Belanja
        </p>
        <h2 className="text-4xl font-extrabold tracking-tight mt-2 text-white">
          {formatRupiah(totalHutang)}
        </h2>
        <p className="text-xs text-rose-100/80 mt-1">
          {totalHutang <= 0 ? '🎉 Anda tidak memiliki hutang' : 'Pilih nominal pembayaran di bawah'}
        </p>
      </div>

      {/* 2. Quick Presets & Payment Input */}
      {totalHutang > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-[26px] p-5 shadow-xs border border-slate-200/50 dark:border-zinc-800/50 space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Nominal</p>
          
          <div className="grid grid-cols-3 gap-2">
            {[50000, 100000, 200000].filter(amt => amt < totalHutang).map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handlePreset(amt)}
                className="py-2.5 px-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
              >
                {formatRupiah(amt)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handlePreset(totalHutang)}
              className="py-2.5 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-extrabold border border-blue-200/60 dark:border-blue-800/40 transition-colors"
            >
              Bayar Lunas
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="relative flex items-center bg-slate-100 dark:bg-zinc-800 rounded-2xl px-4 h-14">
              <span className="text-lg font-bold text-slate-400 mr-2">Rp</span>
              <input
                type="number"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="0"
                max={totalHutang}
                min={1}
                required
                className="w-full bg-transparent text-xl font-extrabold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
              </p>
            )}
            {successMsg && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {successMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !jumlah}
              className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-md active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {submitting ? 'Memproses...' : 'Ajukan Pembayaran'}
            </button>
          </form>
        </div>
      )}

      {/* 3. Inset Grouped History */}
      <IosListSection title="Riwayat Pembayaran Hutang">
        {history.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Belum ada riwayat pembayaran
          </div>
        ) : (
          history.map((h) => (
            <IosListItem
              key={h.pembayaran_id}
              icon={<CreditCard className="w-4 h-4" />}
              iconBgColor={h.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}
              title={formatRupiah(h.nominal || h.jumlah || 0)}
              subtitle={formatDate(h.created_at)}
              value={
                <span className={\`text-xs font-bold \${h.status === 'approved' ? 'text-emerald-600' : 'text-amber-500'}\`}>
                  {h.status === 'approved' ? 'Disetujui' : h.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                </span>
              }
            />
          ))
        )}
      </IosListSection>
    </div>
  )
}
export default BayarHutangPage
`);

write('src/pages/anggota/Profil.tsx', `
import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { anggotaService } from '@/services/anggotaService'
import { IosListSection, IosListItem } from '@/components/ios/IosList'
import { IosBottomSheet } from '@/components/ios/IosBottomSheet'
import { formatRupiah } from '@/lib/utils'
import type { ProfilAnggota } from '@/types'
import { User, Shield, Lock, LogOut, KeyRound, CheckCircle2, ChevronRight } from 'lucide-react'

export function ProfilPage() {
  const { user, logout } = useAuthStore()
  const [profil, setProfil] = useState<ProfilAnggota | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  // Password state
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    anggotaService.getProfil()
      .then(setProfil)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    if (newPassword !== confirmPassword) return setMsg('Konfirmasi password tidak cocok')
    if (newPassword.length < 6) return setMsg('Password minimal 6 karakter')

    setSavingPassword(true)
    try {
      const res = await anggotaService.changePassword(oldPassword, newPassword, user?.user_id)
      if (res.success) {
        alert('Password berhasil diperbarui!')
        setShowPasswordModal(false)
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setMsg(res.error || 'Gagal mengubah password')
      }
    } catch {
      setMsg('Terjadi kesalahan')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleLogout = () => {
    if (confirm('Yakin ingin keluar dari aplikasi?')) {
      logout()
      window.location.href = '/login'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 max-w-lg mx-auto">
      {/* 1. iOS Profile Avatar Header */}
      <div className="flex flex-col items-center text-center pt-2">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-3">
          {user?.username?.charAt(0).toUpperCase() || 'A'}
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {profil?.nama_lengkap || user?.username}
        </h2>
        <span className="inline-block text-xs font-semibold px-3 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 mt-1">
          Anggota Koperasi &bull; #{profil?.anggota_id || user?.anggota_id}
        </span>
      </div>

      {/* 2. Apple Settings: Keuangan & Saldo */}
      <IosListSection title="Informasi Keuangan">
        <IosListItem
          title="Saldo Simpanan"
          subtitle="Tersedia untuk transaksi"
          value={<span className="font-bold text-blue-600">{formatRupiah(profil?.saldo || 0)}</span>}
        />
        <IosListItem
          title="Total Hutang"
          subtitle="Potong gaji bulanan"
          value={<span className="font-bold text-rose-600">{formatRupiah(profil?.hutang || 0)}</span>}
        />
        <IosListItem
          title="SHU Berjalan"
          subtitle="Sisa Hasil Usaha tahun ini"
          value={<span className="font-bold text-emerald-600">{formatRupiah(profil?.shu || 0)}</span>}
        />
      </IosListSection>

      {/* 3. Apple Settings: Keamanan & Akun */}
      <IosListSection title="Keamanan & Pengaturan">
        <IosListItem
          icon={<KeyRound className="w-4 h-4" />}
          iconBgColor="bg-amber-500"
          title="Ubah Password"
          subtitle="Perbarui kata sandi akun Anda"
          hasChevron
          onClick={() => setShowPasswordModal(true)}
        />
      </IosListSection>

      {/* 4. Apple Settings: Logout */}
      <IosListSection>
        <IosListItem
          icon={<LogOut className="w-4 h-4" />}
          iconBgColor="bg-rose-500"
          title="Keluar dari Akun"
          destructive
          onClick={handleLogout}
        />
      </IosListSection>

      {/* Password Sheet */}
      <IosBottomSheet isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Ubah Password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          {msg && <p className="text-xs text-rose-500 font-semibold">{msg}</p>}
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Password Saat Ini"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm font-medium focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password Baru (min 6 karakter)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm font-medium focus:outline-none"
            />
            <input
              type="password"
              placeholder="Konfirmasi Password Baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm font-medium focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="w-full h-12 rounded-2xl bg-blue-600 text-white font-extrabold text-sm shadow-md active:scale-[0.98] transition-all"
          >
            {savingPassword ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
      </IosBottomSheet>
    </div>
  )
}
export default ProfilPage
`);

write('src/pages/anggota/Riwayat.tsx', `
import React, { useEffect, useState } from 'react'
import { anggotaService } from '@/services/anggotaService'
import { IosListSection, IosListItem } from '@/components/ios/IosList'
import { IosBottomSheet } from '@/components/ios/IosBottomSheet'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { HistoriTransaksiAnggota } from '@/types'
import { ShoppingBag, Receipt, CheckCircle2, Clock } from 'lucide-react'

export function RiwayatTransaksiAnggota() {
  const [transaksi, setTransaksi] = useState<HistoriTransaksiAnggota[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTx, setSelectedTx] = useState<HistoriTransaksiAnggota | null>(null)

  useEffect(() => {
    anggotaService.getHistoriTransaksi()
      .then(setTransaksi)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
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
              title={\`Transaksi #\${t.transaksi_id}\`}
              subtitle={formatDate(t.created_at)}
              value={
                <div className="text-right">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{formatRupiah(t.total_harga)}</p>
                  <span className={\`text-[10px] font-semibold capitalize \${t.status === 'selesai' ? 'text-emerald-600' : 'text-amber-500'}\`}>
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
`);

