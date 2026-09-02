import SetoranKasirPage from '@/pages/kasir/SetoranKasir';
import PersetujuanSetoranPage from '@/pages/admin/PersetujuanSetoran';
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppLayout } from './components/layout/AppLayout'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { useAuthStore } from './store/authStore'

// Admin Pages
import { AdminDashboard } from './pages/admin/Dashboard'
import { DataBarang } from './pages/admin/DataBarang'
import { DataAnggota } from './pages/admin/DataAnggota'
import { LaporanTransaksi } from './pages/admin/LaporanTransaksi'
import { LaporanSelisihKasir } from './pages/admin/LaporanSelisihKasir'
import OpnamePage from './pages/admin/Opname'
import ManajemenPkmPage from './pages/admin/ManajemenPkm'
import LaporanTarikTunaiPage from './pages/admin/LaporanTarikTunai'
import ManajemenShuPage from './pages/admin/ManajemenShu'
import { ManajemenJabatan } from './pages/admin/ManajemenJabatan'

// Kasir Pages
import { KasirDashboard } from './pages/kasir/Dashboard'
import { TransaksiKasir } from './pages/kasir/Transaksi'
import { PembayaranHutangPage } from './pages/kasir/PembayaranHutang'
import { SerahTerimaPage } from './pages/kasir/SerahTerima'
import PesananAnggotaPage from './pages/kasir/PesananAnggota'
import BuatSerahTerimaPage from './pages/kasir/BuatSerahTerima'
import TarikTunaiKasirPage from './pages/kasir/TarikTunai'
import { RiwayatTransaksiKasir } from './pages/kasir/Riwayat'

// Anggota Pages
import AnggotaDashboard from './pages/anggota/Dashboard'
import Belanja from './pages/anggota/Belanja'
import BayarHutang from './pages/anggota/BayarHutang'
import { RiwayatTransaksiAnggota } from './pages/anggota/Riwayat'
import ProfilPage from './pages/anggota/Profil'
import TarikTunaiAnggotaPage from './pages/anggota/TarikTunai'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, token } = useAuthStore()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />
  }

  return <>{children}</>
}

export function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="barang" element={<DataBarang />} />
          <Route path="pkm" element={<ManajemenPkmPage />} />
          <Route path="opname" element={<OpnamePage />} />
          <Route path="anggota" element={<DataAnggota />} />
          <Route path="jabatan" element={<ManajemenJabatan />} />
          <Route path="shu" element={<ManajemenShuPage />} />
          <Route path="laporan" element={<LaporanTransaksi />} />
          <Route path="laporan-selisih" element={<LaporanSelisihKasir />} />
          <Route path="tarik-tunai" element={<LaporanTarikTunaiPage />} />
          <Route path="setoran-kasir" element={<PersetujuanSetoranPage />} />
        </Route>

        {/* Kasir Routes */}
        <Route path="/kasir" element={<ProtectedRoute allowedRoles={['kasir', 'admin']}><AppLayout /></ProtectedRoute>}>
          <Route index element={<KasirDashboard />} />
          <Route path="transaksi" element={<TransaksiKasir />} />
          <Route path="tarik-tunai" element={<TarikTunaiKasirPage />} />
          <Route path="pesanan" element={<PesananAnggotaPage />} />
          <Route path="hutang" element={<PembayaranHutangPage />} />
          <Route path="serah-terima" element={<SerahTerimaPage />} />
          <Route path="serah-terima/buat" element={<BuatSerahTerimaPage />} />
          <Route path="setoran" element={<SetoranKasirPage />} />
          <Route path="riwayat" element={<RiwayatTransaksiKasir />} />
        </Route>

        {/* Anggota Routes */}
        <Route path="/anggota" element={<ProtectedRoute allowedRoles={['anggota']}><AppLayout /></ProtectedRoute>}>
          <Route index element={<AnggotaDashboard />} />
          <Route path="belanja" element={<Belanja />} />
          <Route path="tarik-tunai" element={<TarikTunaiAnggotaPage />} />
          <Route path="bayar-hutang" element={<BayarHutang />} />
          <Route path="riwayat" element={<RiwayatTransaksiAnggota />} />
          <Route path="profil" element={<ProfilPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App