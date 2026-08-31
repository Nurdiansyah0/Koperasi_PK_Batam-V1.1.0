import React from 'react'
import { formatRupiah } from '@/lib/utils'
import { Sparkles, ShieldCheck, QrCode } from 'lucide-react'

interface IosMemberCardProps {
  nama: string
  username: string
  saldo: number
  hutang: number
  shu: number
  anggotaId?: number
  onShowQR?: () => void
}

export function IosMemberCard({
  nama,
  username,
  saldo,
  hutang,
  shu,
  anggotaId,
  onShowQR,
}: IosMemberCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-6 shadow-xl shadow-blue-950/20 border border-white/10 active:scale-[0.99] transition-transform duration-200">
      {/* Background Glass Highlights & Holographic Shine */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Card Top: Logo, Cooperative Name & Member ID */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1.5 flex items-center justify-center shadow-inner">
            <img src="/Logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight text-white leading-tight">KOPERASI PK</h3>
            <p className="text-[10px] text-blue-300 font-semibold tracking-wider uppercase">Kartu Anggota Digital</p>
          </div>
        </div>
        {onShowQR && (
          <button
            onClick={onShowQR}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white transition-colors"
          >
            <QrCode className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Card Middle: Primary Balance (Saldo) */}
      <div className="my-6 relative z-10">
        <p className="text-xs text-blue-200/80 font-medium tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          Saldo Simpanan
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-1">
          {formatRupiah(saldo)}
        </h2>
      </div>

      {/* Card Bottom: Hutang, SHU & Name */}
      <div className="pt-4 border-t border-white/10 flex items-end justify-between relative z-10">
        <div>
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Pemilik Kartu</p>
          <p className="text-sm font-bold text-white tracking-tight">{nama || username}</p>
          <p className="text-[10px] text-blue-300/80 font-mono">ID: #{anggotaId || '-'}</p>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[10px] text-rose-300 font-medium uppercase tracking-wider">Hutang</p>
            <p className="text-xs sm:text-sm font-bold text-rose-400">{formatRupiah(hutang)}</p>
          </div>
          <div>
            <p className="text-[10px] text-emerald-300 font-medium uppercase tracking-wider">SHU</p>
            <p className="text-xs sm:text-sm font-bold text-emerald-400">{formatRupiah(shu)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
export default IosMemberCard