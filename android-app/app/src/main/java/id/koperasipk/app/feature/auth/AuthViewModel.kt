package id.koperasipk.app.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AuthViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AuthEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    // Mencegah double-submit saat tombol Login ditekan berulang kali
    private var loginJob: Job? = null

    fun onEvent(event: AuthEvent) {
        when (event) {
            is AuthEvent.UsernameChanged -> _uiState.update {
                it.copy(username = event.value, errorMessage = null)
            }
            is AuthEvent.PasswordChanged -> _uiState.update {
                it.copy(password = event.value, errorMessage = null)
            }
            AuthEvent.ClearError -> _uiState.update { it.copy(errorMessage = null) }
            AuthEvent.SubmitLogin -> submitLogin()
        }
    }

    private fun submitLogin() {
        if (loginJob?.isActive == true) return
        val current = _uiState.value
        if (current.username.isBlank() || current.password.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Username dan password wajib diisi") }
            return
        }

        loginJob = viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = authRepository.login(current.username, current.password)) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(isLoading = false, password = "") }
                    _effects.send(AuthEffect.ShowMessage("Selamat datang, ${result.data.name}"))
                }
                is ApiResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = result.message,
                        )
                    }
                }
            }
        }
    }

    companion object {
        fun factory(authRepository: AuthRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return AuthViewModel(authRepository) as T
                }
            }
    }
}
