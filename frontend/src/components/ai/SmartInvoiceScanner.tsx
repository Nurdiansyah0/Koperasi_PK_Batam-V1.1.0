import React, { useState, useRef } from 'react'
import { Sparkles, Camera, Upload, Check, AlertCircle, RefreshCw, X, ArrowRight, Layers } from 'lucide-react'
import { aiService, ScannedInvoiceItem } from '@/services/aiService'
import { formatRupiah } from '@/lib/utils'
import toast from 'react-hot-toast'

interface SmartInvoiceScannerProps {
  isOpen: boolean
  onClose: () => void
  onApplyItems: (items: ScannedInvoiceItem[], supplierName?: string) => void
}

export function SmartInvoiceScanner({ isOpen, onClose, onApplyItems }: SmartInvoiceScannerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedResult, setScannedResult] = useState<{
    supplier_name?: string
    tanggal_nota?: string
    total_belanja?: number
    items: ScannedInvoiceItem[]
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG/PNG)')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string)
      setScannedResult(null)
    }
    reader.readAsDataURL(file)
  }

  const handleScanWithAi = async () => {
    if (!selectedImage) return
    setIsScanning(true)

    try {
      const mime = selectedImage.split(';')[0].split(':')[1] || 'image/jpeg'
      const base64 = selectedImage.split(',')[1]

      const res = await aiService.scanInvoice(base64, mime)
      if (res.success && res.data) {
        setScannedResult(res.data)
        toast.success(`Berhasil mendeteksi ${res.data.items.length} item dari nota!`)
      } else {
        toast.error(res.error || 'Gagal mengekstrak nota belanja')
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat memproses gambar dengan AI')
    } finally {
      setIsScanning(false)
    }
  }

  const handleApply = () => {
    if (scannedResult && scannedResult.items.length > 0) {
      onApplyItems(scannedResult.items, scannedResult.supplier_name)
      toast.success(`${scannedResult.items.length} item berhasil dimasukkan ke daftar restock`)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">AI Smart Receipt Scanner</h3>
              <p className="text-[11px] text-blue-100/90 font-medium">Ekstraksi otomatis nota supplier via Gemini Vision</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {!selectedImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-500 rounded-3xl p-8 text-center cursor-pointer bg-slate-50/50 dark:bg-zinc-800/40 hover:bg-blue-50/40 transition-all flex flex-col items-center justify-center gap-3 min-h-[220px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shadow-xs">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-zinc-200">Pilih / Foto Nota Pembelian Supplier</p>
                <p className="text-xs text-slate-400 mt-1">Mendukung format JPG, PNG, atau scan dokumen fisik</p>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 bg-blue-600 text-white rounded-full mt-2">
                Unggah Foto Nota
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-700 max-h-48 bg-black flex items-center justify-center">
                <img src={selectedImage} alt="Preview Nota" className="w-full h-full object-contain max-h-48" />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scan Action Button */}
              {!scannedResult && (
                <button
                  onClick={handleScanWithAi}
                  disabled={isScanning}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-98 transition-all disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Gemini Vision Sedang Membaca Nota...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Ekstrak Data Nota dengan AI</span>
                    </>
                  )}
                </button>
              )}

              {/* Result Preview */}
              {scannedResult && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Distributor / Toko</p>
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {scannedResult.supplier_name || 'Supplier Grosir'}
                      </p>
                    </div>
                    {scannedResult.total_belanja && (
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-slate-500 uppercase">Total Nota</p>
                        <p className="font-extrabold text-sm text-emerald-600">
                          {formatRupiah(scannedResult.total_belanja)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 dark:border-zinc-700 rounded-2xl overflow-hidden">
                    <div className="bg-slate-100 dark:bg-zinc-800 px-3.5 py-2 font-bold text-xs text-slate-600 dark:text-zinc-300 flex justify-between">
                      <span>Nama Barang</span>
                      <span>Qty &times; Harga Beli</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-48 overflow-y-auto">
                      {scannedResult.items.map((it, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-zinc-100">{it.nama_barang}</p>
                            <p className="text-[10px] text-slate-400">
                              {it.jumlah} {it.satuan || 'Pcs'} @ {formatRupiah(it.harga_beli_satuan)}
                            </p>
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {formatRupiah(it.total_harga || it.jumlah * it.harga_beli_satuan)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

        {/* Footer */}
        {scannedResult && (
          <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border-t border-slate-200/80 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              onClick={() => {
                setSelectedImage(null)
                setScannedResult(null)
              }}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-bold transition-colors"
            >
              Scan Ulang
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Gunakan Hasil Ekstraksi</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
