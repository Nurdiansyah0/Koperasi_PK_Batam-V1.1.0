package id.koperasipk.app.feature.anggota

import androidx.compose.runtime.Immutable

@Immutable
data class BayarHutangUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
    val submitError: String? = null,
    val submitSuccess: String? = null,
    val nominalInput: String = "",
    val profil: ProfilAnggotaDto? = null,
    val history: List<HistoriBayarHutangDto> = emptyList(),
)

sealed interface BayarHutangEvent {
    data object Refresh : BayarHutangEvent
    data class NominalChanged(val value: String) : BayarHutangEvent
    data class PresetSelected(val amount: Long) : BayarHutangEvent
    data object SubmitPayment : BayarHutangEvent
}

sealed interface BayarHutangEffect {
    data class ShowMessage(val message: String) : BayarHutangEffect
}
