package id.koperasipk.app.feature.akun

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.datastore.UserSession
import id.koperasipk.app.feature.auth.AuthRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AkunSayaViewModel(
    private val authRepository: AuthRepository,
    initialSession: UserSession,
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        AkunSayaUiState(
            isLoadingProfile = true,
            displayName = initialSession.name,
            username = initialSession.username.ifBlank { initialSession.name },
            role = initialSession.role,
            activeRoles = initialSession.activeRoles,
        )
    )
    val uiState: StateFlow<AkunSayaUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AkunSayaEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var profileJob: Job? = null
    private var passwordJob: Job? = null

    init {
        loadProfile(isRefresh = false)
    }

    fun onEvent(event: AkunSayaEvent) {
        when (event) {
            AkunSayaEvent.RefreshProfile -> loadProfile(isRefresh = true)
            is AkunSayaEvent.CurrentPasswordChanged -> _uiState.update {
                it.copy(currentPassword = event.value, passwordError = null)
            }
            is AkunSayaEvent.NewPasswordChanged -> _uiState.update {
                it.copy(newPassword = event.value, passwordError = null)
            }
            is AkunSayaEvent.ConfirmPasswordChanged -> _uiState.update {
                it.copy(confirmPassword = event.value, passwordError = null)
            }
            AkunSayaEvent.SubmitChangePassword -> submitChangePassword()
            AkunSayaEvent.OpenLogoutDialog -> _uiState.update { it.copy(showLogoutDialog = true) }
            AkunSayaEvent.DismissLogoutDialog -> _uiState.update { it.copy(showLogoutDialog = false) }
        }
    }

    private fun loadProfile(isRefresh: Boolean) {
        if (profileJob?.isActive == true) return
        profileJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoadingProfile = !isRefresh && it.user == null,
                    isRefreshing = isRefresh,
                    profileError = null,
                )
            }
            when (val result = authRepository.fetchMe()) {
                is ApiResult.Success -> {
                    val user = result.data
                    _uiState.update {
                        it.copy(
                            isLoadingProfile = false,
                            isRefreshing = false,
                            profileError = null,
                            user = user,
                            displayName = user.displayName,
                            username = user.username,
                            role = user.role.ifBlank { it.role },
                            activeRoles = user.activeRoles,
                        )
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoadingProfile = false,
                            isRefreshing = false,
                            profileError = result.message,
                        )
                    }
                }
            }
        }
    }

    private fun submitChangePassword() {
        if (passwordJob?.isActive == true) return
        val current = _uiState.value

        val validationError = when {
            current.currentPassword.isBlank() -> "Password saat ini wajib diisi"
            current.newPassword.length < 6 -> "Password baru minimal 6 karakter"
            current.newPassword != current.confirmPassword -> "Konfirmasi password tidak cocok"
            current.newPassword == current.currentPassword ->
                "Password baru harus berbeda dari password lama"
            else -> null
        }

        if (validationError != null) {
            _uiState.update { it.copy(passwordError = validationError) }
            return
        }

        passwordJob = viewModelScope.launch {
            _uiState.update { it.copy(isSavingPassword = true, passwordError = null) }
            when (
                val result = authRepository.changePassword(
                    currentPassword = current.currentPassword,
                    newPassword = current.newPassword,
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSavingPassword = false,
                            currentPassword = "",
                            newPassword = "",
                            confirmPassword = "",
                            passwordError = null,
                        )
                    }
                    _effects.send(AkunSayaEffect.ShowMessage(result.data))
                }
                is ApiResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isSavingPassword = false,
                            passwordError = result.message,
                        )
                    }
                }
            }
        }
    }

    companion object {
        fun factory(
            authRepository: AuthRepository,
            session: UserSession,
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return AkunSayaViewModel(authRepository, session) as T
            }
        }
    }
}
