package id.koperasipk.app.feature.anggota

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class ProfilAnggotaViewModel(
    private val repository: AnggotaRepository,
    initialUsername: String,
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        ProfilAnggotaUiState(
            usernameInput = initialUsername,
            initialUsername = initialUsername,
        )
    )
    val uiState: StateFlow<ProfilAnggotaUiState> = _uiState.asStateFlow()

    private val _effects = Channel<ProfilAnggotaEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var updateJob: Job? = null

    init {
        load(isInitial = true)
    }

    fun onEvent(event: ProfilAnggotaEvent) {
        when (event) {
            ProfilAnggotaEvent.Refresh -> load(isInitial = false)
            is ProfilAnggotaEvent.UsernameChanged -> _uiState.update {
                it.copy(usernameInput = event.value, updateError = null, updateSuccess = null)
            }
            ProfilAnggotaEvent.SubmitUpdateProfile -> submitUpdateProfile()
        }
    }

    private fun load(isInitial: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    isLoading = isInitial && state.profil == null,
                    isRefreshing = !isInitial || state.profil != null,
                    errorMessage = if (state.profil == null) null else state.errorMessage,
                )
            }
            try {
                when (val result = repository.getProfil()) {
                    is ApiResult.Success -> {
                        val serverUsername = result.data.username?.takeIf { it.isNotBlank() }
                        _uiState.update { state ->
                            val resolvedUsername = serverUsername ?: state.initialUsername
                            state.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = null,
                                profil = result.data,
                                initialUsername = resolvedUsername,
                                usernameInput = state.usernameInput.ifBlank { resolvedUsername },
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        val hasData = _uiState.value.profil != null
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = if (hasData) null else result.message,
                            )
                        }
                        if (hasData) {
                            _effects.send(ProfilAnggotaEffect.ShowMessage(result.message))
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    private fun submitUpdateProfile() {
        if (updateJob?.isActive == true) return
        val newUsername = _uiState.value.usernameInput.trim()
        if (newUsername.isBlank()) {
            _uiState.update { it.copy(updateError = "Username tidak boleh kosong", updateSuccess = null) }
            return
        }

        updateJob = viewModelScope.launch {
            _uiState.update { it.copy(isUpdatingUsername = true, updateError = null, updateSuccess = null) }
            try {
                when (val result = repository.updateProfile(newUsername)) {
                    is ApiResult.Success -> {
                        val msg = result.data.message.ifBlank { "Profil berhasil diperbarui" }
                        _uiState.update {
                            it.copy(
                                isUpdatingUsername = false,
                                initialUsername = newUsername,
                                usernameInput = newUsername,
                                updateError = null,
                                updateSuccess = msg,
                            )
                        }
                        _effects.send(ProfilAnggotaEffect.ShowMessage(msg))
                    }
                    is ApiResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isUpdatingUsername = false,
                                updateError = result.message,
                                updateSuccess = null,
                            )
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    companion object {
        fun factory(
            repository: AnggotaRepository,
            initialUsername: String,
        ): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return ProfilAnggotaViewModel(repository, initialUsername) as T
                }
            }
    }
}
