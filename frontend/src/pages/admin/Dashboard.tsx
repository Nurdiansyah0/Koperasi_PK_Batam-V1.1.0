import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '@/services/adminService'
import { DashboardAdmin } from '@/types'
import { formatRupiah } from '@/lib/utils'
import {
  TrendingUp, ArrowUpRight, ShoppingBag,
  CreditCard, Wallet, Package, Gift, Users,
  AlertCircle, CheckCircle2, ChevronRight,
  Zap, ArrowRightLeft, Layers, Scale,
  AlertTriangle, RefreshCw, Plus, Store
} from 'lucide-react'
import toast from 'react-hot-toast'

export function AdminDashboard() {
  const [data, setData] = useState<DashboardAdmin | null>(null)
  const [loading, setLoading] = useState(true)
  const [isApplyingPkm, setIsApplyingPkm] = useState(false)
  const navigate = useNavigate()

  const loadDashboard = () => {
    setLoading(true)
    adminService.getDashboard().then((res) => {
      setData(res as any)
      setLoading(false)
    }).catch(() => {
      toast.error('Gagal memuat dashboard admin')
      setLoading(false)
    })
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const handleAutoPkm = async () => {
    if (isApplyingPkm) return
    setIsApplyingPkm(true)
    try {
      const res = await adminService.autoCalculatePkm(30, 4)
      if (res.success) {
        toast.success(res.message || 'PKM 4 hari berhasil diterapkan ke seluruh produk!')
        loadDashboard()
      } else {
        toast.error(res.message || 'Gagal menerapkan kalkulasi PKM')
      }
    } catch {
      toast.error('Terjadi kesalahan saat memproses PKM')
    } finally {
      setIsApplyingPkm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Menghubungkan Otak Syaraf Koperasi...</p>
        </div>
      </div>
    )
  }

  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
      <AlertCircle className="w-10 h-10" />
      <p className="text-sm font-medium">Gagal memuat data syaraf operasional</p>
    </div>
  )

  const realHutangRatio = data.total_saldo_anggota > 0
    ? Math.round((data.total_hutang_beredar / data.total_saldo_anggota) * 100)
    : 0

  const stokKritisCount = data.stok_kritis_count || 0
  const setoranPendingCount = data.setoran_pending_count || 0
  const setoranPendingNominal = data.setoran_pending_nominal || 0
  const anggotaKritisCount = data.anggota_limit_kritis_count || 0

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 max-w-lg md:max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Dashboard Eksekutif
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Pusat Kendali & Tata Kelola Operasional Koperasi</p>
        </div>
        <button
          onClick={loadDashboard}
          className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 active:scale-95 transition-transform"
          title="Segarkan Metrik"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Hero: Pendapatan & Laba Hari Ini (Full Width) ── */}
      <div 
        onClick={() => navigate('/admin/laporan')}
        className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-transform cursor-pointer"
        title="Klik untuk membuka Laporan Transaksi Lengkap"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Penjualan Toko Hari Ini</p>
            <h2 className="text-3xl font-black mt-1 tracking-tight">
              {formatRupiah(data.total_pendapatan_hari_ini)}
            </h2>
          </div>
          <div className="bg-white/20 p-2.5 rounded-2xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/20">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-blue-200" />
            <span className="text-sm font-bold">{data.total_transaksi_hari_ini}</span>
            <span className="text-xs text-blue-200">struk selesai</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-200" />
            <span className="text-sm font-bold">{formatRupiah(data.total_keuntungan_hari_ini)}</span>
            <span className="text-xs text-blue-200">laba bersih</span>
          </div>
        </div>
      </div>

      {/* ── Executive Quick Action Hub (Pusat Aksi Cepat 1-Sentuh) ── */}
      <div className="p-3 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Aksi Cepat Admin</span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">1-Sentuhan</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={handleAutoPkm}
            disabled={isApplyingPkm}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-100 dark:border-zinc-700/60 flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all text-slate-700 dark:text-slate-200"
            title="Hitung otomatis kapasitas batas pajang rak toko sesuai penjualan 4 hari"
          >
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Zap className={`w-4 h-4 ${isApplyingPkm ? 'animate-spin' : ''}`} />
            </div>
            <span className="text-xs font-bold leading-tight">Atur Stok Rak</span>
            <span className="text-[10px] text-slate-400">Otomatis 4 hari laku</span>
          </button>

          <button
            onClick={() => navigate('/admin/setoran-kasir')}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-100 dark:border-zinc-700/60 flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all text-slate-700 dark:text-slate-200"
          >
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 relative">
              <Wallet className="w-4 h-4" />
              {setoranPendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </div>
            <span className="text-xs font-bold leading-tight">Terima Setor</span>
            <span className="text-[10px] text-slate-400">{setoranPendingCount} antrean</span>
          </button>

          <button
            onClick={() => navigate('/admin/barang')}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-100 dark:border-zinc-700/60 flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all text-slate-700 dark:text-slate-200"
          >
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Kulakan Masuk</span>
            <span className="text-[10px] text-slate-400">Restock stok</span>
          </button>

          <button
            onClick={() => navigate('/admin/laporan-selisih')}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-100 dark:border-zinc-700/60 flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all text-slate-700 dark:text-slate-200"
          >
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
              <Scale className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Audit Selisih</span>
            <span className="text-[10px] text-slate-400">Payroll kasir</span>
          </button>
        </div>
      </div>

      {/* ── Operational Radars & Critical Alerts ── */}
      {((data.expired_count || 0) > 0) && (
        <div 
          onClick={() => navigate('/admin/barang')}
          className="p-4 rounded-3xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertCircle className="w-5 h-5 animate-pulse text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-rose-900 dark:text-rose-200">
                Waspada Kadaluarsa: {data.expired_count} Barang Sudah Lewat Tanggal!
              </h3>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                Segera lakukan penarikan / pemusnahan (write-off) dari rak toko dan gudang.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-600 shrink-0" />
        </div>
      )}

      {((data.near_expiry_count || 0) > 0) && (
        <div 
          onClick={() => navigate('/admin/barang')}
          className="p-4 rounded-3xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-600 dark:text-orange-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-orange-900 dark:text-orange-200">
                Near Expiry: {data.near_expiry_count} Barang Mendekati Kadaluarsa (&le; 30 Hari)
              </h3>
              <p className="text-[11px] text-orange-700 dark:text-orange-400 mt-0.5">
                Prioritaskan rotasi FEFO di etalase atau aktifkan program diskon cuci gudang.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-orange-600 shrink-0" />
        </div>
      )}

      {stokKritisCount > 0 && (
        <div 
          onClick={() => navigate('/admin/pkm')}
          className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-amber-900 dark:text-amber-200">
                Peringatan Restock: {stokKritisCount} Barang Kritis (&lt; PKM 4 Hari)
              </h3>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                Segera lakukan kulakan pengadaan untuk mencegah kehabisan stok display toko.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
        </div>
      )}

      {setoranPendingCount > 0 && (
        <div 
          onClick={() => navigate('/admin/setoran-kasir')}
          className="p-4 rounded-3xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-blue-900 dark:text-blue-200">
                Uang Kasir Tertahan: {formatRupiah(setoranPendingNominal)}
              </h3>
              <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                {setoranPendingCount} setoran kasir menunggu validasi penerimaan fisik ke brankas.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-600 shrink-0" />
        </div>
      )}

      {/* ── 2-Col Grid: Anggota + Aset Barang ── */}
      <div className="grid grid-cols-2 gap-3">
        <div 
          onClick={() => navigate('/admin/anggota')}
          className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 shadow-xs hover:border-blue-300 dark:hover:border-blue-800 active:bg-slate-50 dark:active:bg-zinc-800 transition-all cursor-pointer"
          title="Buka Data Master Anggota"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Anggota</span>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-xl">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{data.total_anggota}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            anggota aktif <ChevronRight className="w-3 h-3" />
          </p>
        </div>

        <div 
          onClick={() => navigate('/admin/barang')}
          className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 shadow-xs hover:border-amber-300 dark:hover:border-amber-800 active:bg-slate-50 dark:active:bg-zinc-800 transition-all cursor-pointer"
          title="Buka Katalog Inventori & Expired Radar"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aset Barang</span>
            <div className="bg-amber-100 dark:bg-amber-900/30 p-1.5 rounded-xl">
              <Package className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
            {formatRupiah(data.total_aset_barang)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            nilai inventori <ChevronRight className="w-3 h-3" />
          </p>
        </div>
      </div>

      {/* ── 2-Col Grid: Simpanan + SHU ── */}
      <div className="grid grid-cols-2 gap-3">
        <div 
          onClick={() => navigate('/admin/anggota')}
          className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 active:bg-slate-50 dark:active:bg-zinc-800 transition-all cursor-pointer"
          title="Cek Saldo Anggota"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Simpanan</span>
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-xl">
              <Wallet className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
            {formatRupiah(data.total_saldo_anggota)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            saldo e-wallet <ChevronRight className="w-3 h-3" />
          </p>
        </div>

        <div 
          onClick={() => navigate('/admin/shu')}
          className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 shadow-xs hover:border-pink-300 dark:hover:border-pink-800 active:bg-slate-50 dark:active:bg-zinc-800 transition-all cursor-pointer"
          title="Buka Manajemen SHU Koperasi"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dana SHU</span>
            <div className="bg-pink-100 dark:bg-pink-900/30 p-1.5 rounded-xl">
              <Gift className="w-4 h-4 text-pink-600" />
            </div>
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
            {formatRupiah(data.total_shu_tersedia)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            terkumpul <ChevronRight className="w-3 h-3" />
          </p>
        </div>
      </div>

      {/* ── Piutang Card (Full Width with Credit Risk Indicator) ── */}
      <div 
        onClick={() => navigate('/admin/anggota')}
        className={`rounded-3xl p-4 shadow-xs border cursor-pointer active:scale-[0.98] transition-transform ${
        realHutangRatio > 80
          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
          : realHutangRatio > 50
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
          : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
      }`}
        title="Pantau Piutang Anggota"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Piutang Anggota</p>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {formatRupiah(data.total_hutang_beredar)}
            </p>
          </div>
          <div className={`p-2 rounded-2xl ${realHutangRatio > 50 ? 'bg-rose-100 dark:bg-rose-900/40' : 'bg-slate-100 dark:bg-zinc-800'}`}>
            <CreditCard className={`w-5 h-5 ${realHutangRatio > 50 ? 'text-rose-600' : 'text-slate-500'}`} />
          </div>
        </div>

        {/* Progress bar: Hutang vs Simpanan ratio */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Rasio Piutang / Simpanan Pokok</span>
            <span className={`font-bold ${realHutangRatio > 80 ? 'text-rose-600' : realHutangRatio > 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {realHutangRatio}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                realHutangRatio > 80 ? 'bg-rose-500' : realHutangRatio > 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, realHutangRatio)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1">
              {realHutangRatio > 80 ? (
                <><AlertCircle className="w-3 h-3 text-rose-500" /><span className="text-[10px] text-rose-500 font-semibold">Risiko tinggi — dorong pelunasan hutang</span></>
              ) : realHutangRatio > 50 ? (
                <><AlertCircle className="w-3 h-3 text-amber-500" /><span className="text-[10px] text-amber-500 font-semibold">Perlu perhatian</span></>
              ) : (
                <><CheckCircle2 className="w-3 h-3 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-semibold">Likuiditas sehat</span></>
              )}
            </div>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>

    </div>
  )
}

export default AdminDashboard
