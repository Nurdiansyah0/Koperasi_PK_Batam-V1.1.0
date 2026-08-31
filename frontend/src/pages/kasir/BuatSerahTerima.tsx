import React, { useEffect, useState } from 'react'
import { kasirService } from '@/services/kasirService'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputRupiah } from '@/components/ui/InputRupiah'
import { AlertCircle, Send, Calculator, AlertTriangle, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import type { DaftarKasir, Barang } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

const BuatSerahTerimaPage = () => {
  const navigate = useNavigate()
  const [kasirList, setKasirList] = useState<DaftarKasir[]>([])
  const [cycleItems, setCycleItems] = useState<Barang[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [kasirTo, setKasirTo] = useState<number | ''>('')
  const [uangFisik, setUangFisik] = useState<string>('')
  const [catatan, setCatatan] = useState<string>('')
  const [stokFisik, setStokFisik] = useState<Record<number, string>>({})

  useEffect(() => {
    const fetchDraft = async () => {
      setLoading(true)
      try {
        const res = await kasirService.getSerahTerimaDraft()
        if (res.success && res.data) {
          setKasirList((res.data as any).kasir_list || [])
          setCycleItems((res.data as any).cycle_count_items || [])
        }
      } catch (err) {
        toast.error('Gagal memuat data draft serah terima')
      } finally {
        setLoading(false)
      }
    }
    fetchDraft()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kasirTo) return toast.error('Pilih Kasir tujuan')
    if (!uangFisik) return toast.error('Masukkan jumlah uang kas fisik di laci')
    
    // Validate that all cycle count items are filled
    for (const item of cycleItems) {
      if (stokFisik[item.barang_id] === undefined || stokFisik[item.barang_id] === '') {
        return toast.error(`Harap isi jumlah fisik untuk barang: ${item.nama_barang}`)
      }
    }

    setSubmitting(true)
    
    // Construct the payload based on the new hybrid logic
    const itemsPayload = cycleItems.map(item => {
      const aktual = parseInt(stokFisik[item.barang_id] || '0', 10)
      const input = item.stok
      const selisih = aktual - input
      return {
        barang_id: item.barang_id,
        nama_barang: item.nama_barang,
        stok_aktual: aktual,
        stok_input: input,
        selisih: selisih,
        status: selisih === 0 ? 'sesuai' : 'selisih'
      }
    })

    const barangSelisihCount = itemsPayload.filter(i => i.status === 'selisih').length
    const totalSelisihQty = itemsPayload.reduce((acc, curr) => acc + curr.selisih, 0)

    const hasilOpname = {
      summary: {
        totalBarang: cycleItems.length,
        barangSesuai: cycleItems.length - barangSelisihCount,
        barangSelisih: barangSelisihCount,
        totalSelisih: totalSelisihQty
      },
      uang_fisik: parseInt(uangFisik, 10),
      catatan: catatan,
      items: itemsPayload,
      type: 'hybrid_cycle_count',
      timestamp: new Date().toISOString()
    }

    try {
      const res = await kasirService.createSerahTerima(Number(kasirTo), hasilOpname)
      if (res.success) {
        toast.success('Serah terima berhasil dikirim!')
        navigate('/kasir/serah-terima')
      } else {
        toast.error(res.error || 'Gagal mengirim serah terima')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan sistem')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-10 text-slate-500">Memuat data persiapan serah terima...</div>
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Buat Serah Terima (Ganti Shift)</h1>
        <p className="text-sm text-slate-500 mt-1">Hitung uang kas laci dan lakukan cycle-count untuk beberapa barang acak bernilai tinggi.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Tahap 1: Uang Laci */}
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-500" />
              <CardTitle>1. Perhitungan Kas Laci</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pilih Kasir Penerima Shift <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={kasirTo}
                  onChange={(e) => setKasirTo(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Kasir --</option>
                  {kasirList.map(k => (
                    <option key={k.user_id} value={k.user_id}>
                      {k.nama_lengkap || k.username} (@{k.username})
                    </option>
                  ))}
                </select>
              </div>
              <InputRupiah
                label="Total Uang Fisik di Laci"
                required
                placeholder="Contoh: 1500000"
                value={uangFisik}
                onChange={(val) => setUangFisik(val)}
              />
            </div>
            <Input
              label="Catatan Serah Terima (Opsional)"
              placeholder="Contoh: Ada uang palsu 50rb, atau laci macet..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Tahap 2: Cycle Counting */}
        <Card className="border-t-4 border-t-amber-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-amber-500" />
                <CardTitle>2. Cycle Count (Audit Acak)</CardTitle>
              </div>
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">Wajib Diisi</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Sistem telah memilih {cycleItems.length} barang acak secara otomatis untuk Anda hitung fisiknya sebelum ganti shift.
            </p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {cycleItems.length === 0 ? (
              <div className="p-4 text-center text-slate-500">Tidak ada barang yang perlu dihitung.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-y border-slate-200 text-sm">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700">Barang</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 w-40">Hitungan Fisik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cycleItems.map(item => (
                    <tr key={item.barang_id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{item.nama_barang}</div>
                        <div className="text-xs text-slate-500">Harga: {formatRupiah(item.harga_jual || 0)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          required
                          min="0"
                          placeholder="Fisik..."
                          className="w-full px-3 py-1.5 border border-slate-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          value={stokFisik[item.barang_id] || ''}
                          onChange={(e) => setStokFisik({...stokFisik, [item.barang_id]: e.target.value})}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="p-4 bg-amber-50 border-t border-amber-100 text-xs text-amber-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p>Hitung jumlah fisik barang-barang di atas dengan teliti. Jika ada selisih, Kasir penerima akan mengetahuinya.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" type="button" onClick={() => navigate('/kasir/serah-terima')}>Batal</Button>
          <Button variant="primary" type="submit" loading={submitting} className="gap-2 px-8">
            <Send className="w-4 h-4" /> Kirim Serah Terima
          </Button>
        </div>

      </form>
    </div>
  )
}
export default BuatSerahTerimaPage
