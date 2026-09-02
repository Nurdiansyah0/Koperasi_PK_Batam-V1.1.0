import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard,
  Package,
  Layers,
  Users,
  FileText, 
  Wallet,
  ShoppingCart,
  CreditCard,
  History,
  UserCircle,
  ArrowRightLeft,
  X,
  ShoppingBag,
  Banknote,
  Coins,
  ShieldCheck,
  Scale,
  ClipboardCheck,
  KeyRound
} from 'lucide-react'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore()

  const adminSections = [
    {
      title: 'Utama',
      items: [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard Admin' },
        { to: '/kasir/transaksi', icon: ShoppingCart, label: 'Buka POS Kasir' },
      ]
    },
    {
      title: 'Inventaris & Toko',
      items: [
        { to: '/admin/barang', icon: Package, label: 'Data Barang' },
        { to: '/admin/pkm', icon: Layers, label: 'Manajemen PKM' },
        { to: '/admin/opname', icon: ClipboardCheck, label: 'Stok Opname' },
      ]
    },
    {
      title: 'Keanggotaan & SK',
      items: [
        { to: '/admin/anggota', icon: Users, label: 'Data Anggota' },
        { to: '/admin/jabatan', icon: ShieldCheck, label: 'Jabatan & Mandat' },
        { to: '/admin/shu', icon: Coins, label: 'Manajemen SHU' },
      ]
    },
    {
      title: 'Laporan & Finansial',
      items: [
        { to: '/admin/laporan', icon: FileText, label: 'Laporan Transaksi' },
        { to: '/admin/laporan-selisih', icon: Scale, label: 'Laporan Selisih Kasir' },
        { to: '/admin/tarik-tunai', icon: Banknote, label: 'Laporan Tarik Tunai' },
        { to: '/admin/setoran-kasir', icon: Wallet, label: 'Persetujuan Setoran' },
      ]
    },
    {
      title: 'Integrasi & Gateway',
      items: [
        { to: '/admin/integrasi-api', icon: KeyRound, label: 'Integrasi API & Web' },
      ]
    }
  ]

  const kasirSections = [
    {
      title: 'Utama',
      items: [
        { to: '/kasir', icon: LayoutDashboard, label: 'Dashboard Kasir' },
        { to: '/kasir/transaksi', icon: ShoppingCart, label: 'Buka Kasir POS' },
      ]
    },
    {
      title: 'Layanan Anggota',
      items: [
        { to: '/kasir/pesanan', icon: ShoppingBag, label: 'Pesanan Online' },
        { to: '/kasir/hutang', icon: CreditCard, label: 'Persetujuan Hutang' },
        { to: '/kasir/tarik-tunai', icon: Banknote, label: 'Tarik Tunai SHU' },
      ]
    },
    {
      title: 'Operasional Toko',
      items: [
        { to: '/kasir/serah-terima', icon: ArrowRightLeft, label: 'Operasional Shift' },
        { to: '/kasir/riwayat', icon: History, label: 'Riwayat Transaksi' },
      ]
    }
  ]

  const anggotaSections = [
    {
      title: 'Utama',
      items: [
        { to: '/anggota', icon: LayoutDashboard, label: 'Dashboard Anggota' },
        { to: '/anggota/belanja', icon: ShoppingCart, label: 'Katalog Belanja' },
      ]
    },
    {
      title: 'Finansial & Tabungan',
      items: [
        { to: '/anggota/tarik-tunai', icon: Banknote, label: 'Tarik Tunai / SHU' },
        { to: '/anggota/bayar-hutang', icon: CreditCard, label: 'Bayar Hutang' },
        { to: '/anggota/riwayat', icon: History, label: 'Riwayat Transaksi' },
      ]
    },
    {
      title: 'Pengaturan Akun',
      items: [
        { to: '/anggota/profil', icon: UserCircle, label: 'Profil Saya' },
      ]
    }
  ]

  const sections = user?.role === 'admin' ? adminSections : user?.role === 'kasir' ? kasirSections : anggotaSections

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
              <h2 className="text-base font-bold tracking-tight text-white leading-tight">Koperasi PKPPK</h2>
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Karyawan BTH</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User Card */}
        <div className="p-3.5 mx-3 my-3 rounded-2xl bg-slate-800/90 border border-slate-700/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
            {user?.nama_lengkap ? user.nama_lengkap.charAt(0).toUpperCase() : user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate leading-tight">
              {user?.nama_lengkap || user?.username}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-400 truncate">
                @{user?.username}
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 uppercase tracking-wider shrink-0">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to.split('/').length <= 2}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          Koperasi PK &bull; PWA v2.1
        </div>
      </aside>
    </>
  )
}

export default Sidebar
