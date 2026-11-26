package id.koperasipk.app.feature.anggota

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
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
    private val repository: AnggotaRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(TarikTunaiUiState())
    val uiState: StateFlow<TarikTunaiUiState> = _uiState.asStateFlow()

    private val _effects = Channel<TarikTunaiEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var consentJob: Job? = null
    private var submitJob: Job? = null

    init {
        load(isInitial = true)
    }

    fun onEvent(event: TarikTunaiEvent) {
        when (event) {
            TarikTunaiEvent.Refresh -> load(isInitial = false)
            is TarikTunaiEvent.SumberDanaSelected -> _uiState.update {
                it.copy(sumberDana = event.sumber, formError = null)
            }
            is TarikTunaiEvent.NominalChanged -> _uiState.update {
                it.copy(nominalInput = event.value.filter(Char::isDigit), formError = null)
            }
            is TarikTunaiEvent.QuickAmountSelected -> _uiState.update {
                it.copy(nominalInput = event.amount.coerceAtLeast(0L).toString(), formError = null)
            }
            is TarikTunaiEvent.KeteranganChanged -> _uiState.update {
                it.copy(keteranganInput = event.value, formError = null)
            }
            is TarikTunaiEvent.PersetujuanChanged -> _uiState.update {
                it.copy(persetujuanShuChecked = event.checked, formError = null)
            }
            TarikTunaiEvent.AgreeMasterConsent -> agreeMasterConsent()
            TarikTunaiEvent.SubmitTarikTunai -> submitTarikTunai()
        }
    }

    private fun load(isInitial: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    isLoading = isInitial && state.eligibility == null,
                    isRefreshing = !isInitial || state.eligibility != null,
                    errorMessage = if (state.eligibility == null) null else state.errorMessage,
                )
            }
            try {
                val (eligibilityRes, historyRes) = coroutineScope {
                    val e = async { repository.cekKelayakanTarikTunai() }
                    val h = async { repository.getRiwayatTarikTunai() }
                    e.await() to h.await()
                }

                when (eligibilityRes) {
                    is ApiResult.Success -> {
                        val historyList = when (historyRes) {
                            is ApiResult.Success -> historyRes.data
                            is ApiResult.Error -> _uiState.value.history
                        }
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = null,
                                eligibility = eligibilityRes.data,
                                history = historyList,
                            )
                        }
                        if (historyRes is ApiResult.Error) {
                            _effects.send(TarikTunaiEffect.ShowMessage(historyRes.message))
                        }
                    }
                    is ApiResult.Error -> {
                        val hasData = _uiState.value.eligibility != null
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = if (hasData) null else eligibilityRes.message,
                            )
                        }
                        if (hasData) {
                            _effects.send(TarikTunaiEffect.ShowMessage(eligibilityRes.message))
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    private fun agreeMasterConsent() {
        if (consentJob?.isActive == true) return
        consentJob = viewModelScope.launch {
            _uiState.update { it.copy(isConsentSubmitting = true, formError = null) }
            try {
                when (val result = repository.setujuiMasterConsentShu()) {
                    is ApiResult.Success -> {
                        val msg = result.data.message.ifBlank {
                            "Pakta Integritas SHU (Master Consent) berhasil disetujui!"
                        }
                        _uiState.update {
                            it.copy(
                                isConsentSubmitting = false,
                                persetujuanShuChecked = true,
                            )
                        }
                        _effects.send(TarikTunaiEffect.ShowMessage(msg))
                        load(isInitial = false)
                    }
                    is ApiResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isConsentSubmitting = false,
                                formError = result.message,
                            )
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    private fun submitTarikTunai() {
        if (submitJob?.isActive == true) return
        val state = _uiState.value
        val eligibility = state.eligibility
        if (eligibility == null) {
            _uiState.update { it.copy(formError = "Data kelayakan belum tersedia") }
            return
        }
        val nominal = state.nominalInput.toDoubleOrNull()
        if (nominal == null || nominal < 1000.0) {
            _uiState.update { it.copy(formError = "Masukkan nominal penarikan minimal Rp 1.000") }
            return
        }
        if (!eligibility.hasMasterConsent && !state.persetujuanShuChecked) {
            _uiState.update {
                it.copy(formError = "Harap setujui pernyataan sadar pemotongan SHU Hari Besar (Master Consent).")
            }
            return
        }

        val request = AjukanTarikTunaiRequest(
            nominal = nominal,
            sumberDana = state.sumberDana.apiValue,
            persetujuanShu = eligibility.hasMasterConsent || state.persetujuanShuChecked,
            transaksiId = eligibility.transaksiValidHariIni.firstOrNull()?.transaksiId,
            keterangan = state.keteranganInput.trim().takeIf { it.isNotEmpty() },
        )

        submitJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, formError = null) }
            try {
                when (val result = repository.ajukanTarikTunai(request)) {
                    is ApiResult.Success -> {
                        val msg = result.data.message.ifBlank { "Tiket penarikan berhasil dibuat!" }
                        _uiState.update {
                            it.copy(
                                isSubmitting = false,
                                nominalInput = "",
                                keteranganInput = "",
                                persetujuanShuChecked = false,
                                formError = null,
                            )
                        }
                        _effects.send(TarikTunaiEffect.ShowMessage(msg))
                        load(isInitial = false)
                    }
                    is ApiResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isSubmitting = false,
                                formError = result.message,
                            )
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    companion object {
        fun factory(repository: AnggotaRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return TarikTunaiViewModel(repository) as T
                }
            }
    }
}
