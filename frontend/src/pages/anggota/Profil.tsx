import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { anggotaService } from '@/services/anggotaService'
import { IosListSection, IosListItem } from '@/components/ios/IosList'
import { IosBottomSheet } from '@/components/ios/IosBottomSheet'
import { formatRupiah } from '@/lib/utils'
import type { ProfilAnggota } from '@/types'
import { User, Shield, Lock, LogOut, KeyRound, CheckCircle2, ChevronRight } from 'lucide-react'

export function ProfilPage() {
  const { user, logout } = useAuthStore()
  const [profil, setProfil] = useState<ProfilAnggota | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  // Password state
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    anggotaService.getProfil()
      .then(setProfil)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    if (newPassword !== confirmPassword) return setMsg('Konfirmasi password tidak cocok')
    if (newPassword.length < 6) return setMsg('Password minimal 6 karakter')

    setSavingPassword(true)
    try {
      const res = await anggotaService.changePassword(oldPassword, newPassword, user?.user_id ?? 0)
      if (res.success) {
        toast.success('Password berhasil diperbarui!')
        setShowPasswordModal(false)
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setMsg(res.error || 'Gagal mengubah password')
      }
    } catch {
      setMsg('Terjadi kesalahan')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 max-w-lg mx-auto">
      {/* 1. iOS Profile Avatar Header */}
      <div className="flex flex-col items-center text-center pt-2">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-3">
          {user?.username?.charAt(0).toUpperCase() || 'A'}
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {profil?.nama_lengkap || user?.username}
        </h2>
        <span className="inline-block text-xs font-semibold px-3 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 mt-1">
          Anggota Koperasi &bull; #{profil?.anggota_id || user?.anggota_id}
        </span>
      </div>

      {/* 2. Apple Settings: Keuangan & Saldo */}
      <IosListSection title="Informasi Keuangan">
        <IosListItem
          title="Saldo Bebas"
          subtitle="Tersedia untuk transaksi belanja"
          value={<span className="font-bold text-blue-600">{formatRupiah(profil?.saldo || 0)}</span>}
        />
        <IosListItem
          title="Simpanan Pokok (Agunan)"
          subtitle="Modal setoran awal wajib jaminan anggota"
          value={<span className="font-bold text-amber-600">{formatRupiah(profil?.simpanan_pokok ?? 300000)}</span>}
        />
        <IosListItem
          title="Allowance Koperasi"
          subtitle="Fasilitas plafon ekstra belanja lancar"
          value={<span className="font-bold text-blue-600">+{formatRupiah(profil?.allowance_hutang ?? 100000)}</span>}
        />
        <IosListItem
          title="Total Limit Kredit"
          subtitle="Simpanan pokok (300rb) + allowance (100rb)"
          value={<span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(profil?.limit_hutang ?? 400000)}</span>}
        />
        <IosListItem
          title="Total Hutang"
          subtitle="Belanja kredit belum lunas"
          value={<span className="font-bold text-rose-600">{formatRupiah(profil?.hutang || 0)}</span>}
        />
        <IosListItem
          title="Sisa Pagu Kredit"
          subtitle="Batas belanja hutang tersedia"
          value={<span className="font-bold text-emerald-600">{formatRupiah(profil?.sisa_limit_hutang || 0)}</span>}
        />
        <IosListItem
          title="SHU Berjalan"
          subtitle="Sisa Hasil Usaha tahun ini"
          value={<span className="font-bold text-emerald-600">{formatRupiah(profil?.shu || 0)}</span>}
        />
      </IosListSection>

      {/* 3. Apple Settings: Keamanan & Akun */}
      <IosListSection title="Keamanan & Pengaturan">
        <IosListItem
          icon={<KeyRound className="w-4 h-4" />}
          iconBgColor="bg-amber-500"
          title="Ubah Password"
          subtitle="Perbarui kata sandi akun Anda"
          hasChevron
          onClick={() => setShowPasswordModal(true)}
        />
      </IosListSection>

      {/* 4. Apple Settings: Logout */}
      <IosListSection>
        <IosListItem
          icon={<LogOut className="w-4 h-4" />}
          iconBgColor="bg-rose-500"
          title="Keluar dari Akun"
          destructive
          onClick={handleLogout}
        />
      </IosListSection>

      {/* Password Sheet */}
      <IosBottomSheet isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Ubah Password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          {msg && <p className="text-xs text-rose-500 font-semibold">{msg}</p>}
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Password Saat Ini"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm font-medium focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password Baru (min 6 karakter)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm font-medium focus:outline-none"
            />
            <input
              type="password"
              placeholder="Konfirmasi Password Baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm font-medium focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="w-full h-12 rounded-2xl bg-blue-600 text-white font-extrabold text-sm shadow-md active:scale-[0.98] transition-all"
          >
            {savingPassword ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
      </IosBottomSheet>
    </div>
  )
}
export default ProfilPage