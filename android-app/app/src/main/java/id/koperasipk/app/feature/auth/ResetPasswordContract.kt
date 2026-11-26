package id.koperasipk.app.feature.auth

import androidx.compose.runtime.Immutable

@Immutable
data class ResetPasswordUiState(
    val username: String = "",
    val digitHutang: String = "",
    val digitShu: String = "",
    val passwordBaru: String = "",
    val confirmPassword: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
)

sealed interface ResetPasswordEvent {
    data class UsernameChanged(val value: String) : ResetPasswordEvent
    data class DigitHutangChanged(val value: String) : ResetPasswordEvent
    data class DigitShuChanged(val value: String) : ResetPasswordEvent
    data class PasswordBaruChanged(val value: String) : ResetPasswordEvent
    data class ConfirmPasswordChanged(val value: String) : ResetPasswordEvent
    data object SubmitReset : ResetPasswordEvent
    data object ClearError : ResetPasswordEvent
}

sealed interface ResetPasswordEffect {
    data class ShowMessage(val message: String) : ResetPasswordEffect
}
