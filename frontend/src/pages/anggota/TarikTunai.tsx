import React, { useState, useEffect } from 'react'
import { 
  Banknote, 
  Coins, 
  ShoppingBag, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  QrCode, 
  ArrowRight, 
  ShieldCheck, 
  Receipt,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { anggotaService } from '@/services/anggotaService'
import { formatRupiah } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import type { TarikTunaiItem } from '@/types'

export const TarikTunaiAnggota: React.FC = () => {
  const [eligibility, setEligibility] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [historyList, setHistoryList] = useState<TarikTunaiItem[]>([])

  // Form State
  const [nominal, setNominal] = useState<number | ''>('')
  const [sumberDana, setSumberDana] = useState<'shu' | 'saldo'>('shu')
  const [persetujuanShu, setPersetujuanShu] = useState(false)
  const [keterangan, setKeterangan] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchEligibility()
    fetchHistory()
  }, [])

  const fetchEligibility = async () => {
    setLoading(true)
    try {
      const res = await anggotaService.cekKelayakanTarikTunai()
      if (res.success) {
        setEligibility(res.data)
      }
    } catch (err: any) {
      console.error('Gagal memuat status kelayakan tarik tunai:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const data = await anggotaService.getRiwayatTarikTunai()
      setHistoryList(data || [])
    } catch (err) {
      console.error('Gagal memuat riwayat tarik tunai:', err)
    }
  }

  const isEligible = eligibility?.is_eligible
  const hasPendingTicket = !!eligibility?.pending_ticket
  const pendingTicket = eligibility?.pending_ticket
  const maxQuota = eligibility?.max_kuota_tarik_tunai || 0

  const availableBalance = eligibility 
    ? (sumberDana === 'shu' ? eligibility.saldo_shu : eligibility.saldo_ewallet)
    : 0

  const maxAllowedWithdrawal = Math.min(availableBalance, maxQuota)

  const quickAmounts = [25000, 50000, 75000, 100000]

  const hasMasterConsent = !!eligibility?.has_master_consent

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEligible) {
      toast.error('Syarat penarikan belum terpenuhi.')
      return
    }
    if (!nominal || Number(nominal) < 1000) {
      toast.error('Masukkan nominal penarikan minimal Rp 1.000')
      return
    }
    if (Number(nominal) > maxAllowedWithdrawal) {
      toast.error(`Nominal melebihi batas maksimal penarikan (${formatRupiah(maxAllowedWithdrawal)})`)
      return
    }
    if (!hasMasterConsent && !persetujuanShu) {
      toast.error('Harap setujui pernyataan sadar pemotongan SHU Hari Besar (Master Consent).')
      return
    }

    setSubmitting(true)
    try {
      const res = await anggotaService.ajukanTarikTunai({
        nominal: Number(nominal),
        sumber_dana: sumberDana,
        persetujuan_shu: persetujuanShu || hasMasterConsent,
        keterangan: keterangan || undefined
      })

      if (res.success) {
        toast.success(res.message || 'Tiket penarikan berhasil dibuat!')
        fetchEligibility()
        fetchHistory()
        setNominal('')
        setPersetujuanShu(false)
      } else {
        toast.error(res.message || 'Gagal mengajukan penarikan tunai')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat mengajukan penarikan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAgreeMasterConsent = async () => {
    try {
      const res = await anggotaService.setujuiMasterConsentShu()
      if (res.success) {
        toast.success('Pakta Integritas SHU (Master Consent) berhasil disetujui!')
        fetchEligibility()
      }
    } catch (err) {
      toast.error('Gagal menyetujui Master Consent')
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
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Fasilitas Keanggotaan</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Tarik Tunai & Saldo SHU</h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
              Cairkan saldo E-Wallet dan akumulasi SHU Anda di kasir toko dengan verifikasi otomatis & perlindungan likuiditas koperasi.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs shrink-0">
            <ShoppingBag className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Syarat Belanja: <strong className="text-emerald-200">&gt; Rp 25.000</strong></span>
          </div>
        </div>
      </div>

      {/* Active Pending Ticket Card */}
      {hasPendingTicket && (
        <Card className="rounded-3xl border-2 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-md overflow-hidden animate-in zoom-in-95 duration-200">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                  <Clock className="w-3.5 h-3.5 animate-spin" /> Menunggu Pencairan di Kasir Toko
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Tiket Penarikan Aktif
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md">
                  Tunjukkan kode tiket ini kepada kasir toko untuk mengambil uang tunai sebesar{' '}
                  <strong className="text-emerald-700 dark:text-emerald-300 text-sm font-black">
                    {formatRupiah(pendingTicket.nominal)}
                  </strong>.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm text-center shrink-0 space-y-1">
                <QrCode className="w-12 h-12 text-emerald-600 mx-auto" />
                <div className="font-mono text-base font-black text-slate-900 dark:text-white tracking-wider">
                  {pendingTicket.kode_penarikan}
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">
                  Sumber: {pendingTicket.sumber_dana}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Pre-Verification Status Cards */}
      <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-base">Hasil Verifikasi Otomatis Sistem</CardTitle>
            </div>
            <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
              isEligible ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            }`}>
              {isEligible ? '✓ Syarat Terpenuhi' : '✕ Belum Memenuhi Syarat'}
            </span>
          </div>
          <CardDescription className="text-xs">
            Sistem secara otomatis memeriksa 3 lapis kelayakan penarikan kas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Status Hutang */}
            <div className={`p-4 rounded-2xl border ${
              !eligibility?.has_debt ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200' : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-600 dark:text-slate-400">1. Status Hutang</span>
                {!eligibility?.has_debt ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
              </div>
              <div className={`text-base font-black ${!eligibility?.has_debt ? 'text-emerald-600' : 'text-amber-600'}`}>
                {!eligibility?.has_debt ? 'Bebas Hutang (Rp 0)' : `Ada Hutang ${formatRupiah(eligibility?.hutang || 0)}`}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {!eligibility?.has_debt ? 'SHU utuh tanpa potongan hutang' : 'Hutang diperhitungkan mengurangi hak SHU'}
              </div>
            </div>

            {/* 2. Status Belanja Hari Ini */}
            <div className={`p-4 rounded-2xl border ${
              eligibility?.has_qualifying_purchase ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200' : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-600 dark:text-slate-400">2. Belanja Toko Hari Ini</span>
                {eligibility?.has_qualifying_purchase ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              </div>
              <div className={`text-base font-black ${eligibility?.has_qualifying_purchase ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatRupiah(eligibility?.total_belanja_hari_ini || 0)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {eligibility?.has_qualifying_purchase ? 'Syarat > Rp 25.000 Terpenuhi' : 'Wajib belanja > Rp 25.000'}
              </div>
            </div>

            {/* 3. Kuota Maksimal */}
            <div className="p-4 rounded-2xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-600 dark:text-slate-400">3. Kuota Maksimal Tarik SHU</span>
                <Coins className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-base font-black text-blue-600">
                {formatRupiah(maxQuota)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                50% dari (SHU - Hutang), Maks. Rp 100.000
              </div>
            </div>
          </div>

          {!isEligible && eligibility?.ineligible_reasons?.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-1 text-xs text-rose-800 dark:text-rose-300">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Alasan Pengajuan Belum Dapat Diproses:
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 ml-1">
                {eligibility.ineligible_reasons.map((reason: string, idx: number) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {!isEligible && (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-slate-700 dark:text-zinc-300">
                <span className="font-bold">💡 Ingin Tarik Tunai Sekarang?</span> Belanja produk toko koperasi lebih dari Rp 25.000 atau langsung checkout belanjaan disertai tarik tunai.
              </div>
              <Button
                type="button"
                onClick={() => window.location.href = '/anggota/belanja'}
                className="w-full sm:w-auto shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-sm"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Belanja di Katalog Toko
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Form Pengajuan Tarik Tunai */}
      {isEligible && !hasPendingTicket && (
        <form onSubmit={handleSubmitRequest}>
          <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base">Formulir Pengajuan Tiket Tarik Tunai</CardTitle>
              <CardDescription className="text-xs">Tentukan sumber saldo dan nominal yang ingin ditarik</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* Saldo Cards Switcher */}
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
                    {formatRupiah(eligibility.saldo_shu || 0)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Jasa usaha berjalan</div>
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
                    {formatRupiah(eligibility.saldo_ewallet || 0)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Tabungan belanja Anda</div>
                </button>
              </div>

              {/* Nominal Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Nominal Penarikan <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-slate-400">
                    Batas Kuota: <strong className="text-slate-700 dark:text-slate-200">{formatRupiah(maxAllowedWithdrawal)}</strong>
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-sm text-slate-400">Rp</span>
                  <input
                    type="number"
                    required
                    min="1000"
                    max={maxAllowedWithdrawal}
                    placeholder="0"
                    value={nominal}
                    onChange={(e) => setNominal(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-black text-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {quickAmounts.map(amt => (
                    <button
                      key={amt}
                      type="button"
                      disabled={amt > maxAllowedWithdrawal}
                      onClick={() => setNominal(amt)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-30 transition-colors"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={maxAllowedWithdrawal <= 0}
                    onClick={() => setNominal(maxAllowedWithdrawal)}
                    className="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 disabled:opacity-30 transition-colors"
                  >
                    Tarik Maksimal ({formatRupiah(maxAllowedWithdrawal)})
                  </button>
                </div>
              </div>

              {/* Informed Consent Status (Opsi 2: Master Consent) */}
              {hasMasterConsent ? (
                <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Pakta Integritas SHU (Master Consent) Aktif</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      ✓ Terverifikasi 1x di Awal
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300 leading-relaxed">
                    Anda telah menyetujui ketentuan sadar bahwa penarikan SHU akan mengurangi nilai jatah pembagian SHU pada <strong>Hari Raya / RAT Tahunan</strong>. Anda tidak perlu mencentang ulang setiap kali transaksi.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200">
                        Pernyataan Persetujuan Sadar Pengurangan SHU Hari Besar (Master Consent 1x)
                      </h4>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300 leading-relaxed mt-0.5">
                        Dengan menarik dana ini, saya menyetujui secara sadar bahwa saldo akumulasi SHU belanja saya akan berkurang secara riil, sehingga pada saat pembagian SHU <strong>Hari Raya / RAT Tahunan</strong>, nilai pembagian yang saya terima akan berkurang sejumlah penarikan ini atau bernilai <strong>Rp 0</strong> jika ditarik habis.
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
                      Saya memahami dan menyetujui konsekuensi pemotongan SHU ini secara sadar (Master Consent 1x).
                    </span>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={submitting || (!hasMasterConsent && !persetujuanShu) || !nominal || Number(nominal) > maxAllowedWithdrawal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-8 py-3 rounded-xl shadow-md flex items-center gap-2"
                >
                  {submitting ? 'Memproses...' : (
                    <>
                      <span>Buat Tiket Penarikan Kas</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Riwayat Penarikan Saya */}
      <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-sm">Riwayat Penarikan Tunai Saya</CardTitle>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
              {historyList.length} Mutasi
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {historyList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Anda belum pernah melakukan penarikan tunai saldo/SHU.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {historyList.map(item => (
                <div key={item.tarik_id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[10px]">#{item.kode_penarikan || `TRK-${item.tarik_id}`}</span>
                      <span className={`px-2 py-0.2 rounded-md font-bold text-[9px] uppercase ${
                        item.sumber_dana === 'shu' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.sumber_dana}
                      </span>
                      <span className={`px-2 py-0.2 rounded-md font-bold text-[9px] uppercase ${
                        item.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        item.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {item.status === 'completed' ? '✓ Diserahkan' : item.status === 'pending' ? '⏳ Menunggu' : '✕ Ditolak'}
                      </span>
                    </div>
                    <span className={`font-black text-sm ${item.status === 'rejected' ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>
                      {formatRupiah(item.nominal)}
                    </span>
                  </div>

                  {item.status === 'rejected' && item.alasan_tolak && (
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
                      ⚠️ {item.alasan_tolak}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <div>
                      <span>Verifikator: {item.kasir_name || '-'}</span> • <span>Struk Belanja: #{item.transaksi_id || '-'} ({formatRupiah(item.belanja_nominal || 0)})</span>
                    </div>
                    <span>{new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TarikTunaiAnggota
