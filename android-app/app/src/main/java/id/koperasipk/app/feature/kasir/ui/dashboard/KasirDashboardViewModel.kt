package id.koperasipk.app.feature.kasir.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.kasir.data.KasirRepository
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

class KasirDashboardViewModel(
    private val repository: KasirRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(KasirDashboardUiState())
    val uiState: StateFlow<KasirDashboardUiState> = _uiState.asStateFlow()

    private val _effects = Channel<KasirDashboardEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null

    init {
        load(isRefresh = false)
    }

    fun onEvent(event: KasirDashboardEvent) {
        when (event) {
            KasirDashboardEvent.Load -> load(isRefresh = false)
            KasirDashboardEvent.Refresh -> load(isRefresh = true)
        }
    }

    private fun load(isRefresh: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.dashboard == null,
                    isRefreshing = isRefresh,
                    errorMessage = null,
                )
            }
            try {
                val (dashRes, terbaruRes, shiftRes) = coroutineScope {
                    val d = async { repository.getDashboard() }
                    val t = async { repository.getTransaksiTerbaru() }
                    val s = async { repository.getActiveShiftInfo() }
                    Triple(d.await(), t.await(), s.await())
                }

                when (dashRes) {
                    is ApiResult.Success -> {
                        val dash = dashRes.data
                        val recentList = when (terbaruRes) {
                            is ApiResult.Success -> if (terbaruRes.data.isNotEmpty()) terbaruRes.data else dash.transaksiTerbaru
                            is ApiResult.Error -> dash.transaksiTerbaru
                        }
                        val shiftDetail = dash.activeShift ?: (shiftRes as? ApiResult.Success)?.data?.latestIncoming
                        val hasOutgoing = (shiftRes as? ApiResult.Success)?.data?.hasPendingOutgoing == true

                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = null,
                                dashboard = dash,
                                transaksiTerbaru = recentList,
                                activeShift = shiftDetail,
                                hasPendingOutgoingShift = hasOutgoing,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        if (_uiState.value.dashboard == null) {
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    isRefreshing = false,
                                    errorMessage = dashRes.message,
                                )
                            }
                        } else {
                            _uiState.update { it.copy(isLoading = false, isRefreshing = false) }
                            _effects.send(KasirDashboardEffect.ShowMessage(dashRes.message))
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    companion object {
        fun factory(repository: KasirRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return KasirDashboardViewModel(repository) as T
                }
            }
    }
}
