package id.koperasipk.app.feature.anggota

import androidx.compose.runtime.Immutable

@Immutable
data class AnggotaDashboardUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isBalanceHidden: Boolean = false,
    val errorMessage: String? = null,
    val profil: ProfilAnggotaDto? = null,
    val recentTransactions: List<TransaksiAnggotaDto> = emptyList(),
    val showQrDialog: Boolean = false,
)

sealed interface AnggotaDashboardEvent {
    data object Refresh : AnggotaDashboardEvent
    data object ToggleBalanceVisibility : AnggotaDashboardEvent
    data object ShowQrDialog : AnggotaDashboardEvent
    data object DismissQrDialog : AnggotaDashboardEvent
}

sealed interface AnggotaDashboardEffect {
    data class ShowMessage(val message: String) : AnggotaDashboardEffect
}
