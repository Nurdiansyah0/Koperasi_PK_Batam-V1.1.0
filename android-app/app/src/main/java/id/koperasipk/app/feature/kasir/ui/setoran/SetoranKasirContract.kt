package id.koperasipk.app.feature.kasir.ui.setoran

import androidx.compose.runtime.Immutable
import id.koperasipk.app.feature.kasir.data.SetoranKasirDto

@Immutable
data class SetoranKasirUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val nominalText: String = "",
    val nominalError: String? = null,
    val isSubmitting: Boolean = false,
    val riwayat: List<SetoranKasirDto> = emptyList(),
)

sealed interface SetoranKasirEvent {
    data object Load : SetoranKasirEvent
    data object Refresh : SetoranKasirEvent
    data class NominalChanged(val digits: String) : SetoranKasirEvent
    data object SubmitSetoran : SetoranKasirEvent
}

sealed interface SetoranKasirEffect {
    data class ShowMessage(val message: String) : SetoranKasirEffect
}
