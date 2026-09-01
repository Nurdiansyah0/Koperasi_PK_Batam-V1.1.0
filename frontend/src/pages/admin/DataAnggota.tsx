import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '@/services/adminService'
import { Anggota } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Search, ChevronLeft, ChevronRight, Users, Wallet, HandCoins, CreditCard, UserCheck, Calculator } from 'lucide-react'

export function DataAnggota() {
  const [anggota, setAnggota] = useState<Anggota[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAnggota, setSelectedAnggota] = useState<Anggota | null>(null)
  const [jumlahSHU, setJumlahSHU] = useState(0)
  const [saving, setSaving] = useState(false)

  // Pagination & Search
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await adminService.getAnggota()
      setAnggota(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Derived state: sort alphabetically, then filter, then paginate
  const filteredAndSortedData = useMemo(() => {
    let result = [...anggota]
    
    // Sort alphabetically by nama_lengkap (Ascending)
    result.sort((a, b) => (a.nama_lengkap || '').localeCompare(b.nama_lengkap || ''))

    // Search filter
    if (search) {
      const lowerSearch = search.toLowerCase()
      result = result.filter(item => 
        (item.nama_lengkap || '').toLowerCase().includes(lowerSearch) ||
        (item.username || '').toLowerCase().includes(lowerSearch)
      )
    }
    
    return result
  }, [anggota, search])

  const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE) || 1
  const paginatedData = filteredAndSortedData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const nextPage = () => setPage(p => Math.min(totalPages, p + 1))
  const prevPage = () => setPage(p => Math.max(1, p - 1))

  // Smart Analytics for Members (non-redundant with dashboard)
  const summary = useMemo(() => {
    const total = anggota.length
    const aktif = anggota.filter(a => a.saldo > 0).length
    const berhutang = anggota.filter(a => a.hutang > 0).length
    const totalSaldo = anggota.reduce((sum, item) => sum + (item.saldo || 0), 0)
    const avgSaldo = total > 0 ? totalSaldo / total : 0

    return {
      totalAnggota: total,
      anggotaAktif: aktif,
      anggotaBerhutang: berhutang,
      rataRataSaldo: avgSaldo
    }
  }, [anggota])

  const handleOpenTopup = (item: Anggota) => {
    setSelectedAnggota(item)
    setJumlahSHU(0)
    setIsModalOpen(true)
  }

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAnggota || jumlahSHU <= 0) return
    setSaving(true)
    try {
      await adminService.topupSHU(selectedAnggota.username, jumlahSHU)
      toast.success('Berhasil topup SHU ke saldo anggota')
      setIsModalOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal topup SHU')
    } finally {
      setSaving(false)
    }
  }

  // Get initials for Avatar
  const getInitials = (name: string) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Data Anggota
          </h2>
          <p className="text-sm text-slate-500 mt-1">Kelola saldo, hutang, dan SHU berjalan dari seluruh anggota koperasi.</p>
        </div>
      </div>

      {/* Smart Analytics Widgets */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-6 flex items-center gap-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 md:border-r">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Anggota</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? '...' : summary.totalAnggota} <span className="text-base font-medium text-slate-500 normal-case tracking-normal">orang</span>
              </h4>
            </div>
          </div>
          
          <div className="p-6 flex items-center gap-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800">
            <div className="p-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Memiliki Saldo</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? '...' : summary.anggotaAktif} <span className="text-base font-medium text-slate-500 normal-case tracking-normal">anggota</span>
              </h4>
            </div>
          </div>

          <div className="p-6 flex items-center gap-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b md:border-b-0 border-slate-100 dark:border-slate-800 md:border-r">
            <div className="p-4 bg-rose-100 dark:bg-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Memiliki Hutang</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? '...' : summary.anggotaBerhutang} <span className="text-base font-medium text-slate-500 normal-case tracking-normal">anggota</span>
              </h4>
            </div>
          </div>

          <div className="p-6 flex items-center gap-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rata-rata Saldo</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? '...' : formatRupiah(summary.rataRataSaldo)}
              </h4>
            </div>
          </div>
        </div>
      </Card>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            Direktori Anggota
          </h3>
          <div className="w-full sm:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cari nama atau username..." 
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-800/80">
              <TableRow>
                <TableHead className="font-bold text-slate-600 py-4">Anggota</TableHead>
                <TableHead className="font-bold text-slate-600 text-right py-4">S. Pokok</TableHead>
                <TableHead className="font-bold text-slate-600 text-right py-4">S. Wajib</TableHead>
                <TableHead className="font-bold text-slate-600 text-right py-4">Saldo Aktif</TableHead>
                <TableHead className="font-bold text-slate-600 text-right py-4">Hutang</TableHead>
                <TableHead className="font-bold text-slate-600 text-right py-4">SHU Tersedia</TableHead>
                <TableHead className="font-bold text-slate-600 text-right py-4 w-28">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-32"></div>
                          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-24"></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><div className="h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-20 ml-auto"></div></TableCell>
                    <TableCell><div className="h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-20 ml-auto"></div></TableCell>
                    <TableCell><div className="h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-24 ml-auto"></div></TableCell>
                    <TableCell><div className="h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-20 ml-auto"></div></TableCell>
                    <TableCell><div className="h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-20 ml-auto"></div></TableCell>
                    <TableCell><div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse w-24 ml-auto"></div></TableCell>
                  </TableRow>
                ))
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                        <Users className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="font-medium text-slate-600 dark:text-slate-400">Tidak ada anggota ditemukan</p>
                      <p className="text-sm mt-1">Coba sesuaikan kata kunci pencarian Anda.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.anggota_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                          {getInitials(item.nama_lengkap || 'BN')}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {item.nama_lengkap || 'Belum Ada Nama'}
                          </span>
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                            @{item.username}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex font-medium text-slate-500 dark:text-slate-400 text-sm">
                        {formatRupiah(item.simpanan_pokok)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex font-medium text-slate-500 dark:text-slate-400 text-sm">
                        {formatRupiah(item.simpanan_wajib)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex font-bold text-slate-700 dark:text-slate-300">
                        {formatRupiah(item.saldo)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.hutang > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 font-bold text-sm">
                          {formatRupiah(item.hutang)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-sm">Rp 0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                       {item.shu > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-bold text-sm">
                          {formatRupiah(item.shu)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-sm">Rp 0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled={item.shu <= 0}
                        className="h-8 px-3 font-semibold shadow-sm border-slate-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 transition-all text-xs" 
                        onClick={() => handleOpenTopup(item)}
                      >
                        <HandCoins className="w-3.5 h-3.5 mr-1.5" /> Cairkan
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredAndSortedData.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-sm text-slate-500">
              Menampilkan <span className="font-bold text-slate-700 dark:text-slate-300">{((page - 1) * ITEMS_PER_PAGE) + 1}</span> - <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(page * ITEMS_PER_PAGE, filteredAndSortedData.length)}</span> dari <span className="font-bold text-slate-700 dark:text-slate-300">{filteredAndSortedData.length}</span> anggota
            </span>
            <div className="flex items-center gap-1">
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={prevPage} 
                disabled={page === 1}
                className="h-8 px-3 border-slate-200 text-slate-600 bg-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Sebelumnya
              </Button>
              <div className="px-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                {page} / {totalPages}
              </div>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={nextPage} 
                disabled={page === totalPages}
                className="h-8 px-3 border-slate-200 text-slate-600 bg-white"
              >
                Selanjutnya <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Pencairan SHU ke Saldo">
        <form onSubmit={handleTopup} className="space-y-5">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                {getInitials(selectedAnggota?.nama_lengkap || '')}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedAnggota?.nama_lengkap || 'Tanpa Nama'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">@{selectedAnggota?.username}</p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-medium text-slate-500">SHU Tersedia</span>
              <span className="text-lg font-bold text-emerald-600">{formatRupiah(selectedAnggota?.shu || 0)}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nominal Pencairan</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-500 font-medium">Rp</span>
              </div>
              <input 
                type="number" 
                required 
                max={selectedAnggota?.shu || 0}
                min={1}
                value={jumlahSHU || ''} 
                onChange={e => setJumlahSHU(Number(e.target.value))} 
                placeholder="0"
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <p className="text-xs text-slate-500">Saldo ini akan otomatis ditambahkan ke saldo aktif anggota.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" className="font-medium" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving} variant="primary" className="font-bold px-6 shadow-md shadow-blue-500/20">Konfirmasi Pencairan</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
export default DataAnggota
