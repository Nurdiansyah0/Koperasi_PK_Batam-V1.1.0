import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { kasirService } from '@/services/kasirService'
import { DashboardKasir, Transaksi } from '@/types'
import { formatRupiah, formatDate } from '@/lib/utils'
import { IosListSection, IosListItem } from '@/components/ios/IosList'
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
  UserCheck,
  ScanLine
} from 'lucide-react'

export function KasirDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardKasir | null>(null)
  const [transaksiTerbaru, setTransaksiTerbaru] = useState<Transaksi[]>([])
  const [activeShift, setActiveShift] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      kasirService.getDashboard(),
      kasirService.getTransaksiTerbaru(),
      kasirService.getActiveShiftInfo()
    ]).then(([dashboard, transaksi, shiftInfo]) => {
      setData(dashboard)
      setTransaksiTerbaru(transaksi)
      setActiveShift(shiftInfo.data?.latest_incoming || null)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  const statCards = [
    { label: 'Penjualan Hari Ini', value: formatRupiah(data?.total_pendapatan_hari_ini || 0), icon: TrendingUp, color: 'text-emerald-600', bg: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20' },
    { label: 'Transaksi Selesai', value: `${data?.total_transaksi_hari_ini || 0} struk`, icon: ShoppingCart, color: 'text-blue-600', bg: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20' },
    { label: 'Saldo Kas Laci', value: formatRupiah(data?.saldo_kas || 0), icon: Banknote, color: 'text-indigo-600', bg: 'from-indigo-500/10 to-purple-500/10 border-indigo-500/20' },
    { label: 'Pending Serah Terima', value: `${data?.pending_serah_terima || 0} req`, icon: ArrowRightLeft, color: 'text-amber-500', bg: 'from-amber-500/10 to-orange-500/10 border-amber-500/20' },
  ]

  const pendingPesanan = data?.pending_pesanan || 0
  const pendingHutang = data?.pending_hutang || 0

  const opnameShift = activeShift?.hasil_opname ? (typeof activeShift.hasil_opname === 'string' ? JSON.parse(activeShift.hasil_opname) : activeShift.hasil_opname) : null
  const barangSelisihShift = opnameShift?.summary?.barangSelisih || 0

  return (
    <div className="space-y-6 pb-20 max-w-lg md:max-w-4xl mx-auto">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Kasir POS</h1>
        <p className="text-xs text-slate-500 mt-0.5">Ringkasan transaksi dan status operasional kasir hari ini</p>
      </div>

      {/* Urgent Pending Handover Banner */}
      {(data?.pending_serah_terima || 0) > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider">Tugas Masuk Serah Terima Shift</div>
              <p className="text-xs text-amber-100 mt-0.5">
                Terdapat {data?.pending_serah_terima} serah terima shift menunggu validasi Anda.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/kasir/serah-terima')}
            className="px-3.5 py-2 rounded-xl bg-white text-rose-700 font-extrabold text-xs shadow-md shrink-0 active:scale-95 hover:bg-rose-50 transition-transform"
          >
            Validasi Shift &rarr;
          </button>
        </div>
      )}

      {/* 2. Active Shift Status Card (Hasil Cycle Count & Serah Terima Diterima) */}
      {activeShift && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-900/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Shift Aktif Berjalan</span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Ref: #ST-{activeShift.serah_id}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Diterima dari <b>@{activeShift.kasir_from_name}</b> &bull; Modal Kas: <b>{formatRupiah(opnameShift?.uang_fisik || 0)}</b>
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
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 self-end sm:self-center px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900 shadow-xs active:scale-95"
          >
            Lihat Berita Acara &rarr;
          </button>
        </div>
      )}

      {/* 3. Priority Action Cards (Pending Orders, Debt Approvals, & Tarik Tunai) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Pesanan Anggota Card */}
        <button
          onClick={() => navigate('/kasir/pesanan')}
          className="p-4 rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 flex items-center justify-between text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm">Pesanan Anggota</h4>
              <p className="text-[10px] text-blue-100 mt-0.5">
                {pendingPesanan > 0 ? `${pendingPesanan} pending approval` : 'Semua selesai'}
              </p>
            </div>
          </div>
          {pendingPesanan > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white text-blue-700 text-xs font-black shadow-xs">
              {pendingPesanan}
            </span>
          )}
        </button>

        {/* Persetujuan Bayar Hutang Card */}
        <button
          onClick={() => navigate('/kasir/hutang')}
          className="p-4 rounded-3xl bg-slate-900 dark:bg-zinc-800 text-white border border-slate-800 shadow-md flex items-center justify-between text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm">Persetujuan Hutang</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {pendingHutang > 0 ? `${pendingHutang} cicilan disetor` : 'Tidak ada antrean'}
              </p>
            </div>
          </div>
          {pendingHutang > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black">
              {pendingHutang}
            </span>
          )}
        </button>

        {/* Tarik Tunai & SHU Card */}
        <button
          onClick={() => navigate('/kasir/tarik-tunai')}
          className="p-4 rounded-3xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-between text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm">Tarik Tunai & SHU</h4>
              <p className="text-[10px] text-emerald-100 mt-0.5">
                Min. Belanja Rp 25.000
              </p>
            </div>
          </div>
          <span className="p-1 rounded-full bg-white/20 text-white">
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>

      {/* 4. iOS Stat Widgets Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((st) => {
          const Icon = st.icon
          return (
            <div
              key={st.label}
              className={`p-4 rounded-3xl bg-gradient-to-br ${st.bg} bg-white dark:bg-zinc-900 border shadow-xs flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{st.label}</span>
                <Icon className={`w-4 h-4 ${st.color}`} />
              </div>
              <h3 className={`text-lg sm:text-xl font-extrabold tracking-tight mt-2 ${st.color}`}>
                {st.value}
              </h3>
            </div>
          )
        })}
      </div>

      {/* 5. Inset Grouped Recent Transactions */}
      <IosListSection title="Transaksi Kasir Terbaru">
        {transaksiTerbaru.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Belum ada transaksi tercatat hari ini
          </div>
        ) : (
          transaksiTerbaru.map((t) => (
            <IosListItem
              key={t.transaksi_id}
              icon={<ShoppingCart className="w-4 h-4" />}
              iconBgColor="bg-blue-600"
              title={t.nama_anggota || 'Umum (Non-Anggota)'}
              subtitle={`${formatDate(t.created_at)} • ${t.metode_pembayaran}`}
              value={
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {formatRupiah(t.total_harga)}
                </span>
              }
            />
          ))
        )}
      </IosListSection>
    </div>
  )
}

export default KasirDashboard