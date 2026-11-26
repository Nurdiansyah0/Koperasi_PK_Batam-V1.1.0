package id.koperasipk.app.feature.anggota

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AnggotaDashboardViewModel(
    private val repository: AnggotaRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AnggotaDashboardUiState())
    val uiState: StateFlow<AnggotaDashboardUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AnggotaDashboardEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null

    init {
        load(isInitial = true)
    }

    fun onEvent(event: AnggotaDashboardEvent) {
        when (event) {
            AnggotaDashboardEvent.Refresh -> load(isInitial = false)
            AnggotaDashboardEvent.ToggleBalanceVisibility -> _uiState.update {
                it.copy(isBalanceHidden = !it.isBalanceHidden)
            }
            AnggotaDashboardEvent.ShowQrDialog -> _uiState.update { it.copy(showQrDialog = true) }
            AnggotaDashboardEvent.DismissQrDialog -> _uiState.update { it.copy(showQrDialog = false) }
        }
    }

    private fun load(isInitial: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update { current ->
                current.copy(
                    isLoading = isInitial && current.profil == null,
                    isRefreshing = !isInitial || current.profil != null,
                    errorMessage = if (current.profil == null) null else current.errorMessage,
                )
            }
            try {
                val (profilRes, historyRes) = coroutineScope {
                    val p = async { repository.getProfil() }
                    val h = async { repository.getHistoriTransaksi(page = 1) }
                    p.await() to h.await()
                }

                when (profilRes) {
                    is ApiResult.Success -> {
                        val txs = when (historyRes) {
                            is ApiResult.Success -> historyRes.data.data.take(5)
                            is ApiResult.Error -> _uiState.value.recentTransactions
                        }
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = null,
                                profil = profilRes.data,
                                recentTransactions = txs,
                            )
                        }
                        if (historyRes is ApiResult.Error) {
                            _effects.send(AnggotaDashboardEffect.ShowMessage(historyRes.message))
                        }
                    }
                    is ApiResult.Error -> {
                        val hasCached = _uiState.value.profil != null
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = if (hasCached) null else profilRes.message,
                            )
                        }
                        if (hasCached) {
                            _effects.send(AnggotaDashboardEffect.ShowMessage(profilRes.message))
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    companion object {
        fun factory(repository: AnggotaRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return AnggotaDashboardViewModel(repository) as T
                }
            }
    }
}
