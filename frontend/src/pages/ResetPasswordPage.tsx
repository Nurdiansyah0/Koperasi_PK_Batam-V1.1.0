import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { KeyRound, User, Lock, AlertCircle, ShieldCheck, Eye, EyeOff, ArrowLeft, HelpCircle, CheckCircle2, DollarSign, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'

export function ResetPasswordPage() {
  const [username, setUsername] = useState('')
  const [digitHutang, setDigitHutang] = useState('')
  const [digitShu, setDigitShu] = useState('')
  const [passwordBaru, setPasswordBaru] = useState('')
  const [passwordBaruConfirm, setPasswordBaruConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

  const handleReset = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!username.trim()) {
      setError('Harap masukkan username Anda!')
      toast.error('Harap masukkan username!')
      return
    }

    if (digitHutang.trim().length !== 2) {
      setError('2 digit depan hutang harus terdiri dari 2 angka (misal: 35 atau 00 jika lunas)!')
      toast.error('Format 2 digit hutang harus 2 angka')
      return
    }

    if (digitShu.trim().length !== 3) {
      setError('3 digit belakang SHU harus terdiri dari 3 angka (misal: 750 atau 000 jika nol)!')
      toast.error('Format 3 digit SHU harus 3 angka')
      return
    }

    if (passwordBaru.length < 6) {
      setError('Password baru minimal harus 6 karakter!')
      toast.error('Password baru minimal 6 karakter!')
      return
    }

    if (passwordBaru !== passwordBaruConfirm) {
      setError('Konfirmasi password tidak cocok! Pastikan kedua kolom password sama.')
      toast.error('Konfirmasi password tidak cocok!')
      return
    }

    setLoading(true)

    try {
      const res = await authService.resetPasswordWithChallenge({
        username: username.trim(),
        digit_hutang: digitHutang.trim(),
        digit_shu: digitShu.trim(),
        password_baru: passwordBaru,
      })

      if (res.success) {
        setSuccessMessage(res.message || 'Password berhasil direset!')
        toast.success('Password berhasil direset! Silakan login.')
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else {
        const msg = res.message || res.error || 'Verifikasi gagal. Periksa data kembali.'
        setError(msg)
        toast.error(msg)
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        const msg = 'Terlalu banyak percobaan reset gagal. Silakan tunggu 1 menit demi keamanan akun.'
        setError(msg)
        toast.error(msg)
      } else {
        const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Gagal mereset password'
        setError(msg)
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#060a12] via-[#0b1329] to-[#0f172a] p-4 sm:p-6 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation */}
      <div className="w-full max-w-md mb-4 z-10 flex justify-between items-center px-1">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-blue-400" />
          <span>Kembali ke Login</span>
        </button>
      </div>

      {/* Main Reset Card */}
      <Card className="w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border-white/15 shadow-2xl rounded-[32px] z-10 text-white overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-blue-500 to-emerald-400" />

        <CardHeader className="text-center pb-2 pt-8 px-6 sm:px-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 p-3 bg-gradient-to-tr from-amber-500/20 to-blue-500/20 rounded-3xl border border-amber-500/30 shadow-inner flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Reset Password
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            Verifikasi Keamanan Rekening Koperasi PKPPK BTH
          </p>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-4">
          {successMessage ? (
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-300">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="font-bold text-base text-white">Password Berhasil Diperbarui!</h4>
              <p className="text-xs text-emerald-300/90">{successMessage}</p>
              <p className="text-[11px] text-slate-400">Mengalihkan ke halaman login...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Step 1: Username */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  1. Username Anggota
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

              {/* Step 2: Security Verification Codes */}
              <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 space-y-3.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-blue-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>2. Verifikasi Data Buku Anggota</span>
                </div>
                
                {/* Visual Explanation Card */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-white/10 text-[11px] space-y-2.5">
                  <p className="text-slate-300 font-bold flex items-center gap-1.5 text-xs">
                    💡 Cara Mengetahui Angka Verifikasi:
                  </p>
                  
                  <div className="space-y-2 text-slate-300">
                    {/* Hutang Example */}
                    <div className="flex items-start gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-amber-300 text-xs">2 Digit Paling Depan Hutang</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Ambil 2 angka pertama dari total hutang Anda.
                        </p>
                        <p className="text-[10px] font-mono text-slate-300 mt-1">
                          &bull; Hutang Rp <strong className="text-amber-300 underline font-black">35</strong>0.000 &rarr; Ketik: <span className="px-1.5 py-0.5 bg-amber-500/30 text-amber-200 rounded font-bold">35</span><br />
                          &bull; Jika hutang Rp <strong className="text-amber-300 underline font-black">0</strong> (Lunas) &rarr; Ketik: <span className="px-1.5 py-0.5 bg-amber-500/30 text-amber-200 rounded font-bold">00</span>
                        </p>
                      </div>
                    </div>

                    {/* SHU Example */}
                    <div className="flex items-start gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-emerald-300 text-xs">3 Digit Paling Belakang SHU</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Ambil 3 angka terakhir dari saldo SHU Anda.
                        </p>
                        <p className="text-[10px] font-mono text-slate-300 mt-1">
                          &bull; SHU Rp 1.458.<strong className="text-emerald-300 underline font-black">750</strong> &rarr; Ketik: <span className="px-1.5 py-0.5 bg-emerald-500/30 text-emerald-200 rounded font-bold">750</span><br />
                          &bull; Jika SHU masih Rp <strong className="text-emerald-300 underline font-black">0</strong> &rarr; Ketik: <span className="px-1.5 py-0.5 bg-emerald-500/30 text-emerald-200 rounded font-bold">000</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic pt-1 border-t border-white/5">
                    * Belum tahu saldo Anda? Tanyakan langsung ke Kasir atau Pengurus Koperasi PKPPK BTH.
                  </p>
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-black text-amber-300 uppercase tracking-wider mb-1">
                      2 Digit Depan Hutang:
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={digitHutang}
                      onChange={(e) => setDigitHutang(e.target.value)}
                      required
                      placeholder="e.g. 35 / 00"
                      className="w-full text-center font-mono font-black text-base tracking-widest px-3 py-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all shadow-inner"
                    />
                    <span className="block text-[9px] text-slate-400 text-center mt-1 font-medium">
                      2 angka paling awal
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-emerald-300 uppercase tracking-wider mb-1">
                      3 Digit Belakang SHU:
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      value={digitShu}
                      onChange={(e) => setDigitShu(e.target.value)}
                      required
                      placeholder="e.g. 750 / 000"
                      className="w-full text-center font-mono font-black text-base tracking-widest px-3 py-2.5 bg-slate-950 border border-emerald-500/40 rounded-xl text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition-all shadow-inner"
                    />
                    <span className="block text-[9px] text-slate-400 text-center mt-1 font-medium">
                      3 angka paling akhir
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3: New Password */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    3. Password Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordBaru}
                      onChange={(e) => setPasswordBaru(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Minimal 6 karakter"
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

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Konfirmasi Password Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordBaruConfirm}
                      onChange={(e) => setPasswordBaruConfirm(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Ketik ulang password baru"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-white/10 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Verifikasi & Simpan Password Baru</span>
                )}
              </button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center z-10">
        <p className="text-slate-500 text-xs">
          &copy; 2025 Koperasi PKPPK BTH &bull; Sistem Reset Mandiri
        </p>
      </div>
    </div>
  )
}
export default ResetPasswordPage
