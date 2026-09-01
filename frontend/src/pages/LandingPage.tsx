import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  CreditCard, 
  ShoppingBag, 
  Smartphone, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  QrCode, 
  Store, 
  Users, 
  PieChart, 
  CheckCircle2, 
  ChevronRight,
  Layers,
  Calculator,
  Lock
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatRupiah } from '@/lib/utils'

export function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()

  // Interactive SHU Simulator State (Purely based on Member Shopping Activity)
  const [belanjaBulan, setBelanjaBulan] = useState(500000)

  // Real Koperasi PK Distribution Formula:
  // 100% SHU Anggota diperoleh dari 60% keuntungan margin belanja koperasi (tidak ada jasa simpan modal)
  const belanjaTahunan = belanjaBulan * 12
  const profitBelanjaTahunan = belanjaTahunan * 0.15 // Rata-rata margin toko 15%
  const totalShuAnggota = Math.round(profitBelanjaTahunan * 0.60) // 60% hak anggota
  const danaCadangan30 = Math.round(profitBelanjaTahunan * 0.30)  // 30% cadangan
  const danaSosial10 = Math.round(profitBelanjaTahunan * 0.10)    // 10% pengurus/sosial

  // Interactive Member Card Demo State
  const [showQR, setShowQR] = useState(false)

  const handlePortalAction = () => {
    if (isAuthenticated && user) {
      navigate(`/${user.role}`)
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* ── Ambient Gradient Background Glows ── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-600/15 via-indigo-600/10 to-transparent blur-[120px] pointer-events-none z-0" />
      <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed -bottom-40 -right-40 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* ── 1. Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090d16]/80 border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-1.5 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
              <img src="/Logo.svg" alt="Logo Koperasi PK" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-white leading-none">
                  Koperasi PKPPK BTH
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live System
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">
                Koperasi Karyawan PKPPK BTH
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => {
                const el = document.getElementById('fitur-section')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="hidden md:block text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-2"
            >
              Fitur Layanan
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('simulasi-shu')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="hidden md:block text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-2"
            >
              Simulasi SHU
            </button>

            <button
              onClick={handlePortalAction}
              className="group relative inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/25 active:scale-95 transition-all border border-white/15"
            >
              <span>{isAuthenticated ? 'Masuk ke Dashboard' : 'Masuk ke Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. Hero Section ── */}
      <section className="relative z-10 pt-10 sm:pt-16 lg:pt-24 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline & Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span className="text-xs font-semibold text-slate-200">
                Aplikasi Koperasi Generasi 2.0 &bull; PWA Multi-Platform
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Modernisasi Koperasi Karyawan,{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400">
                Transparan & Serba Digital
              </span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Tinggalkan pencatatan manual. Nikmati kemudahan belanja online anggota bebas antre, transaksi kasir POS kilat, kartu identitas QR digital, dan transparansi dividen SHU real-time.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                onClick={handlePortalAction}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 active:scale-98 transition-all border border-blue-400/20"
              >
                <span>Buka Portal Koperasi</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('simulasi-shu')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 backdrop-blur-md transition-all flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4 text-blue-400" />
                <span>Simulasi Bagian SHU</span>
              </button>
            </div>

            {/* Trust Metric Badges */}
            <div className="pt-6 border-t border-white/5 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">13.400+</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Transaksi Diproses</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-emerald-400">100%</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pencatatan Akurat</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-blue-400">PWA Native</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">iOS & Android</p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Digital Member Card Showcase */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md">
              {/* Card Container with Floating Glow */}
              <div className="relative group">
                <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 opacity-30 blur-xl group-hover:opacity-50 transition duration-500" />
                
                <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-white/15 p-6 sm:p-7 shadow-2xl text-white">
                  {/* Subtle Background Shine */}
                  <div className="absolute -right-16 -top-16 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Top Bar: Logo & Smart Chip */}
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1.5 flex items-center justify-center">
                        <img src="/Logo.svg" alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm tracking-tight text-white leading-tight">KOPERASI PKPPK</h3>
                        <p className="text-[9px] text-blue-300 font-bold tracking-widest uppercase">Digital Member Card &bull; BTH</p>
                      </div>
                    </div>

                    {/* Metallic EMV Chip & QR Toggle */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-6 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/60 shadow-xs flex items-center justify-center relative overflow-hidden">
                        <div className="w-full h-px bg-amber-800/40 absolute top-2" />
                        <div className="w-full h-px bg-amber-800/40 absolute bottom-2" />
                        <div className="h-full w-px bg-amber-800/40 absolute left-2" />
                        <div className="h-full w-px bg-amber-800/40 absolute right-2" />
                      </div>

                      <button
                        onClick={() => setShowQR(!showQR)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white transition-all shadow-xs"
                        title="Klik untuk lihat QR Code"
                      >
                        <QrCode className="w-4 h-4 text-blue-300" />
                      </button>
                    </div>
                  </div>

                  {/* Middle Area: Balance / QR Mode */}
                  {!showQR ? (
                    <div className="my-6 relative z-10 space-y-1">
                      <p className="text-xs text-blue-200/90 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Saldo Simpanan Anggota
                      </p>
                      <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-xs">
                        Rp 4.850.000
                      </h2>
                      <p className="text-[11px] text-slate-400 pt-1">
                        Siap digunakan untuk belanja kebutuhan di gerai koperasi
                      </p>
                    </div>
                  ) : (
                    <div className="my-4 p-4 rounded-2xl bg-white text-slate-900 flex flex-col items-center justify-center gap-2 animate-in fade-in duration-300">
                      <div className="w-28 h-28 bg-slate-900 rounded-xl p-2 flex items-center justify-center">
                        {/* High-Contrast SVG QR Representation */}
                        <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                          <rect x="10" y="10" width="30" height="30" fill="white" />
                          <rect x="15" y="15" width="20" height="20" fill="black" />
                          <rect x="20" y="20" width="10" height="10" fill="white" />
                          <rect x="60" y="10" width="30" height="30" fill="white" />
                          <rect x="65" y="15" width="20" height="20" fill="black" />
                          <rect x="70" y="20" width="10" height="10" fill="white" />
                          <rect x="10" y="60" width="30" height="30" fill="white" />
                          <rect x="15" y="65" width="20" height="20" fill="black" />
                          <rect x="20" y="70" width="10" height="10" fill="white" />
                          <rect x="45" y="15" width="8" height="8" fill="white" />
                          <rect x="45" y="35" width="8" height="8" fill="white" />
                          <rect x="55" y="45" width="15" height="10" fill="white" />
                          <rect x="75" y="65" width="12" height="12" fill="white" />
                          <rect x="50" y="75" width="15" height="10" fill="white" />
                        </svg>
                      </div>
                      <p className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                        #ID-ANGGOTA-001 &bull; SCAN POS
                      </p>
                    </div>
                  )}

                  {/* Bottom: Cardholder Name, SHU, and Status */}
                  <div className="pt-4 border-t border-white/10 flex items-end justify-between relative z-10">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nama Anggota</p>
                      <p className="text-sm font-extrabold text-white tracking-tight">Karyawan PKPPK BTH</p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Anggota Aktif
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Estimasi SHU</p>
                      <p className="text-xs sm:text-sm font-black text-emerald-400">
                        {formatRupiah(totalShuAnggota)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-center text-slate-400 text-[11px] mt-3 font-medium">
                💡 Tip: Klik ikon QR di pojok kanan kartu untuk memunculkan barcode belanja
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── 3. Bento Grid Features Section ── */}
      <section id="fitur-section" className="relative z-10 py-16 sm:py-24 bg-slate-950/60 border-t border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-blue-400">
              Layanan Terintegrasi
            </h2>
            <p className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Satu Aplikasi untuk Seluruh Kebutuhan Koperasi
            </p>
            <p className="text-xs sm:text-sm text-slate-400">
              Dirancang dengan standar UI/UX modern untuk memberikan kecepatan maksimal bagi Anggota, Kasir, dan Pengurus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            
            {/* Bento Card 1: POS Kasir */}
            <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-white/10 hover:border-blue-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                SISTEM POS KASIR
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Mencatat transaksi penjualan, scan barcode barang / QR anggota, dan kalkulator hitung uang kembalian.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Pembayaran Tunai & E-Wallet
                </span>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Serah Terima Shift
                </span>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Setoran Kasir
                </span>
              </div>
            </div>

            {/* Bento Card 2: Belanja Anggota */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-white/10 hover:border-indigo-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                Katalog Belanja
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Melihat daftar harga barang dan membuat pesanan belanja dari ponsel atau komputer.
              </p>
            </div>

            {/* Bento Card 3: Kartu QR Digital */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-white/10 hover:border-violet-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                Kartu Anggota Digital
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Identitas anggota dengan QR Code untuk verifikasi saat transaksi di kasir.
              </p>
            </div>

            {/* Bento Card 4: Transparansi SHU & Finansial */}
            <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-white/10 hover:border-emerald-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Kalkulasi SHU & Laporan Keuangan
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Kalkulasi otomatis pembagian SHU belanja (60% anggota, 30% cadangan, 10% pengurus) dan pencatatan laporan transaksi.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Alokasi SHU Belanja 60%
                </span>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Stok Opname
                </span>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Laporan Transaksi
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 4. Interactive SHU Simulator ── */}
      <section id="simulasi-shu" className="relative z-10 py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-blue-950/60 via-slate-900 to-indigo-950/60 border border-white/10 rounded-[32px] p-6 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                <Calculator className="w-3.5 h-3.5" />
                Kalkulator SHU Belanja
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Kalkulator SHU Belanja
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Hitung estimasi SHU tahunan dari total belanja bulanan di koperasi (alokasi 60% dari keuntungan belanja).
              </p>

              {/* Shopping Slider */}
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between items-center text-xs font-bold mb-2">
                    <span className="text-slate-300">Estimasi Belanja di Koperasi / Bulan:</span>
                    <span className="text-emerald-400 text-base font-black">{formatRupiah(belanjaBulan)}</span>
                  </div>
                  <input
                    type="range"
                    min={100000}
                    max={3000000}
                    step={50000}
                    value={belanjaBulan}
                    onChange={(e) => setBelanjaBulan(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                    <span>Rp 100 rb / bln</span>
                    <span>Rp 3 Juta / bln</span>
                  </div>
                </div>

                {/* Quick Spending Presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 self-center">Pilihan Cepat:</span>
                  {[250000, 500000, 1000000, 2000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBelanjaBulan(val)}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${
                        belanjaBulan === val
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                      }`}
                    >
                      {formatRupiah(val)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Output Box */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-sm p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-white/15 text-center shadow-xl space-y-4">
                <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Estimasi Bagian SHU Anggota (60% Profit)
                </p>
                <h3 className="text-3xl sm:text-4xl font-black text-emerald-400 drop-shadow-xs">
                  {formatRupiah(totalShuAnggota)}
                </h3>
                
                {/* Detailed Breakdown */}
                <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 text-[11px] text-slate-300 text-left space-y-2">
                  <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                    <span className="text-slate-400">Total Belanja 1 Tahun:</span>
                    <span className="font-bold text-white">{formatRupiah(belanjaTahunan)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                    <span className="text-slate-400">Keuntungan Toko Koperasi (~15%):</span>
                    <span className="font-bold text-blue-300">{formatRupiah(profitBelanjaTahunan)}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-emerald-400 pb-1 border-b border-white/5">
                    <span>➔ Hak SHU Anggota (60%):</span>
                    <span>+{formatRupiah(totalShuAnggota)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>* Cadangan Modal Koperasi (30%):</span>
                    <span>{formatRupiah(danaCadangan30)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>* Dana Sosial & Pengurus (10%):</span>
                    <span>{formatRupiah(danaSosial10)}</span>
                  </div>
                </div>

                <button
                  onClick={handlePortalAction}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
                >
                  Masuk Portal & Cek SHU Nyata
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. PWA Multi-Device Compatibility ── */}
      <section className="relative z-10 py-16 bg-[#070b13] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="max-w-2xl mx-auto space-y-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-400">
              Akses dari Mana Saja
            </h2>
            <p className="text-2xl sm:text-3xl font-black text-white">
              Responsif di Seluruh Perangkat Anda
            </p>
            <p className="text-xs sm:text-sm text-slate-400">
              Tidak perlu mengunduh file APK berat. Pasang aplikasi langsung dari browser ke Layar Utama perangkat Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">iPhone & Android</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mendukung Dynamic Island, Notch, status bar transparan, dan navigasi tab bawah.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">iPad & Tablet</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Format split-view yang sangat pas diletakkan di meja kasir sebagai terminal POS register.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">PC & Laptop</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Sidebar navigasi penuh untuk admin mengelola data master, laporan transaksi, dan opname stok.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Footer ── */}
      <footer className="relative z-10 border-t border-white/5 py-10 bg-[#060910]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/Logo.svg" alt="Logo" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-sm text-white">Koperasi PKPPK BTH</span>
          </div>
          <p className="text-xs text-slate-500">
            &copy; 2025 Koperasi PKPPK BTH. Seluruh Hak Cipta Dilindungi.
          </p>
          <button
            onClick={handlePortalAction}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
          >
            Masuk ke Portal Login &rarr;
          </button>
        </div>
      </footer>
    </div>
  )
}
export default LandingPage
