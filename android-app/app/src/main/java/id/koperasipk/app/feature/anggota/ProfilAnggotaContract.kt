package id.koperasipk.app.feature.anggota

import androidx.compose.runtime.Immutable

@Immutable
data class ProfilAnggotaUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isUpdatingUsername: Boolean = false,
    val errorMessage: String? = null,
    val updateError: String? = null,
    val updateSuccess: String? = null,
    val usernameInput: String = "",
    val initialUsername: String = "",
    val profil: ProfilAnggotaDto? = null,
)

sealed interface ProfilAnggotaEvent {
    data object Refresh : ProfilAnggotaEvent
    data class UsernameChanged(val value: String) : ProfilAnggotaEvent
    data object SubmitUpdateProfile : ProfilAnggotaEvent
}

sealed interface ProfilAnggotaEffect {
    data class ShowMessage(val message: String) : ProfilAnggotaEffect
}
