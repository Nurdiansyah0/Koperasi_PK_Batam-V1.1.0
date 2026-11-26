package id.koperasipk.app.feature.admin.setoran

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.SetoranKasirItemDto
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@Immutable
data class PendingSetoranAction(
    val item: SetoranKasirItemDto,
    val action: String, // "approve" | "reject"
)

@Immutable
data class AdminSetoranUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val processingId: Int? = null,
    val items: List<SetoranKasirItemDto> = emptyList(),
    val historyLimit: Int = 20,
    val pendingConfirm: PendingSetoranAction? = null,
    val errorMessage: String? = null,
) {
    val pendingItems: List<SetoranKasirItemDto>
        get() = items.filter { it.status == "pending" }

    val historyItems: List<SetoranKasirItemDto>
        get() = items.filter { it.status != "pending" }.take(historyLimit)

    val totalHistoryCount: Int
        get() = items.count { it.status != "pending" }
}

sealed interface AdminSetoranEvent {
    data object Load : AdminSetoranEvent
    data object Refresh : AdminSetoranEvent
    data class RequestAction(val item: SetoranKasirItemDto, val action: String) : AdminSetoranEvent
    data object DismissConfirm : AdminSetoranEvent
    data object ConfirmAction : AdminSetoranEvent
    data object LoadMoreHistory : AdminSetoranEvent
}

sealed interface AdminSetoranEffect {
    data class ShowMessage(val message: String, val isError: Boolean = false) : AdminSetoranEffect
}

class AdminSetoranViewModel(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminSetoranUiState())
    val uiState: StateFlow<AdminSetoranUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AdminSetoranEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var actionJob: Job? = null

    init {
        loadSetoran(isRefresh = false)
    }

    fun onEvent(event: AdminSetoranEvent) {
        when (event) {
            AdminSetoranEvent.Load -> loadSetoran(isRefresh = false)
            AdminSetoranEvent.Refresh -> loadSetoran(isRefresh = true)
            is AdminSetoranEvent.RequestAction -> {
                _uiState.update { it.copy(pendingConfirm = PendingSetoranAction(event.item, event.action)) }
            }
            AdminSetoranEvent.DismissConfirm -> _uiState.update { it.copy(pendingConfirm = null) }
            AdminSetoranEvent.ConfirmAction -> confirmAction()
            AdminSetoranEvent.LoadMoreHistory -> {
                _uiState.update { it.copy(historyLimit = it.historyLimit + 20) }
            }
        }
    }

    private fun loadSetoran(isRefresh: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.items.isEmpty(),
                    isRefreshing = isRefresh || it.items.isNotEmpty(),
                    errorMessage = null,
                )
            }
            try {
                when (val res = repository.getSetoranKasir()) {
                    is ApiResult.Success -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                items = res.data,
                                errorMessage = null,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = if (it.items.isEmpty()) res.message else null,
                            )
                        }
                        if (_uiState.value.items.isNotEmpty()) {
                            _effects.send(AdminSetoranEffect.ShowMessage(res.message, isError = true))
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isLoading = false, isRefreshing = false) }
            }
        }
    }

    private fun confirmAction() {
        val pending = _uiState.value.pendingConfirm ?: return
        if (actionJob?.isActive == true) return
        val id = pending.item.resolvedId
        actionJob = viewModelScope.launch {
            _uiState.update { it.copy(processingId = id, pendingConfirm = null) }
            try {
                when (val res = repository.approveSetoranKasir(id, pending.action)) {
                    is ApiResult.Success -> {
                        _effects.send(AdminSetoranEffect.ShowMessage(res.data))
                        loadSetoran(isRefresh = true)
                    }
                    is ApiResult.Error -> {
                        _effects.send(AdminSetoranEffect.ShowMessage(res.message, isError = true))
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(processingId = null) }
            }
        }
    }

    companion object {
        fun factory(repository: AdminRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return AdminSetoranViewModel(repository) as T
                }
            }
    }
}
