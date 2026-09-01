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
import { Search, ChevronLeft, ChevronRight, Users, Wallet, HandCoins } from 'lucide-react'

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Data Anggota
          </h2>
          <p className="text-sm text-slate-500 mt-1">Kelola saldo, hutang, dan SHU berjalan anggota.</p>
        </div>
      </div>

      <Card className="shadow-md border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Daftar Anggota</h3>
          <div className="w-full sm:w-72">
            <Input 
              icon={<Search className="w-4 h-4 text-slate-400" />}
              placeholder="Cari nama atau username..." 
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead className="font-bold">Nama</TableHead>
                <TableHead className="font-bold">Username</TableHead>
                <TableHead className="font-bold text-right">Saldo</TableHead>
                <TableHead className="font-bold text-right">Hutang</TableHead>
                <TableHead className="font-bold text-right">SHU Berjalan</TableHead>
                <TableHead className="text-right font-bold w-32">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-32"></div></TableCell>
                    <TableCell><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-24"></div></TableCell>
                    <TableCell><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-20 ml-auto"></div></TableCell>
                    <TableCell><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-20 ml-auto"></div></TableCell>
                    <TableCell><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-24 ml-auto"></div></TableCell>
                    <TableCell><div className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-24 ml-auto"></div></TableCell>
                  </TableRow>
                ))
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-8 h-8 text-slate-300 mb-2" />
                      <p>Tidak ada data anggota ditemukan.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.anggota_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-bold text-slate-900 dark:text-white">{item.nama_lengkap || 'Belum Ada Nama'}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block mt-2">
                      @{item.username}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-blue-600">{formatRupiah(item.saldo)}</TableCell>
                    <TableCell className="text-right font-semibold text-rose-600">{formatRupiah(item.hutang)}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">{formatRupiah(item.shu)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="text-xs h-8 px-2 font-bold shadow-sm" onClick={() => handleOpenTopup(item)}>
                        <HandCoins className="w-3 h-3 mr-1" /> Cairkan SHU
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
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-xs font-semibold text-slate-500">
              Menampilkan {((page - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(page * ITEMS_PER_PAGE, filteredAndSortedData.length)} dari {filteredAndSortedData.length} anggota
            </span>
            <div className="flex gap-2">
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={prevPage} 
                disabled={page === 1}
                className="h-9 px-3 border-slate-200 shadow-sm bg-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Sebelumnya
              </Button>
              <div className="flex items-center px-2 text-sm font-bold text-slate-700">
                {page} / {totalPages}
              </div>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={nextPage} 
                disabled={page === totalPages}
                className="h-9 px-3 border-slate-200 shadow-sm bg-white"
              >
                Selanjutnya <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Pencairan / Topup SHU ke Saldo">
        <form onSubmit={handleTopup} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col gap-1 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Anggota</span>
              <span className="font-bold text-slate-900 dark:text-white">{selectedAnggota?.nama_lengkap || 'Tanpa Nama'} ({selectedAnggota?.username})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">SHU Tersedia</span>
              <span className="font-bold text-emerald-600">{formatRupiah(selectedAnggota?.shu || 0)}</span>
            </div>
          </div>
          <Input 
            label="Nominal Pencairan ke Saldo (Rp)" 
            type="number" 
            required 
            max={selectedAnggota?.shu || 0}
            min={1}
            value={jumlahSHU || ''} 
            onChange={e => setJumlahSHU(Number(e.target.value))} 
            placeholder="Masukkan nominal"
            icon={<Wallet className="w-4 h-4 text-slate-400" />}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving} variant="primary" className="font-bold px-6">Proses</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
export default DataAnggota
