import { useEffect, useState } from 'react'
import { kasirService } from '@/services/kasirService'
import { DashboardKasir, Transaksi } from '@/types'
import { formatRupiah, formatDate } from '@/lib/utils'
import { IosListSection, IosListItem } from '@/components/ios/IosList'
import { ShoppingCart, Banknote, Clock, ArrowRightLeft, TrendingUp, Sparkles } from 'lucide-react'

export function KasirDashboard() {
  const [data, setData] = useState<DashboardKasir | null>(null)
  const [transaksiTerbaru, setTransaksiTerbaru] = useState<Transaksi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      kasirService.getDashboard(),
      kasirService.getTransaksiTerbaru()
    ]).then(([dashboard, transaksi]) => {
      setData(dashboard)
      setTransaksiTerbaru(transaksi)
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

  return (
    <div className="space-y-6 pb-20 max-w-lg md:max-w-4xl mx-auto">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Kasir POS</h1>
        <p className="text-xs text-slate-500 mt-0.5">Ringkasan transaksi dan status kasir hari ini</p>
      </div>

      {/* 2. iOS Stat Widgets Grid */}
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

      {/* 3. Inset Grouped Recent Transactions */}
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