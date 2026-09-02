import React, { useState, useEffect } from 'react'
import { 
  Coins, 
  Banknote, 
  CreditCard, 
  ShieldCheck, 
  Sparkles, 
  ArrowRightLeft, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  Users,
  Search,
  Check,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { adminService } from '@/services/adminService'
import { formatRupiah } from '@/lib/utils'
import { toast } from 'react-hot-toast'

export const ManajemenShuPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'massal' | 'kompensasi' | 'individual' | 'anggota' | 'riwayat'>('massal')
  const [searchAnggota, setSearchAnggota] = useState('')

  // Action Form States
  const [massPercentage, setMassPercentage] = useState<number>(100)
  const [massSubmitting, setMassSubmitting] = useState(false)

  const [selectedAnggotaId, setSelectedAnggotaId] = useState<number | null>(null)
  const [individualNominal, setIndividualNominal] = useState<number | ''>('')
  const [individualSubmitting, setIndividualSubmitting] = useState(false)

  const [offsetSubmittingId, setOffsetSubmittingId] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await adminService.getShuManagement()
      if (res.success) {
        setData(res.data)
      }
    } catch (err) {
      console.error('Gagal memuat data manajemen SHU:', err)
      toast.error('Gagal memuat data manajemen SHU')
    } finally {
      setLoading(false)
    }
  }

  const handleMassDistribution = async () => {
    if (!window.confirm(`Konfirmasi: Distribusikan ${massPercentage}% jatah SHU ke Saldo E-Wallet belanja seluruh anggota?`)) {
      return
    }

    setMassSubmitting(true)
    try {
      const res = await adminService.prosesKonversiShu({
        mode: 'massal_ke_saldo',
        persentase: massPercentage,
        keterangan: `Distribusi Massal ${massPercentage}% SHU ke Saldo Belanja Hari Raya`
      })

      if (res.success) {
        toast.success(res.message || 'Distribusi massal berhasil dieksekusi!')
        fetchData()
      } else {
        toast.error(res.message || 'Gagal mengeksekusi distribusi massal')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat distribusi massal')
    } finally {
      setMassSubmitting(false)
    }
  }

  const handleAutoOffsetDebt = async (anggotaId: number, maxPotong: number) => {
    if (!window.confirm(`Konfirmasi: Potong SHU sebesar ${formatRupiah(maxPotong)} untuk melunasi hutang belanja anggota ini?`)) {
      return
    }

    setOffsetSubmittingId(anggotaId)
    try {
      const res = await adminService.prosesKonversiShu({
        mode: 'pelunasan_hutang',
        anggota_id: anggotaId,
        nominal: maxPotong,
        keterangan: 'Kompensasi Pelunasan Hutang dari Saldo SHU'
      })

      if (res.success) {
        toast.success(res.message || 'Hutang berhasil dilunasi dari SHU!')
        fetchData()
      } else {
        toast.error(res.message || 'Gagal melunasi hutang dari SHU')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat memproses pelunasan hutang')
    } finally {
      setOffsetSubmittingId(null)
    }
  }

  const handleIndividualConversion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAnggotaId || !individualNominal || Number(individualNominal) <= 0) {
      toast.error('Pilih anggota dan masukkan nominal konversi yang valid')
      return
    }

    setIndividualSubmitting(true)
    try {
      const res = await adminService.prosesKonversiShu({
        mode: 'individual',
        anggota_id: selectedAnggotaId,
        nominal: Number(individualNominal),
        keterangan: 'Konversi Mandiri SHU ke Saldo Belanja E-Wallet'
      })

      if (res.success) {
        toast.success(res.message || 'Konversi SHU ke Saldo berhasil!')
        fetchData()
        setSelectedAnggotaId(null)
        setIndividualNominal('')
      } else {
        toast.error(res.message || 'Gagal memproses konversi SHU')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat konversi')
    } finally {
      setIndividualSubmitting(false)
    }
  }

  const summary = data?.summary
  const anggotaList = data?.anggota || []
  const riwayatList = data?.riwayat_konversi || []

  const filteredAnggota = anggotaList.filter((a: any) =>
    a.nama_lengkap.toLowerCase().includes(searchAnggota.toLowerCase()) ||
    String(a.anggota_id).includes(searchAnggota)
  )

  const indebtedMembers = anggotaList.filter((a: any) => a.hutang > 0 && a.shu > 0)

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                <Coins className="w-5 h-5 text-blue-200" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Otoritas Admin & Keuangan</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Manajemen SHU & Distribusi Saldo</h1>
            <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-2xl">
              Kelola konversi SHU ke Saldo Belanja E-Wallet, eksekusi distribusi Hari Raya, kompensasi pelunasan hutang otomatis, dan pantau Master Consent anggota.
            </p>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData} 
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold text-emerald-800 dark:text-emerald-300">Total Hak SHU Anggota</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
            {formatRupiah(summary?.total_shu || 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Akumulasi jasa usaha berjalan</div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm p-4 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold text-blue-800 dark:text-blue-300">Total Saldo E-Wallet</span>
            <Banknote className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-700 dark:text-blue-400">
            {formatRupiah(summary?.total_saldo || 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Uang belanja aktif di sistem</div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm p-4 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold text-rose-800 dark:text-rose-300">Total Piutang Hutang</span>
            <CreditCard className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700 dark:text-rose-400">
            {formatRupiah(summary?.total_hutang || 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Uang tertahan di anggota</div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold text-indigo-800 dark:text-indigo-300">Master Consent SHU</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-700 dark:text-indigo-400">
            {summary?.anggota_consent_count || 0} / {summary?.total_anggota || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{summary?.consent_percentage || 0}% Anggota Menyetujui</div>
        </Card>
      </div>

      {/* Navigation Action Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('massal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'massal'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Distribusi Hari Raya (Massal)</span>
        </button>

        <button
          onClick={() => setActiveTab('kompensasi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'kompensasi'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
          <span>Auto-Pelunasan Hutang</span>
          {indebtedMembers.length > 0 && (
            <span className="px-2 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
              {indebtedMembers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'individual'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4 text-blue-500" />
          <span>Konversi Individual</span>
        </button>

        <button
          onClick={() => setActiveTab('anggota')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'anggota'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Status Master Consent ({anggotaList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('riwayat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'riwayat'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
          <span>Log Mutasi Konversi</span>
        </button>
      </div>

      {/* Tab 1: Distribusi Massal Hari Raya */}
      {activeTab === 'massal' && (
        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Distribusi Massal SHU ke Saldo Belanja Hari Raya / RAT</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Pindahkan saldo SHU seluruh anggota ke Saldo E-Wallet secara serentak agar dapat dibelanjakan di toko koperasi
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Strategi Closed-Loop Ekonomi Koperasi:</span>
              </div>
              <p className="leading-relaxed text-[11px] text-amber-800 dark:text-amber-300">
                Dengan memindahkan SHU ke Saldo Belanja, kas koperasi <strong>tidak terkuras keluar</strong>, melainkan anggota langsung membelanjakannya untuk sembako dan kebutuhan toko koperasi. Omzet penjualan toko melonjak drastis dan perputaran kas tetap aman di dalam koperasi.
              </p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  Pilih Persentase Distribusi SHU:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setMassPercentage(pct)}
                      className={`p-3 rounded-2xl border text-center font-bold text-sm transition-all ${
                        massPercentage === pct
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Total SHU Tersedia di Sistem:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(summary?.total_shu || 0)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Estimasi Dana Dipindahkan ke Saldo:</span>
                  <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                    {formatRupiah(((summary?.total_shu || 0) * massPercentage) / 100)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleMassDistribution}
                disabled={massSubmitting || (summary?.total_shu || 0) <= 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-8 py-3 rounded-xl shadow-md flex items-center gap-2"
              >
                {massSubmitting ? 'Memproses Distribusi Massal...' : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Eksekusi Distribusi Massal {massPercentage}% ke Saldo Belanja</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Auto-Pelunasan Hutang */}
      {activeTab === 'kompensasi' && (
        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Kompensasi Pelunasan Hutang dari SHU</CardTitle>
                <CardDescription className="text-xs">
                  Otomatis potong saldo SHU untuk melunasi tagihan hutang belanja anggota yang menunggak
                </CardDescription>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                {indebtedMembers.length} Anggota Dapat Dikompensasi
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {indebtedMembers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700 dark:text-slate-300">Tidak ada hutang yang perlu dikompensasi.</p>
                <p>Seluruh anggota yang memiliki hutang tidak memiliki saldo SHU atau sudah bebas hutang.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {indebtedMembers.map((a: any) => {
                  const maxPotong = Math.min(a.shu, a.hutang)
                  return (
                    <div key={a.anggota_id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {a.nama_lengkap} <span className="font-mono text-xs text-slate-400 font-normal">#{a.anggota_id}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>Hutang: <strong className="text-rose-600">{formatRupiah(a.hutang)}</strong></span>
                          <span>• Saldo SHU: <strong className="text-emerald-600">{formatRupiah(a.shu)}</strong></span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={offsetSubmittingId === a.anggota_id}
                        onClick={() => handleAutoOffsetDebt(a.anggota_id, maxPotong)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Potong SHU {formatRupiah(maxPotong)}</span>
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Konversi Individual */}
      {activeTab === 'individual' && (
        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base">Konversi Mandiri SHU ke Saldo Belanja Individual</CardTitle>
            <CardDescription className="text-xs">
              Pindahkan jatah SHU anggota tertentu ke saldo belanja E-Wallet sesuai permintaan
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleIndividualConversion} className="space-y-4 max-w-lg">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Pilih Anggota:
                </label>
                <select
                  value={selectedAnggotaId || ''}
                  onChange={(e) => setSelectedAnggotaId(Number(e.target.value) || null)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Anggota Koperasi --</option>
                  {anggotaList.filter((a: any) => a.shu > 0).map((a: any) => (
                    <option key={a.anggota_id} value={a.anggota_id}>
                      {a.nama_lengkap} (SHU: {formatRupiah(a.shu)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Nominal SHU yang Dipindahkan ke Saldo:
                </label>
                <input
                  type="number"
                  min="1000"
                  required
                  placeholder="0"
                  value={individualNominal}
                  onChange={(e) => setIndividualNominal(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button
                type="submit"
                disabled={individualSubmitting || !selectedAnggotaId || !individualNominal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md"
              >
                {individualSubmitting ? 'Memproses...' : 'Pindahkan ke Saldo Belanja'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Daftar Anggota & Status Master Consent */}
      {activeTab === 'anggota' && (
        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Daftar Anggota & Status Pakta Integritas SHU</CardTitle>
                <CardDescription className="text-xs">
                  Pantau kepatuhan Master Consent 1x di awal untuk seluruh 85 anggota
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama anggota..."
                  value={searchAnggota}
                  onChange={(e) => setSearchAnggota(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Anggota</th>
                    <th className="p-3 text-right">Saldo E-Wallet</th>
                    <th className="p-3 text-right">Akumulasi SHU</th>
                    <th className="p-3 text-right">Hutang</th>
                    <th className="p-3 text-center">Status Master Consent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAnggota.map((a: any) => (
                    <tr key={a.anggota_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        <div>{a.nama_lengkap}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: #{a.anggota_id}</div>
                      </td>
                      <td className="p-3 text-right font-medium text-blue-600">
                        {formatRupiah(a.saldo)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {formatRupiah(a.shu)}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600">
                        {formatRupiah(a.hutang)}
                      </td>
                      <td className="p-3 text-center">
                        {a.has_master_consent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Disetujui (Aktif)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                            <AlertTriangle className="w-3 h-3" /> Belum Diisi
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Riwayat Mutasi Konversi */}
      {activeTab === 'riwayat' && (
        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-3">
            <CardTitle className="text-base">Log Riwayat Konversi & Distribusi SHU</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {riwayatList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Belum ada transaksi mutasi konversi SHU yang tercatat.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {riwayatList.map((r: any) => (
                  <div key={r.konversi_id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[10px]">#{r.konversi_id}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{r.nama_anggota}</span>
                        <span className="px-2 py-0.2 rounded-md font-bold text-[9px] uppercase bg-blue-100 text-blue-800">
                          {r.tipe_konversi.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="font-black text-blue-600 text-sm">{formatRupiah(r.nominal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Keterangan: {r.keterangan || '-'} • Oleh Admin: {r.admin_name}</span>
                      <span>{new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ManajemenShuPage
