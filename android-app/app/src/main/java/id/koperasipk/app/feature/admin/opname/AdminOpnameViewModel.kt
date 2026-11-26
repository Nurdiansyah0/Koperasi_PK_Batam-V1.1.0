package id.koperasipk.app.feature.admin.opname

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.admin.data.AdminBarangDto
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.OpnameAdjustmentRequest
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
data class AdminOpnameUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSubmitting: Boolean = false,
    val showConfirmDialog: Boolean = false,
    val items: List<AdminBarangDto> = emptyList(),
    val lokasi: String = "toko",
    val searchQuery: String = "",
    val onlyChanged: Boolean = false,
    val physicalCounts: Map<Int, String> = emptyMap(),
    val currentPage: Int = 1,
    val errorMessage: String? = null,
) {
    fun systemStockFor(item: AdminBarangDto): Int =
        if (lokasi == "gudang") item.effectiveStokGudang else item.effectiveStokToko

    val pendingAdjustments: List<OpnameAdjustmentRequest>
        get() = items.mapNotNull { item ->
            val raw = physicalCounts[item.barangId]?.trim()
            if (raw.isNullOrEmpty()) return@mapNotNull null
            val fisik = raw.toIntOrNull() ?: return@mapNotNull null
            val sistem = systemStockFor(item)
            if (fisik == sistem) return@mapNotNull null
            OpnameAdjustmentRequest(
                barangId = item.barangId,
                stokAwal = sistem,
                stokAkhir = fisik,
                selisih = fisik - sistem,
                lokasi = lokasi,
                keterangan = "Penyesuaian Opname Massal ($lokasi)",
            )
        }

    val filteredItems: List<AdminBarangDto>
        get() {
            val q = searchQuery.trim().lowercase()
            return items.filter { item ->
                val matchSearch = q.isEmpty() || item.namaBarang.lowercase().contains(q)
                val matchChanged = !onlyChanged || !physicalCounts[item.barangId].isNullOrBlank()
                matchSearch && matchChanged
            }
        }

    val totalPages: Int
        get() = ((filteredItems.size + PAGE_SIZE - 1) / PAGE_SIZE).coerceAtLeast(1)

    val pagedItems: List<AdminBarangDto>
        get() {
            val safePage = currentPage.coerceIn(1, totalPages)
            val from = (safePage - 1) * PAGE_SIZE
            val to = minOf(from + PAGE_SIZE, filteredItems.size)
            return if (from < to) filteredItems.subList(from, to) else emptyList()
        }

    companion object {
        const val PAGE_SIZE = 15
    }
}

sealed interface AdminOpnameEvent {
    data object Load : AdminOpnameEvent
    data object Refresh : AdminOpnameEvent
    data class SearchChanged(val query: String) : AdminOpnameEvent
    data class LokasiChanged(val lokasi: String) : AdminOpnameEvent
    data class ToggleOnlyChanged(val onlyChanged: Boolean) : AdminOpnameEvent
    data class PhysicalCountChanged(val barangId: Int, val value: String) : AdminOpnameEvent
    data class PageChanged(val page: Int) : AdminOpnameEvent
    data object RequestSubmit : AdminOpnameEvent
    data object DismissConfirm : AdminOpnameEvent
    data object ConfirmSubmit : AdminOpnameEvent
}

sealed interface AdminOpnameEffect {
    data class ShowMessage(val message: String, val isError: Boolean = false) : AdminOpnameEffect
}

class AdminOpnameViewModel(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminOpnameUiState())
    val uiState: StateFlow<AdminOpnameUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AdminOpnameEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var submitJob: Job? = null

    init {
        loadBarang(isRefresh = false)
    }

    fun onEvent(event: AdminOpnameEvent) {
        when (event) {
            AdminOpnameEvent.Load -> loadBarang(isRefresh = false)
            AdminOpnameEvent.Refresh -> loadBarang(isRefresh = true)
            is AdminOpnameEvent.SearchChanged -> _uiState.update { it.copy(searchQuery = event.query, currentPage = 1) }
            is AdminOpnameEvent.LokasiChanged -> {
                _uiState.update { it.copy(lokasi = event.lokasi, physicalCounts = emptyMap(), currentPage = 1) }
            }
            is AdminOpnameEvent.ToggleOnlyChanged -> _uiState.update { it.copy(onlyChanged = event.onlyChanged, currentPage = 1) }
            is AdminOpnameEvent.PhysicalCountChanged -> {
                val clean = event.value.filter(Char::isDigit)
                _uiState.update { state ->
                    val next = state.physicalCounts.toMutableMap()
                    if (clean.isEmpty()) next.remove(event.barangId) else next[event.barangId] = clean
                    state.copy(physicalCounts = next)
                }
            }
            is AdminOpnameEvent.PageChanged -> {
                _uiState.update { it.copy(currentPage = event.page.coerceIn(1, it.totalPages)) }
            }
            AdminOpnameEvent.RequestSubmit -> {
                val count = _uiState.value.pendingAdjustments.size
                if (count == 0) {
                    viewModelScope.launch {
                        _effects.send(AdminOpnameEffect.ShowMessage("Tidak ada selisih stok yang perlu disesuaikan", isError = true))
                    }
                } else {
                    _uiState.update { it.copy(showConfirmDialog = true) }
                }
            }
            AdminOpnameEvent.DismissConfirm -> _uiState.update { it.copy(showConfirmDialog = false) }
            AdminOpnameEvent.ConfirmSubmit -> submitOpname()
        }
    }

    private fun loadBarang(isRefresh: Boolean) {
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
                when (val res = repository.getBarang()) {
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
                            _effects.send(AdminOpnameEffect.ShowMessage(res.message, isError = true))
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

    private fun submitOpname() {
        val adjustments = _uiState.value.pendingAdjustments
        if (adjustments.isEmpty() || submitJob?.isActive == true) return
        submitJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, showConfirmDialog = false) }
            try {
                when (val res = repository.submitOpnameMassal(adjustments)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(physicalCounts = emptyMap()) }
                        _effects.send(AdminOpnameEffect.ShowMessage(res.data))
                        loadBarang(isRefresh = true)
                    }
                    is ApiResult.Error -> {
                        _effects.send(AdminOpnameEffect.ShowMessage(res.message, isError = true))
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    companion object {
        fun factory(repository: AdminRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return AdminOpnameViewModel(repository) as T
                }
            }
    }
}
