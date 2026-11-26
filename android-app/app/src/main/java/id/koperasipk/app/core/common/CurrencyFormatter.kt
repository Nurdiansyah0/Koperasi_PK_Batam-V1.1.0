package id.koperasipk.app.core.common

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale
import kotlin.math.roundToLong

/**
 * Pemformat mata uang Rupiah thread-safe tanpa alokasi objek per recomposition.
 * Menghasilkan format standar Indonesia seperti "Rp 25.000".
 */
object CurrencyFormatter {

    private val formatter: ThreadLocal<DecimalFormat> = ThreadLocal.withInitial {
        val symbols = DecimalFormatSymbols(Locale("id", "ID")).apply {
            groupingSeparator = '.'
            decimalSeparator = ','
        }
        DecimalFormat("#,##0", symbols)
    }

    fun format(amount: Double): String {
        val safe = if (amount.isNaN() || amount.isInfinite()) 0.0 else amount
        return format(safe.roundToLong())
    }

    fun format(amount: Long): String {
        val df = requireNotNull(formatter.get())
        return if (amount < 0L) {
            "-Rp ${df.format(-amount)}"
        } else {
            "Rp ${df.format(amount)}"
        }
    }

    fun format(amount: Int): String = format(amount.toLong())

    fun formatPlain(amount: Double): String {
        val safe = if (amount.isNaN() || amount.isInfinite()) 0.0 else amount
        return formatPlain(safe.roundToLong())
    }

    fun formatPlain(amount: Long): String {
        val df = requireNotNull(formatter.get())
        return df.format(amount)
    }
}
