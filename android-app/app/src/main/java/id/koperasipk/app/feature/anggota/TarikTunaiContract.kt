package id.koperasipk.app.feature.anggota

import androidx.compose.runtime.Immutable

enum class SumberDanaTarikTunai(val apiValue: String, val label: String) {
    SHU("shu", "Akumulasi SHU"),
    SALDO("saldo", "Saldo E-Wallet"),
}

@Immutable
data class TarikTunaiUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isConsentSubmitting: Boolean = false,
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
    val formError: String? = null,
    val eligibility: KelayakanTarikTunaiDto? = null,
    val history: List<TarikTunaiItemDto> = emptyList(),
    val sumberDana: SumberDanaTarikTunai = SumberDanaTarikTunai.SHU,
    val nominalInput: String = "",
    val keteranganInput: String = "",
    val persetujuanShuChecked: Boolean = false,
)

sealed interface TarikTunaiEvent {
    data object Refresh : TarikTunaiEvent
    data class SumberDanaSelected(val sumber: SumberDanaTarikTunai) : TarikTunaiEvent
    data class NominalChanged(val value: String) : TarikTunaiEvent
    data class QuickAmountSelected(val amount: Long) : TarikTunaiEvent
    data class KeteranganChanged(val value: String) : TarikTunaiEvent
    data class PersetujuanChanged(val checked: Boolean) : TarikTunaiEvent
    data object AgreeMasterConsent : TarikTunaiEvent
    data object SubmitTarikTunai : TarikTunaiEvent
}

sealed interface TarikTunaiEffect {
    data class ShowMessage(val message: String) : TarikTunaiEffect
}
