package id.koperasipk.app.core.common

import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.concurrent.Callable
import java.util.concurrent.Executors

class CurrencyFormatterTest {

    @Test
    fun `formats standard Rupiah values with Indonesian dot grouping and space`() {
        assertEquals("Rp 25.000", CurrencyFormatter.format(25_000))
        assertEquals("Rp 0", CurrencyFormatter.format(0))
        assertEquals("Rp 1.458.750", CurrencyFormatter.format(1_458_750.0))
        assertEquals("-Rp 5.000", CurrencyFormatter.format(-5_000L))
        assertEquals("50.000", CurrencyFormatter.formatPlain(50_000L))
    }

    @Test
    fun `handles NaN and infinite doubles safely`() {
        assertEquals("Rp 0", CurrencyFormatter.format(Double.NaN))
        assertEquals("Rp 0", CurrencyFormatter.format(Double.POSITIVE_INFINITY))
    }

    @Test
    fun `is thread-safe across concurrent threads via ThreadLocal`() {
        val executor = Executors.newFixedThreadPool(4)
        try {
            val tasks = (1..200).map { idx ->
                Callable {
                    val amount = idx * 1000L
                    CurrencyFormatter.format(amount) to amount
                }
            }
            val results = executor.invokeAll(tasks)
            for (future in results) {
                val (formatted, amount) = future.get()
                assertEquals(CurrencyFormatter.format(amount), formatted)
            }
        } finally {
            executor.shutdownNow()
        }
    }

    @Test
    fun `DateFormatter formats Laravel ISO and SQL timestamps without crashing`() {
        assertEquals("-", DateFormatter.formatDateTime(null))
        assertEquals("-", DateFormatter.formatDateTime(""))
        assertEquals("08 Sep 2026", DateFormatter.formatShortDate("2026-09-08"))
        val formattedIso = DateFormatter.formatDateTime("2026-09-08T10:41:47.000000Z")
        assertEquals(true, formattedIso.contains("2026"))
        val formattedSql = DateFormatter.formatDateTime("2026-09-08 17:41:47")
        assertEquals(true, formattedSql.contains("17:41") || formattedSql.contains("17.41"))
    }
}
