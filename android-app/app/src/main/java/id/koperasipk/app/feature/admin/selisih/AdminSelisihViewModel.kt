package id.koperasipk.app.feature.admin.selisih

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.RekapSelisihKasirDto
import id.koperasipk.app.feature.admin.data.RiwayatSelisihShiftDto
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class SelisihTab {
    REKAP,
    RIWAYAT,
}

@Immutable
data class AdminSelisihUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val activeTab: SelisihTab = SelisihTab.REKAP,
    val rekapList: List<RekapSelisihKasirDto> = emptyList(),
    val riwayatList: List<RiwayatSelisihShiftDto> = emptyList(),
    val searchQuery: String = "",
    val currentPage: Int = 1,
    val selectedShiftDetail: RiwayatSelisihShiftDto? = null,
    val errorMessage: String? = null,
) {
    val totalKerugianAkumulasi: Double get() = rekapList.sumOf { it.totalAkumulasiKerugian }
    val totalMinusBarang: Double get() = rekapList.sumOf { it.totalMinusBarangNominal }
    val totalMinusKas: Double get() = rekapList.sumOf { it.totalMinusKasNominal }
    val totalShiftBermasalah: Int get() = rekapList.sumOf { it.totalShiftAdaSelisih }

    val filteredRekap: List<RekapSelisihKasirDto>
        get() {
            val q = searchQuery.trim().lowercase()
            if (q.isEmpty()) return rekapList
            return rekapList.filter { it.kasirName.lowercase().contains(q) }
        }

    val filteredRiwayat: List<RiwayatSelisihShiftDto>
        get() {
            val q = searchQuery.trim().lowercase()
            if (q.isEmpty()) return riwayatList
            return riwayatList.filter {
                it.kasirFromName.lowercase().contains(q) ||
                    it.kasirToName.lowercase().contains(q) ||
                    it.serahId.toString().contains(q)
            }
        }

    val activeTotalCount: Int
        get() = if (activeTab == SelisihTab.REKAP) filteredRekap.size else filteredRiwayat.size

    val totalPages: Int
        get() = ((activeTotalCount + PAGE_SIZE - 1) / PAGE_SIZE).coerceAtLeast(1)

    val pagedRekap: List<RekapSelisihKasirDto>
        get() {
            val safe = currentPage.coerceIn(1, totalPages)
            val from = (safe - 1) * PAGE_SIZE
            val to = minOf(from + PAGE_SIZE, filteredRekap.size)
            return if (from < to) filteredRekap.subList(from, to) else emptyList()
        }

    val pagedRiwayat: List<RiwayatSelisihShiftDto>
        get() {
            val safe = currentPage.coerceIn(1, totalPages)
            val from = (safe - 1) * PAGE_SIZE
            val to = minOf(from + PAGE_SIZE, filteredRiwayat.size)
            return if (from < to) filteredRiwayat.subList(from, to) else emptyList()
        }

    companion object {
        const val PAGE_SIZE = 15
    }
}

sealed interface AdminSelisihEvent {
    data object Load : AdminSelisihEvent
    data object Refresh : AdminSelisihEvent
    data class TabChanged(val tab: SelisihTab) : AdminSelisihEvent
    data class SearchChanged(val query: String) : AdminSelisihEvent
    data class PageChanged(val page: Int) : AdminSelisihEvent
    data class OpenShiftDetail(val shift: RiwayatSelisihShiftDto) : AdminSelisihEvent
    data object DismissShiftDetail : AdminSelisihEvent
}

sealed interface AdminSelisihEffect {
    data class ShowMessage(val message: String, val isError: Boolean = false) : AdminSelisihEffect
}

class AdminSelisihViewModel(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminSelisihUiState())
    val uiState: StateFlow<AdminSelisihUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AdminSelisihEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null

    init {
        loadData(isRefresh = false)
    }

    fun onEvent(event: AdminSelisihEvent) {
        when (event) {
            AdminSelisihEvent.Load -> loadData(isRefresh = false)
            AdminSelisihEvent.Refresh -> loadData(isRefresh = true)
            is AdminSelisihEvent.TabChanged -> _uiState.update { it.copy(activeTab = event.tab, currentPage = 1) }
            is AdminSelisihEvent.SearchChanged -> _uiState.update { it.copy(searchQuery = event.query, currentPage = 1) }
            is AdminSelisihEvent.PageChanged -> _uiState.update { it.copy(currentPage = event.page.coerceIn(1, it.totalPages)) }
            is AdminSelisihEvent.OpenShiftDetail -> _uiState.update { it.copy(selectedShiftDetail = event.shift) }
            AdminSelisihEvent.DismissShiftDetail -> _uiState.update { it.copy(selectedShiftDetail = null) }
        }
    }

    private fun loadData(isRefresh: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.rekapList.isEmpty() && it.riwayatList.isEmpty(),
                    isRefreshing = isRefresh || it.rekapList.isNotEmpty() || it.riwayatList.isNotEmpty(),
                    errorMessage = null,
                )
            }
            try {
                when (val res = repository.getLaporanSelisihKasir()) {
                    is ApiResult.Success -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                rekapList = res.data.rekapPerKasir,
                                riwayatList = res.data.riwayatSelisih,
                                errorMessage = null,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = if (it.rekapList.isEmpty() && it.riwayatList.isEmpty()) res.message else null,
                            )
                        }
                        if (_uiState.value.rekapList.isNotEmpty() || _uiState.value.riwayatList.isNotEmpty()) {
                            _effects.send(AdminSelisihEffect.ShowMessage(res.message, isError = true))
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
                    return AdminSelisihViewModel(repository) as T
                }
            }
    }
}
