import { useState } from 'react'
import toast from 'react-hot-toast'
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt'
import { useAuthStore } from '@/store/authStore'
import { LogOut } from 'lucide-react'

export function AppLayout() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen bg-[#f2f2f7] dark:bg-black font-sans antialiased text-slate-900 dark:text-white">
      {/* Desktop Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* iOS Native Navigation Bar Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-zinc-800/50 h-14 flex items-center justify-between px-4 sm:px-6 pt-safe">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <img src="/Logo.svg" alt="Logo" className="w-7 h-7 rounded-lg shadow-2xs" />
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-none">
                  Koperasi PKPPK BTH
                </span>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live System
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(user.role === 'anggota' ? '/anggota/profil' : `/${user.role}`)}
              className="flex items-center gap-2 py-1 px-2.5 rounded-full bg-slate-100 dark:bg-zinc-800/80 active:scale-95 transition-transform"
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[10px] flex items-center justify-center shadow-xs">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 capitalize">
                {user.role}
              </span>
            </button>

            <button 
              onClick={handleLogout} 
              className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-lg md:max-w-7xl w-full mx-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* iOS Bottom Navigation Bar */}
      <BottomNav />
      <PwaInstallPrompt />
    </div>
  )
}
export default AppLayout
