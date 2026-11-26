package id.koperasipk.app.feature.kasir.ui.hutang

import androidx.compose.runtime.Immutable
import id.koperasipk.app.feature.kasir.data.PembayaranHutangDto

enum class HutangTab(val label: String) {
    PENDING("Menunggu"),
    HISTORY("Riwayat"),
}

@Immutable
data class PembayaranHutangUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val items: List<PembayaranHutangDto> = emptyList(),
    val activeTab: HutangTab = HutangTab.PENDING,
    val searchQuery: String = "",
    val processingId: Int? = null,
    val confirmRejectItem: PembayaranHutangDto? = null,
) {
    val pendingCount: Int
        get() = items.count { it.status.equals("pending", ignoreCase = true) }

    val filteredItems: List<PembayaranHutangDto>
        get() {
            val base = when (activeTab) {
                HutangTab.PENDING -> items.filter { it.status.equals("pending", ignoreCase = true) }
                HutangTab.HISTORY -> items.filter { !it.status.equals("pending", ignoreCase = true) }
            }
            val q = searchQuery.trim().lowercase()
            if (q.isEmpty()) return base
            return base.filter { it.namaAnggota.lowercase().contains(q) }
        }
}

sealed interface PembayaranHutangEvent {
    data object Load : PembayaranHutangEvent
    data object Refresh : PembayaranHutangEvent
    data class TabSelected(val tab: HutangTab) : PembayaranHutangEvent
    data class SearchChanged(val query: String) : PembayaranHutangEvent
    data class Approve(val pembayaranId: Int, val metodePembayaran: String) : PembayaranHutangEvent
    data class RequestReject(val item: PembayaranHutangDto) : PembayaranHutangEvent
    data object DismissRejectDialog : PembayaranHutangEvent
    data object ConfirmReject : PembayaranHutangEvent
}

sealed interface PembayaranHutangEffect {
    data class ShowMessage(val message: String) : PembayaranHutangEffect
}
