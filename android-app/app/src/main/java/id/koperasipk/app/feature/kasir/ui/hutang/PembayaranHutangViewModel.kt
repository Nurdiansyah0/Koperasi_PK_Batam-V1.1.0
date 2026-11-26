package id.koperasipk.app.feature.kasir.ui.hutang

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

class PembayaranHutangViewModel(
    private val repository: KasirRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PembayaranHutangUiState())
    val uiState: StateFlow<PembayaranHutangUiState> = _uiState.asStateFlow()

    private val _effects = Channel<PembayaranHutangEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var actionJob: Job? = null

    init {
        load(isRefresh = false)
    }

    fun onEvent(event: PembayaranHutangEvent) {
        when (event) {
            PembayaranHutangEvent.Load -> load(isRefresh = false)
            PembayaranHutangEvent.Refresh -> load(isRefresh = true)
            is PembayaranHutangEvent.TabSelected -> _uiState.update { it.copy(activeTab = event.tab) }
            is PembayaranHutangEvent.SearchChanged -> _uiState.update { it.copy(searchQuery = event.query) }
            is PembayaranHutangEvent.Approve -> submitDecision(event.pembayaranId, "approve", event.metodePembayaran)
            is PembayaranHutangEvent.RequestReject -> _uiState.update { it.copy(confirmRejectItem = event.item) }
            PembayaranHutangEvent.DismissRejectDialog -> _uiState.update { it.copy(confirmRejectItem = null) }
            PembayaranHutangEvent.ConfirmReject -> {
                val target = _uiState.value.confirmRejectItem ?: return
                submitDecision(target.pembayaranId, "reject", "cash")
            }
        }
    }

    private fun load(isRefresh: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.items.isEmpty(),
                    isRefreshing = isRefresh,
                    errorMessage = null,
                )
            }
            when (val res = repository.getAllPembayaranHutang()) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            errorMessage = null,
                            items = res.data,
                        )
                    }
                }
                is ApiResult.Error -> {
                    if (_uiState.value.items.isEmpty()) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = res.message,
                            )
                        }
                    } else {
                        _uiState.update { it.copy(isLoading = false, isRefreshing = false) }
                        _effects.send(PembayaranHutangEffect.ShowMessage(res.message))
                    }
                }
            }
        }
    }

    private fun submitDecision(pembayaranId: Int, action: String, metodePembayaran: String) {
        if (actionJob?.isActive == true) return
        actionJob = viewModelScope.launch {
            _uiState.update { it.copy(processingId = pembayaranId, confirmRejectItem = null) }
            when (val res = repository.approvePembayaranHutang(pembayaranId, action, metodePembayaran)) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(processingId = null) }
                    val msg = if (action == "approve") {
                        "Pembayaran hutang disetujui"
                    } else {
                        "Pembayaran hutang ditolak"
                    }
                    _effects.send(PembayaranHutangEffect.ShowMessage(msg))
                    load(isRefresh = true)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(processingId = null) }
                    _effects.send(PembayaranHutangEffect.ShowMessage(res.message))
                }
            }
        }
    }

    companion object {
        fun factory(repository: KasirRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return PembayaranHutangViewModel(repository) as T
                }
            }
    }
}
