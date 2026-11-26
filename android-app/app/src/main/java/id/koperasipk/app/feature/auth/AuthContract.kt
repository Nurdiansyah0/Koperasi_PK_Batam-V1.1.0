package id.koperasipk.app.feature.auth

import androidx.compose.runtime.Immutable

@Immutable
data class AuthUiState(
    val username: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
)

sealed interface AuthEvent {
    data class UsernameChanged(val value: String) : AuthEvent
    data class PasswordChanged(val value: String) : AuthEvent
    data object SubmitLogin : AuthEvent
    data object ClearError : AuthEvent
}

sealed interface AuthEffect {
    data class ShowMessage(val message: String) : AuthEffect
}
