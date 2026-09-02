import React, { useState, useEffect } from 'react'
import { 
  Banknote, 
  ShoppingBag, 
  TrendingUp, 
  Receipt, 
  Search, 
  FileSpreadsheet, 
  Calendar, 
  CheckCircle2, 
  Coins 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { adminService } from '@/services/adminService'
import { formatRupiah } from '@/lib/utils'
import type { TarikTunaiItem, LaporanTarikTunaiData } from '@/types'

export const LaporanTarikTunai: React.FC = () => {
  const [data, setData] = useState<LaporanTarikTunaiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await adminService.getLaporanTarikTunai()
      if (res.success) {
        setData(res)
      }
    } catch (err) {
      console.error('Gagal mengambil laporan tarik tunai:', err)
    } finally {
      setLoading(false)
    }
  }

  const list = data?.data || []
  const summary = data?.summary || {
    total_penarikan_count: 0,
    total_nominal_keluar: 0,
    total_sales_kontribusi: 0,
    rasio_sales_to_tarik: 0
  }

  const filteredList = list.filter(item => 
    (item.nama_anggota && item.nama_anggota.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.kasir_name && item.kasir_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    String(item.tarik_id).includes(searchQuery)
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
              <Banknote className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Laporan Keuangan & SHU</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Rekapitulasi Tarik Tunai & Kontribusi Sales</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring penarikan dana/SHU kasir serta kontribusi omzet belanja yang dihasilkan (Min. Rp 25.000).
          </p>
        </div>

        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          className="text-xs rounded-xl self-start sm:self-auto"
        >
          Muat Ulang
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total Penarikan Kas</span>
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <Banknote className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-rose-600">
            {formatRupiah(summary.total_nominal_keluar)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summary.total_penarikan_count} transaksi penarikan
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Omzet Belanja Penyerta</span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-emerald-600">
            {formatRupiah(summary.total_sales_kontribusi)}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
            Kontribusi omzet toko masuk
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Rasio Sales / Kas Keluar</span>
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-blue-600">
            {summary.rasio_sales_to_tarik}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Efektivitas perputaran belanja
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Aturan Kontribusi Toko</span>
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-amber-600">
            Min. Rp 25.000
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Persetujuan Sadar SHU Aktif
          </div>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Daftar Log Penarikan Tunai & SHU</CardTitle>
              <CardDescription className="text-xs">Riwayat lengkap mutasi penarikan kas dan struk belanja penyerta</CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari anggota / kasir..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Memuat data penarikan...</div>
          ) : filteredList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">Belum ada riwayat penarikan tunai yang tercatat.</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Waktu & ID</th>
                  <th className="px-4 py-3 font-bold">Anggota</th>
                  <th className="px-4 py-3 font-bold">Kasir Bertugas</th>
                  <th className="px-4 py-3 font-bold text-right">Nominal Tarik</th>
                  <th className="px-4 py-3 font-bold text-center">Sumber Dana</th>
                  <th className="px-4 py-3 font-bold">Struk Belanja Toko</th>
                  <th className="px-4 py-3 font-bold text-center">Persetujuan SHU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.map(item => (
                  <tr key={item.tarik_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-slate-400 text-[10px]">#TRK-{item.tarik_id}</div>
                      <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                        {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {item.nama_anggota}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {item.kasir_name}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-rose-600 text-sm">
                      {formatRupiah(item.nominal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                        item.sumber_dana === 'shu' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {item.sumber_dana}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatRupiah(item.belanja_nominal || 0)}
                        </span>
                        <span className="text-[10px] text-slate-400">(Trx #{item.transaksi_id || '-'})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" /> Disetujui Sadar
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LaporanTarikTunai
