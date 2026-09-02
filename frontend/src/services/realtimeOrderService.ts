import { playOrderAlertSound } from '@/lib/sound'
import { formatRupiah } from '@/lib/utils'
import api from '@/lib/api'

export interface RealtimeOrderEvent {
  transaksi_id: number
  anggota_id: number
  nama_anggota: string
  username?: string
  total_harga: number
  metode_pembayaran: string
  items_count: number
  items_summary: string
  items?: Array<{
    barang_id: number
    nama_barang: string
    jumlah: number
    harga_satuan: number
    subtotal: number
  }>
  created_at: string
  timestamp: number
  is_test?: boolean
}

type OrderListener = (order: RealtimeOrderEvent) => void

class RealtimeOrderManager {
  private listeners: Set<OrderListener> = new Set()
  private isConnected = false
  private abortController: AbortController | null = null
  private pollTimer: any = null
  private lastProcessedId: number = 0
  private isShiftActive = false

  public setShiftActive(status: boolean) {
    this.isShiftActive = status
  }

  public getShiftActive() {
    return this.isShiftActive
  }

  public subscribe(listener: OrderListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public async requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }

  public emitOrder(order: RealtimeOrderEvent) {
    if (order.transaksi_id && order.transaksi_id === this.lastProcessedId && !order.is_test) {
      return
    }
    this.lastProcessedId = order.transaksi_id

    // 1. Play POS Sound Chime
    playOrderAlertSound()

    // 2. Trigger Native OS / PWA Push Notification
    this.triggerNativeNotification(order)

    // 3. Notify In-App React Modals & Listeners
    this.listeners.forEach(fn => {
      try {
        fn(order)
      } catch (err) {
        console.error('Order listener error:', err)
      }
    })
  }

  private async triggerNativeNotification(order: RealtimeOrderEvent) {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return
      if (Notification.permission !== 'granted') return

      const title = `🛒 Pesanan Baru: ${order.nama_anggota}`
      const body = `${order.items_summary || `${order.items_count} Barang Belanja`}\n${order.metode_pembayaran.toUpperCase()} • ${formatRupiah(order.total_harga)}`

      // If Service Worker is available (PWA mode), use showNotification
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready
        reg.showNotification(title, {
          body,
          icon: '/Logo.svg',
          badge: '/icon-192x192.png',
          tag: `order-${order.transaksi_id}`,
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          data: { url: '/kasir/pesanan' }
        } as any)
      } else {
        // Standard Web Notification
        const notification = new Notification(title, {
          body,
          icon: '/Logo.svg',
          tag: `order-${order.transaksi_id}`,
          requireInteraction: true
        })

        notification.onclick = () => {
          window.focus()
          window.location.href = '/kasir/pesanan'
          notification.close()
        }
      }
    } catch (err) {
      console.warn('Native notification failed:', err)
    }
  }

  /**
   * Connect to Server-Sent Events stream or adaptive polling
   */
  public start(token: string) {
    if (this.isConnected) return
    this.isConnected = true

    this.requestNotificationPermission().catch(() => {})

    // Start streaming loop
    this.runStream(token)

    // Start auxiliary adaptive poll (every 3s)
    this.pollTimer = setInterval(() => {
      this.checkLatestOrders()
    }, 3000)
  }

  public stop() {
    this.isConnected = false
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  private async checkLatestOrders() {
    try {
      const res = await api.get('/laravel/api/kasir/latest-pending-orders')
      if (res.data?.success) {
        this.isShiftActive = res.data.is_active_shift

        const latest = res.data.latest_order
        if (latest && latest.transaksi_id > this.lastProcessedId) {
          if (this.lastProcessedId > 0) {
            this.emitOrder(latest)
          } else {
            this.lastProcessedId = latest.transaksi_id
          }
        }
      }
    } catch {
      // quiet
    }
  }

  private async runStream(token: string) {
    while (this.isConnected) {
      try {
        this.abortController = new AbortController()

        const response = await fetch('/laravel/api/kasir/order-stream', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream'
          },
          signal: this.abortController.signal
        })

        if (!response.ok || !response.body) {
          throw new Error(`SSE response not ok: ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (this.isConnected) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const block of lines) {
            if (!block.trim()) continue

            const eventMatch = block.match(/event:\s*([^\n]+)/)
            const dataMatch = block.match(/data:\s*([^\n]+)/)

            const eventType = eventMatch ? eventMatch[1].trim() : 'message'
            const rawData = dataMatch ? dataMatch[1].trim() : ''

            if (eventType === 'new_order' && rawData) {
              try {
                const parsed = JSON.parse(rawData)
                if (parsed.order) {
                  this.isShiftActive = parsed.has_active_shift
                  this.emitOrder(parsed.order)
                }
              } catch (e) {
                console.warn('SSE parse error:', e)
              }
            } else if (eventType === 'connected' && rawData) {
              try {
                const parsed = JSON.parse(rawData)
                this.isShiftActive = parsed.has_active_shift
              } catch {}
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') break
        // Backoff 2s on disconnection
        await new Promise(r => setTimeout(r, 2000))
      }
    }
  }

  public async triggerTestNotification() {
    try {
      const res = await api.post('/laravel/api/kasir/test-order-notification')
      if (res.data?.success && res.data?.data) {
        this.emitOrder(res.data.data)
        return res.data
      }
    } catch (err: any) {
      console.error('Trigger test notification failed:', err)
      throw err
    }
  }
}

export const realtimeOrderService = new RealtimeOrderManager()
