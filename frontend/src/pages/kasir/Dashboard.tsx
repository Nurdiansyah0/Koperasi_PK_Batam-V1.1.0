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
  ChevronRight,
  FileText,
  Smartphone
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
      label: 'Transaksi Shift Ini', 
      value: `${data?.total_transaksi_hari_ini || 0} Struk`, 
      desc: 'Nota transaksi berhasil selesai',
      icon: ReceiptText, 
      color: 'text-blue-600 dark:text-blue-400'
    },
    { 
      label: 'Item Terjual (Qty)', 
      value: `${(data?.total_item_terjual_hari_ini ?? data?.totalItemTerjualHariIni ?? 0).toLocaleString('id-ID')} Pcs`, 
      desc: 'Fisik barang keluar kasir',
      icon: ShoppingBag, 
      color: 'text-emerald-600 dark:text-emerald-400'
    },
    { 
      label: 'Status Sesi Shift', 
      value: activeShift ? 'Shift Aktif' : 'Shift Standby', 
      desc: activeShift ? `Mulai: ${formatDate(activeShift.created_at)}` : 'Sesi kasir operasional POS',
      icon: Clock, 
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    { 
      label: 'Tugas Serah Terima', 
      value: `${data?.pending_serah_terima || 0} Antrean`, 
      desc: 'Verifikasi pergantian shift',
      icon: ArrowRightLeft, 
      color: 'text-amber-600 dark:text-amber-400'
    },
  ]

  const pendingPesanan = data?.pending_pesanan || 0
  const pendingHutang = data?.pending_hutang || 0

  const opnameShift = activeShift?.hasil_opname ? (typeof activeShift.hasil_opname === 'string' ? JSON.parse(activeShift.hasil_opname) : activeShift.hasil_opname) : null
  const barangSelisihShift = opnameShift?.summary?.barangSelisih || 0

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-lg md:max-w-4xl mx-auto px-1 sm:px-0">
      
      {/* ─── CARD 1: IDENTITY & KASIR STATUS HERO ─── */}
      <div className="rounded-3xl bg-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shrink-0">
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
                @{user?.username} &bull; Anggota #{user?.anggota_id || '-'}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/kasir/transaksi')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all shrink-0"
          >
            Buka POS &rarr;
          </button>
        </div>
      </div>

      {/* ─── URGENT NOTIFICATION BANNER (SERAH TERIMA) ─── */}
      {(data?.pending_serah_terima || 0) > 0 && (
        <div className="p-4 rounded-3xl bg-amber-600 text-white shadow-md flex items-center justify-between gap-3">
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
            className="px-3.5 py-2 rounded-xl bg-white text-amber-900 font-bold text-xs shadow-xs shrink-0 active:scale-95 hover:bg-amber-50 transition-transform"
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
              className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{st.label}</span>
                <div className={`p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 ${st.color}`}>
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

      {/* ─── CARD 5: AKSI SPESIFIK KASIR ─── */}
      <div className="grid grid-cols-1 gap-3">

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
                    {t.metode_pembayaran === 'cash' || t.metode_pembayaran === 'tunai' ? (
                      <Banknote className="w-4 h-4" />
                    ) : t.metode_pembayaran === 'saldo' ? (
                      <CreditCard className="w-4 h-4" />
                    ) : t.metode_pembayaran === 'hutang' ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <Smartphone className="w-4 h-4" />
                    )}
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