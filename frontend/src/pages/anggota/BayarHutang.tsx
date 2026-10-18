import React, { useEffect, useState } from 'react'
import { anggotaService } from '@/services/anggotaService'
import { IosListSection, IosListItem } from '@/components/ios/IosList'
import { formatRupiah, formatDate, formatThousands, parseThousands } from '@/lib/utils'
import type { ProfilAnggota, HistoriBayarHutang } from '@/types'
import { CreditCard, CheckCircle2, AlertCircle, ShieldCheck, Banknote, ArrowRight, RefreshCw } from 'lucide-react'

export function BayarHutangPage() {
  const [profil, setProfil] = useState<ProfilAnggota | null>(null)
  const [history, setHistory] = useState<HistoriBayarHutang[]>([])
  const [jumlah, setJumlah] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const loadData = async () => {
    try {
      const [p, h] = await Promise.all([
        anggotaService.getProfil(),
        anggotaService.getHistoriBayarHutang()
      ])
      setProfil(p)
      setHistory(h)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handlePreset = (amount: number) => {
    setJumlah(amount.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg('')
    setErrorMsg('')
    const val = Number(jumlah)
    if (!val || val <= 0) {
      setErrorMsg('Nominal bayar harus lebih dari 0')
      return
    }
    if (val > (profil?.hutang || 0)) {
      setErrorMsg('Nominal bayar melebihi total hutang')
      return
    }

    setSubmitting(true)
    try {
      const res = await anggotaService.bayarHutang(val)
      if (res.success) {
        setSuccessMsg('Pengajuan bayar hutang terkirim! Silakan serahkan uang ke kasir untuk verifikasi.')
        setJumlah('')
        loadData()
      } else {
        setErrorMsg(res.error || 'Gagal mengirim pembayaran')
      }
    } catch {
      setErrorMsg('Terjadi kesalahan sistem')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  const totalHutang = profil?.hutang || 0
  const simpananPokok = profil?.simpanan_pokok ?? (profil ? Math.max(300000, (profil.saldo || 0) + (profil.hutang || 0)) : 300000)
  const limitHutang = profil?.limit_hutang ?? simpananPokok
  const sisaLimitHutang = profil?.sisa_limit_hutang ?? Math.max(0, limitHutang - totalHutang)
  const persentaseTerpakai = Math.min(100, Math.round((totalHutang / limitHutang) * 100))

  return (
    <div className="pb-16 max-w-5xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Pembayaran Hutang & Plafon Kredit
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola pelunasan hutang belanja dan pantau pemulihan pagu jaminan simpanan pokok Anda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Debt Summary & Collateral System Panel */}
        <div className="md:col-span-6 space-y-5">
          
          {/* 1. Debt Summary Card */}
          <div className="rounded-3xl bg-rose-600 text-white p-6 shadow-md text-center">
            <p className="text-xs font-bold text-rose-100 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              Total Hutang Belanja Saat Ini
            </p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mt-2 text-white">
              {formatRupiah(totalHutang)}
            </h2>
            <p className="text-xs font-semibold text-rose-100/90 mt-1.5">
              {totalHutang <= 0 ? '🎉 Tidak ada kewajiban hutang aktif' : 'Plafon kredit terpakai untuk belanja'}
            </p>
          </div>

          {/* 2. Personalized Collateral Credit Explanation Panel */}
          <div className="p-5 bg-slate-900 border border-slate-700/80 rounded-3xl text-white space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">
                    Sistem Jaminan (Collateral) Simpanan
                  </h4>
                  <p className="text-[11px] text-blue-300 font-semibold">Pagu Resmi Koperasi PKPPK BTH</p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-600/30 text-blue-200 border border-blue-500/40">
                Plafon {formatRupiah(limitHutang)}
              </span>
            </div>

            {/* 3 Metric Value Boxes */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-center">
                <p className="text-[10px] text-amber-300 font-bold uppercase">Jaminan Pokok</p>
                <p className="text-xs sm:text-sm font-black text-amber-300 mt-0.5">{formatRupiah(simpananPokok)}</p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-center">
                <p className="text-[10px] text-rose-300 font-bold uppercase">Hutang Terpakai</p>
                <p className="text-xs sm:text-sm font-black text-rose-300 mt-0.5">{formatRupiah(totalHutang)}</p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-center">
                <p className="text-[10px] text-emerald-300 font-bold uppercase">Sisa Pagu</p>
                <p className="text-xs sm:text-sm font-black text-emerald-300 mt-0.5">{formatRupiah(sisaLimitHutang)}</p>
              </div>
            </div>

            {/* Credit Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">Penggunaan Plafon:</span>
                <span className={persentaseTerpakai >= 100 ? 'text-rose-400 font-black' : 'text-blue-300'}>
                  {persentaseTerpakai}% {persentaseTerpakai >= 100 ? '(Plafon Penuh)' : ''}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    persentaseTerpakai >= 100 ? 'bg-rose-500' : persentaseTerpakai > 60 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, persentaseTerpakai)}%` }}
                />
              </div>
            </div>

            {/* 3 Clear Educational Points */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Simpanan Pokok Sebagai Collateral:</strong> Simpanan Pokok sebesar <strong>{formatRupiah(simpananPokok)}</strong> bertindak sebagai dana jaminan sah yang membatasi pagu maksimal belanja kredit Anda.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Pemulihan Pagu Otomatis:</strong> Begitu pembayaran hutang Anda disetujui kasir, <strong>Sisa Pagu Belanja</strong> Anda akan langsung pulih kembali sebesar nominal yang disetorkan.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Banknote className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Pelunasan di Kasir:</strong> Pembayaran hutang dapat disetorkan langsung ke kasir (Tunai / Transfer / QRIS) dan langsung diverifikasi.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Payment Form & History */}
        <div className="md:col-span-6 space-y-5">
          
          {/* Payment Form Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-xs border border-slate-200/80 dark:border-zinc-800 space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Formulir Pembayaran Hutang
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih atau ketik nominal hutang yang ingin Anda bayarkan ke kasir.
              </p>
            </div>

            {totalHutang <= 0 ? (
              <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm text-emerald-800 dark:text-emerald-300">Hutang Anda Nihil</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Pagu kredit Anda utuh 100% dan siap digunakan untuk berbelanja.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Presets */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pilihan Nominal Cepat</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[10000, 25000, 50000, 100000].filter(amt => amt < totalHutang).map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handlePreset(amt)}
                        className="py-2.5 px-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        {formatRupiah(amt)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handlePreset(totalHutang)}
                      className="py-2.5 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black border border-blue-200/80 dark:border-blue-800/60 transition-colors col-span-1"
                    >
                      Bayar Lunas
                    </button>
                  </div>
                </div>

                {/* Form Input */}
                <form onSubmit={handleSubmit} className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nominal Pembayaran</label>
                      {jumlah && Number(jumlah) > 0 && (
                        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                          {formatRupiah(Number(jumlah))}
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center bg-slate-100 dark:bg-zinc-800 rounded-2xl px-4 h-14 border border-slate-200/80 dark:border-zinc-700">
                      <span className="text-lg font-black text-slate-400 mr-2">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatThousands(jumlah)}
                        onChange={(e) => {
                          const parsed = parseThousands(e.target.value)
                          setJumlah(parsed > 0 ? parsed.toString() : '')
                        }}
                        placeholder="0"
                        required
                        className="w-full bg-transparent text-xl font-black text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      *Ketik angka, pemisah titik ribuan akan muncul otomatis untuk mencegah salah input.
                    </p>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-rose-500 font-semibold flex items-center gap-1.5 p-2 bg-rose-50 rounded-xl">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                    </p>
                  )}
                  {successMsg && (
                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> {successMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !jumlah}
                    className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-md active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Memproses...' : (
                      <>
                        <span>Ajukan Pembayaran ke Kasir</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Payment History */}
          <IosListSection title="Riwayat Pembayaran Hutang" footer="Menampilkan histori transaksi pengajuan pembayaran hutang">
            {history.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Belum ada riwayat pembayaran hutang
              </div>
            ) : (
              history.map((h) => (
                <IosListItem
                  key={h.pembayaran_id}
                  icon={<CreditCard className="w-4 h-4" />}
                  iconBgColor={h.status === 'approved' ? 'bg-emerald-500' : h.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'}
                  title={formatRupiah(h.nominal || h.jumlah || 0)}
                  subtitle={formatDate(h.created_at)}
                  value={
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      h.status === 'approved' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                        : h.status === 'rejected'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {h.status === 'approved' ? 'Disetujui' : h.status === 'rejected' ? 'Ditolak' : 'Menunggu Kasir'}
                    </span>
                  }
                />
              ))
            )}
          </IosListSection>

        </div>

      </div>
    </div>
  )
}
export default BayarHutangPage