package id.koperasipk.app.core.designsystem

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

enum class BadgeVariant {
    DEFAULT,
    SUCCESS,
    WARNING,
    DANGER,
    INFO,
    PURPLE,
}

@Composable
fun StatusBadge(
    text: String,
    modifier: Modifier = Modifier,
    variant: BadgeVariant = BadgeVariant.DEFAULT,
) {
    val isDark = isSystemInDarkTheme()
    val (bg, fg, border) = when (variant) {
        BadgeVariant.DEFAULT -> Triple(
            if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
            if (isDark) Color(0xFFCBD5E1) else Color(0xFF334155),
            if (isDark) Color(0xFF334155) else Color(0xFFCBD5E1),
        )
        BadgeVariant.SUCCESS -> Triple(
            if (isDark) Color(0xFF064E3B) else Color(0xFFECFDF5),
            if (isDark) Color(0xFF6EE7B7) else Color(0xFF047857),
            if (isDark) Color(0xFF065F46) else Color(0xFFA7F3D0),
        )
        BadgeVariant.WARNING -> Triple(
            if (isDark) Color(0xFF78350F) else Color(0xFFFFFBEB),
            if (isDark) Color(0xFFFCD34D) else Color(0xFFB45309),
            if (isDark) Color(0xFF92400E) else Color(0xFFFDE68A),
        )
        BadgeVariant.DANGER -> Triple(
            if (isDark) Color(0xFF7F1D1D) else Color(0xFFFFF1F2),
            if (isDark) Color(0xFFFCA5A5) else Color(0xFFBE123C),
            if (isDark) Color(0xFF991B1B) else Color(0xFFFECDD3),
        )
        BadgeVariant.INFO -> Triple(
            if (isDark) Color(0xFF1E3A8A) else Color(0xFFEFF6FF),
            if (isDark) Color(0xFF93C5FD) else Color(0xFF1D4ED8),
            if (isDark) Color(0xFF1E40AF) else Color(0xFFBFDBFE),
        )
        BadgeVariant.PURPLE -> Triple(
            if (isDark) Color(0xFF4C1D95) else Color(0xFFFAF5FF),
            if (isDark) Color(0xFFD8B4FE) else Color(0xFF7E22CE),
            if (isDark) Color(0xFF5B21B6) else Color(0xFFE9D5FF),
        )
    }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(999.dp),
        color = bg,
        border = BorderStroke(1.dp, border),
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = fg,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}

fun statusBadgeVariant(status: String?): BadgeVariant {
    return when (status?.trim()?.lowercase()) {
        "selesai", "approved", "disetujui", "aktif", "aman", "lunas", "active" -> BadgeVariant.SUCCESS
        "pending", "menunggu", "near_expiry", "proses" -> BadgeVariant.WARNING
        "ditolak", "rejected", "expired", "nonaktif", "batal", "kadaluarsa" -> BadgeVariant.DANGER
        "cash", "ewallet", "qr", "transfer", "admin", "kasir" -> BadgeVariant.INFO
        "pengurus", "shu" -> BadgeVariant.PURPLE
        else -> BadgeVariant.DEFAULT
    }
}
