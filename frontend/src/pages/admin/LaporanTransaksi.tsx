import { useEffect, useState } from 'react'
import { adminService } from '@/services/adminService'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export function LaporanTransaksi() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [tglMulai, setTglMulai] = useState('')
  const [tglSelesai, setTglSelesai] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await adminService.getLaporanTransaksi(tglMulai, tglSelesai)
      setData(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Laporan Transaksi</h2>
      
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <Input type="date" label="Tanggal Mulai" value={tglMulai} onChange={e => setTglMulai(e.target.value)} />
          <Input type="date" label="Tanggal Selesai" value={tglSelesai} onChange={e => setTglSelesai(e.target.value)} />
          <Button onClick={loadData} loading={loading}>Filter Laporan</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-6">
          <p className="text-sm text-gray-500">Total Transaksi</p>
          <h3 className="text-2xl font-bold">{data?.summary?.total_transaksi || 0}</h3>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-gray-500">Total Pendapatan</p>
          <h3 className="text-2xl font-bold text-green-600">{formatRupiah(data?.summary?.total_pendapatan || 0)}</h3>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-gray-500">Total Hutang Baru</p>
          <h3 className="text-2xl font-bold text-red-600">{formatRupiah(data?.summary?.total_hutang || 0)}</h3>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Anggota</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
              ) : !data?.data?.length ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24">Data kosong</TableCell></TableRow>
              ) : (
                data.data.map((item: any) => (
                  <TableRow key={item.transaksi_id}>
                    <TableCell>#{item.transaksi_id}</TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>{item.nama_anggota || 'Umum'}</TableCell>
                    <TableCell className="capitalize">{item.metode_pembayaran}</TableCell>
                    <TableCell className="text-right font-medium">{formatRupiah(item.total_harga)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}