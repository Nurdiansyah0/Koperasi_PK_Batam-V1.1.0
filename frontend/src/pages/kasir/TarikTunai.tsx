import React, { useState, useEffect } from 'react'
import { 
  Banknote, 
  Search, 
  UserCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Receipt, 
  Coins, 
  ShoppingBag, 
  ShieldCheck, 
  Printer, 
  Clock, 
  ArrowRight,
  Sparkles,
  Info,
  QrCode,
  Check,
  XCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { kasirService } from '@/services/kasirService'
import { formatRupiah } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import type { Anggota, KelayakanTarikTunai, TarikTunaiItem } from '@/types'

export const TarikTunai: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'antrean' | 'manual'>('antrean')
  
  // Antrean Pre-Verified Tickets
  const [antreanList, setAntreanList] = useState<any[]>([])
  const [processingQueueId, setProcessingQueueId] = useState<number | null>(null)

  // Manual Kasir Form State
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAnggota, setSelectedAnggota] = useState<Anggota | null>(null)
  
  const [eligibility, setEligibility] = useState<KelayakanTarikTunai | null>(null)
  const [loadingEligibility, setLoadingEligibility] = useState(false)

  const [nominal, setNominal] = useState<number | ''>('')
  const [sumberDana, setSumberDana] = useState<'shu' | 'saldo'>('shu')
  const [selectedTransaksiId, setSelectedTransaksiId] = useState<number | undefined>(undefined)
  const [potongBelanja, setPotongBelanja] = useState(true)
  const [persetujuanShu, setPersetujuanShu] = useState(false)
  const [keterangan, setKeterangan] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // History & Receipt Modal
  const [historyList, setHistoryList] = useState<TarikTunaiItem[]>([])
  const [receiptData, setReceiptData] = useState<any | null>(null)

  useEffect(() => {
    fetchAntrean()
    fetchAnggota()
    fetchHistory()
  }, [])

  const fetchAntrean = async () => {
    try {
      const data = await kasirService.getAntreanTarikTunai()
      setAntreanList(data || [])
    } catch (err) {
      console.error('Gagal memuat antrean tarik tunai:', err)
    }
  }

  const fetchAnggota = async () => {
    try {
      const data = await kasirService.getAllAnggota()
      setAnggotaList(data || [])
    } catch (err) {
      console.error('Gagal mengambil daftar anggota:', err)
    }
  }

  const fetchHistory = async () => {
    try {
      const data = await kasirService.getRiwayatTarikTunaiKasir()
      setHistoryList(data || [])
    } catch (err) {
      console.error('Gagal mengambil riwayat tarik tunai:', err)
    }
  }

  const handleProcessQueue = async (tarikId: number, action: 'approve' | 'reject') => {
    setProcessingQueueId(tarikId)
    try {
      const res = await kasirService.prosesTarikTunai({
        tarik_id: tarikId,
        action
      })
      if (res.success) {
        toast.success(res.message || 'Berhasil memproses pencairan kas')
        if (action === 'approve' && res.data) {
          setReceiptData(res.data)
        }
        fetchAntrean()
        fetchHistory()
      } else {
        toast.error(res.message || 'Gagal memproses tiket')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat memproses tiket')
    } finally {
      setProcessingQueueId(null)
    }
  }

  const handleSelectAnggota = async (anggota: Anggota) => {
    setSelectedAnggota(anggota)
    setNominal('')
    setPersetujuanShu(false)
    setSelectedTransaksiId(undefined)
    setLoadingEligibility(true)
    try {
      const res = await kasirService.cekKelayakanTarikTunai(anggota.anggota_id)
      if (res.success && res.data) {
        setEligibility(res.data)
        if (res.data.transaksi_valid_hari_ini && res.data.transaksi_valid_hari_ini.length > 0) {
          setSelectedTransaksiId(res.data.transaksi_valid_hari_ini[0].transaksi_id)
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengecek kelayakan transaksi anggota')
    } finally {
      setLoadingEligibility(false)
    }
  }

  const filteredAnggota = anggotaList.filter(a => 
    (a.nama_lengkap || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.username && a.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    String(a.anggota_id).includes(searchQuery)
  )

  const quickAmounts = [25000, 50000, 75000, 100000]

  const maxQuota = eligibility?.max_kuota_tarik_tunai ?? 100000
  const maxAvailable = selectedAnggota 
    ? (sumberDana === 'shu' 
        ? Math.min(Number(selectedAnggota.shu || 0), maxQuota) 
        : Math.min(Number(selectedAnggota.saldo || 0), 100000))
    : 0

  const handleProcessWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAnggota) {
      toast.error('Pilih anggota terlebih dahulu')
      return
    }
    if (!nominal || Number(nominal) < 1000) {
      toast.error('Masukkan nominal penarikan minimal Rp 1.000')
      return
    }
    if (Number(nominal) > maxAvailable) {
      toast.error(`Nominal melebihi batas maksimal penarikan (${formatRupiah(maxAvailable)})`)
      return
    }
    if (!eligibility?.has_qualifying_purchase) {
      toast.error('Penarikan tunai wajib disertai transaksi belanja toko lebih dari Rp 25.000 hari ini.')
      return
    }
    if (!persetujuanShu) {
      toast.error('Harap centang persetujuan sadar pemotongan SHU Hari Besar.')
      return
    }

    setSubmitting(true)
    try {
      const res = await kasirService.tarikTunai({
        anggota_id: selectedAnggota.anggota_id,
        nominal: Number(nominal),
        sumber_dana: sumberDana,
        persetujuan_shu: persetujuanShu,
        transaksi_id: selectedTransaksiId,
        keterangan: keterangan || undefined
      })

      if (res.success) {
        toast.success(res.message || 'Tarik tunai berhasil!')
        if (res.data) {
          setReceiptData(res.data)
        }
        setNominal('')
        setPersetujuanShu(false)
        setSelectedAnggota(null)
        setEligibility(null)
        fetchAntrean()
        fetchHistory()
      } else {
        toast.error(res.message || 'Gagal memproses tarik tunai')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat memproses penarikan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 bg-white/20 rounded-xl">
                <Banknote className="w-5 h-5 text-emerald-100" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Layanan Kasir POS</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Pencairan Tarik Tunai & SHU</h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
              Proses pencairan dana anggota yang telah terverifikasi otomatis oleh sistem (Belanja &gt; Rp 25.000 &amp; SHU mencukupi).
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs shrink-0">
            <ShoppingBag className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Plafon Tarik: <strong className="text-emerald-200">50% (SHU - Hutang), Maks. 100rb</strong></span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('antrean')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'antrean'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Antrean Tiket Terverifikasi</span>
          {antreanList.length > 0 && (
            <span className="px-2 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-black">
              {antreanList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'manual'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Cari & Input Manual</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Active View */}
        <div className="lg:col-span-7 space-y-6">
          {activeTab === 'antrean' ? (
            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Antrean Tiket Penarikan Mandiri</CardTitle>
                    <CardDescription className="text-xs">
                      Seluruh pengajuan di bawah ini telah lolos 100% verifikasi syarat belanja & bebas hutang
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchAntrean} className="text-xs rounded-xl">
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {antreanList.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                    <p>Tidak ada antrean tiket penarikan saat ini.</p>
                    <p className="text-[11px] text-slate-400">Anggota dapat mengajukan tiket melalui menu Tarik Tunai di akun anggotanya.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {antreanList.map(item => (
                      <div key={item.tarik_id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors text-xs space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                #{item.kode_penarikan}
                              </span>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {item.nama_anggota}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                              <span>Sumber: <strong className="uppercase text-slate-600 dark:text-slate-300">{item.sumber_dana}</strong></span>
                              <span>• Struk Belanja: #{item.transaksi_id || '-'} ({formatRupiah(item.belanja_nominal || 0)})</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                              {formatRupiah(item.nominal)}
                            </div>
                            <span className="text-[9px] text-slate-400">
                              {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Persetujuan Sadar SHU Terverifikasi
                          </span>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={processingQueueId === item.tarik_id}
                              onClick={() => handleProcessQueue(item.tarik_id, 'reject')}
                              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                            >
                              Tolak
                            </Button>
                            <Button
                              size="sm"
                              disabled={processingQueueId === item.tarik_id}
                              onClick={() => handleProcessQueue(item.tarik_id, 'approve')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Serahkan Kas ({formatRupiah(item.nominal)})</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Step 1: Member Selector */}
              <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">1</span>
                    <div>
                      <CardTitle className="text-base">Pilih Anggota Koperasi</CardTitle>
                      <CardDescription className="text-xs">Cari berdasarkan nama lengkap atau ID Anggota</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ketik nama anggota atau ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {filteredAnggota.slice(0, 8).map(a => {
                      const isSelected = selectedAnggota?.anggota_id === a.anggota_id
                      return (
                        <button
                          key={a.anggota_id}
                          type="button"
                          onClick={() => handleSelectAnggota(a)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all text-xs ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500'
                              : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                              {(a.nama_lengkap || 'A').charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{a.nama_lengkap || 'Anggota'}</div>
                              <div className="text-[10px] text-slate-400">ID: #{a.anggota_id} • User: {a.username || '-'}</div>
                            </div>
                          </div>

                          <div className="text-right text-[11px]">
                            <div className="text-emerald-600 dark:text-emerald-400 font-bold">SHU: {formatRupiah(a.shu || 0)}</div>
                            <div className="text-slate-400">Saldo: {formatRupiah(a.saldo || 0)}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Form Input */}
              {selectedAnggota && (
                <form onSubmit={handleProcessWithdrawal} className="space-y-6">
                  <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in-50 duration-300">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">2</span>
                          <div>
                            <CardTitle className="text-base">Detail Penarikan & Validasi Syarat</CardTitle>
                            <CardDescription className="text-xs">Konfirmasi dana, syarat belanja, dan persetujuan</CardDescription>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg text-[10px] font-bold">
                          {selectedAnggota.nama_lengkap}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSumberDana('shu')}
                          className={`p-3.5 rounded-2xl border text-left transition-all ${
                            sumberDana === 'shu'
                              ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 ring-2 ring-emerald-500/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" /> Akumulasi SHU
                            </span>
                            {sumberDana === 'shu' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          </div>
                          <div className="text-lg font-black text-slate-900 dark:text-white">
                            {formatRupiah(selectedAnggota.shu || 0)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Jasa usaha tahun berjalan</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSumberDana('saldo')}
                          className={`p-3.5 rounded-2xl border text-left transition-all ${
                            sumberDana === 'saldo'
                              ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 ring-2 ring-blue-500/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                              <Banknote className="w-3.5 h-3.5" /> Saldo E-Wallet
                            </span>
                            {sumberDana === 'saldo' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div className="text-lg font-black text-slate-900 dark:text-white">
                            {formatRupiah(selectedAnggota.saldo || 0)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Tabungan belanja anggota</div>
                        </button>
                      </div>

                      {/* Sales Requirement */}
                      <div className={`p-4 rounded-2xl border ${
                        eligibility?.has_qualifying_purchase 
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl mt-0.5 ${eligibility?.has_qualifying_purchase ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {eligibility?.has_qualifying_purchase ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                Syarat Kontribusi Belanja Koperasi (&gt; Rp 25.000)
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                eligibility?.has_qualifying_purchase ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                              }`}>
                                {eligibility?.has_qualifying_purchase ? '✓ Syarat Terpenuhi' : '✕ Belum Ada Belanja'}
                              </span>
                            </div>

                            {eligibility?.has_qualifying_purchase ? (
                              <div className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                                Ditemukan transaksi belanja aktif hari ini sebesar: 
                                <strong className="ml-1 text-emerald-900 dark:text-emerald-100">
                                  {formatRupiah(eligibility.transaksi_valid_hari_ini[0].total_harga)}
                                </strong> (Trx #{eligibility.transaksi_valid_hari_ini[0].transaksi_id})
                              </div>
                            ) : (
                              <div className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                                Anggota belum memiliki transaksi belanja produk toko lebih dari <strong>Rp 25.000</strong> hari ini.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Nominal Input */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-bold text-slate-700 dark:text-slate-300">
                            Nominal Penarikan Tunai <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-slate-400">
                            Tersedia: <strong className="text-slate-700 dark:text-slate-200">{formatRupiah(maxAvailable)}</strong>
                          </span>
                        </div>

                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-sm text-slate-400">Rp</span>
                          <input
                            type="number"
                            required
                            min="1000"
                            max={maxAvailable}
                            placeholder="0"
                            value={nominal}
                            onChange={(e) => setNominal(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-black text-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {quickAmounts.map(amt => (
                            <button
                              key={amt}
                              type="button"
                              disabled={amt > maxAvailable}
                              onClick={() => setNominal(amt)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-30 transition-colors"
                            >
                              {formatRupiah(amt)}
                            </button>
                          ))}
                          <button
                            type="button"
                            disabled={maxAvailable <= 0}
                            onClick={() => setNominal(maxAvailable)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 disabled:opacity-30 transition-colors"
                          >
                            Tarik Semua ({formatRupiah(maxAvailable)})
                          </button>
                        </div>
                      </div>

                      {/* Potong Belanja Langsung Summary Box */}
                      {selectedTransaksiId && (
                        <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={potongBelanja}
                              onChange={(e) => setPotongBelanja(e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300"
                            />
                            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                              Potong Biaya Belanja Langsung dari Penarikan Ini (Kasir Kas Keluar Bersih)
                            </span>
                          </label>

                          {Number(nominal) > 0 && (
                            <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80 text-xs space-y-1">
                              <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                                <span>🪙 Hak {sumberDana.toUpperCase()} Ditarik:</span>
                                <span className="font-bold">{formatRupiah(Number(nominal))}</span>
                              </div>
                              {potongBelanja && (
                                <div className="flex justify-between text-rose-600">
                                  <span>🛍️ Potong Belanja Trx #{selectedTransaksiId}:</span>
                                  <span className="font-bold">
                                    -{formatRupiah(
                                      eligibility?.transaksi_valid_hari_ini?.find((t: any) => t.transaksi_id === selectedTransaksiId)?.total_harga || 0
                                    )}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between font-black text-emerald-900 dark:text-emerald-200 pt-1.5 border-t border-emerald-300/60 dark:border-emerald-800/60">
                                <span>💵 Uang Kas Fisik yang Diserahkan ke Anggota:</span>
                                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                  {formatRupiah(
                                    potongBelanja
                                      ? Math.max(
                                          0,
                                          Number(nominal) -
                                            (eligibility?.transaksi_valid_hari_ini?.find(
                                              (t: any) => t.transaksi_id === selectedTransaksiId
                                            )?.total_harga || 0)
                                        )
                                      : Number(nominal)
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Informed Consent */}
                      <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200">
                              Klausul Persetujuan Pengurangan SHU Hari Besar
                            </h4>
                            <p className="text-[11px] text-amber-800/90 dark:text-amber-300 leading-relaxed mt-0.5">
                              Sesuai ketentuan, saldo SHU yang ditarik tunai akan memotong hak akumulasi pembagian SHU tahun berjalan. Pada saat pembagian SHU <strong>Hari Raya / RAT Tahunan</strong>, nilai SHU yang diterima anggota akan berkurang sejumlah penarikan ini atau bernilai <strong>Rp 0</strong> jika ditarik habis.
                            </p>
                          </div>
                        </div>

                        <label className="flex items-center gap-2.5 pt-2 border-t border-amber-200/80 dark:border-amber-800 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            required
                            checked={persetujuanShu}
                            onChange={(e) => setPersetujuanShu(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-amber-300"
                          />
                          <span className="text-xs font-bold text-amber-950 dark:text-amber-100">
                            Saya mengonfirmasi bahwa anggota telah menyetujui secara sadar konsekuensi pemotongan SHU ini.
                          </span>
                        </label>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedAnggota(null)
                            setEligibility(null)
                          }}
                          className="text-xs"
                        >
                          Batal
                        </Button>
                        <Button
                          type="submit"
                          disabled={submitting || !eligibility?.has_qualifying_purchase || !persetujuanShu || !nominal || Number(nominal) > maxAvailable}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md"
                        >
                          {submitting ? 'Memproses...' : (
                            potongBelanja && selectedTransaksiId
                              ? `Serahkan Kas Bersih ${formatRupiah(
                                  Math.max(
                                    0,
                                    (Number(nominal) || 0) -
                                      (eligibility?.transaksi_valid_hari_ini?.find(
                                        (t: any) => t.transaksi_id === selectedTransaksiId
                                      )?.total_harga || 0)
                                  )
                                )}`
                              : `Serahkan Uang Tunai (${formatRupiah(Number(nominal) || 0)})`
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Riwayat Penarikan Hari Ini */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <CardTitle className="text-sm">Riwayat Tarik Tunai di Kasir</CardTitle>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
                  {historyList.length} Transaksi
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {historyList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Belum ada transaksi penarikan tunai pada shift ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                  {historyList.map(item => (
                    <div key={item.tarik_id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 text-[10px]">#{item.kode_penarikan || `TRK-${item.tarik_id}`}</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.nama_anggota}
                          </span>
                        </div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatRupiah(item.nominal)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className="uppercase px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-bold text-[9px] text-slate-600">
                            {item.sumber_dana}
                          </span>
                          <span>• Trx Belanja: #{item.transaksi_id || '-'} ({formatRupiah(item.belanja_nominal || 0)})</span>
                        </div>
                        <span>{new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt Modal */}
      {receiptData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center border-b border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white">Penarikan Tunai Sukses</h3>
              <p className="text-xs text-slate-500">Bukti Penarikan Dana & Pemotongan SHU Koperasi</p>
            </div>

            <div className="p-6 space-y-4 text-xs font-mono">
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>No. Tiket:</span>
                  <span className="font-bold text-slate-900 dark:text-white">#{receiptData.kode_penarikan || `TRK-${receiptData.tarik_id}`}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Nama Anggota:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{receiptData.nama_anggota}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Nominal Diserahkan:</span>
                  <span className="font-black text-emerald-600 text-sm">{formatRupiah(receiptData.nominal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Struk Belanja Terkait:</span>
                  <span className="font-bold text-slate-900 dark:text-white">Trx #{receiptData.transaksi_id}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Sisa Saldo SHU:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(receiptData.sisa_shu)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 font-sans">
                ✓ Anggota telah menyetujui pemotongan saldo SHU Hari Besar secara sadar.
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Struk
              </Button>
              <Button
                size="sm"
                onClick={() => setReceiptData(null)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Tutup Selesai
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default TarikTunai
