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

class BayarHutangViewModel(
    private val repository: AnggotaRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BayarHutangUiState())
    val uiState: StateFlow<BayarHutangUiState> = _uiState.asStateFlow()

    private val _effects = Channel<BayarHutangEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var submitJob: Job? = null

    init {
        load(isInitial = true)
    }

    fun onEvent(event: BayarHutangEvent) {
        when (event) {
            BayarHutangEvent.Refresh -> load(isInitial = false)
            is BayarHutangEvent.NominalChanged -> _uiState.update {
                it.copy(nominalInput = event.value.filter(Char::isDigit), submitError = null, submitSuccess = null)
            }
            is BayarHutangEvent.PresetSelected -> _uiState.update {
                it.copy(nominalInput = event.amount.coerceAtLeast(0L).toString(), submitError = null, submitSuccess = null)
            }
            BayarHutangEvent.SubmitPayment -> submitPayment()
        }
    }

    private fun load(isInitial: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    isLoading = isInitial && state.profil == null,
                    isRefreshing = !isInitial || state.profil != null,
                    errorMessage = if (state.profil == null) null else state.errorMessage,
                )
            }
            try {
                val (profilRes, historyRes) = coroutineScope {
                    val p = async { repository.getProfil() }
                    val h = async { repository.getHistoriBayarHutang() }
                    p.await() to h.await()
                }

                when (profilRes) {
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
                                profil = profilRes.data,
                                history = historyList,
                            )
                        }
                        if (historyRes is ApiResult.Error) {
                            _effects.send(BayarHutangEffect.ShowMessage(historyRes.message))
                        }
                    }
                    is ApiResult.Error -> {
                        val hasData = _uiState.value.profil != null
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = if (hasData) null else profilRes.message,
                            )
                        }
                        if (hasData) {
                            _effects.send(BayarHutangEffect.ShowMessage(profilRes.message))
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    private fun submitPayment() {
        if (submitJob?.isActive == true) return
        val amount = _uiState.value.nominalInput.toDoubleOrNull()
        if (amount == null || amount <= 0.0) {
            _uiState.update { it.copy(submitError = "Nominal pembayaran harus lebih dari Rp 0", submitSuccess = null) }
            return
        }

        submitJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, submitError = null, submitSuccess = null) }
            try {
                when (val result = repository.bayarHutang(amount)) {
                    is ApiResult.Success -> {
                        val msg = result.data.message.ifBlank {
                            "Pengajuan pembayaran hutang berhasil dibuat, silakan serahkan uang ke kasir."
                        }
                        _uiState.update {
                            it.copy(
                                isSubmitting = false,
                                nominalInput = "",
                                submitError = null,
                                submitSuccess = msg,
                            )
                        }
                        _effects.send(BayarHutangEffect.ShowMessage(msg))
                        load(isInitial = false)
                    }
                    is ApiResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isSubmitting = false,
                                submitError = result.message,
                                submitSuccess = null,
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
                    return BayarHutangViewModel(repository) as T
                }
            }
    }
}
