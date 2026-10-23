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
  Store,
  Wallet,
  ShoppingCart
} from 'lucide-react'

export function BottomNav() {
  const { user } = useAuthStore()
  if (!user) return null

  const adminNav = [
    { to: '/admin', icon: LayoutDashboard, label: 'Beranda' },
    { to: '/admin/barang', icon: Package, label: 'Barang' },
    { to: '/admin/anggota', icon: Users, label: 'Anggota' },
    { to: '/admin/laporan', icon: FileText, label: 'Laporan' },
    { to: '/admin/akun', icon: UserCircle, label: 'Akun' },
  ]

  const kasirNav = [
    { to: '/kasir', icon: LayoutDashboard, label: 'Beranda' },
    { to: '/kasir/pesanan', icon: ShoppingBag, label: 'Pesanan' },
    { to: '/kasir/transaksi', icon: Store, label: 'POS', isPrimary: true },
    { to: '/kasir/serah-terima', icon: ArrowRightLeft, label: 'Shift' },
    { to: '/kasir/akun', icon: UserCircle, label: 'Akun' },
  ]

  const anggotaNav = [
    { to: '/anggota', icon: LayoutDashboard, label: 'Beranda' },
    { to: '/anggota/belanja', icon: ShoppingCart, label: 'Belanja', isPrimary: true },
    { to: '/anggota/bayar-hutang', icon: CreditCard, label: 'Hutang' },
    { to: '/anggota/riwayat', icon: History, label: 'Riwayat' },
    { to: '/anggota/profil', icon: UserCircle, label: 'Profil' },
  ]

  const items = user.role === 'admin' ? adminNav : user.role === 'kasir' ? kasirNav : anggotaNav

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-2xl border-t border-slate-200/70 dark:border-zinc-800/80 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),10px)] flex justify-around items-center shadow-2xl safe-area-inset-bottom">
      {items.map((item) => {
        const Icon = item.icon
        const isPrimary = (item as any).isPrimary

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length <= 2}
            className={({ isActive }) =>
              isPrimary
                ? `flex flex-col items-center justify-center -translate-y-2 py-1 px-3 rounded-2xl transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 font-black'
                      : 'bg-slate-900 text-white dark:bg-zinc-800 shadow-md font-bold'
                  }`
                : `flex flex-col items-center justify-center flex-1 max-w-[68px] py-1 rounded-2xl transition-all duration-150 active:scale-90 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                      : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 font-medium'
                  }`
            }
          >
            {isPrimary ? (
              <div className="flex flex-col items-center">
                <Icon className="w-5 h-5 mb-0.5 stroke-[2.5]" />
                <span className="text-[10px] tracking-tight uppercase font-black">{item.label}</span>
              </div>
            ) : (
              <>
                <Icon className="w-5 h-5 mb-0.5 stroke-[2.25]" />
                <span className="text-[10px] tracking-tight truncate leading-none">{item.label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export default BottomNav
