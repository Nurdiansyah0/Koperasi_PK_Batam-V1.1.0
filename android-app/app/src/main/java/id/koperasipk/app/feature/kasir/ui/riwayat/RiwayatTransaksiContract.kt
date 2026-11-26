package id.koperasipk.app.feature.kasir.ui.riwayat

import androidx.compose.runtime.Immutable
import id.koperasipk.app.feature.kasir.data.RiwayatTransaksiDto

enum class DateFilterPreset(val label: String) {
    SEMUA("Semua"),
    HARI_INI("Hari Ini"),
    KEMARIN("Kemarin"),
    TUJUH_HARI("7 Hari Terakhir"),
    BULAN_INI("Bulan Ini"),
    KUSTOM("Kustom"),
}

enum class PaymentFilter(val label: String) {
    SEMUA("Semua Metode"),
    TUNAI("Tunai"),
    SALDO("Saldo"),
    QRIS("QRIS"),
    TRANSFER("Transfer"),
    HUTANG("Hutang"),
}

@Immutable
data class RiwayatTransaksiUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val items: List<RiwayatTransaksiDto> = emptyList(),
    val currentPage: Int = 1,
    val lastPage: Int = 1,
    val totalCount: Int = 0,
    val datePreset: DateFilterPreset = DateFilterPreset.SEMUA,
    val tanggalAwal: String = "",
    val tanggalAkhir: String = "",
    val showCustomDateRow: Boolean = false,
    val paymentFilter: PaymentFilter = PaymentFilter.SEMUA,
    val searchQuery: String = "",
    val expandedIds: Set<Int> = emptySet(),
    val selectedReceipt: RiwayatTransaksiDto? = null,
) {
    val filteredItems: List<RiwayatTransaksiDto>
        get() {
            val q = searchQuery.trim().lowercase()
            return items.filter { t ->
                val met = t.metodePembayaran.lowercase()
                val methodMatches = when (paymentFilter) {
                    PaymentFilter.SEMUA -> true
                    PaymentFilter.TUNAI -> met == "cash" || met == "tunai"
                    PaymentFilter.SALDO -> met == "ewallet" || met == "saldo"
                    PaymentFilter.QRIS -> met == "qr"
                    PaymentFilter.TRANSFER -> met == "transfer"
                    PaymentFilter.HUTANG -> met == "hutang"
                }
                val searchMatches = if (q.isEmpty()) {
                    true
                } else {
                    t.resolvedId.toString().contains(q) ||
                        t.namaAnggota.orEmpty().lowercase().contains(q) ||
                        t.namaKasir.orEmpty().lowercase().contains(q)
                }
                methodMatches && searchMatches
            }
        }

    val totalOmsetFiltered: Double
        get() = filteredItems.sumOf { it.resolvedTotal }
}

sealed interface RiwayatTransaksiEvent {
    data object Refresh : RiwayatTransaksiEvent
    data class DatePresetSelected(val preset: DateFilterPreset) : RiwayatTransaksiEvent
    data class TanggalAwalChanged(val value: String) : RiwayatTransaksiEvent
    data class TanggalAkhirChanged(val value: String) : RiwayatTransaksiEvent
    data object ApplyCustomDate : RiwayatTransaksiEvent
    data class PaymentFilterSelected(val filter: PaymentFilter) : RiwayatTransaksiEvent
    data class SearchChanged(val query: String) : RiwayatTransaksiEvent
    data class ToggleExpand(val transaksiId: Int) : RiwayatTransaksiEvent
    data class SelectReceipt(val trx: RiwayatTransaksiDto?) : RiwayatTransaksiEvent
    data class ChangePage(val page: Int) : RiwayatTransaksiEvent
}

sealed interface RiwayatTransaksiEffect {
    data class ShowMessage(val message: String) : RiwayatTransaksiEffect
}
