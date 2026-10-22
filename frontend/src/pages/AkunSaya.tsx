import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { KeyRound, Lock, ShieldCheck } from 'lucide-react'

/**
 * Halaman pengaturan akun untuk role admin & kasir (ganti password sendiri).
 * Anggota memakai halaman /anggota/profil.
 */
export function AkunSaya() {
  const { user } = useAuthStore()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    if (newPassword.length < 6) return setMsg('Password baru minimal 6 karakter')
    if (newPassword !== confirmPassword) return setMsg('Konfirmasi password tidak cocok')
    if (newPassword === oldPassword) return setMsg('Password baru harus berbeda dari password lama')

    setSaving(true)
    try {
      const res = await authService.changePassword(oldPassword, newPassword)
      if (res.success) {
        toast.success('Password berhasil diperbarui!')
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setMsg(res.message || res.error || 'Gagal mengubah password')
      }
    } catch (error: any) {
      setMsg(error.response?.data?.message || 'Terjadi kesalahan, coba lagi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 max-w-lg mx-auto">
      <div className="flex flex-col items-center text-center pt-2">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-3">
          {user?.username?.charAt(0).toUpperCase() || 'A'}
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{user?.username}</h2>
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 mt-1 capitalize">
          <ShieldCheck className="w-3.5 h-3.5" /> {user?.role}
        </span>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 dark:text-white">Ubah Password</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {msg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-sm font-medium">
                {msg}
              </div>
            )}
            <Input
              label="Password Saat Ini"
              type="password"
              autoComplete="current-password"
              required
              icon={<Lock className="w-4 h-4" />}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
            <Input
              label="Password Baru"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              icon={<Lock className="w-4 h-4" />}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Konfirmasi Password Baru"
              type="password"
              autoComplete="new-password"
              required
              icon={<Lock className="w-4 h-4" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" loading={saving} className="w-full font-bold">
              Simpan Password Baru
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AkunSaya
