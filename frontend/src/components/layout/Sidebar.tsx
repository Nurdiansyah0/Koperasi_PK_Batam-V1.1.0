import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard,
  Package,
  Users,
  FileText, Wallet,
  ShoppingCart,
  CreditCard,
  History,
  UserCircle,
  ArrowRightLeft,
  X,
  ShoppingBag
} from 'lucide-react'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore()

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard Admin' },
    { to: '/admin/barang', icon: Package, label: 'Data Barang' },
    { to: '/admin/anggota', icon: Users, label: 'Data Anggota' },
    { to: '/admin/laporan', icon: FileText, label: 'Laporan Transaksi' },
    { to: '/admin/setoran-kasir', icon: Wallet, label: 'Persetujuan Setoran' },
    { to: '/kasir/transaksi', icon: ShoppingCart, label: 'Buka POS Kasir' },
  ]

  const kasirLinks = [
    { to: '/kasir', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/kasir/transaksi', icon: ShoppingCart, label: 'Kasir POS' },
    { to: '/kasir/pesanan', icon: ShoppingBag, label: 'Pesanan Anggota' },
    { to: '/kasir/hutang', icon: CreditCard, label: 'Persetujuan Hutang' },
    { to: '/kasir/serah-terima', icon: ArrowRightLeft, label: 'Operasional Shift' },
    { to: '/kasir/riwayat', icon: History, label: 'Riwayat Transaksi' },
  ]

  const anggotaLinks = [
    { to: '/anggota', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/anggota/belanja', icon: ShoppingCart, label: 'Katalog Belanja' },
    { to: '/anggota/bayar-hutang', icon: CreditCard, label: 'Bayar Hutang' },
    { to: '/anggota/riwayat', icon: History, label: 'Riwayat Transaksi' },
    { to: '/anggota/profil', icon: UserCircle, label: 'Profil Saya' },
  ]

  const links = user?.role === 'admin' ? adminLinks : user?.role === 'kasir' ? kasirLinks : anggotaLinks

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 text-white min-h-screen flex flex-col
        transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/Logo.svg" alt="Logo Koperasi" className="w-9 h-9 bg-white rounded-xl p-1 shadow-sm" />
            <div>
              <h2 className="text-base font-bold tracking-tight text-white leading-tight">Koperasi PK</h2>
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Koperasi Batam</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-sm">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.username}</p>
            <span className="inline-block text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 capitalize mt-0.5">
              {user?.role}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to.split('/').length <= 2}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {link.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          Koperasi PK &bull; PWA v2.0
        </div>
      </aside>
    </>
  )
}
