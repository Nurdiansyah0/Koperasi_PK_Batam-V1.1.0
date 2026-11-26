package id.koperasipk.app.feature.akun

import androidx.compose.runtime.Immutable
import id.koperasipk.app.core.network.UserDto

@Immutable
data class AkunSayaUiState(
    val isLoadingProfile: Boolean = false,
    val isRefreshing: Boolean = false,
    val profileError: String? = null,
    val user: UserDto? = null,
    val displayName: String = "",
    val username: String = "",
    val role: String = "",
    val activeRoles: List<String> = emptyList(),
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val isSavingPassword: Boolean = false,
    val passwordError: String? = null,
    val showLogoutDialog: Boolean = false,
)

sealed interface AkunSayaEvent {
    data object RefreshProfile : AkunSayaEvent
    data class CurrentPasswordChanged(val value: String) : AkunSayaEvent
    data class NewPasswordChanged(val value: String) : AkunSayaEvent
    data class ConfirmPasswordChanged(val value: String) : AkunSayaEvent
    data object SubmitChangePassword : AkunSayaEvent
    data object OpenLogoutDialog : AkunSayaEvent
    data object DismissLogoutDialog : AkunSayaEvent
}

sealed interface AkunSayaEffect {
    data class ShowMessage(val message: String) : AkunSayaEffect
}
