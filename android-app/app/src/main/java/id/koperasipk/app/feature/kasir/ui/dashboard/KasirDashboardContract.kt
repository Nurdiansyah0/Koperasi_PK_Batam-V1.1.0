package id.koperasipk.app.feature.kasir.ui.dashboard

import androidx.compose.runtime.Immutable
import id.koperasipk.app.feature.kasir.data.ActiveShiftDetailDto
import id.koperasipk.app.feature.kasir.data.DashboardKasirDto
import id.koperasipk.app.feature.kasir.data.TransaksiTerbaruDto

@Immutable
data class KasirDashboardUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val dashboard: DashboardKasirDto? = null,
    val activeShift: ActiveShiftDetailDto? = null,
    val hasPendingOutgoingShift: Boolean = false,
    val transaksiTerbaru: List<TransaksiTerbaruDto> = emptyList(),
)

sealed interface KasirDashboardEvent {
    data object Load : KasirDashboardEvent
    data object Refresh : KasirDashboardEvent
}

sealed interface KasirDashboardEffect {
    data class ShowMessage(val message: String) : KasirDashboardEffect
}
