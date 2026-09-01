import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { User, Lock, AlertCircle, ShieldCheck, Eye, EyeOff, ArrowLeft, HelpCircle, X, PhoneCall, CheckCircle2 } from 'lucide-react'
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt'
import toast from 'react-hot-toast'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showHelpModal, setShowHelpModal] = useState(false)
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
        toast.success(`Selamat datang, ${res.user.nama_lengkap || res.user.username}!`)
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#060a12] via-[#0b1329] to-[#0f172a] p-4 sm:p-6 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <div className="w-full max-w-md mb-4 z-10 flex justify-between items-center px-1">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-blue-400" />
          <span>Kembali ke Beranda</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-300 px-3 py-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all"
        >
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span>Bantuan</span>
        </button>
      </div>

      {/* Main Login Card */}
      <Card className="w-full max-w-md bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-2xl border-white/15 shadow-2xl rounded-[32px] z-10 text-white overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400" />

        <CardHeader className="text-center pb-2 pt-8 px-6 sm:px-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 p-2.5 bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 rounded-3xl border border-blue-500/30 shadow-inner flex items-center justify-center relative group">
              <img src="/Logo.svg" alt="Logo Koperasi PKPPK BTH" className="w-full h-full object-contain drop-shadow-md group-hover:scale-105 transition-transform" />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900" />
              </span>
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Koperasi PKPPK BTH
          </CardTitle>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
            Portal Layanan Koperasi Karyawan PKPPK BTH
          </p>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Masukkan username Anda"
                    autoComplete="username"
                    autoCapitalize="none"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-white/10 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Masukkan password Anda"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-3 bg-slate-950/80 border border-white/10 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition-all cursor-pointer"
                />
                <span className="text-slate-400 group-hover:text-slate-200 transition-colors font-medium">
                  Ingat saya
                </span>
              </label>

              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className="text-blue-400 hover:text-blue-300 font-bold transition-colors hover:underline"
              >
                Lupa password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Masuk ke Portal</span>
              )}
            </button>

            {/* Quick Demo Role Selector Pills (Local Development Only) */}
            {import.meta.env.DEV && (
              <div className="pt-4 border-t border-white/10 text-center">
                <p className="text-[11px] font-bold text-slate-400 mb-2.5">
                  ⚡ Login Cepat Pengembang (Dev Mode):
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    { label: '👨‍💼 Admin', user: 'Admin', pass: 'password' },
                    { label: '🏪 Kasir', user: 'Tanggang', pass: 'password' },
                    { label: '👤 Anggota', user: 'Nurdiansyah', pass: 'password' },
                  ].map(demo => (
                    <button
                      key={demo.label}
                      type="button"
                      onClick={() => {
                        setUsername(demo.user)
                        setPassword(demo.pass)
                        toast.success(`Akun ${demo.label} dipilih!`)
                      }}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-blue-600/30 text-slate-300 hover:text-white border border-white/10 active:scale-95 transition-all"
                    >
                      {demo.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Akses Aman &bull; Sesi Terenkripsi</span>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Feature Highlights Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-md px-2 z-10">
        {[
          '📱 PWA Native Ready',
          '💳 Kartu Anggota Digital',
          '🔒 Sistem Transparan & Akurat',
        ].map((feat, idx) => (
          <span
            key={idx}
            className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10 backdrop-blur-md shadow-xs"
          >
            {feat}
          </span>
        ))}
      </div>

      {/* Help / Password Reset Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-7 max-w-sm w-full text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Bantuan Akun & Sandi</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Untuk keamanan anggota Koperasi PKPPK BTH, reset kata sandi dilakukan secara terverifikasi melalui Pengurus Koperasi atau Admin Kasir.
            </p>

            <div className="p-3.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-xs text-blue-300 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Langkah Reset Sandi:
              </p>
              <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1 pl-1">
                <li>Datangi kasir atau hubungi pengurus koperasi.</li>
                <li>Sebutkan No. Anggota atau Username Anda.</li>
                <li>Admin akan melakukan verifikasi dan reset kata sandi baru.</li>
              </ol>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowHelpModal(false)
                  navigate('/reset-password')
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all"
              >
                Reset Sandi Mandiri &rarr;
              </button>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <p className="text-slate-500 text-xs sm:text-sm">
          &copy; 2025 Koperasi PKPPK BTH. All rights reserved.
        </p>
        <p className="text-slate-600 text-[10px] sm:text-xs mt-1">
          Version 1.1.0 &bull; Single-Sign-On Ready
        </p>
      </div>

      <PwaInstallPrompt />
    </div>
  )
}
export default LoginPage