import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppLayout } from './components/layout/AppLayout'
import { useAuthStore } from './store/authStore'

// ─── Critical path (always eager loaded — kecil & dibutuhkan segera) ─────────
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'

// ─── Admin Pages (lazy — hanya dimuat saat kasir/admin mengaksesnya) ──────────
const ResetPasswordPage    = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const AdminDashboard       = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })))
const DataBarang           = lazy(() => import('./pages/admin/DataBarang').then(m => ({ default: m.DataBarang })))
const DataAnggota          = lazy(() => import('./pages/admin/DataAnggota').then(m => ({ default: m.DataAnggota })))
const LaporanTransaksi     = lazy(() => import('./pages/admin/LaporanTransaksi').then(m => ({ default: m.LaporanTransaksi })))
const LaporanSelisihKasir  = lazy(() => import('./pages/admin/LaporanSelisihKasir').then(m => ({ default: m.LaporanSelisihKasir })))
const OpnamePage           = lazy(() => import('./pages/admin/Opname'))
const ManajemenPkmPage     = lazy(() => import('./pages/admin/ManajemenPkm'))
const LaporanTarikTunai    = lazy(() => import('./pages/admin/LaporanTarikTunai'))
const ManajemenShuPage     = lazy(() => import('./pages/admin/ManajemenShu'))
const ManajemenJabatan     = lazy(() => import('./pages/admin/ManajemenJabatan').then(m => ({ default: m.ManajemenJabatan })))
const ApiIntegration       = lazy(() => import('./pages/admin/ApiIntegration').then(m => ({ default: m.ApiIntegration })))
const PersetujuanSetoran   = lazy(() => import('./pages/admin/PersetujuanSetoran'))

// ─── Kasir Pages (lazy) ───────────────────────────────────────────────────────
const KasirDashboard       = lazy(() => import('./pages/kasir/Dashboard').then(m => ({ default: m.KasirDashboard })))
const TransaksiKasir       = lazy(() => import('./pages/kasir/Transaksi').then(m => ({ default: m.TransaksiKasir })))
const PembayaranHutang     = lazy(() => import('./pages/kasir/PembayaranHutang').then(m => ({ default: m.PembayaranHutangPage })))
const SerahTerimaPage      = lazy(() => import('./pages/kasir/SerahTerima').then(m => ({ default: m.SerahTerimaPage })))
const PesananAnggota       = lazy(() => import('./pages/kasir/PesananAnggota'))
const BuatSerahTerima      = lazy(() => import('./pages/kasir/BuatSerahTerima'))
const TarikTunaiKasir      = lazy(() => import('./pages/kasir/TarikTunai'))
const RiwayatKasir         = lazy(() => import('./pages/kasir/Riwayat').then(m => ({ default: m.RiwayatTransaksiKasir })))
const SetoranKasir         = lazy(() => import('./pages/kasir/SetoranKasir'))

// ─── Anggota Pages (lazy) ─────────────────────────────────────────────────────
const AnggotaDashboard     = lazy(() => import('./pages/anggota/Dashboard'))
const Belanja              = lazy(() => import('./pages/anggota/Belanja'))
const BayarHutang          = lazy(() => import('./pages/anggota/BayarHutang'))
const RiwayatAnggota       = lazy(() => import('./pages/anggota/Riwayat').then(m => ({ default: m.RiwayatTransaksiAnggota })))
const ProfilPage           = lazy(() => import('./pages/anggota/Profil'))
const TarikTunaiAnggota    = lazy(() => import('./pages/anggota/TarikTunai'))

// ─── Loading Skeleton yang ringan ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400">Memuat halaman...</span>
      </div>
    </div>
  )
}

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
      <Suspense fallback={<PageLoader />}>
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
            <Route path="tarik-tunai" element={<LaporanTarikTunai />} />
            <Route path="setoran-kasir" element={<PersetujuanSetoran />} />
            <Route path="integrasi-api" element={<ApiIntegration />} />
          </Route>

          {/* Kasir Routes */}
          <Route path="/kasir" element={<ProtectedRoute allowedRoles={['kasir', 'admin']}><AppLayout /></ProtectedRoute>}>
            <Route index element={<KasirDashboard />} />
            <Route path="transaksi" element={<TransaksiKasir />} />
            <Route path="tarik-tunai" element={<TarikTunaiKasir />} />
            <Route path="pesanan" element={<PesananAnggota />} />
            <Route path="hutang" element={<PembayaranHutang />} />
            <Route path="serah-terima" element={<SerahTerimaPage />} />
            <Route path="serah-terima/buat" element={<BuatSerahTerima />} />
            <Route path="setoran" element={<SetoranKasir />} />
            <Route path="riwayat" element={<RiwayatKasir />} />
          </Route>

          {/* Anggota Routes */}
          <Route path="/anggota" element={<ProtectedRoute allowedRoles={['anggota']}><AppLayout /></ProtectedRoute>}>
            <Route index element={<AnggotaDashboard />} />
            <Route path="belanja" element={<Belanja />} />
            <Route path="tarik-tunai" element={<TarikTunaiAnggota />} />
            <Route path="bayar-hutang" element={<BayarHutang />} />
            <Route path="riwayat" element={<RiwayatAnggota />} />
            <Route path="profil" element={<ProfilPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App