package id.koperasipk.app.core.notification

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import id.koperasipk.app.MainActivity
import id.koperasipk.app.R
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.feature.kasir.data.LatestOrderDto

object OrderNotificationHelper {

    const val CHANNEL_ORDERS_ID = "koperasi_pk_incoming_orders"
    const val CHANNEL_HUTANG_ID = "koperasi_pk_hutang_payment"
    const val CHANNEL_SERVICE_ID = "koperasi_pk_monitor_service"
    const val SERVICE_NOTIFICATION_ID = 8881
    const val HUTANG_BASE_NOTIFICATION_ID = 9000

    private val VIBRATION_PATTERN = longArrayOf(0, 500, 200, 500, 200, 500)
    private val HUTANG_VIBRATION_PATTERN = longArrayOf(0, 300, 150, 300)

    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                ?: return

            // 1. Channel Notifikasi Pesanan Masuk (Prioritas Tinggi - Heads Up & Bangunkan Layar)
            val ordersChannel = NotificationChannel(
                CHANNEL_ORDERS_ID,
                "Pesanan Masuk (Prioritas Tinggi)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifikasi pesanan online baru dari anggota yang harus segera diproses kasir"
                enableLights(true)
                lightColor = 0xFF10B981.toInt()
                enableVibration(true)
                vibrationPattern = VIBRATION_PATTERN
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
                val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build()
                setSound(soundUri, audioAttributes)
            }
            notificationManager.createNotificationChannel(ordersChannel)

            // 2. Channel Notifikasi Pembayaran Hutang (Prioritas Default)
            val hutangChannel = NotificationChannel(
                CHANNEL_HUTANG_ID,
                "Pembayaran Hutang Anggota",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifikasi pengajuan pembayaran hutang baru dari anggota"
                enableLights(true)
                lightColor = 0xFFF59E0B.toInt()
                enableVibration(true)
                vibrationPattern = HUTANG_VIBRATION_PATTERN
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(hutangChannel)

            // 3. Channel Service Monitor (Low Importance - Silent Ongoing)
            val serviceChannel = NotificationChannel(
                CHANNEL_SERVICE_ID,
                "Layanan Pemantau Pesanan Kasir",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Layanan pemantau pesanan aktif di latar belakang saat shift kasir berjalan"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(serviceChannel)
        }
    }

    /**
     * Memunculkan notifikasi pesanan masuk dari atas status bar (heads-up notification)
     * dan menyalakan layar ponsel meskipun ponsel sedang terkunci / layar mati.
     */
    fun notifyIncomingOrder(context: Context, order: LatestOrderDto) {
        createNotificationChannels(context)

        // 1. Bangunkan layar ponsel (WakeLock) jika layar sedang mati / terkunci
        wakeUpScreen(context)

        // 2. Siapkan PendingIntent untuk membuka MainActivity langsung ke antrean pesanan
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("NAVIGATE_TO", "kasir/pesanan")
            putExtra("TRANSAKSI_ID", order.transaksiId)
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            order.transaksiId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val namaPemesan = order.namaAnggota.ifBlank { "Anggota #${order.anggotaId ?: ""}" }
        val rincian = order.itemsSummary.ifBlank { "${order.itemsCount} barang belanja" }
        val totalFormatted = CurrencyFormatter.format(order.totalHarga)

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val builder = NotificationCompat.Builder(context, CHANNEL_ORDERS_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("🔔 PESANAN ONLINE BARU: $namaPemesan")
            .setContentText("$rincian • $totalFormatted")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Pesanan baru masuk dari $namaPemesan ($totalFormatted)\nItems: $rincian\nMetode Pembayaran: ${order.metodePembayaran.uppercase()}\nSegera buka kasir untuk konfirmasi!")
            )
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(soundUri)
            .setVibrate(VIBRATION_PATTERN)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pendingIntent)
            .setFullScreenIntent(pendingIntent, true) // Memicu heads-up banner dari atas layar saat ponsel terkunci
            .setNumber(order.itemsCount)
            .setAutoCancel(true)
            .setColor(0xFF10B981.toInt())
            .addAction(
                R.drawable.ic_notification,
                "Buka Pesanan",
                pendingIntent
            )

        try {
            val notificationManager = NotificationManagerCompat.from(context)
            notificationManager.notify(order.transaksiId, builder.build())
        } catch (_: SecurityException) {
            // Permission belum diberikan di Android 13+
        }
    }

    /**
     * Membangun notifikasi persisten untuk Foreground Service pemantau pesanan
     */
    fun createMonitorNotification(context: Context): Notification {
        createNotificationChannels(context)

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("NAVIGATE_TO", "kasir/pesanan")
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(context, CHANNEL_SERVICE_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Kasir Koperasi PK Aktif")
            .setContentText("Memantau pesanan masuk secara real-time...")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setColor(0xFF10B981.toInt())
            .build()
    }

    private fun wakeUpScreen(context: Context) {
        try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
            @Suppress("DEPRECATION")
            val wakeLock = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                "koperasi:order_alert_wakelock"
            )
            wakeLock.acquire(7_000L) // Hidupkan layar selama 7 detik
        } catch (_: Exception) {
            // Abaikan jika device membatasi wakelock
        }
    }
}
