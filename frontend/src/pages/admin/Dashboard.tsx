import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '@/services/adminService'
import { DashboardAdmin } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { IosBottomSheet } from '@/components/ios/IosBottomSheet'
import {
  TrendingUp, ArrowUpRight, ShoppingBag,
  CreditCard, Wallet, Package, Gift, Users,
  AlertCircle, CheckCircle2, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

export function AdminDashboard() {
  const [data, setData] = useState<DashboardAdmin | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSheet, setActiveSheet] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    adminService.getDashboard().then((res) => {
      setData(res as any)
      setLoading(false)
    }).catch(() => {
      toast.error('Gagal memuat dashboard')
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
      <AlertCircle className="w-10 h-10" />
      <p className="text-sm font-medium">Gagal memuat dashboard</p>
    </div>
  )

  const realHutangRatio = data.total_saldo_anggota > 0
    ? Math.round((data.total_hutang_beredar / data.total_saldo_anggota) * 100)
    : 0
  const hutangRatio = Math.min(100, realHutangRatio)

  return (
    <div className="space-y-5 pb-24 max-w-lg md:max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Dashboard Admin
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Ringkasan operasional Koperasi Karyawan PKPPK BTH</p>
      </div>

      {/* ── Hero: Pendapatan Hari Ini (full width) ── */}
      <div 
        onClick={() => setActiveSheet('pendapatan')}
        className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform cursor-pointer"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Pendapatan Hari Ini</p>
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
            <span className="text-xs text-blue-200">transaksi</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-200" />
            <span className="text-sm font-bold">{formatRupiah(data.total_keuntungan_hari_ini)}</span>
            <span className="text-xs text-blue-200">keuntungan</span>
          </div>
        </div>
      </div>

      {/* ── 2-col grid: Anggota + Aset Barang ── */}
      <div className="grid grid-cols-2 gap-3">
        <div 
          onClick={() => setActiveSheet('anggota')}
          className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 shadow-xs active:bg-slate-50 dark:active:bg-zinc-800 transition-colors cursor-pointer"
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
          onClick={() => setActiveSheet('aset')}
          className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 shadow-xs active:bg-slate-50 dark:active:bg-zinc-800 transition-colors cursor-pointer"
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

      {/* ── 2-col grid: Simpanan + SHU ── */}
      <div className="grid grid-cols-2 gap-3">
        <div 
          onClick={() => setActiveSheet('simpanan')}
          className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 shadow-xs active:bg-slate-50 dark:active:bg-zinc-800 transition-colors cursor-pointer"
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
          onClick={() => setActiveSheet('shu')}
          className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 shadow-xs active:bg-slate-50 dark:active:bg-zinc-800 transition-colors cursor-pointer"
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

      {/* ── Piutang Card (full width with risk indicator) ── */}
      <div 
        onClick={() => setActiveSheet('piutang')}
        className={`rounded-3xl p-4 shadow-xs border cursor-pointer active:scale-[0.98] transition-transform ${
        realHutangRatio > 80
          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
          : realHutangRatio > 50
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
          : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800'
      }`}>
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
            <span>Rasio Piutang/Simpanan</span>
            <span className={`font-bold ${realHutangRatio > 80 ? 'text-rose-600' : realHutangRatio > 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {realHutangRatio}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                realHutangRatio > 80 ? 'bg-rose-500' : realHutangRatio > 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${realHutangRatio}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1">
              {realHutangRatio > 80 ? (
                <><AlertCircle className="w-3 h-3 text-rose-500" /><span className="text-[10px] text-rose-500 font-semibold">Risiko tinggi — dorong pelunasan hutang</span></>
              ) : realHutangRatio > 50 ? (
                <><AlertCircle className="w-3 h-3 text-amber-500" /><span className="text-[10px] text-amber-500 font-semibold">Perlu perhatian</span></>
              ) : (
                <><CheckCircle2 className="w-3 h-3 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-semibold">Kondisi sehat</span></>
              )}
            </div>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* --- Detail Matrix Bottom Sheets --- */}
      
      {/* Pendapatan Sheet */}
      <IosBottomSheet isOpen={activeSheet === 'pendapatan'} onClose={() => setActiveSheet(null)} title="Matriks Pendapatan">
        <div className="p-4 space-y-4">
          <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-500">Pendapatan Kotor</span>
              <span className="font-bold">{formatRupiah(data.total_pendapatan_hari_ini)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-500">Margin Keuntungan Netto</span>
              <span className="font-bold text-emerald-600">{formatRupiah(data.total_keuntungan_hari_ini)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-zinc-600">
              <span className="text-sm text-slate-500">Total Transaksi</span>
              <span className="font-bold">{data.total_transaksi_hari_ini} trx</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center">Matriks ini menghitung semua transaksi berstatus 'selesai' pada hari ini.</p>
          <button onClick={() => navigate('/admin/laporan')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold active:scale-95 transition-transform">
            Lihat Laporan Transaksi
          </button>
        </div>
      </IosBottomSheet>

      {/* Anggota Sheet */}
      <IosBottomSheet isOpen={activeSheet === 'anggota'} onClose={() => setActiveSheet(null)} title="Matriks Anggota">
        <div className="p-4 space-y-4">
          <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700">
             <div className="flex justify-between items-center text-lg">
              <span className="text-slate-500">Total Anggota Terdaftar</span>
              <span className="font-black text-blue-600">{data.total_anggota} Orang</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center">Data anggota koperasi yang memiliki akun aktif di sistem.</p>
          <button onClick={() => navigate('/admin/anggota')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold active:scale-95 transition-transform">
            Kelola Data Anggota
          </button>
        </div>
      </IosBottomSheet>

      {/* Aset Barang Sheet */}
      <IosBottomSheet isOpen={activeSheet === 'aset'} onClose={() => setActiveSheet(null)} title="Matriks Aset Barang">
        <div className="p-4 space-y-4">
          <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700">
             <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-500">Total Nilai Inventori</span>
              <span className="font-bold text-amber-600">{formatRupiah(data.total_aset_barang)}</span>
            </div>
             <p className="text-[10px] text-slate-400 mt-2">Dihitung dari: &Sigma; (Stok Fisik &times; Harga Modal Dasar)</p>
          </div>
          <p className="text-xs text-slate-500 text-center">Angka ini merepresentasikan total modal Koperasi yang sedang tertahan dalam bentuk barang di gudang/toko.</p>
          <button onClick={() => navigate('/admin/barang')} className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold active:scale-95 transition-transform">
            Lihat Inventori Barang
          </button>
        </div>
      </IosBottomSheet>

      {/* Simpanan Sheet */}
      <IosBottomSheet isOpen={activeSheet === 'simpanan'} onClose={() => setActiveSheet(null)} title="Matriks Simpanan">
        <div className="p-4 space-y-4">
          <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700">
             <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Total Saldo E-Wallet</span>
              <span className="font-bold text-indigo-600">{formatRupiah(data.total_saldo_anggota)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center">Likuiditas kas digital Koperasi yang berasal dari top-up atau simpanan anggota aktif.</p>
          <button onClick={() => navigate('/admin/anggota')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold active:scale-95 transition-transform">
            Cek Saldo Anggota
          </button>
        </div>
      </IosBottomSheet>

      {/* SHU Sheet */}
      <IosBottomSheet isOpen={activeSheet === 'shu'} onClose={() => setActiveSheet(null)} title="Matriks SHU">
        <div className="p-4 space-y-4">
          <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700 space-y-3">
             <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-slate-500 block">SHU Anggota (60%)</span>
                <span className="text-[10px] text-slate-400">Belum dicairkan ke saldo</span>
              </div>
              <span className="font-bold text-pink-600">{formatRupiah(data.total_shu_tersedia)}</span>
            </div>
            
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-zinc-700">
              <span className="text-sm text-slate-500">Operasional Koperasi (30%)</span>
              <span className="font-bold text-amber-600">{formatRupiah(data.total_shu_koperasi)}</span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-zinc-700">
              <span className="text-sm text-slate-500">Jasa Pengurus (10%)</span>
              <span className="font-bold text-blue-600">{formatRupiah(data.total_shu_pengurus)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center">Dana ini adalah hak milik anggota yang belum dicairkan ke saldo e-wallet mereka.</p>
          <button onClick={() => navigate('/admin/anggota')} className="w-full py-3 bg-pink-600 text-white rounded-xl font-bold active:scale-95 transition-transform">
            Kelola Distribusi SHU
          </button>
        </div>
      </IosBottomSheet>

      {/* Piutang Sheet */}
      <IosBottomSheet isOpen={activeSheet === 'piutang'} onClose={() => setActiveSheet(null)} title="Matriks Piutang (Kredit)">
        <div className="p-4 space-y-4">
          <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700">
             <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-500">Total Piutang Berjalan</span>
              <span className="font-bold text-rose-600">{formatRupiah(data.total_hutang_beredar)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-zinc-600">
              <span className="text-sm text-slate-500">Tingkat Risiko Rasio</span>
              <span className={`font-bold ${realHutangRatio > 80 ? 'text-rose-600' : realHutangRatio > 50 ? 'text-amber-600' : 'text-emerald-600'}`}>{realHutangRatio}%</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center">Total pinjaman/belanja kredit yang sedang berjalan dan belum disetorkan ke kasir.</p>
          <button onClick={() => navigate('/admin/anggota')} className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold active:scale-95 transition-transform">
            Pantau Hutang Anggota
          </button>
        </div>
      </IosBottomSheet>

    </div>
  )
}

export default AdminDashboard
