import React, { useEffect, useState } from 'react'
import { anggotaService } from '@/services/anggotaService'
import { IosListSection, IosListItem } from '@/components/ios/IosList'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { ProfilAnggota, HistoriBayarHutang } from '@/types'
import { CreditCard, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'

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
        setSuccessMsg('Pengajuan bayar hutang terkirim! Silakan serahkan uang ke kasir.')
        setJumlah('')
        loadData()
      } else {
        setErrorMsg(res.error || 'Gagal mengirim pembayaran')
      }
    } catch {
      setErrorMsg('Terjadi kesalahan')
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

  return (
    <div className="space-y-6 pb-20 max-w-lg mx-auto">
      {/* 1. Apple Pay Style Debt Summary Card */}
      <div className="rounded-[28px] bg-gradient-to-br from-rose-500 to-red-600 text-white p-6 shadow-xl shadow-rose-600/20 text-center">
        <p className="text-xs font-semibold text-rose-100 uppercase tracking-wider flex items-center justify-center gap-1">
          <CreditCard className="w-4 h-4" />
          Total Hutang Belanja
        </p>
        <h2 className="text-4xl font-extrabold tracking-tight mt-2 text-white">
          {formatRupiah(totalHutang)}
        </h2>
        <p className="text-xs text-rose-100/80 mt-1">
          {totalHutang <= 0 ? '🎉 Anda tidak memiliki hutang' : 'Pilih nominal pembayaran di bawah'}
        </p>
      </div>

      {/* 2. Quick Presets & Payment Input */}
      {totalHutang > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-[26px] p-5 shadow-xs border border-slate-200/50 dark:border-zinc-800/50 space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Nominal</p>
          
          <div className="grid grid-cols-3 gap-2">
            {[50000, 100000, 200000].filter(amt => amt < totalHutang).map((amt) => (
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
              className="py-2.5 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-extrabold border border-blue-200/60 dark:border-blue-800/40 transition-colors"
            >
              Bayar Lunas
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="relative flex items-center bg-slate-100 dark:bg-zinc-800 rounded-2xl px-4 h-14">
              <span className="text-lg font-bold text-slate-400 mr-2">Rp</span>
              <input
                type="number"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="0"
                max={totalHutang}
                min={1}
                required
                className="w-full bg-transparent text-xl font-extrabold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
              </p>
            )}
            {successMsg && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {successMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !jumlah}
              className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-md active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {submitting ? 'Memproses...' : 'Ajukan Pembayaran'}
            </button>
          </form>
        </div>
      )}

      {/* 3. Inset Grouped History */}
      <IosListSection title="Riwayat Pembayaran Hutang">
        {history.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Belum ada riwayat pembayaran
          </div>
        ) : (
          history.map((h) => (
            <IosListItem
              key={h.pembayaran_id}
              icon={<CreditCard className="w-4 h-4" />}
              iconBgColor={h.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}
              title={formatRupiah(h.nominal || h.jumlah || 0)}
              subtitle={formatDate(h.created_at)}
              value={
                <span className={`text-xs font-bold ${h.status === 'approved' ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {h.status === 'approved' ? 'Disetujui' : h.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                </span>
              }
            />
          ))
        )}
      </IosListSection>
    </div>
  )
}
export default BayarHutangPage