import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { kasirService } from '@/services/kasirService'
import { useAuthStore } from '@/store/authStore'
import { DashboardKasir, Transaksi } from '@/types'
import { formatRupiah, formatDate } from '@/lib/utils'
import { 
  ShoppingCart, 
  Banknote, 
  Clock, 
  ArrowRightLeft, 
  TrendingUp, 
  ShoppingBag, 
  CreditCard, 
  ArrowRight, 
  ShieldCheck, 
  ShieldAlert, 
  ScanLine, 
  BadgeCheck, 
  ReceiptText, 
  Landmark, 
  ChevronRight 
} from 'lucide-react'

export function KasirDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: dashboardPayload, isLoading: loading } = useQuery({
    queryKey: ['kasir', 'dashboard-combined'],
    queryFn: async () => {
      const dashboard = await kasirService.getDashboard()
      // Use consolidated payload if available, else fallback gracefully
      const raw = dashboard as any
      let transaksi = raw?.transaksi_terbaru
      let activeShift = raw?.active_shift
      if (!transaksi) {
        transaksi = await kasirService.getTransaksiTerbaru()
      }
      if (activeShift === undefined) {
        const shiftInfo = await kasirService.getActiveShiftInfo()
        activeShift = shiftInfo.data?.latest_incoming || null
      }
      return {
        data: dashboard,
        transaksiTerbaru: transaksi || [],
        activeShift: activeShift || null
      }
    },
    staleTime: 1000 * 30,
  })

  const data = dashboardPayload?.data || null
  const transaksiTerbaru: Transaksi[] = dashboardPayload?.transaksiTerbaru || []
  const activeShift = dashboardPayload?.activeShift || null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Memuat Dashboard Kasir POS...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    { 
      label: 'Penjualan Hari Ini', 
      value: formatRupiah(data?.total_pendapatan_hari_ini || 0), 
      desc: 'Total omset toko shift ini',
      icon: TrendingUp, 
      color: 'text-emerald-600 dark:text-emerald-400', 
      bg: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20' 
    },
    { 
      label: 'Transaksi Hari Ini', 
      value: `${data?.total_transaksi_hari_ini || 0} Struk`, 
      desc: 'Transaksi berhasil hari ini',
      icon: ReceiptText, 
      color: 'text-blue-600 dark:text-blue-400', 
      bg: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20' 
    },
    { 
      label: 'Total Transaksi Dilayani', 
      value: `${(data?.total_transaksi_dilayani ?? data?.total_transaksi_hari_ini ?? 0).toLocaleString('id-ID')} Trx`, 
      desc: 'Akumulasi transaksi sukses kasir',
      icon: ShoppingBag, 
      color: 'text-indigo-600 dark:text-indigo-400', 
      bg: 'from-indigo-500/10 to-purple-500/10 border-indigo-500/20' 
    },
    { 
      label: 'Pending Shift', 
      value: `${data?.pending_serah_terima || 0} Antrean`, 
      desc: 'Serah terima menunggu validasi',
      icon: ArrowRightLeft, 
      color: 'text-amber-600 dark:text-amber-400', 
      bg: 'from-amber-500/10 to-orange-500/10 border-amber-500/20' 
    },
  ]

  const pendingPesanan = data?.pending_pesanan || 0
  const pendingHutang = data?.pending_hutang || 0

  const opnameShift = activeShift?.hasil_opname ? (typeof activeShift.hasil_opname === 'string' ? JSON.parse(activeShift.hasil_opname) : activeShift.hasil_opname) : null
  const barangSelisihShift = opnameShift?.summary?.barangSelisih || 0

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-lg md:max-w-4xl mx-auto px-1 sm:px-0">
      
      {/* ─── CARD 1: IDENTITY & ANGGOTA STATUS HERO (GLASSMORPHISM) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shadow-xl border border-slate-800">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0 ring-2 ring-white/10">
                {user?.nama_lengkap ? user.nama_lengkap.charAt(0).toUpperCase() : user?.username?.charAt(0).toUpperCase() || 'K'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                    {user?.nama_lengkap || user?.username}
                  </h2>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" />
                    Kasir Aktif
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  @{user?.username} &bull; Anggota Resmi #{user?.anggota_id || '-'}
                </p>
              </div>
            </div>

            <span className="hidden sm:inline-block text-[11px] text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl font-mono">
              POS v2.1
            </span>
          </div>

          {/* Member Financial Stats Pills */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
            <div className="bg-white/5 backdrop-blur-xs p-2.5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SHU Pribadi</p>
              <p className="text-xs sm:text-sm font-black text-emerald-400 mt-0.5 truncate">
                {formatRupiah(user?.shu || 0)}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-xs p-2.5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simpanan</p>
              <p className="text-xs sm:text-sm font-black text-blue-300 mt-0.5 truncate">
                {formatRupiah(user?.saldo || 300000)}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-xs p-2.5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Limit Kasbon</p>
              <p className="text-xs sm:text-sm font-black text-amber-300 mt-0.5 truncate">
                {formatRupiah(400000)}
              </p>
            </div>
          </div>
        </div>
      </div>



      {/* ─── URGENT NOTIFICATION BANNER (SERAH TERIMA) ─── */}
      {(data?.pending_serah_terima || 0) > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider">Tugas Serah Terima Masuk</div>
              <p className="text-xs text-amber-100 mt-0.5">
                Terdapat {data?.pending_serah_terima} serah terima shift menunggu validasi Anda.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/kasir/serah-terima')}
            className="px-3.5 py-2 rounded-xl bg-white text-rose-700 font-black text-xs shadow-md shrink-0 active:scale-95 hover:bg-rose-50 transition-transform"
          >
            Validasi &rarr;
          </button>
        </div>
      )}

      {/* ─── CARD 3: LIVE ACTIVE SHIFT TELEMETRY ─── */}
      {activeShift ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-900/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">Shift Aktif Toko</span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Ref: #ST-{activeShift.serah_id}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Diterima dari <b>@{activeShift.kasir_from_name}</b> &bull; Modal Awal: <b>{formatRupiah(opnameShift?.uang_fisik || 0)}</b>
              </p>
              <div className="flex items-center gap-2 mt-1">
                {barangSelisihShift > 0 ? (
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {barangSelisihShift} barang selisih telah disinkronkan ke stok fisik
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Cycle count shift: 100% Cocok
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/kasir/serah-terima')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 self-end sm:self-center active:scale-95"
          >
            Kelola Shift &rarr;
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Operasional Shift Mandiri</p>
              <p className="text-[11px] text-slate-500">Anda dapat membuat serah terima saat pergantian tugas kasir.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/kasir/serah-terima/buat')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 shadow-2xs"
          >
            Form Serah Terima
          </button>
        </div>
      )}

      {/* ─── CARD 4: FINANCIAL & DRAWER METRICS (4 COMPACT SMART CARDS) ─── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
        {statCards.map((st) => {
          const Icon = st.icon
          return (
            <div
              key={st.label}
              className={`p-3.5 sm:p-4 rounded-3xl bg-gradient-to-br ${st.bg} bg-white dark:bg-slate-900 border shadow-xs flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{st.label}</span>
                <div className={`p-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-2xs ${st.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <h3 className={`text-base sm:text-xl font-black tracking-tight ${st.color}`}>
                  {st.value}
                </h3>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{st.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── CARD 5: DUA AKSI SPESIFIK KASIR (NON-REDUNDANT DENGAN BOTTOMNAV) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Layanan Tarik Tunai SHU */}
        <button
          onClick={() => navigate('/kasir/tarik-tunai')}
          className="p-4 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-between text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-sm text-white">Layanan Tarik Tunai</h4>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-white/20 text-white">
                  SHU
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                Verifikasi 4-Tahap & Pencairan Kas
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <ChevronRight className="w-4 h-4 text-white" />
          </div>
        </button>

        {/* Setoran Kas Toko ke Admin */}
        <button
          onClick={() => navigate('/kasir/setoran')}
          className="p-4 rounded-3xl bg-slate-900 dark:bg-zinc-800 text-white border border-slate-800 shadow-md flex items-center justify-between text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-800 dark:bg-zinc-700 flex items-center justify-center shrink-0">
              <Landmark className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-sm text-white">Setor Kas ke Admin</h4>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300">
                  Laci
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Penyetoran Kas Fisik Toko
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-zinc-700 flex items-center justify-center shrink-0">
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </button>
      </div>

      {/* ─── CARD 6: INSET GROUPED RECENT TRANSACTIONS FEED ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Transaksi Kasir Terbaru</h3>
            <p className="text-[11px] text-slate-400">Aktivitas penjualan kasir hari ini</p>
          </div>
          <button
            onClick={() => navigate('/kasir/riwayat')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
          >
            Lihat Semua &rarr;
          </button>
        </div>

        {transaksiTerbaru.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Belum ada transaksi pada shift ini. Ketuk tombol <b>"POS"</b> di bilah bawah untuk mulai melayani pembeli.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {transaksiTerbaru.slice(0, 5).map((t) => (
              <div key={t.transaksi_id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    t.metode_pembayaran === 'cash' || t.metode_pembayaran === 'tunai'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : t.metode_pembayaran === 'saldo'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                      : t.metode_pembayaran === 'hutang'
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                      : 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400'
                  }`}>
                    {t.metode_pembayaran === 'cash' || t.metode_pembayaran === 'tunai' ? '💵' : t.metode_pembayaran === 'saldo' ? '💳' : t.metode_pembayaran === 'hutang' ? '📝' : '📱'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {t.nama_anggota || 'Pembeli Anggota'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      #{t.transaksi_id} &bull; {formatDate(t.created_at)} &bull; <span className="capitalize font-semibold">{t.metode_pembayaran}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white">
                    {formatRupiah(t.total_harga)}
                  </p>
                  <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default KasirDashboard