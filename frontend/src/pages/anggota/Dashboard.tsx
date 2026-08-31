import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { anggotaService } from '@/services/anggotaService'
import { useAuthStore } from '@/store/authStore'
import { IosMemberCard } from '@/components/ios/IosMemberCard'
import { IosListSection, IosListItem } from '@/components/ios/IosList'
import { IosBottomSheet } from '@/components/ios/IosBottomSheet'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { ProfilAnggota, HistoriTransaksiAnggota } from '@/types'
import { ShoppingBag, CreditCard, History, UserCircle, ArrowUpRight, CheckCircle2, QrCode } from 'lucide-react'

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

  const quickActions = [
    { label: 'Belanja', icon: ShoppingBag, color: 'bg-blue-600', to: '/anggota/belanja' },
    { label: 'Bayar Hutang', icon: CreditCard, color: 'bg-rose-500', to: '/anggota/bayar-hutang' },
    { label: 'Riwayat', icon: History, color: 'bg-amber-500', to: '/anggota/riwayat' },
    { label: 'Profil Saya', icon: UserCircle, color: 'bg-slate-700', to: '/anggota/profil' },
  ]

  return (
    <div className="space-y-6 pb-16 max-w-lg mx-auto">
      {/* 1. Apple Wallet Membership Card */}
      <IosMemberCard
        nama={profil?.nama_lengkap || user?.username || 'Anggota'}
        username={user?.username || ''}
        saldo={profil?.saldo || 0}
        hutang={profil?.hutang || 0}
        shu={profil?.shu || 0}
        anggotaId={profil?.anggota_id || user?.anggota_id}
        onShowQR={() => setShowQrModal(true)}
      />

      {/* 2. iOS Quick Actions Bar */}
      <div className="grid grid-cols-4 gap-3 px-1">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.to)}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group"
            >
              <div className={`w-14 h-14 rounded-2xl ${action.color} text-white flex items-center justify-center shadow-sm shadow-slate-300 dark:shadow-none group-hover:brightness-105 transition-all`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-center tracking-tight leading-tight">
                {action.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* 3. Inset Grouped Recent Activity */}
      <IosListSection title="Transaksi Terbaru" footer="Menampilkan 5 transaksi terakhir">
        {transaksi.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Belum ada transaksi
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