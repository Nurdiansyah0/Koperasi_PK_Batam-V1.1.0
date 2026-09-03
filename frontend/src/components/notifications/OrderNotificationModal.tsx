import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { realtimeOrderService, type RealtimeOrderEvent } from '@/services/realtimeOrderService'
import { useAuthStore } from '@/store/authStore'
import { formatRupiah } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  BellRing, ShoppingBag, User, CreditCard, ArrowRight,
  X, Volume2, ShieldAlert, Sparkles, CheckCircle2
} from 'lucide-react'

export function OrderNotificationModal() {
  const { user, token } = useAuthStore()
  const navigate = useNavigate()
  const [activeOrder, setActiveOrder] = useState<RealtimeOrderEvent | null>(null)
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission)
    } else {
      setPermissionState('unsupported')
    }

    if (!token || !user || user.role !== 'kasir') {
      return
    }

    // Start Real-Time SSE Stream & Push Manager
    realtimeOrderService.start(token)

    // Subscribe to incoming orders
    const unsubscribe = realtimeOrderService.subscribe((order) => {
      setActiveOrder(order)
    })

    return () => {
      unsubscribe()
      realtimeOrderService.stop()
    }
  }, [token, user])

  const handleRequestPermission = async () => {
    const granted = await realtimeOrderService.requestNotificationPermission()
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission)
    }
    if (granted) {
      // Test chime
      realtimeOrderService.triggerTestNotification()
    }
  }

  const handleOpenOrder = () => {
    setActiveOrder(null)
    navigate('/kasir/pesanan')
  }

  if (!user || !['kasir', 'admin'].includes(user.role)) {
    return null
  }

  return (
    <>
      {/* ── Optional Polite Permission Bar for Kasir ── */}
      {permissionState === 'default' && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-amber-500 text-slate-900 px-3 py-2 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 animate-bounce shrink-0" />
            <span>Aktifkan izin notifikasi suara & pop-up agar pesanan masuk langsung berbunyi di kasir!</span>
          </div>
          <button
            type="button"
            onClick={handleRequestPermission}
            className="px-3 py-1 bg-slate-900 text-white rounded-xl text-[11px] font-black active:scale-95 shrink-0"
          >
            Aktifkan Sekarang
          </button>
        </div>
      )}

      {/* ── High-Priority Urgent Pop-up Modal for Incoming Orders ── */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border-2 border-blue-500 dark:border-blue-600 space-y-4 relative overflow-hidden">
            {/* Pulsating Top Beacon */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30">
                  <BellRing className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 border border-rose-200 dark:border-rose-900">
                      PESANAN ONLINE BARU!
                    </span>
                    {activeOrder.is_test && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        SIMULASI
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                    Segera Layani & Konfirmasi
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-zinc-700/80 space-y-3">
              {/* 1. Pemesan */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 dark:border-zinc-700/60 pb-2.5">
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {activeOrder.nama_anggota.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pemesan</span>
                    <strong className="text-slate-900 dark:text-white text-sm">
                      {activeOrder.nama_anggota}
                    </strong>
                    {activeOrder.username && (
                      <span className="text-[11px] text-slate-400 block">@{activeOrder.username}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold bg-slate-200/60 dark:bg-zinc-700/60 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300">
                    #TRX-{activeOrder.transaksi_id}
                  </span>
                </div>
              </div>

              {/* 2. Daftar Pesanan */}
              <div className="space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Rincian Pesanan
                </span>
                <p className="font-extrabold text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-zinc-900/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-zinc-700/60">
                  {activeOrder.items_summary || `${activeOrder.items_count} Barang Belanja`}
                </p>
              </div>

              {/* 3. Metode Pembayaran & Total */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pembayaran</span>
                  <span className="inline-block mt-0.5 text-xs font-black uppercase px-2.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {activeOrder.metode_pembayaran}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Belanja</span>
                  <span className="text-base font-black text-blue-600 dark:text-blue-400">
                    {formatRupiah(activeOrder.total_harga)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveOrder(null)}
                className="flex-1 rounded-2xl text-xs font-bold"
              >
                Nanti
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenOrder}
                className="flex-1 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-md shadow-blue-500/20"
              >
                <span>Proses Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default OrderNotificationModal
