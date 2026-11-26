package id.koperasipk.app.feature.kasir.ui.setoran

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.kasir.data.KasirRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class SetoranKasirViewModel(
    private val repository: KasirRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SetoranKasirUiState())
    val uiState: StateFlow<SetoranKasirUiState> = _uiState.asStateFlow()

    private val _effects = Channel<SetoranKasirEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var submitJob: Job? = null

    init {
        load(isRefresh = false)
    }

    fun onEvent(event: SetoranKasirEvent) {
        when (event) {
            SetoranKasirEvent.Load -> load(isRefresh = false)
            SetoranKasirEvent.Refresh -> load(isRefresh = true)
            is SetoranKasirEvent.NominalChanged -> _uiState.update {
                it.copy(nominalText = event.digits.filter(Char::isDigit), nominalError = null)
            }
            SetoranKasirEvent.SubmitSetoran -> submitSetoran()
        }
    }

    private fun load(isRefresh: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.riwayat.isEmpty(),
                    isRefreshing = isRefresh,
                    errorMessage = null,
                )
            }
            when (val res = repository.getRiwayatSetoran()) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            errorMessage = null,
                            riwayat = res.data,
                        )
                    }
                }
                is ApiResult.Error -> {
                    if (_uiState.value.riwayat.isEmpty()) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = res.message,
                            )
                        }
                    } else {
                        _uiState.update { it.copy(isLoading = false, isRefreshing = false) }
                        _effects.send(SetoranKasirEffect.ShowMessage(res.message))
                    }
                }
            }
        }
    }

    private fun submitSetoran() {
        if (submitJob?.isActive == true) return
        val nominal = _uiState.value.nominalText.toDoubleOrNull() ?: 0.0
        if (nominal <= 0.0) {
            _uiState.update { it.copy(nominalError = "Nominal setoran harus lebih dari 0") }
            return
        }

        submitJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, nominalError = null) }
            when (val res = repository.setorAdmin(nominal)) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, nominalText = "") }
                    _effects.send(SetoranKasirEffect.ShowMessage(res.data))
                    load(isRefresh = true)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isSubmitting = false, nominalError = res.message) }
                    _effects.send(SetoranKasirEffect.ShowMessage(res.message))
                }
            }
        }
    }

    companion object {
        fun factory(repository: KasirRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return SetoranKasirViewModel(repository) as T
                }
            }
    }
}
