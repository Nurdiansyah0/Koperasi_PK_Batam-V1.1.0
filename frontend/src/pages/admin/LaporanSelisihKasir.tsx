import React, { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Scale, 
  UserX, 
  TrendingDown, 
  Search, 
  ChevronRight, 
  Calendar, 
  FileSpreadsheet, 
  Banknote, 
  PackageMinus, 
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Eye,
  SlidersHorizontal
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { adminService } from '@/services/adminService'
import { formatRupiah, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface RekapKasir {
  kasir_id: number
  kasir_name: string
  total_shift_selesai: number
  total_shift_ada_selisih: number
  total_minus_barang_nominal: number
  total_minus_kas_nominal: number
  total_akumulasi_kerugian: number
}

interface DiscrepantItem {
  nama_barang: string
  selisih: number
  harga_jual: number
  selisih_nominal: number
}

interface RiwayatSelisih {
  serah_id: number
  kasir_from_name: string
  kasir_to_name: string
  created_at: string
  uang_fisik: number
  saldo_kas_sistem: number
  selisih_kas: number
  total_minus_barang_nominal: number
  total_kerugian_shift: number
  catatan?: string
  discrepant_items: DiscrepantItem[]
}

export function LaporanSelisihKasir() {
  const [loading, setLoading] = useState(true)
  const [rekapList, setRekapList] = useState<RekapKasir[]>([])
  const [riwayatList, setRiwayatList] = useState<RiwayatSelisih[]>([])
  const [activeTab, setActiveTab] = useState<'rekap' | 'riwayat'>('rekap')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedShift, setSelectedShift] = useState<RiwayatSelisih | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await adminService.getLaporanSelisihKasir()
      if (res.success && res.data) {
        setRekapList(res.data.rekap_per_kasir || [])
        setRiwayatList(res.data.riwayat_selisih || [])
      }
    } catch (err) {
      toast.error('Gagal memuat laporan selisih kasir')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // High-level Metrics
  const totalKerugianAkumulasi = rekapList.reduce((acc, curr) => acc + curr.total_akumulasi_kerugian, 0)
  const totalMinusBarangAll = rekapList.reduce((acc, curr) => acc + curr.total_minus_barang_nominal, 0)
  const totalMinusKasAll = rekapList.reduce((acc, curr) => acc + curr.total_minus_kas_nominal, 0)
  const totalShiftBermasalah = rekapList.reduce((acc, curr) => acc + curr.total_shift_ada_selisih, 0)

  const filteredRekap = rekapList.filter(k => 
    k.kasir_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredRiwayat = riwayatList.filter(r => 
    r.kasir_from_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.kasir_to_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.serah_id).includes(searchQuery)
  )

  return (
    <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-xl">
              <Scale className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Audit & Akuntabilitas Toko</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Laporan Selisih & Kerugian Kasir
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekapitulasi akumulasi minus barang etalase dan selisih kas laci untuk pemotongan payroll (*Payroll Deduction*).
          </p>
        </div>

        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          className="rounded-xl text-xs flex items-center gap-2 self-start sm:self-auto active:scale-95"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
      </div>

      {/* ─── Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-semibold">
            <span>Total Kerugian Shift</span>
            <span className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <TrendingDown className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600">
            {formatRupiah(totalKerugianAkumulasi)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {totalShiftBermasalah} shift mengalami selisih
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-semibold">
            <span>Minus Barang / Rokok</span>
            <span className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <PackageMinus className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
            {formatRupiah(totalMinusBarangAll)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Shrinkage barang etalase
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-semibold">
            <span>Minus Uang Kas Laci</span>
            <span className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <Banknote className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">
            {formatRupiah(totalMinusKasAll)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Cash shortage shift kasir
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-semibold">
            <span>Kasir Terdaftar</span>
            <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {rekapList.length} Petugas
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Akuntabilitas per shift
          </div>
        </Card>
      </div>

      {/* ─── Filter & Navigation Tabs ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl">
          <button
            onClick={() => setActiveTab('rekap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'rekap' 
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Rekap Payroll Kasir ({rekapList.length})
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'riwayat' 
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Audit Log Shift ({riwayatList.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kasir atau shift ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* ─── TAB 1: REKAP KASIR (PAYROLL DEDUCTION SUMMARY) ─── */}
      {activeTab === 'rekap' && (
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Memuat rekap selisih kasir...</div>
          ) : filteredRekap.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Seluruh Kasir Tertib & Bersih</p>
              <p className="text-xs text-slate-400 mt-0.5">Tidak ditemukan akumulasi minus barang ataupun kas pada data kasir.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredRekap.map((k) => {
                const hasLoss = k.total_akumulasi_kerugian > 0
                return (
                  <div
                    key={k.kasir_id}
                    className={`p-4 rounded-3xl bg-white dark:bg-zinc-900 border transition-all ${
                      hasLoss 
                        ? 'border-rose-200 dark:border-rose-900/40 shadow-xs' 
                        : 'border-slate-200/80 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          {k.kasir_name}
                          {hasLoss && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-full">
                              Ada Selisih
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          ID Staf: #{k.kasir_id} &bull; {k.total_shift_selesai} Total Shift
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Potongan Gaji</div>
                        <div className={`text-base font-black ${hasLoss ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatRupiah(k.total_akumulasi_kerugian)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs">
                      <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Minus Barang (Etalase)</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {formatRupiah(k.total_minus_barang_nominal)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Minus Kas (Laci)</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {formatRupiah(k.total_minus_kas_nominal)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: AUDIT LOG SHIFT (CHRONOLOGICAL DETAIL) ─── */}
      {activeTab === 'riwayat' && (
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Memuat riwayat serah terima...</div>
          ) : filteredRiwayat.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800">
              <p className="text-xs">Tidak ada riwayat shift yang sesuai dengan pencarian.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 overflow-hidden">
              {filteredRiwayat.map((r) => {
                const isLoss = r.total_kerugian_shift > 0
                return (
                  <div 
                    key={r.serah_id} 
                    className="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          Shift #{r.serah_id}
                        </span>
                        <span className="text-xs text-slate-500">
                          <b className="text-slate-700 dark:text-slate-300">@{r.kasir_from_name}</b> &rarr; <b className="text-slate-700 dark:text-slate-300">@{r.kasir_to_name}</b>
                        </span>
                        <Badge variant={isLoss ? 'danger' : 'success'} className="text-[10px]">
                          {isLoss ? `Minus ${formatRupiah(r.total_kerugian_shift)}` : 'Sesuai (Pas)'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(r.created_at)}
                        </span>
                        <span>Uang Fisik: <b className="text-slate-600 dark:text-slate-300">{formatRupiah(r.uang_fisik)}</b></span>
                        {r.selisih_kas !== 0 && (
                          <span className={r.selisih_kas < 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                            Selisih Kas: {formatRupiah(r.selisih_kas)}
                          </span>
                        )}
                      </div>

                      {r.catatan && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg inline-block">
                          "{r.catatan}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {r.discrepant_items.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedShift(r)}
                          className="rounded-xl text-xs flex items-center gap-1 text-rose-600 border-rose-200 dark:border-rose-900"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {r.discrepant_items.length} Item Selisih
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL DETAIL ITEM SELISIH ─── */}
      {selectedShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Rincian Item Selisih Shift #{selectedShift.serah_id}
                </h3>
                <p className="text-xs text-slate-500">
                  Pengirim: @{selectedShift.kasir_from_name} &bull; {formatDate(selectedShift.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedShift(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-60 overflow-y-auto">
              {selectedShift.discrepant_items.map((it, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{it.nama_barang}</span>
                    <span className="text-[11px] text-slate-400">@ {formatRupiah(it.harga_jual)}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-rose-600 block">
                      {it.selisih} pcs
                    </span>
                    <span className="text-[10px] font-bold text-rose-500">
                      {formatRupiah(it.selisih_nominal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl text-xs font-bold"
                onClick={() => setSelectedShift(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LaporanSelisihKasir
