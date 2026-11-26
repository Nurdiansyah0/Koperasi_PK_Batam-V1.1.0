package id.koperasipk.app.feature.kasir.ui.serahterima

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

class SerahTerimaViewModel(
    private val repository: KasirRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SerahTerimaUiState())
    val uiState: StateFlow<SerahTerimaUiState> = _uiState.asStateFlow()

    private val _effects = Channel<SerahTerimaEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var actionJob: Job? = null

    init {
        load(tab = SerahTerimaTab.PENDING, page = 1, isRefresh = false)
    }

    fun onEvent(event: SerahTerimaEvent) {
        when (event) {
            SerahTerimaEvent.Refresh -> {
                val s = _uiState.value
                load(tab = s.activeTab, page = s.currentPage, isRefresh = true)
            }
            is SerahTerimaEvent.TabSelected -> {
                _uiState.update { it.copy(activeTab = event.tab, currentPage = 1) }
                load(tab = event.tab, page = 1, isRefresh = false)
            }
            is SerahTerimaEvent.ChangePage -> {
                val s = _uiState.value
                val target = event.page.coerceIn(1, s.lastPage.coerceAtLeast(1))
                load(tab = s.activeTab, page = target, isRefresh = false)
            }
            is SerahTerimaEvent.SelectItem -> _uiState.update {
                it.copy(selectedItem = event.item, detailFilter = OpnameDetailFilter.ALL)
            }
            SerahTerimaEvent.DismissDetail -> _uiState.update {
                it.copy(selectedItem = null, showRejectDialog = false, alasanPenolakan = "", rejectError = null)
            }
            is SerahTerimaEvent.DetailFilterSelected -> _uiState.update {
                it.copy(detailFilter = event.filter)
            }
            is SerahTerimaEvent.Approve -> approve(event.serahId)
            SerahTerimaEvent.OpenRejectDialog -> _uiState.update {
                it.copy(showRejectDialog = true, alasanPenolakan = "", rejectError = null)
            }
            SerahTerimaEvent.DismissRejectDialog -> _uiState.update {
                it.copy(showRejectDialog = false, rejectError = null)
            }
            is SerahTerimaEvent.AlasanPenolakanChanged -> _uiState.update {
                it.copy(alasanPenolakan = event.value, rejectError = null)
            }
            SerahTerimaEvent.SubmitReject -> submitReject()
        }
    }

    private fun load(tab: SerahTerimaTab, page: Int, isRefresh: Boolean) {
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.items.isEmpty(),
                    isRefreshing = isRefresh,
                    errorMessage = null,
                )
            }
            try {
                val (listRes, shiftRes, kasirRes) = coroutineScope {
                    val l = async { repository.getSerahTerimaForMe(tab.apiType, page) }
                    val s = async { repository.getActiveShiftInfo() }
                    val k = async { repository.getDaftarKasir() }
                    Triple(l.await(), s.await(), k.await())
                }

                when (listRes) {
                    is ApiResult.Success -> {
                        val paginator = listRes.data
                        val shiftInfo = (shiftRes as? ApiResult.Success)?.data
                        val kasirs = (kasirRes as? ApiResult.Success)?.data ?: _uiState.value.daftarKasir
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = null,
                                items = paginator.data,
                                currentPage = paginator.currentPage,
                                lastPage = paginator.lastPage.coerceAtLeast(1),
                                activeShift = shiftInfo?.latestIncoming ?: it.activeShift,
                                hasPendingOutgoing = shiftInfo?.hasPendingOutgoing ?: it.hasPendingOutgoing,
                                daftarKasir = kasirs,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        if (_uiState.value.items.isEmpty()) {
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    isRefreshing = false,
                                    errorMessage = listRes.message,
                                )
                            }
                        } else {
                            _uiState.update { it.copy(isLoading = false, isRefreshing = false) }
                            _effects.send(SerahTerimaEffect.ShowMessage(listRes.message))
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    private fun approve(serahId: Int) {
        if (actionJob?.isActive == true) return
        actionJob = viewModelScope.launch {
            _uiState.update { it.copy(processingId = serahId) }
            when (val res = repository.approveSerahTerima(serahId)) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(processingId = null, selectedItem = null) }
                    _effects.send(SerahTerimaEffect.ShowMessage(res.data))
                    val s = _uiState.value
                    load(s.activeTab, s.currentPage, isRefresh = true)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(processingId = null) }
                    _effects.send(SerahTerimaEffect.ShowMessage(res.message))
                }
            }
        }
    }

    private fun submitReject() {
        if (actionJob?.isActive == true) return
        val selected = _uiState.value.selectedItem ?: return
        val alasan = _uiState.value.alasanPenolakan.trim()
        if (alasan.isEmpty()) {
            _uiState.update { it.copy(rejectError = "Alasan penolakan wajib diisi secara jelas") }
            return
        }
        val serahId = selected.resolvedId
        actionJob = viewModelScope.launch {
            _uiState.update { it.copy(processingId = serahId, rejectError = null) }
            when (val res = repository.rejectSerahTerima(serahId, alasan)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            processingId = null,
                            showRejectDialog = false,
                            alasanPenolakan = "",
                            selectedItem = null,
                        )
                    }
                    _effects.send(SerahTerimaEffect.ShowMessage(res.data))
                    val s = _uiState.value
                    load(s.activeTab, s.currentPage, isRefresh = true)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(processingId = null, rejectError = res.message) }
                    _effects.send(SerahTerimaEffect.ShowMessage(res.message))
                }
            }
        }
    }

    companion object {
        fun factory(repository: KasirRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return SerahTerimaViewModel(repository) as T
                }
            }
    }
}
