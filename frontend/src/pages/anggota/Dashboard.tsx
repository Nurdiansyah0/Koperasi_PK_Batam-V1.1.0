import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { anggotaService } from '@/services/anggotaService'
import { useAuthStore } from '@/store/authStore'
import { IosMemberCard } from '@/components/ios/IosMemberCard'
import { IosListSection, IosListItem } from '@/components/ios/IosList'
import { IosBottomSheet } from '@/components/ios/IosBottomSheet'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { ProfilAnggota, HistoriTransaksiAnggota } from '@/types'
import { ShoppingBag, CreditCard, History, UserCircle, ArrowUpRight, CheckCircle2, QrCode, ShieldCheck, Banknote } from 'lucide-react'

export function AnggotaDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [profil, setProfil] = useState<ProfilAnggota | null>(null)
  const [transaksi, setTransaksi] = useState<HistoriTransaksiAnggota[]>([])
  const [loading, setLoading] = useState(true)
  const [showQrModal, setShowQrModal] = useState(false)

  useEffect(() => {
    Promise.all([
      anggotaService.getProfil(),
      anggotaService.getHistoriTransaksi()
    ])
      .then(([p, t]) => {
        setProfil(p)
        setTransaksi(t.data.slice(0, 5))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }



  const simpananPokok = profil?.simpanan_pokok ?? (profil ? Math.max(300000, (profil.saldo || 0) + (profil.hutang || 0)) : 300000)
  const limitHutang = profil?.limit_hutang ?? simpananPokok
  const sisaLimitHutang = profil?.sisa_limit_hutang ?? Math.max(0, limitHutang - (profil?.hutang || 0))
  const hutang = profil?.hutang || 0
  const persentaseTerpakai = Math.min(100, Math.round((hutang / limitHutang) * 100))

  return (
    <div className="pb-16 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Digital Member Card */}
        <div className="md:col-span-6 space-y-4">
          <IosMemberCard
            nama={profil?.nama_lengkap || user?.username || 'Anggota'}
            username={user?.username || ''}
            saldo={profil?.saldo || 0}
            simpananPokok={simpananPokok}
            limitHutang={limitHutang}
            sisaLimitHutang={sisaLimitHutang}
            hutang={hutang}
            shu={profil?.shu || 0}
            anggotaId={profil?.anggota_id || user?.anggota_id}
            onShowQR={() => setShowQrModal(true)}
          />

          {/* Quick Account Summary & Tarik Tunai Banner */}
          <div className="p-4 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">Status Keanggotaan</p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">Anggota Aktif Koperasi</p>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              Terverifikasi
            </span>
          </div>
        </div>

        {/* Right Column: Recent Transactions & Activity */}
        <div className="md:col-span-6 space-y-4">
          {/* Inset Grouped Recent Activity */}
          <IosListSection title="Aktivitas Belanja Terakhir" footer="Riwayat 5 transaksi pembelian terakhir">
            {transaksi.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Belum ada transaksi belanja
              </div>
            ) : (
              transaksi.map((t) => (
                <IosListItem
                  key={t.transaksi_id}
                  icon={<ShoppingBag className="w-4 h-4" />}
                  iconBgColor={t.metode_pembayaran === 'hutang' ? 'bg-rose-500' : 'bg-blue-600'}
                  title={`Belanja #${t.transaksi_id}`}
                  subtitle={formatDate(t.created_at)}
                  value={
                    <div className="text-right">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{formatRupiah(t.total_harga)}</p>
                      <span className={`text-[10px] font-semibold capitalize ${t.status === 'selesai' ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {t.metode_pembayaran} &bull; {t.status}
                      </span>
                    </div>
                  }
                  hasChevron
                  onClick={() => navigate('/anggota/riwayat')}
                />
              ))
            )}
          </IosListSection>
        </div>

      </div>

      {/* QR Code Member Sheet */}
      <IosBottomSheet isOpen={showQrModal} onClose={() => setShowQrModal(false)} title="Kartu Digital Anggota">
        <div className="flex flex-col items-center text-center p-4 space-y-4">
          <div className="p-6 bg-white rounded-3xl shadow-md border border-slate-100 flex flex-col items-center">
            <QrCode className="w-44 h-44 text-slate-900" />
            <p className="font-mono font-bold text-sm text-slate-700 mt-3">#{profil?.anggota_id || user?.anggota_id || user?.username}</p>
          </div>
          <div>
            <h4 className="font-bold text-base text-slate-900">{profil?.nama_lengkap || user?.username}</h4>
            <p className="text-xs text-slate-400 mt-0.5">Tunjukkan QR ini ke kasir saat berbelanja di Koperasi</p>
          </div>
        </div>
      </IosBottomSheet>
    </div>
  )
}
export default AnggotaDashboard