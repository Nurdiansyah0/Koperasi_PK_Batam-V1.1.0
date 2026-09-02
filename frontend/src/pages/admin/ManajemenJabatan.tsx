import React, { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '@/services/adminService'
import { JabatanAnggotaItem, JabatanSummary, AnggotaAdmin } from '@/types'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import {
  ShieldCheck,
  UserCheck,
  Users,
  Search,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Briefcase,
  History,
  Info
} from 'lucide-react'

export function ManajemenJabatan() {
  const [jabatanList, setJabatanList] = useState<JabatanAnggotaItem[]>([])
  const [summary, setSummary] = useState<JabatanSummary>({
    admin_aktif: 0,
    kasir_aktif: 0,
    pengurus_aktif: 0,
    total_riwayat: 0,
    total_nonaktif: 0
  })
  const [anggotaList, setAnggotaList] = useState<AnggotaAdmin[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'kasir' | 'pengurus' | 'nonaktif'>('all')

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false)
  const [selectedJabatan, setSelectedJabatan] = useState<JabatanAnggotaItem | null>(null)

  // Form State - Assign
  const [assignUserId, setAssignUserId] = useState<number | ''>('')
  const [assignRole, setAssignRole] = useState<'admin' | 'kasir' | 'pengurus'>('kasir')
  const [assignCatatan, setAssignCatatan] = useState('')
  const [submittingAssign, setSubmittingAssign] = useState(false)

  // Form State - Revoke
  const [revokeAlasan, setRevokeAlasan] = useState('')
  const [submittingRevoke, setSubmittingRevoke] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [jabatanRes, anggotaData] = await Promise.all([
        adminService.getDaftarJabatan(),
        adminService.getAnggota()
      ])
      if (jabatanRes.data) {
        setJabatanList(jabatanRes.data)
      }
      if (jabatanRes.summary) {
        setSummary(jabatanRes.summary)
      }
      setAnggotaList(anggotaData)
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data mandat jabatan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredData = useMemo(() => {
    return jabatanList.filter(item => {
      // Role filter
      if (roleFilter === 'nonaktif') {
        if (item.status !== 'nonaktif') return false
      } else if (roleFilter !== 'all') {
        if (item.role !== roleFilter || item.status !== 'aktif') return false
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = item.nama_lengkap.toLowerCase().includes(q)
        const matchUser = item.username.toLowerCase().includes(q)
        const matchNote = (item.catatan || '').toLowerCase().includes(q)
        return matchName || matchUser || matchNote
      }

      return true
    })
  }, [jabatanList, roleFilter, search])

  const handleOpenAssign = () => {
    setAssignUserId(anggotaList[0]?.user_id || '')
    setAssignRole('kasir')
    setAssignCatatan('')
    setIsAssignModalOpen(true)
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignUserId) {
      toast.error('Pilih anggota terlebih dahulu')
      return
    }

    setSubmittingAssign(true)
    try {
      const res = await adminService.assignJabatan({
        user_id: Number(assignUserId),
        role: assignRole,
        catatan: assignCatatan
      })
      if (res.success) {
        toast.success(res.message || 'Mandat berhasil ditugaskan!')
        setIsAssignModalOpen(false)
        loadData()
      } else {
        toast.error(res.message || 'Gagal menugaskan mandat')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan sistem')
    } finally {
      setSubmittingAssign(false)
    }
  }

  const handleOpenRevoke = (item: JabatanAnggotaItem) => {
    setSelectedJabatan(item)
    setRevokeAlasan('')
    setIsRevokeModalOpen(true)
  }

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJabatan) return

    setSubmittingRevoke(true)
    try {
      const res = await adminService.revokeJabatan({
        jabatan_id: selectedJabatan.jabatan_id,
        alasan: revokeAlasan
      })
      if (res.success) {
        toast.success(res.message || 'Mandat berhasil dinonaktifkan')
        setIsRevokeModalOpen(false)
        loadData()
      } else {
        toast.error(res.message || 'Gagal mencabut mandat')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan sistem')
    } finally {
      setSubmittingRevoke(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Role Mandate Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Tata Kelola Jabatan & Hak Akses Staf
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Semua pengelola (Admin & Kasir) adalah anggota resmi koperasi. Mandat operasional dapat ditugaskan, dirotasi, atau dinonaktifkan sewaktu-waktu dengan aman.
          </p>
        </div>

        <Button
          onClick={handleOpenAssign}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 rounded-xl py-2.5 px-4 self-start sm:self-center"
        >
          <PlusCircle className="w-4 h-4" />
          Tugaskan Mandat Baru
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Admin Aktif</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {summary.admin_aktif} <span className="text-xs font-normal text-slate-400">Petugas</span>
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Kasir Aktif</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {summary.kasir_aktif} <span className="text-xs font-normal text-slate-400">Petugas</span>
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-100 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Pengurus</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {summary.pengurus_aktif} <span className="text-xs font-normal text-slate-400">Anggota</span>
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Riwayat Mandat</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {summary.total_riwayat} <span className="text-xs font-normal text-slate-400">Catatan</span>
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto overflow-x-auto">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'admin', label: 'Admin' },
            { key: 'kasir', label: 'Kasir' },
            { key: 'pengurus', label: 'Pengurus' },
            { key: 'nonaktif', label: 'Riwayat Nonaktif' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                roleFilter === tab.key
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama anggota / SK..."
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="text-xs font-bold">Anggota Koperasi</TableHead>
                <TableHead className="text-xs font-bold">Mandat Jabatan</TableHead>
                <TableHead className="text-xs font-bold">Status Mandat</TableHead>
                <TableHead className="text-xs font-bold">Periode Penugasan</TableHead>
                <TableHead className="text-xs font-bold">Pemberi Mandat & SK</TableHead>
                <TableHead className="text-xs font-bold text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    Memuat data mandat pengelola...
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    Tidak ditemukan riwayat mandat jabatan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map(item => (
                  <TableRow key={item.jabatan_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.nama_lengkap.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                            {item.nama_lengkap}
                          </p>
                          <p className="text-[11px] text-slate-400">@{item.username}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          item.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : item.role === 'kasir'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {item.role === 'admin' ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : item.role === 'kasir' ? (
                          <UserCheck className="w-3 h-3" />
                        ) : (
                          <Briefcase className="w-3 h-3" />
                        )}
                        {item.role}
                      </span>
                    </TableCell>

                    <TableCell>
                      {item.status === 'aktif' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aktif Bertugas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          <XCircle className="w-3.5 h-3.5" />
                          Selesai / Dicabut
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        <p>Mulai: {item.assigned_at || '-'}</p>
                        {item.revoked_at && (
                          <p className="text-slate-400 text-[10px]">Selesai: {item.revoked_at}</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {item.ditugaskan_oleh}
                        </p>
                        <p className="text-[10px] text-slate-400 italic truncate" title={item.catatan || ''}>
                          {item.catatan || 'Tanpa catatan khusus'}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      {item.status === 'aktif' ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleOpenRevoke(item)}
                          className="h-7 text-[11px] font-bold px-2.5 rounded-lg"
                        >
                          Cabut Mandat
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Arsip</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Info Card SOP */}
      <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-300">
          <p className="font-bold">Keamanan Role Mandate Engine</p>
          <p className="mt-0.5 leading-relaxed text-blue-800/80 dark:text-blue-300/80">
            Mencabut mandat kasir/admin tidak akan pernah menghapus akun pokok, data saldo, simpanan, maupun hak SHU anggota. Anggota tersebut akan kembali memiliki hak akses standar sebagai anggota koperasi biasa.
          </p>
        </div>
      </div>

      {/* MODAL: ASSIGN MANDATE */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Tugaskan Mandat Staf Koperasi"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300">
            Pilih anggota koperasi terdaftar yang akan diberi wewenang dan hak akses operasional.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Anggota Koperasi
            </label>
            <select
              value={assignUserId}
              onChange={e => setAssignUserId(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Pilih Anggota --</option>
              {anggotaList.map(a => (
                <option key={a.user_id || a.anggota_id} value={a.user_id || a.anggota_id}>
                  {a.nama_lengkap} (@{a.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tipe Mandat Jabatan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'kasir', label: 'Kasir POS', desc: 'Akses POS kasir & setor' },
                { key: 'admin', label: 'Admin Utama', desc: 'Akses penuh manajemen' },
                { key: 'pengurus', label: 'Pengurus', desc: 'Akses laporan & audit' }
              ].map(r => (
                <button
                  type="button"
                  key={r.key}
                  onClick={() => setAssignRole(r.key as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    assignRole === r.key
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold">{r.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Nomor SK Penugasan
            </label>
            <Input
              value={assignCatatan}
              onChange={e => setAssignCatatan(e.target.value)}
              placeholder="Contoh: SK Pengurus No. 04/SK-KOP/2026 Shift Toko Pagi"
              className="text-xs rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
              disabled={submittingAssign}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submittingAssign}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl"
            >
              {submittingAssign ? 'Menyimpan...' : 'Konfirmasi Penugasan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: REVOKE MANDATE */}
      <Modal
        isOpen={isRevokeModalOpen}
        onClose={() => setIsRevokeModalOpen(false)}
        title="Cabut Mandat Jabatan"
      >
        <form onSubmit={handleRevokeSubmit} className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">Konfirmasi Pencabutan Hak Akses</p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300/90">
                Anda akan menonaktifkan peran <strong>{selectedJabatan?.role.toUpperCase()}</strong> untuk anggota <strong>{selectedJabatan?.nama_lengkap}</strong> (@{selectedJabatan?.username}).
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alasan Pencabutan / Rotasi (Opsional)
            </label>
            <Input
              value={revokeAlasan}
              onChange={e => setRevokeAlasan(e.target.value)}
              placeholder="Contoh: Rotasi shift berkala / Selesai masa tugas kasir"
              className="text-xs rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRevokeModalOpen(false)}
              disabled={submittingRevoke}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={submittingRevoke}
              className="font-bold text-xs rounded-xl"
            >
              {submittingRevoke ? 'Memproses...' : 'Cabut Mandat Sekarang'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ManajemenJabatan
