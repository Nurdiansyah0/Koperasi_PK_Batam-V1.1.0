import React, { useEffect, useState } from 'react'
import { kasirService } from '@/services/kasirService'
import { Button } from '@/components/ui/Button'
import { InputRupiah } from '@/components/ui/InputRupiah'
import { Card, CardContent } from '@/components/ui/Card'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Wallet, Clock, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export function SetoranKasirPage() {
  const [nominal, setNominal] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [riwayat, setRiwayat] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadRiwayat = async () => {
    try {
      const data = await kasirService.getRiwayatSetoran()
      setRiwayat(data)
    } catch {
      toast.error('Gagal memuat riwayat setoran')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRiwayat() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nominal || parseInt(nominal) <= 0) return toast.error('Nominal harus lebih dari 0')
    setSubmitting(true)
    try {
      const res = await kasirService.createSetoranKasir(parseInt(nominal))
      if (res.success) {
        toast.success('Setoran berhasil diajukan ke Admin')
        setNominal('')
        loadRiwayat()
      } else {
        toast.error(res.error || 'Gagal mengajukan setoran')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Setoran Kasir</h1>
        <p className="text-sm text-slate-500 mt-1">Setor uang kasir fisik harian ke Admin Koperasi.</p>
      </div>

      <Card className="border-t-4 border-t-emerald-500">
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full">
              <InputRupiah
                label="Nominal Setoran"
                required
                placeholder="Contoh: 500000"
                value={nominal}
                onChange={(val) => setNominal(val)}
              />
            </div>
            <Button type="submit" variant="primary" loading={submitting} className="w-full sm:w-auto h-[42px] font-bold">
              Ajukan Setoran
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Riwayat Setoran Saya</h3>
          </div>
          {loading ? (
            <div className="text-center py-10 text-slate-400">Memuat riwayat...</div>
          ) : riwayat.length === 0 ? (
            <div className="text-center py-10 text-slate-500">Belum ada riwayat setoran.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {riwayat.map(r => (
                <div key={r.setoran_id} className="p-4 flex justify-between items-center bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${r.status === 'pending' ? 'bg-amber-100 text-amber-600' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{formatRupiah(r.nominal)}</div>
                      <div className="text-xs text-slate-500">{formatDate(r.created_at)}</div>
                    </div>
                  </div>
                  <div>
                    {r.status === 'pending' && <span className="flex items-center gap-1 text-xs font-bold text-amber-600"><Clock className="w-3.5 h-3.5"/> Menunggu</span>}
                    {r.status === 'approved' && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle className="w-3.5 h-3.5"/> Disetujui</span>}
                    {r.status === 'rejected' && <span className="flex items-center gap-1 text-xs font-bold text-rose-600"><XCircle className="w-3.5 h-3.5"/> Ditolak</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default SetoranKasirPage
