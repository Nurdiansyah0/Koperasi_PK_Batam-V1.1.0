package id.koperasipk.app.feature.admin.dashboard

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.admin.data.AdminDashboardResponse
import id.koperasipk.app.feature.admin.data.AdminRepository
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
data class AdminDashboardUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isApplyingPkm: Boolean = false,
    val showConfirmAutoPkm: Boolean = false,
    val data: AdminDashboardResponse? = null,
    val errorMessage: String? = null,
)

sealed interface AdminDashboardEvent {
    data object Load : AdminDashboardEvent
    data object Refresh : AdminDashboardEvent
    data object RequestAutoPkm : AdminDashboardEvent
    data object DismissAutoPkm : AdminDashboardEvent
    data object ConfirmAutoPkm : AdminDashboardEvent
}

sealed interface AdminDashboardEffect {
    data class ShowMessage(val message: String, val isError: Boolean = false) : AdminDashboardEffect
}

class AdminDashboardViewModel(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminDashboardUiState())
    val uiState: StateFlow<AdminDashboardUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AdminDashboardEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var autoPkmJob: Job? = null

    init {
        loadDashboard(isRefresh = false)
    }

    fun onEvent(event: AdminDashboardEvent) {
        when (event) {
            AdminDashboardEvent.Load -> loadDashboard(isRefresh = false)
            AdminDashboardEvent.Refresh -> loadDashboard(isRefresh = true)
            AdminDashboardEvent.RequestAutoPkm -> {
                _uiState.update { it.copy(showConfirmAutoPkm = true) }
            }
            AdminDashboardEvent.DismissAutoPkm -> {
                _uiState.update { it.copy(showConfirmAutoPkm = false) }
            }
            AdminDashboardEvent.ConfirmAutoPkm -> executeAutoPkm()
        }
    }

    private fun loadDashboard(isRefresh: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update { state ->
                if (isRefresh && state.data != null) {
                    state.copy(isRefreshing = true, errorMessage = null)
                } else {
                    state.copy(isLoading = state.data == null, isRefreshing = state.data != null, errorMessage = null)
                }
            }
            try {
                when (val res = repository.getDashboardStats()) {
                    is ApiResult.Success -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                data = res.data,
                                errorMessage = null,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = if (it.data == null) res.message else null,
                            )
                        }
                        if (_uiState.value.data != null) {
                            _effects.send(AdminDashboardEffect.ShowMessage(res.message, isError = true))
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

    private fun executeAutoPkm() {
        if (autoPkmJob?.isActive == true) return
        autoPkmJob = viewModelScope.launch {
            _uiState.update { it.copy(isApplyingPkm = true, showConfirmAutoPkm = false) }
            try {
                when (val res = repository.autoCalculatePkm(days = 30, leadTimeDays = 4)) {
                    is ApiResult.Success -> {
                        _effects.send(AdminDashboardEffect.ShowMessage(res.data))
                        loadDashboard(isRefresh = true)
                    }
                    is ApiResult.Error -> {
                        _effects.send(AdminDashboardEffect.ShowMessage(res.message, isError = true))
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isApplyingPkm = false) }
            }
        }
    }

    companion object {
        fun factory(repository: AdminRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return AdminDashboardViewModel(repository) as T
                }
            }
    }
}
