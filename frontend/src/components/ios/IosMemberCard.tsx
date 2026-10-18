import React from 'react'
import { formatRupiah } from '@/lib/utils'
import { QrCode } from 'lucide-react'

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
    <div className="relative overflow-hidden rounded-[28px] bg-slate-900 text-white p-6 shadow-xl border border-white/10 active:scale-[0.99] transition-transform duration-200">
      {/* Card Top: Logo, Cooperative Name & QR Action */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 p-1.5 flex items-center justify-center">
            <img src="/Logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="font-black text-base tracking-tight text-white leading-tight">KOPERASI PKPPK</h3>
            <p className="text-xs text-blue-200 font-bold tracking-wider uppercase">Karyawan BTH &bull; Kartu Anggota</p>
          </div>
        </div>
        
        {onShowQR && (
          <button
            onClick={onShowQR}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white transition-all shadow-xs"
            title="Tampilkan QR Code Anggota"
          >
            <QrCode className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Card Middle: Primary Balance (Saldo) + Collateral Tag */}
      <div className="my-6 relative z-10 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold text-blue-200 tracking-wide uppercase">
            Saldo Bebas Belanja
          </p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
            {formatRupiah(saldo)}
          </h2>
        </div>

        <div className="text-right">
          <span className="inline-block text-xs font-extrabold px-3 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
            Jaminan: {formatRupiah(pokok)}
          </span>
          <p className="text-[11px] font-medium text-slate-300 mt-1">Simpanan Pokok (Collateral)</p>
        </div>
      </div>

      {/* Card Bottom: Hutang, SHU & Name */}
      <div className="pt-4 border-t border-white/10 flex items-end justify-between relative z-10">
        <div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pemilik Kartu</p>
          <p className="text-sm sm:text-base font-black text-white tracking-tight">{nama || username}</p>
          <p className="text-xs text-blue-300 font-mono font-medium">ID: #{anggotaId || '-'}</p>
        </div>

        <div className="flex items-center gap-3 text-right">
          <div className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <p className="text-[11px] text-rose-300 font-bold uppercase tracking-wider">Hutang</p>
            <p className="text-sm font-black text-rose-300">{formatRupiah(hutang)}</p>
          </div>
          <div className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <p className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider">SHU</p>
            <p className="text-sm font-black text-emerald-300">{formatRupiah(shu)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
export default IosMemberCard