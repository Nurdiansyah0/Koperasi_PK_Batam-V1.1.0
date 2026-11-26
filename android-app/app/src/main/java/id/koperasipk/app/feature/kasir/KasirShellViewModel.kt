package id.koperasipk.app.feature.kasir

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.kasir.data.KasirRepository
import id.koperasipk.app.feature.kasir.data.LatestOrderDto
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.coroutines.coroutineContext

@Immutable
data class KasirShellUiState(
    val pendingOrdersCount: Int = 0,
    val isActiveShift: Boolean = false,
    val activeOrderAlert: LatestOrderDto? = null,
    val orderRefreshTick: Int = 0,
    val isTestingNotification: Boolean = false,
)

sealed interface KasirShellEvent {
    data object DismissOrderAlert : KasirShellEvent
    data object OpenOrdersFromAlert : KasirShellEvent
    data object TriggerTestNotification : KasirShellEvent
    data object PollNow : KasirShellEvent
}

sealed interface KasirShellEffect {
    data object NavigateToPesanan : KasirShellEffect
    data class ShowMessage(val message: String) : KasirShellEffect
}

class KasirShellViewModel(
    private val repository: KasirRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(KasirShellUiState())
    val uiState: StateFlow<KasirShellUiState> = _uiState.asStateFlow()

    private val _effects = Channel<KasirShellEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var hasBaseline: Boolean = false
    private var lastSeenOrderId: Int = 0
    private var testNotifJob: Job? = null
    private var manualPollJob: Job? = null

    fun onEvent(event: KasirShellEvent) {
        when (event) {
            KasirShellEvent.DismissOrderAlert -> {
                _uiState.update { it.copy(activeOrderAlert = null) }
            }
            KasirShellEvent.OpenOrdersFromAlert -> {
                _uiState.update { it.copy(activeOrderAlert = null) }
                viewModelScope.launch {
                    _effects.send(KasirShellEffect.NavigateToPesanan)
                }
            }
            KasirShellEvent.TriggerTestNotification -> triggerTestNotification()
            KasirShellEvent.PollNow -> {
                if (manualPollJob?.isActive == true) return
                manualPollJob = viewModelScope.launch {
                    pollOnce()
                }
            }
        }
    }

    /**
     * Dipanggil di dalam `repeatOnLifecycle(Lifecycle.State.STARTED)` agar polling berhenti
     * otomatis saat layar masuk ke background (STOPPED) dan aktif lagi saat STARTED.
     */
    suspend fun runPollingLoop(intervalMs: Long = POLLING_INTERVAL_MS) {
        while (coroutineContext.isActive) {
            pollOnce()
            delay(intervalMs)
        }
    }

    internal suspend fun pollOnce() {
        try {
            when (val result = repository.getLatestPendingOrders()) {
                is ApiResult.Success -> {
                    val data = result.data
                    val latest = data.latestOrder
                    val latestId = latest?.transaksiId ?: 0

                    val shouldAlert = if (!hasBaseline) {
                        hasBaseline = true
                        lastSeenOrderId = latestId
                        false
                    } else if (latest != null && latestId > lastSeenOrderId) {
                        lastSeenOrderId = latestId
                        true
                    } else {
                        false
                    }

                    _uiState.update { current ->
                        current.copy(
                            pendingOrdersCount = data.pendingCount,
                            isActiveShift = data.isActiveShift,
                            activeOrderAlert = if (shouldAlert) latest else current.activeOrderAlert,
                            orderRefreshTick = if (shouldAlert) current.orderRefreshTick + 1 else current.orderRefreshTick,
                        )
                    }
                }
                is ApiResult.Error -> {
                    // Diam saat polling latar belakang gagal sementara agar tidak mengganggu kasir
                }
            }
        } catch (e: CancellationException) {
            throw e
        }
    }

    private fun triggerTestNotification() {
        if (testNotifJob?.isActive == true) return
        testNotifJob = viewModelScope.launch {
            _uiState.update { it.copy(isTestingNotification = true) }
            when (val res = repository.triggerTestOrderNotification()) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isTestingNotification = false,
                            activeOrderAlert = res.data,
                        )
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isTestingNotification = false) }
                    _effects.send(KasirShellEffect.ShowMessage(res.message))
                }
            }
        }
    }

    companion object {
        const val POLLING_INTERVAL_MS = 15_000L

        fun factory(repository: KasirRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return KasirShellViewModel(repository) as T
                }
            }
    }
}
