package id.koperasipk.app.feature.admin.tariktunai

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.TarikTunaiReportItemDto
import id.koperasipk.app.feature.admin.data.TarikTunaiReportSummaryDto
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
data class AdminTarikTunaiUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val items: List<TarikTunaiReportItemDto> = emptyList(),
    val summary: TarikTunaiReportSummaryDto = TarikTunaiReportSummaryDto(),
    val searchQuery: String = "",
    val currentPage: Int = 1,
    val errorMessage: String? = null,
) {
    val filteredItems: List<TarikTunaiReportItemDto>
        get() {
            val q = searchQuery.trim().lowercase()
            if (q.isEmpty()) return items
            return items.filter {
                it.namaAnggota.lowercase().contains(q) ||
                    it.kasirName.lowercase().contains(q) ||
                    it.tarikId.toString().contains(q)
            }
        }

    val totalPages: Int
        get() = ((filteredItems.size + PAGE_SIZE - 1) / PAGE_SIZE).coerceAtLeast(1)

    val pagedItems: List<TarikTunaiReportItemDto>
        get() {
            val safe = currentPage.coerceIn(1, totalPages)
            val from = (safe - 1) * PAGE_SIZE
            val to = minOf(from + PAGE_SIZE, filteredItems.size)
            return if (from < to) filteredItems.subList(from, to) else emptyList()
        }

    companion object {
        const val PAGE_SIZE = 15
    }
}

sealed interface AdminTarikTunaiEvent {
    data object Load : AdminTarikTunaiEvent
    data object Refresh : AdminTarikTunaiEvent
    data class SearchChanged(val query: String) : AdminTarikTunaiEvent
    data class PageChanged(val page: Int) : AdminTarikTunaiEvent
}

sealed interface AdminTarikTunaiEffect {
    data class ShowMessage(val message: String, val isError: Boolean = false) : AdminTarikTunaiEffect
}

class AdminTarikTunaiViewModel(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminTarikTunaiUiState())
    val uiState: StateFlow<AdminTarikTunaiUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AdminTarikTunaiEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null

    init {
        loadData(isRefresh = false)
    }

    fun onEvent(event: AdminTarikTunaiEvent) {
        when (event) {
            AdminTarikTunaiEvent.Load -> loadData(isRefresh = false)
            AdminTarikTunaiEvent.Refresh -> loadData(isRefresh = true)
            is AdminTarikTunaiEvent.SearchChanged -> _uiState.update { it.copy(searchQuery = event.query, currentPage = 1) }
            is AdminTarikTunaiEvent.PageChanged -> _uiState.update { it.copy(currentPage = event.page.coerceIn(1, it.totalPages)) }
        }
    }

    private fun loadData(isRefresh: Boolean) {
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
                when (val res = repository.getLaporanTarikTunai()) {
                    is ApiResult.Success -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                items = res.data.data,
                                summary = res.data.summary ?: TarikTunaiReportSummaryDto(),
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
                            _effects.send(AdminTarikTunaiEffect.ShowMessage(res.message, isError = true))
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

    companion object {
        fun factory(repository: AdminRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return AdminTarikTunaiViewModel(repository) as T
                }
            }
    }
}
