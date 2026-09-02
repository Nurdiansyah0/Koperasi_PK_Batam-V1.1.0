import React, { useEffect, useState } from 'react'
import { adminService } from '@/services/adminService'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Wallet, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export function PersetujuanSetoranPage() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const loadData = async () => {
    try {
      const data = await adminService.getSetoranKasir()
      setList(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Gagal memuat data setoran')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (action === 'reject' && !window.confirm('Yakin ingin menolak setoran ini?')) return
    setProcessingId(id)
    try {
      const res = await adminService.approveSetoranKasir(id, action)
      if (res.success) {
        toast.success(action === 'approve' ? 'Setoran disetujui!' : 'Setoran ditolak.')
        loadData()
      } else {
        toast.error(res.error || res.message || 'Gagal memproses setoran')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setProcessingId(null)
    }
  }

  const pending = list.filter(s => s.status === 'pending')
  const history = list.filter(s => s.status !== 'pending')

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Persetujuan Setoran Kasir</h1>
        <p className="text-sm text-slate-500 mt-1">Validasi penerimaan uang fisik dari kasir ke brankas/kas koperasi.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-t-4 border-t-amber-500">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold flex items-center gap-2"><Wallet className="w-5 h-5 text-amber-500"/> Menunggu Persetujuan ({pending.length})</h3>
          </div>
          <CardContent className="p-0">
            {loading ? <div className="p-10 text-center text-slate-400">Memuat...</div> : pending.length === 0 ? <div className="p-10 text-center text-slate-500">Tidak ada setoran tertunda.</div> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pending.map(s => {
                  const setoranId = s.setoran_id || s.id
                  const namaKasir = s.nama_kasir || s.kasir?.nama_lengkap || s.kasir?.username || 'Kasir'
                  const tanggal = s.created_at || s.tanggal
                  return (
                    <div key={setoranId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{namaKasir}</div>
                        <div className="font-extrabold text-blue-600 text-lg">{formatRupiah(s.nominal)}</div>
                        <div className="text-xs text-slate-400 mt-1">{formatDate(tanggal)}</div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="ghost" className="flex-1 text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold" onClick={() => handleAction(setoranId, 'reject')} loading={processingId === setoranId}>Tolak</Button>
                        <Button variant="primary" className="flex-1 font-bold" onClick={() => handleAction(setoranId, 'approve')} loading={processingId === setoranId}>Terima</Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold">Riwayat Setoran</h3>
          </div>
          <CardContent className="p-0">
            {loading ? <div className="p-10 text-center text-slate-400">Memuat...</div> : history.length === 0 ? <div className="p-10 text-center text-slate-500">Belum ada riwayat.</div> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                {history.map(s => {
                  const setoranId = s.setoran_id || s.id
                  const namaKasir = s.nama_kasir || s.kasir?.nama_lengkap || s.kasir?.username || 'Kasir'
                  const tanggal = s.created_at || s.tanggal
                  return (
                    <div key={setoranId} className="p-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{namaKasir}</div>
                        <div className="font-bold text-slate-900 dark:text-white">{formatRupiah(s.nominal)}</div>
                        <div className="text-xs text-slate-500">{formatDate(tanggal)}</div>
                      </div>
                      <Badge variant={s.status === 'approved' ? 'success' : 'danger'}>{s.status === 'approved' ? 'Disetujui' : 'Ditolak'}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default PersetujuanSetoranPage
