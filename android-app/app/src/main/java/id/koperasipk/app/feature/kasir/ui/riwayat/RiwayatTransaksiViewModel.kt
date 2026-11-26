package id.koperasipk.app.feature.kasir.ui.riwayat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.feature.kasir.data.HistoryTransaksiRequest
import id.koperasipk.app.feature.kasir.data.KasirRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.Calendar

class RiwayatTransaksiViewModel(
    private val repository: KasirRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RiwayatTransaksiUiState())
    val uiState: StateFlow<RiwayatTransaksiUiState> = _uiState.asStateFlow()

    private val _effects = Channel<RiwayatTransaksiEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null

    init {
        load(page = 1, awal = "", akhir = "", isRefresh = false)
    }

    fun onEvent(event: RiwayatTransaksiEvent) {
        when (event) {
            RiwayatTransaksiEvent.Refresh -> {
                val s = _uiState.value
                load(page = s.currentPage, awal = s.tanggalAwal, akhir = s.tanggalAkhir, isRefresh = true)
            }
            is RiwayatTransaksiEvent.DatePresetSelected -> applyPreset(event.preset)
            is RiwayatTransaksiEvent.TanggalAwalChanged -> _uiState.update { it.copy(tanggalAwal = event.value) }
            is RiwayatTransaksiEvent.TanggalAkhirChanged -> _uiState.update { it.copy(tanggalAkhir = event.value) }
            RiwayatTransaksiEvent.ApplyCustomDate -> {
                val s = _uiState.value
                load(page = 1, awal = s.tanggalAwal, akhir = s.tanggalAkhir, isRefresh = false)
            }
            is RiwayatTransaksiEvent.PaymentFilterSelected -> _uiState.update {
                it.copy(paymentFilter = event.filter)
            }
            is RiwayatTransaksiEvent.SearchChanged -> _uiState.update {
                it.copy(searchQuery = event.query)
            }
            is RiwayatTransaksiEvent.ToggleExpand -> _uiState.update { state ->
                val next = state.expandedIds.toMutableSet()
                if (!next.add(event.transaksiId)) next.remove(event.transaksiId)
                state.copy(expandedIds = next)
            }
            is RiwayatTransaksiEvent.SelectReceipt -> _uiState.update {
                it.copy(selectedReceipt = event.trx)
            }
            is RiwayatTransaksiEvent.ChangePage -> {
                val s = _uiState.value
                val target = event.page.coerceIn(1, s.lastPage.coerceAtLeast(1))
                load(page = target, awal = s.tanggalAwal, akhir = s.tanggalAkhir, isRefresh = false)
            }
        }
    }

    private fun applyPreset(preset: DateFilterPreset) {
        if (preset == DateFilterPreset.KUSTOM) {
            _uiState.update {
                it.copy(
                    datePreset = preset,
                    showCustomDateRow = true,
                )
            }
            return
        }

        val todayStr = DateFormatter.todayApiDate()
        val cal = Calendar.getInstance()
        val (awal, akhir) = when (preset) {
            DateFilterPreset.SEMUA -> "" to ""
            DateFilterPreset.HARI_INI -> todayStr to todayStr
            DateFilterPreset.KEMARIN -> {
                cal.add(Calendar.DAY_OF_YEAR, -1)
                val y = DateFormatter.formatApiDate(cal.timeInMillis)
                y to y
            }
            DateFilterPreset.TUJUH_HARI -> {
                cal.add(Calendar.DAY_OF_YEAR, -7)
                DateFormatter.formatApiDate(cal.timeInMillis) to todayStr
            }
            DateFilterPreset.BULAN_INI -> {
                cal.set(Calendar.DAY_OF_MONTH, 1)
                DateFormatter.formatApiDate(cal.timeInMillis) to todayStr
            }
            DateFilterPreset.KUSTOM -> "" to ""
        }

        _uiState.update {
            it.copy(
                datePreset = preset,
                tanggalAwal = awal,
                tanggalAkhir = akhir,
                showCustomDateRow = false,
            )
        }
        load(page = 1, awal = awal, akhir = akhir, isRefresh = false)
    }

    private fun load(page: Int, awal: String, akhir: String, isRefresh: Boolean) {
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.items.isEmpty(),
                    isRefreshing = isRefresh,
                    errorMessage = null,
                )
            }
            val req = HistoryTransaksiRequest(
                tanggalAwal = awal.takeIf { it.isNotBlank() },
                tanggalAkhir = akhir.takeIf { it.isNotBlank() },
                page = page,
            )
            when (val res = repository.getHistoryTransaksi(req)) {
                is ApiResult.Success -> {
                    val paginator = res.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            errorMessage = null,
                            items = paginator.data,
                            currentPage = paginator.currentPage,
                            lastPage = paginator.lastPage.coerceAtLeast(1),
                            totalCount = paginator.total,
                            expandedIds = emptySet(),
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
                        _effects.send(RiwayatTransaksiEffect.ShowMessage(res.message))
                    }
                }
            }
        }
    }

    companion object {
        fun factory(repository: KasirRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return RiwayatTransaksiViewModel(repository) as T
                }
            }
    }
}
