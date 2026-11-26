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

class ResetPasswordViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ResetPasswordUiState())
    val uiState: StateFlow<ResetPasswordUiState> = _uiState.asStateFlow()

    private val _effects = Channel<ResetPasswordEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var submitJob: Job? = null

    fun onEvent(event: ResetPasswordEvent) {
        when (event) {
            is ResetPasswordEvent.UsernameChanged -> _uiState.update {
                it.copy(username = event.value, errorMessage = null)
            }
            is ResetPasswordEvent.DigitHutangChanged -> {
                val filtered = event.value.filter(Char::isDigit).take(2)
                _uiState.update { it.copy(digitHutang = filtered, errorMessage = null) }
            }
            is ResetPasswordEvent.DigitShuChanged -> {
                val filtered = event.value.filter(Char::isDigit).take(3)
                _uiState.update { it.copy(digitShu = filtered, errorMessage = null) }
            }
            is ResetPasswordEvent.PasswordBaruChanged -> _uiState.update {
                it.copy(passwordBaru = event.value, errorMessage = null)
            }
            is ResetPasswordEvent.ConfirmPasswordChanged -> _uiState.update {
                it.copy(confirmPassword = event.value, errorMessage = null)
            }
            ResetPasswordEvent.ClearError -> _uiState.update { it.copy(errorMessage = null) }
            ResetPasswordEvent.SubmitReset -> submit()
        }
    }

    private fun submit() {
        if (submitJob?.isActive == true) return
        val current = _uiState.value

        val validationError = when {
            current.username.isBlank() -> "Harap masukkan username Anda!"
            current.digitHutang.trim().length != 2 ->
                "2 digit depan hutang harus terdiri dari 2 angka (misal: 35 atau 00 jika lunas)"
            current.digitShu.trim().length != 3 ->
                "3 digit belakang SHU harus terdiri dari 3 angka (misal: 750 atau 000 jika nol)"
            current.passwordBaru.length < 6 -> "Password baru minimal 6 karakter!"
            current.passwordBaru != current.confirmPassword ->
                "Konfirmasi password tidak cocok!"
            else -> null
        }

        if (validationError != null) {
            _uiState.update { it.copy(errorMessage = validationError) }
            return
        }

        submitJob = viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (
                val result = authRepository.resetPassword(
                    username = current.username,
                    digitHutang = current.digitHutang,
                    digitShu = current.digitShu,
                    passwordBaru = current.passwordBaru,
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            successMessage = result.data,
                            passwordBaru = "",
                            confirmPassword = "",
                        )
                    }
                    _effects.send(ResetPasswordEffect.ShowMessage(result.data))
                }
                is ApiResult.Error -> {
                    val msg = if (result.code == 429) {
                        "Terlalu banyak percobaan reset gagal. Silakan tunggu 1 menit demi keamanan akun."
                    } else {
                        result.message
                    }
                    _uiState.update { it.copy(isLoading = false, errorMessage = msg) }
                }
            }
        }
    }

    companion object {
        fun factory(authRepository: AuthRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return ResetPasswordViewModel(authRepository) as T
                }
            }
    }
}
