package id.koperasipk.app.feature.kasir.ui.tariktunai

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.kasir.data.AnggotaKasirDto
import id.koperasipk.app.feature.kasir.data.KasirRepository
import id.koperasipk.app.feature.kasir.data.TarikTunaiRequest
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

class TarikTunaiViewModel(
    private val repository: KasirRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(TarikTunaiUiState())
    val uiState: StateFlow<TarikTunaiUiState> = _uiState.asStateFlow()

    private val _effects = Channel<TarikTunaiEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var queueJob: Job? = null
    private var eligibilityJob: Job? = null
    private var submitJob: Job? = null

    init {
        loadAll(isRefresh = false)
    }

    fun onEvent(event: TarikTunaiEvent) {
        when (event) {
            TarikTunaiEvent.Load -> loadAll(isRefresh = false)
            TarikTunaiEvent.Refresh -> loadAll(isRefresh = true)
            is TarikTunaiEvent.TabSelected -> _uiState.update { it.copy(activeTab = event.tab) }
            is TarikTunaiEvent.ApproveQueueItem -> processQueue(event.tarikId, "approve", null)
            is TarikTunaiEvent.OpenRejectQueueDialog -> _uiState.update {
                it.copy(rejectQueueTarget = event.item, rejectQueueReason = "")
            }
            is TarikTunaiEvent.RejectQueueReasonChanged -> _uiState.update {
                it.copy(rejectQueueReason = event.reason)
            }
            TarikTunaiEvent.DismissRejectQueueDialog -> _uiState.update {
                it.copy(rejectQueueTarget = null, rejectQueueReason = "")
            }
            TarikTunaiEvent.ConfirmRejectQueueItem -> {
                val target = _uiState.value.rejectQueueTarget ?: return
                val reason = _uiState.value.rejectQueueReason.trim().ifBlank { null }
                processQueue(target.tarikId, "reject", reason)
            }
            is TarikTunaiEvent.AnggotaSearchChanged -> _uiState.update {
                it.copy(anggotaSearchQuery = event.query)
            }
            is TarikTunaiEvent.SelectAnggota -> selectAnggota(event.anggota)
            TarikTunaiEvent.ClearSelectedAnggota -> {
                eligibilityJob?.cancel()
                _uiState.update {
                    it.copy(
                        selectedAnggota = null,
                        eligibility = null,
                        eligibilityError = null,
                        selectedTransaksiId = null,
                        nominalText = "",
                        persetujuanShu = false,
                        keterangan = "",
                    )
                }
            }
            is TarikTunaiEvent.SumberDanaSelected -> _uiState.update { it.copy(sumberDana = event.sumber) }
            is TarikTunaiEvent.TransaksiSelected -> _uiState.update {
                it.copy(selectedTransaksiId = event.transaksiId)
            }
            is TarikTunaiEvent.NominalChanged -> _uiState.update {
                it.copy(nominalText = event.digits.filter(Char::isDigit))
            }
            is TarikTunaiEvent.PersetujuanShuChanged -> _uiState.update {
                it.copy(persetujuanShu = event.checked)
            }
            is TarikTunaiEvent.KeteranganChanged -> _uiState.update {
                it.copy(keterangan = event.text)
            }
            TarikTunaiEvent.SubmitManualTarikTunai -> submitManual()
            TarikTunaiEvent.DismissReceipt -> _uiState.update { it.copy(receipt = null) }
        }
    }

    private fun loadAll(isRefresh: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.antreanList.isEmpty() && it.anggotaList.isEmpty() && it.riwayatList.isEmpty(),
                    isRefreshing = isRefresh,
                    errorMessage = null,
                )
            }
            try {
                val (antreanRes, anggotaRes, riwayatRes) = coroutineScope {
                    val q = async { repository.getAntreanTarikTunai() }
                    val a = async { repository.getAllAnggota() }
                    val r = async { repository.getRiwayatTarikTunaiKasir() }
                    Triple(q.await(), a.await(), r.await())
                }

                val firstError = listOf(antreanRes, anggotaRes, riwayatRes)
                    .filterIsInstance<ApiResult.Error>()
                    .firstOrNull()

                if (antreanRes is ApiResult.Error && anggotaRes is ApiResult.Error && riwayatRes is ApiResult.Error) {
                    if (_uiState.value.antreanList.isEmpty() && _uiState.value.riwayatList.isEmpty()) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = antreanRes.message,
                            )
                        }
                    } else {
                        _uiState.update { it.copy(isLoading = false, isRefreshing = false) }
                        _effects.send(TarikTunaiEffect.ShowMessage(antreanRes.message))
                    }
                    return@launch
                }

                _uiState.update { current ->
                    current.copy(
                        isLoading = false,
                        isRefreshing = false,
                        errorMessage = null,
                        antreanList = (antreanRes as? ApiResult.Success)?.data ?: current.antreanList,
                        anggotaList = (anggotaRes as? ApiResult.Success)?.data ?: current.anggotaList,
                        riwayatList = (riwayatRes as? ApiResult.Success)?.data ?: current.riwayatList,
                    )
                }
                if (firstError != null && isRefresh) {
                    _effects.send(TarikTunaiEffect.ShowMessage(firstError.message))
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    private fun selectAnggota(anggota: AnggotaKasirDto) {
        _uiState.update {
            it.copy(
                selectedAnggota = anggota,
                nominalText = "",
                persetujuanShu = false,
                selectedTransaksiId = null,
                eligibility = null,
                eligibilityError = null,
                isLoadingEligibility = true,
            )
        }
        eligibilityJob?.cancel()
        eligibilityJob = viewModelScope.launch {
            when (val res = repository.cekKelayakanTarikTunai(anggota.anggotaId)) {
                is ApiResult.Success -> {
                    val data = res.data
                    _uiState.update { state ->
                        if (state.selectedAnggota?.anggotaId == anggota.anggotaId) {
                            state.copy(
                                isLoadingEligibility = false,
                                eligibility = data,
                                eligibilityError = null,
                                selectedTransaksiId = data.transaksiValidHariIni.firstOrNull()?.transaksiId,
                            )
                        } else {
                            state.copy(isLoadingEligibility = false)
                        }
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoadingEligibility = false,
                            eligibilityError = res.message,
                        )
                    }
                    _effects.send(TarikTunaiEffect.ShowMessage(res.message))
                }
            }
        }
    }

    private fun processQueue(tarikId: Int, action: String, reason: String?) {
        if (queueJob?.isActive == true) return
        queueJob = viewModelScope.launch {
            _uiState.update { it.copy(processingQueueId = tarikId, rejectQueueTarget = null, rejectQueueReason = "") }
            when (val res = repository.prosesTarikTunai(tarikId, action, reason)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            processingQueueId = null,
                            receipt = if (action == "approve") res.data.receipt else it.receipt,
                        )
                    }
                    _effects.send(TarikTunaiEffect.ShowMessage(res.data.message))
                    loadAll(isRefresh = true)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(processingQueueId = null) }
                    _effects.send(TarikTunaiEffect.ShowMessage(res.message))
                }
            }
        }
    }

    private fun submitManual() {
        if (submitJob?.isActive == true) return
        val s = _uiState.value
        val anggota = s.selectedAnggota
        if (anggota == null) {
            emitMessage("Pilih anggota terlebih dahulu")
            return
        }
        val nominal = s.nominalText.toDoubleOrNull() ?: 0.0
        if (nominal < 1000.0) {
            emitMessage("Masukkan nominal penarikan minimal Rp 1.000")
            return
        }
        if (!s.persetujuanShu) {
            emitMessage("Harap centang persetujuan pemotongan SHU Hari Besar")
            return
        }

        submitJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmittingManual = true) }
            val request = TarikTunaiRequest(
                anggotaId = anggota.anggotaId,
                nominal = nominal,
                sumberDana = s.sumberDana.apiValue,
                persetujuanShu = s.persetujuanShu,
                transaksiId = s.selectedTransaksiId,
                keterangan = s.keterangan.trim().takeIf { it.isNotBlank() },
            )
            when (val res = repository.tarikTunai(request)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmittingManual = false,
                            nominalText = "",
                            persetujuanShu = false,
                            keterangan = "",
                            selectedAnggota = null,
                            eligibility = null,
                            selectedTransaksiId = null,
                            receipt = res.data.receipt,
                        )
                    }
                    _effects.send(TarikTunaiEffect.ShowMessage(res.data.message))
                    loadAll(isRefresh = true)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isSubmittingManual = false) }
                    _effects.send(TarikTunaiEffect.ShowMessage(res.message))
                }
            }
        }
    }

    private fun emitMessage(message: String) {
        viewModelScope.launch {
            _effects.send(TarikTunaiEffect.ShowMessage(message))
        }
    }

    companion object {
        fun factory(repository: KasirRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return TarikTunaiViewModel(repository) as T
                }
            }
    }
}
