import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '@/services/adminService'
import { Anggota } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

export function DataAnggota() {
  const [anggota, setAnggota] = useState<Anggota[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAnggota, setSelectedAnggota] = useState<Anggota | null>(null)
  const [jumlahSHU, setJumlahSHU] = useState(0)
  const [saving, setSaving] = useState(false)

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
      // Backend topupMemberSHU expects username
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Data Anggota Koperasi</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Hutang</TableHead>
                <TableHead>SHU Berjalan</TableHead>
                <TableHead align="right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" className="py-10 text-slate-400">Memuat data anggota...</TableCell></TableRow>
              ) : anggota.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" className="py-10 text-slate-400">Data anggota kosong</TableCell></TableRow>
              ) : (
                anggota.map((item) => (
                  <TableRow key={item.anggota_id}>
                    <TableCell className="font-semibold text-slate-900 dark:text-white">{item.nama}</TableCell>
                    <TableCell className="font-mono text-slate-500">{item.username}</TableCell>
                    <TableCell className="font-semibold text-blue-600">{formatRupiah(item.saldo)}</TableCell>
                    <TableCell className="font-semibold text-rose-600">{formatRupiah(item.hutang)}</TableCell>
                    <TableCell className="font-semibold text-emerald-600">{formatRupiah(item.shu)}</TableCell>
                    <TableCell align="right">
                      <Button size="sm" variant="outline" onClick={() => handleOpenTopup(item)}>Cairkan SHU</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Pencairan / Topup SHU ke Saldo">
        <form onSubmit={handleTopup} className="space-y-4">
          <p className="text-sm text-slate-600">
            Anggota: <strong>{selectedAnggota?.nama}</strong> ({selectedAnggota?.username})
          </p>
          <p className="text-xs text-slate-500">
            SHU Tersedia: <span className="font-bold text-emerald-600">{formatRupiah(selectedAnggota?.shu || 0)}</span>
          </p>
          <Input 
            label="Nominal Pencairan ke Saldo (Rp)" 
            type="number" 
            required 
            max={selectedAnggota?.shu || 0}
            min={1}
            value={jumlahSHU || ''} 
            onChange={e => setJumlahSHU(Number(e.target.value))} 
            placeholder="Masukkan nominal"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving} variant="primary">Proses</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
export default DataAnggota