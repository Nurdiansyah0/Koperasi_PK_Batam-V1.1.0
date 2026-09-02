import React from 'react'
import { formatRupiah } from '@/lib/utils'
import { Sparkles, ShieldCheck, QrCode } from 'lucide-react'

interface IosMemberCardProps {
  nama: string
  username: string
  saldo: number
  simpananPokok?: number
  limitHutang?: number
  sisaLimitHutang?: number
  hutang: number
  shu: number
  anggotaId?: number
  onShowQR?: () => void
}

export function IosMemberCard({
  nama,
  username,
  saldo,
  simpananPokok,
  limitHutang,
  sisaLimitHutang,
  hutang,
  shu,
  anggotaId,
  onShowQR,
}: IosMemberCardProps) {
  const pokok = simpananPokok ?? (saldo + hutang > 0 ? saldo + hutang : 300000)

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0b132b] via-[#1c2541] to-[#0b132b] text-white p-6 shadow-2xl border border-white/20 active:scale-[0.99] transition-transform duration-200">
      {/* Background Glass Highlights */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />

      {/* Card Top: Logo, Cooperative Name & Member ID */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 p-1.5 flex items-center justify-center shadow-md">
            <img src="/Logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="font-black text-base tracking-tight text-white leading-tight drop-shadow-sm">KOPERASI PKPPK</h3>
            <p className="text-xs text-blue-200 font-bold tracking-wider uppercase">Karyawan BTH &bull; Kartu Anggota</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          {/* EMV Metallic Smart Chip Icon */}
          <div className="w-8 h-7 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-200 shadow-md flex items-center justify-center relative overflow-hidden">
            <div className="w-full h-px bg-amber-900/50 absolute top-2" />
            <div className="w-full h-px bg-amber-900/50 absolute bottom-2" />
            <div className="h-full w-px bg-amber-900/50 absolute left-2.5" />
            <div className="h-full w-px bg-amber-900/50 absolute right-2.5" />
          </div>

          {onShowQR && (
            <button
              onClick={onShowQR}
              className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-md border border-white/30 text-white transition-all shadow-md"
              title="Tampilkan QR Code Anggota"
            >
              <QrCode className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Card Middle: Primary Balance (Saldo) + Collateral Tag */}
      <div className="my-6 relative z-10 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold text-blue-200 tracking-wide flex items-center gap-1.5 uppercase">
            <Sparkles className="w-4 h-4 text-amber-300" />
            Saldo Bebas Belanja
          </p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1 drop-shadow-md">
            {formatRupiah(saldo)}
          </h2>
        </div>

        <div className="text-right">
          <span className="inline-block text-xs font-extrabold px-3 py-1 rounded-full bg-amber-400/25 text-amber-200 border border-amber-300/40 shadow-sm">
            Jaminan: {formatRupiah(pokok)}
          </span>
          <p className="text-[11px] font-bold text-slate-300 mt-1">Simpanan Pokok (Collateral)</p>
        </div>
      </div>

      {/* Card Bottom: Hutang, SHU & Name */}
      <div className="pt-4 border-t border-white/20 flex items-end justify-between relative z-10">
        <div>
          <p className="text-xs text-slate-300 font-bold uppercase tracking-wider">Pemilik Kartu</p>
          <p className="text-sm sm:text-base font-black text-white tracking-tight">{nama || username}</p>
          <p className="text-xs text-blue-200 font-mono font-bold">ID: #{anggotaId || '-'}</p>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div className="bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
            <p className="text-[11px] text-rose-300 font-bold uppercase tracking-wider">Hutang</p>
            <p className="text-sm font-black text-rose-300">{formatRupiah(hutang)}</p>
          </div>
          <div className="bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
            <p className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider">SHU</p>
            <p className="text-sm font-black text-emerald-300">{formatRupiah(shu)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
export default IosMemberCard