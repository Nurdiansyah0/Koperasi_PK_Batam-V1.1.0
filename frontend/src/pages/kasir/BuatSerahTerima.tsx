import React, { useEffect, useState } from 'react'
import { kasirService } from '@/services/kasirService'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputRupiah } from '@/components/ui/InputRupiah'
import { 
  ShieldCheck, 
  Send, 
  AlertTriangle, 
  ScanLine, 
  Flame, 
  Layers,
  Lock,
  EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { DaftarKasir, Barang } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface CycleCountBarang extends Barang {
  audit_reason?: string
  risk_badge?: string
}

const BuatSerahTerimaPage = () => {
  const navigate = useNavigate()
  const [kasirList, setKasirList] = useState<DaftarKasir[]>([])
  const [cycleItems, setCycleItems] = useState<CycleCountBarang[]>([])
  const [saldoKasSistem, setSaldoKasSistem] = useState<number>(0)
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
          setSaldoKasSistem(Number((res.data as any).saldo_kas_sistem || 0))
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
    if (!kasirTo) return toast.error('Pilih Kasir tujuan penerima shift')
    if (!uangFisik) return toast.error('Masukkan jumlah uang kas fisik di laci')
    
    // Strict Validation: Blind physical count required for ALL items
    for (const item of cycleItems) {
      if (stokFisik[item.barang_id] === undefined || stokFisik[item.barang_id] === '') {
        return toast.error(`Harap isi hitungan fisik riil untuk barang: ${item.nama_barang}`)
      }
    }

    setSubmitting(true)
    
    // Construct rich item payload with financial calculation
    const itemsPayload = cycleItems.map(item => {
      const aktual = parseInt(stokFisik[item.barang_id] || '0', 10)
      const input = item.stok_toko || 0
      const selisih = aktual - input
      const hargaJual = Number(item.harga_jual || item.harga || 0)
      const selisihNominal = selisih * hargaJual

      return {
        barang_id: item.barang_id,
        nama_barang: item.nama_barang,
        harga_jual: hargaJual,
        stok_aktual: aktual,
        stok_input: input,
        selisih: selisih,
        selisih_nominal: selisihNominal,
        status: selisih === 0 ? 'sesuai' : 'selisih',
        audit_reason: item.audit_reason || `PKM Display: ${item.pkm || 1} pcs`,
        risk_badge: item.risk_badge || 'Cycle Count'
      }
    })

    const barangSelisihCount = itemsPayload.filter(i => i.status === 'selisih').length
    const totalSelisihQty = itemsPayload.reduce((acc, curr) => acc + curr.selisih, 0)
    const totalSelisihNominal = itemsPayload.reduce((acc, curr) => acc + curr.selisih_nominal, 0)
    const totalMinusNominal = itemsPayload
      .filter(i => i.selisih < 0)
      .reduce((acc, curr) => acc + Math.abs(curr.selisih_nominal), 0)

    const nominalUangFisik = parseInt(uangFisik, 10) || 0
    const selisihKas = nominalUangFisik - saldoKasSistem

    const hasilOpname = {
      summary: {
        totalBarang: cycleItems.length,
        barangSesuai: cycleItems.length - barangSelisihCount,
        barangSelisih: barangSelisihCount,
        totalSelisihQty: totalSelisihQty,
        totalSelisihNominal: totalSelisihNominal,
        totalMinusNominal: totalMinusNominal
      },
      saldo_kas_sistem: saldoKasSistem,
      uang_fisik: nominalUangFisik,
      selisih_kas: selisihKas,
      catatan: catatan,
      items: itemsPayload,
      type: 'hybrid_cycle_count',
      timestamp: new Date().toISOString()
    }

    try {
      const res = await kasirService.createSerahTerima(Number(kasirTo), hasilOpname)
      if (res.success) {
        toast.success(res.message || 'Serah terima shift berhasil dikirim untuk divalidasi Kasir Penerima!')
        navigate('/kasir/serah-terima')
      } else {
        toast.error(res.message || res.error || 'Gagal membuat serah terima')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat memproses serah terima')
    } finally {
      setSubmitting(false)
    }
  }

  const nominalUangFisikInput = parseInt(uangFisik, 10) || 0

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Formulir Serah Terima Shift</h1>
          <p className="text-sm text-slate-500">
            Audit Buta (Blind Count): Hitung kas fisik dan fisik barang riil di etalase toko untuk akuntabilitas shift.
          </p>
        </div>
      </div>

      {/* Fraud Prevention & Loss Control Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-800/60 flex items-start gap-3.5">
        <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1 text-amber-950 dark:text-amber-200">
          <div className="font-bold text-sm">
            Prosedur Akuntabilitas Shift & Blind Audit (Audit Buta):
          </div>
          <p>
            Untuk menjaga kejujuran dan mencegah manipulasi selisih barang antar kasir, <b>jumlah stok sistem disembunyikan</b>. 
            Kasir pengirim <b>wajib menghitung fisik barang yang sebenarnya</b> di area display kasir.
          </p>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold pt-0.5">
            Setiap selisih akan otomatis dihitung dan divalidasi silang oleh Kasir Penerima shift sebelum disetujui.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tahap 1: Kasir Penerima & Rekonsiliasi Kas Laci */}
        <Card className="border-t-4 border-t-blue-600 shadow-sm">
          <CardHeader>
            <CardTitle>1. Rekonsiliasi Uang Kas Laci</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Serahkan Ke Kasir (Penerima Shift) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={kasirTo}
                  onChange={(e) => setKasirTo(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">-- Pilih Kasir Penerima --</option>
                  {kasirList.map(k => (
                    <option key={k.user_id} value={k.user_id}>
                      {k.nama_lengkap || k.username} (@{k.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <InputRupiah
                  label="Jumlah Uang Fisik Di Laci Kasir (Rp)"
                  required
                  placeholder="0"
                  value={uangFisik}
                  onChange={setUangFisik}
                />
              </div>
            </div>

            <Input
              label="Catatan / Pesan Kasir (Opsional)"
              placeholder="Contoh: Ada uang koin pecahan 500an dipisah, atau titipan bon belanja..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Tahap 2: Blind Cycle Counting Seluruh Item Toko (PKM 4 Hari) */}
        <Card className="border-t-4 border-t-amber-500 shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-amber-500" />
                  <CardTitle>2. Blind Cycle Count (Hitungan Fisik Nyata Toko)</CardTitle>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Hitung kuantitas fisik riil barang yang ada di etalase kasir / rak display toko.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700">
                  <EyeOff className="w-3.5 h-3.5 text-amber-500" /> Blind Count Aktif
                </span>
                <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-900">
                  {cycleItems.length} Item Wajib Hitung
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {cycleItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Memuat item toko...</div>
            ) : (
              <>
                {/* 1. Desktop Table View (>= sm) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3.5 font-bold">Barang & Kategori</th>
                        <th className="px-4 py-3.5 font-bold text-center w-36">Kapasitas PKM Toko</th>
                        <th className="px-4 py-3.5 font-bold text-center w-44">
                          Hitungan Fisik Riil <span className="text-rose-500">*</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {cycleItems.map((item, idx) => {
                        const badgeType = item.risk_badge || 'Display Toko'
                        const isRokok = badgeType.toLowerCase().includes('rokok')

                        return (
                          <tr key={item.barang_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <span className="text-slate-400 font-mono text-[10px] w-5">#{idx + 1}</span>
                                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{item.nama_barang}</span>
                                {isRokok && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-0.5">
                                    <Flame className="w-2.5 h-2.5" /> Rokok
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 ml-6">
                                Harga: {formatRupiah(item.harga_jual || item.harga || 0)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg text-xs">
                                Max {item.pkm || 1} pcs
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  placeholder="Ketik fisik..."
                                  className="w-28 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-black focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs bg-white dark:bg-slate-900"
                                  value={stokFisik[item.barang_id] ?? ''}
                                  onChange={(e) => setStokFisik({...stokFisik, [item.barang_id]: e.target.value})}
                                />
                                <span className="text-[10px] text-slate-400">pcs</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 2. Mobile Responsive Card List (< sm) */}
                <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
                  {cycleItems.map((item, idx) => {
                    const badgeType = item.risk_badge || 'Display Toko'
                    const isRokok = badgeType.toLowerCase().includes('rokok')

                    return (
                      <div 
                        key={item.barang_id} 
                        className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-slate-400 font-mono text-[10px]">#{idx + 1}</span>
                              <span className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                                {item.nama_barang}
                              </span>
                              {isRokok && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5" /> Rokok
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Harga: {formatRupiah(item.harga_jual || item.harga || 0)}/pcs
                            </div>
                          </div>

                          <span className="shrink-0 text-[10px] font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900">
                            PKM: {item.pkm || 1} pcs
                          </span>
                        </div>

                        {/* Input Row for Mobile */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <span className="font-semibold text-slate-600 dark:text-slate-400 text-xs">
                            Fisik Riil <span className="text-rose-500">*</span>:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              required
                              min="0"
                              placeholder="0"
                              className="w-24 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-center font-black focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                              value={stokFisik[item.barang_id] ?? ''}
                              onChange={(e) => setStokFisik({...stokFisik, [item.barang_id]: e.target.value})}
                            />
                            <span className="text-xs text-slate-500 font-semibold">pcs</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <p>
                Hasil hitungan fisik Anda akan dicatat permanen dalam sistem audit log serah terima shift dan divalidasi langsung oleh Kasir Penerima.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" type="button" onClick={() => navigate('/kasir/serah-terima')}>Batal</Button>
          <Button variant="primary" type="submit" loading={submitting} className="gap-2 px-8 font-bold shadow-md">
            <Send className="w-4 h-4" /> Kirim Serah Terima Shift
          </Button>
        </div>

      </form>
    </div>
  )
}

export default BuatSerahTerimaPage
