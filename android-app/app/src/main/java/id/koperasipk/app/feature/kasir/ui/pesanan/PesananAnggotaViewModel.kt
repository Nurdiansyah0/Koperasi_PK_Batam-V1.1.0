package id.koperasipk.app.feature.kasir.ui.pesanan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.kasir.data.KasirRepository
import id.koperasipk.app.feature.kasir.data.PesananAnggotaDto
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class PesananAnggotaViewModel(
    private val repository: KasirRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PesananAnggotaUiState())
    val uiState: StateFlow<PesananAnggotaUiState> = _uiState.asStateFlow()

    private val _effects = Channel<PesananAnggotaEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var actionJob: Job? = null

    init {
        load(isRefresh = false, silent = false)
    }

    fun onEvent(event: PesananAnggotaEvent) {
        when (event) {
            PesananAnggotaEvent.Load -> load(isRefresh = false, silent = false)
            PesananAnggotaEvent.Refresh -> load(isRefresh = true, silent = false)
            PesananAnggotaEvent.SilentRefresh -> load(isRefresh = false, silent = true)
            is PesananAnggotaEvent.FilterSelected -> _uiState.update { it.copy(filter = event.filter) }
            is PesananAnggotaEvent.SelectGroup -> _uiState.update {
                it.copy(selectedAnggotaId = event.anggotaId, selectedOrderIds = emptySet())
            }
            is PesananAnggotaEvent.ToggleOrderSelection -> _uiState.update { state ->
                val next = state.selectedOrderIds.toMutableSet()
                if (!next.add(event.transaksiId)) next.remove(event.transaksiId)
                state.copy(selectedOrderIds = next)
            }
            is PesananAnggotaEvent.ApproveOrders -> approveOrders(event.transaksiIds)
            is PesananAnggotaEvent.OpenRejectDialog -> {
                if (event.transaksiIds.isNotEmpty()) {
                    _uiState.update {
                        it.copy(rejectDialogTarget = PendingRejectTarget(transaksiIds = event.transaksiIds))
                    }
                }
            }
            is PesananAnggotaEvent.RejectReasonChanged -> _uiState.update { state ->
                val current = state.rejectDialogTarget ?: return@update state
                state.copy(rejectDialogTarget = current.copy(alasan = event.reason))
            }
            PesananAnggotaEvent.DismissRejectDialog -> _uiState.update {
                it.copy(rejectDialogTarget = null)
            }
            PesananAnggotaEvent.ConfirmRejectOrders -> confirmReject()
        }
    }

    private fun load(isRefresh: Boolean, silent: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            if (!silent) {
                _uiState.update {
                    it.copy(
                        isLoading = !isRefresh && it.groups.isEmpty(),
                        isRefreshing = isRefresh,
                        errorMessage = null,
                    )
                }
            }
            when (val res = repository.getPesananAnggota()) {
                is ApiResult.Success -> {
                    val grouped = groupOrders(res.data)
                    _uiState.update { state ->
                        val selectedStillExists = state.selectedAnggotaId?.let { selId ->
                            grouped.any { it.anggotaId == selId }
                        } == true
                        state.copy(
                            isLoading = false,
                            isRefreshing = false,
                            errorMessage = null,
                            groups = grouped,
                            selectedAnggotaId = if (selectedStillExists) state.selectedAnggotaId else null,
                            selectedOrderIds = if (silent) state.selectedOrderIds else emptySet(),
                        )
                    }
                }
                is ApiResult.Error -> {
                    if (!silent) {
                        if (_uiState.value.groups.isEmpty()) {
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    isRefreshing = false,
                                    errorMessage = res.message,
                                )
                            }
                        } else {
                            _uiState.update { it.copy(isLoading = false, isRefreshing = false) }
                            _effects.send(PesananAnggotaEffect.ShowMessage(res.message))
                        }
                    }
                }
            }
        }
    }

    private fun approveOrders(ids: List<Int>) {
        if (ids.isEmpty() || actionJob?.isActive == true) return
        actionJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmittingAction = true) }
            when (val res = repository.simpanTransaksiKasir(ids)) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(isSubmittingAction = false, selectedOrderIds = emptySet()) }
                    _effects.send(PesananAnggotaEffect.ShowMessage(res.data))
                    _effects.send(PesananAnggotaEffect.OrdersMutated)
                    load(isRefresh = true, silent = false)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isSubmittingAction = false) }
                    _effects.send(PesananAnggotaEffect.ShowMessage(res.message))
                }
            }
        }
    }

    private fun confirmReject() {
        val target = _uiState.value.rejectDialogTarget ?: return
        if (target.transaksiIds.isEmpty() || actionJob?.isActive == true) return
        actionJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmittingAction = true) }
            when (val res = repository.tolakPesananAnggota(target.transaksiIds, target.alasan)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmittingAction = false,
                            rejectDialogTarget = null,
                            selectedOrderIds = emptySet(),
                        )
                    }
                    _effects.send(PesananAnggotaEffect.ShowMessage(res.data))
                    _effects.send(PesananAnggotaEffect.OrdersMutated)
                    load(isRefresh = true, silent = false)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isSubmittingAction = false) }
                    _effects.send(PesananAnggotaEffect.ShowMessage(res.message))
                }
            }
        }
    }

    private fun groupOrders(orders: List<PesananAnggotaDto>): List<PesananGroupUi> {
        val map = linkedMapOf<Int, MutableList<PesananAnggotaDto>>()
        for (order in orders) {
            val key = order.anggotaId ?: -1
            map.getOrPut(key) { mutableListOf() }.add(order)
        }
        return map.map { (anggotaId, list) ->
            PesananGroupUi(
                anggotaId = anggotaId,
                namaAnggota = list.firstOrNull()?.namaAnggota?.ifBlank { "Pembeli Umum" } ?: "Pembeli Umum",
                totalHarga = list.sumOf { it.totalHarga },
                orders = list,
            )
        }
    }

    companion object {
        fun factory(repository: KasirRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return PesananAnggotaViewModel(repository) as T
                }
            }
    }
}
