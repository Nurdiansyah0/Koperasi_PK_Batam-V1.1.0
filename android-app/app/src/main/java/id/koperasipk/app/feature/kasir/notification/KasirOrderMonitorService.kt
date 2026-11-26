package id.koperasipk.app.feature.kasir.notification

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.content.ContextCompat
import id.koperasipk.app.KoperasiApp
import id.koperasipk.app.core.notification.OrderNotificationHelper
import id.koperasipk.app.feature.kasir.data.KasirApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class KasirOrderMonitorService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var pollJob: Job? = null
    private var lastSeenOrderId = 0
    private var hasBaseline = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        OrderNotificationHelper.createNotificationChannels(this)
        startForeground(
            OrderNotificationHelper.SERVICE_NOTIFICATION_ID,
            OrderNotificationHelper.createMonitorNotification(this)
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        startPollingLoop()
        return START_STICKY
    }

    private fun startPollingLoop() {
        if (pollJob?.isActive == true) return

        val app = application as? KoperasiApp ?: return
        val api = app.container.createService<KasirApi>()

        pollJob = serviceScope.launch {
            while (isActive) {
                try {
                    val response = api.getLatestPendingOrders()
                    if (response.success) {
                        val latest = response.latestOrder
                        val latestId = latest?.transaksiId ?: 0

                        if (!hasBaseline) {
                            hasBaseline = true
                            lastSeenOrderId = latestId
                        } else if (latest != null && latestId > lastSeenOrderId) {
                            lastSeenOrderId = latestId
                            // Memicu notifikasi heads-up dari status bar atas layar & bangunkan layar!
                            OrderNotificationHelper.notifyIncomingOrder(applicationContext, latest)
                        }
                    }
                } catch (_: Exception) {
                    // Polling sementara gagal, coba lagi interval berikutnya
                }
                delay(POLLING_INTERVAL_MS)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        pollJob?.cancel()
        serviceScope.cancel()
    }

    companion object {
        private const val POLLING_INTERVAL_MS = 15_000L
        private const val ACTION_START = "id.koperasipk.app.ACTION_START_MONITOR"
        private const val ACTION_STOP = "id.koperasipk.app.ACTION_STOP_MONITOR"

        fun start(context: Context) {
            val intent = Intent(context, KasirOrderMonitorService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, KasirOrderMonitorService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }
}
