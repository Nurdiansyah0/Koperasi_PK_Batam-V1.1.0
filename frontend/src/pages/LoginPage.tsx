import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { User, Lock, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt'
import toast from 'react-hot-toast'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setAuth, isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/${user.role}`)
    }
  }, [isAuthenticated, user, navigate])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const res = await authService.login(username, password)
      if (res.success && res.token && res.user) {
        setAuth(res.user, res.token)
        toast.success('Login berhasil')
        navigate(`/${res.user.role}`)
      } else {
        const errorMessage = res.error || res.message || 'Username atau password salah'
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Gagal terhubung ke server'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-700/30 shadow-2xl rounded-3xl z-10">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 shadow-inner">
              <img src="/Logo.svg" alt="Logo Koperasi" className="w-16 h-16 object-contain" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Koperasi PK
          </CardTitle>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Sistem Informasi Koperasi Karyawan PK Batam
          </p>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-rose-50 text-rose-600 border border-rose-200/80 p-3.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <Input
                label="Username"
                icon={<User className="w-4 h-4" />}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Masukkan username Anda"
                autoComplete="username"
              />

              <Input
                label="Password"
                icon={<Lock className="w-4 h-4" />}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Masukkan password"
                autoComplete="current-password"
                rightElement={
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-4 h-4 rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                    <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
                <span className="text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors select-none text-xs sm:text-sm">
                  Ingat saya
                </span>
              </label>
              
              <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors text-xs sm:text-sm focus:outline-none focus-visible:underline">
                Lupa password?
              </a>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-sm sm:text-base font-bold shadow-lg shadow-blue-600/25 mt-4" 
              loading={loading}
            >
              Masuk ke Aplikasi
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Koneksi aman terenkripsi JWT token</span>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
          &copy; 2025 Koperasi PK Batam. All rights reserved.
        </p>
        <p className="text-slate-500/80 dark:text-slate-600 text-[10px] sm:text-xs mt-1">
          Version 1.1.0
        </p>
      </div>

      <PwaInstallPrompt />
    </div>
  )
}
export default LoginPage