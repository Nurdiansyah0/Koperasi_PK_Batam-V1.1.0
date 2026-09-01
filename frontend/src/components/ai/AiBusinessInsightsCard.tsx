import { useState, useEffect } from 'react'
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react'
import { aiService, BusinessInsightsResponse } from '@/services/aiService'
import toast from 'react-hot-toast'

export function AiBusinessInsightsCard() {
  const [data, setData] = useState<BusinessInsightsResponse['data'] | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchInsights = async () => {
    setIsLoading(true)
    try {
      const res = await aiService.getBusinessInsights()
      if (res.success && res.data) {
        setData(res.data)
      } else {
        toast.error(res.error || 'Gagal memuat analitik AI')
      }
    } catch (err) {
      toast.error('Gagal menghubungi layanan AI')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  if (isLoading && !data) {
    return (
      <div className="bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-transparent border border-indigo-200/50 dark:border-indigo-800/30 rounded-3xl p-6 shadow-xs animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-200 dark:bg-indigo-900/50" />
            <div className="h-5 w-48 bg-indigo-200 dark:bg-indigo-900/50 rounded-md" />
          </div>
          <div className="h-6 w-24 bg-indigo-200 dark:bg-indigo-900/50 rounded-full" />
        </div>
        <div className="h-4 w-full bg-slate-200 dark:bg-zinc-800 rounded-md mb-2" />
        <div className="h-4 w-3/4 bg-slate-200 dark:bg-zinc-800 rounded-md" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="relative overflow-hidden bg-white dark:bg-zinc-900/90 border border-indigo-100 dark:border-indigo-900/40 rounded-3xl p-5 sm:p-7 shadow-xs hover:shadow-md transition-all">
      {/* Subtle Background Glow */}
      <div className="absolute -right-16 -top-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                Analitik AI & Prediksi Bisnis
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                Gemini 3.6
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Insight inventaris, rasio piutang, dan rekomendasi restock otomatis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data.kpi_score && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200/70 dark:border-emerald-800/50 text-xs font-black">
              <ShieldCheck className="w-4 h-4" />
              <span>Skor Kesehatan: {data.kpi_score}/100</span>
            </div>
          )}
          <button
            onClick={fetchInsights}
            disabled={isLoading}
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 transition-colors"
            title="Muat Ulang Analisis"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Paragraph */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-violet-50/70 dark:from-indigo-950/40 dark:via-zinc-900 dark:to-violet-950/40 p-4 rounded-2xl border border-indigo-100/80 dark:border-indigo-800/30 mb-5">
        <p className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-zinc-200 font-medium">
          {data.summary}
        </p>
      </div>

      {/* Grid: Highlights & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Highlights */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/50">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Poin Sorotan Utama
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-zinc-400 font-medium">
            {data.highlights?.map((h, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Rekomendasi Aksi Cepat
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-amber-900/80 dark:text-amber-200/80 font-medium">
            {data.recommendations?.map((r, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0 mt-1.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
