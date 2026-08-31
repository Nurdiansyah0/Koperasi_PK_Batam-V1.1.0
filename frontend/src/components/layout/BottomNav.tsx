import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  ShoppingBag,
  CreditCard,
  History,
  UserCircle,
  ArrowRightLeft,
  Store, Wallet
} from 'lucide-react'

export function BottomNav() {
  const { user } = useAuthStore()
  if (!user) return null

  const adminNav = [
    { to: '/admin', icon: LayoutDashboard, label: 'Beranda' },
    { to: '/admin/barang', icon: Package, label: 'Barang' },
    { to: '/admin/anggota', icon: Users, label: 'Anggota' },
    { to: '/admin/laporan', icon: FileText, label: 'Laporan' },
    { to: '/admin/setoran-kasir', icon: Wallet, label: 'Setoran' },
  ]

  const kasirNav = [
    { to: '/kasir', icon: LayoutDashboard, label: 'Beranda' },
    { to: '/kasir/transaksi', icon: Store, label: 'Kasir POS' },
    { to: '/kasir/hutang', icon: CreditCard, label: 'Hutang' },
    { to: '/kasir/serah-terima', icon: ArrowRightLeft, label: 'Shift' },
    { to: '/kasir/riwayat', icon: History, label: 'Riwayat' },
  ]

  const anggotaNav = [
    { to: '/anggota', icon: LayoutDashboard, label: 'Beranda' },
    { to: '/anggota/belanja', icon: ShoppingBag, label: 'Belanja' },
    { to: '/anggota/bayar-hutang', icon: CreditCard, label: 'Hutang' },
    { to: '/anggota/riwayat', icon: History, label: 'Riwayat' },
    { to: '/anggota/profil', icon: UserCircle, label: 'Profil' },
  ]

  const items = user.role === 'admin' ? adminNav : user.role === 'kasir' ? kasirNav : anggotaNav

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-t border-slate-200/60 dark:border-zinc-800/60 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] flex justify-around items-center shadow-xl safe-area-inset-bottom">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length <= 2}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 max-w-[72px] py-1 rounded-2xl transition-all duration-150 active:scale-90 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 font-medium'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5 stroke-[2.25]" />
            <span className="text-[10px] tracking-tight truncate leading-none">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
export default BottomNav
