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

class RiwayatViewModel(
    private val repository: AnggotaRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RiwayatUiState())
    val uiState: StateFlow<RiwayatUiState> = _uiState.asStateFlow()

    private val _effects = Channel<RiwayatEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null

    init {
        loadPage(page = 1, isInitial = true)
    }

    fun onEvent(event: RiwayatEvent) {
        when (event) {
            RiwayatEvent.Refresh -> loadPage(page = _uiState.value.currentPage, isInitial = false)
            is RiwayatEvent.FilterSelected -> _uiState.update { it.copy(selectedFilter = event.filter) }
            is RiwayatEvent.LoadPage -> {
                val target = event.page.coerceAtLeast(1)
                loadPage(page = target, isInitial = false)
            }
            is RiwayatEvent.SelectTransaction -> _uiState.update { it.copy(selectedTransaction = event.transaction) }
            RiwayatEvent.DismissReceipt -> _uiState.update { it.copy(selectedTransaction = null) }
        }
    }

    private fun loadPage(page: Int, isInitial: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    isLoading = isInitial && state.transactions.isEmpty(),
                    isRefreshing = !isInitial || state.transactions.isNotEmpty(),
                    errorMessage = if (state.transactions.isEmpty()) null else state.errorMessage,
                )
            }
            try {
                when (val result = repository.getHistoriTransaksi(page)) {
                    is ApiResult.Success -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = null,
                                transactions = result.data.data,
                                currentPage = result.data.currentPage.coerceAtLeast(1),
                                lastPage = result.data.lastPage.coerceAtLeast(1),
                                totalItems = result.data.total,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        val hasData = _uiState.value.transactions.isNotEmpty()
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = if (hasData) null else result.message,
                            )
                        }
                        if (hasData) {
                            _effects.send(RiwayatEffect.ShowMessage(result.message))
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
                    return RiwayatViewModel(repository) as T
                }
            }
    }
}
