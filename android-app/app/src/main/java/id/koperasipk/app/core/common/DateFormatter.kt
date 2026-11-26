package id.koperasipk.app.core.common

import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Pemformat tanggal dan timestamp Laravel (ISO-8601 & SQL datetime) yang thread-safe
 * serta kompatibel dengan Android API 24+.
 */
object DateFormatter {

    private val localeId = Locale("id", "ID")
    private val fractionalSecondsRegex = Regex("""\.\d+""")
    private val dateOnlyRegex = Regex("""^\d{4}-\d{2}-\d{2}$""")

    private val isoUtcParser = threadLocalParser("yyyy-MM-dd'T'HH:mm:ss'Z'", TimeZone.getTimeZone("UTC"))
    private val isoOffsetParser = threadLocalParser("yyyy-MM-dd'T'HH:mm:ssXXX", null)
    private val isoLocalParser = threadLocalParser("yyyy-MM-dd'T'HH:mm:ss", null)
    private val sqlDateTimeParser = threadLocalParser("yyyy-MM-dd HH:mm:ss", null)
    private val sqlDateParser = threadLocalParser("yyyy-MM-dd", null)

    private val displayDateTimeFormatter = threadLocalFormatter("dd MMM yyyy, HH:mm")
    private val displayDateFormatter = threadLocalFormatter("dd MMMM yyyy")
    private val displayShortDateFormatter = threadLocalFormatter("dd MMM yyyy")
    private val apiDateFormatter = threadLocalFormatter("yyyy-MM-dd")

    fun formatDateTime(raw: String?): String {
        val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return "-"
        if (dateOnlyRegex.matches(trimmed)) {
            return formatShortDate(trimmed)
        }
        val date = parse(trimmed) ?: return trimmed
        return requireNotNull(displayDateTimeFormatter.get()).format(date)
    }

    fun formatDate(raw: String?): String {
        val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return "-"
        val date = parse(trimmed) ?: return trimmed
        return requireNotNull(displayDateFormatter.get()).format(date)
    }

    fun formatShortDate(raw: String?): String {
        val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return "-"
        val date = parse(trimmed) ?: return trimmed
        return requireNotNull(displayShortDateFormatter.get()).format(date)
    }

    fun formatApiDate(timeMillis: Long): String {
        return requireNotNull(apiDateFormatter.get()).format(Date(timeMillis))
    }

    fun todayApiDate(): String = formatApiDate(System.currentTimeMillis())

    fun parse(raw: String?): Date? {
        val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        val normalized = trimmed.replace(fractionalSecondsRegex, "")
        val parsers = listOf(
            isoUtcParser,
            isoOffsetParser,
            isoLocalParser,
            sqlDateTimeParser,
            sqlDateParser,
        )
        for (parserHolder in parsers) {
            val parser = requireNotNull(parserHolder.get())
            try {
                return parser.parse(normalized)
            } catch (_: ParseException) {
                // Lanjutkan ke format berikutnya
            }
        }
        return null
    }

    private fun threadLocalParser(pattern: String, timeZone: TimeZone?): ThreadLocal<SimpleDateFormat> {
        return ThreadLocal.withInitial {
            SimpleDateFormat(pattern, Locale.US).apply {
                isLenient = false
                if (timeZone != null) {
                    this.timeZone = timeZone
                }
            }
        }
    }

    private fun threadLocalFormatter(pattern: String): ThreadLocal<SimpleDateFormat> {
        return ThreadLocal.withInitial {
            SimpleDateFormat(pattern, localeId)
        }
    }
}
