import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { User, Lock, AlertCircle, ShieldCheck } from 'lucide-react'
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt'
import toast from 'react-hot-toast'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Masukkan password"
                autoComplete="current-password"
              />
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

      <PwaInstallPrompt />
    </div>
  )
}
export default LoginPage