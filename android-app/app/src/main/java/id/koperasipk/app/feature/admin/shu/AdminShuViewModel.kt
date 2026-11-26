package id.koperasipk.app.feature.admin.shu

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.admin.data.AdminAnggotaDto
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.KonversiShuDto
import id.koperasipk.app.feature.admin.data.ProsesKonversiShuRequest
import id.koperasipk.app.feature.admin.data.ShuAnggotaDto
import id.koperasipk.app.feature.admin.data.ShuDistribusiItemDto
import id.koperasipk.app.feature.admin.data.ShuDistribusiSummaryDto
import id.koperasipk.app.feature.admin.data.ShuManagementSummaryDto
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

enum class ShuTab {
    MASSAL,
    KOMPENSASI,
    INDIVIDUAL,
    CONSENT,
    RIWAYAT,
    DISTRIBUSI,
}

@Immutable
data class TopupShuFormState(
    val selectedUsername: String = "",
    val nominalDigits: String = "",
    val memberQuery: String = "",
)

@Immutable
data class AdminShuUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSubmitting: Boolean = false,
    val activeTab: ShuTab = ShuTab.MASSAL,
    val summary: ShuManagementSummaryDto = ShuManagementSummaryDto(),
    val anggotaList: List<ShuAnggotaDto> = emptyList(),
    val riwayatKonversi: List<KonversiShuDto> = emptyList(),
    val distribusiItems: List<ShuDistribusiItemDto> = emptyList(),
    val distribusiSummary: ShuDistribusiSummaryDto? = null,
    val distribusiTahunFilter: String = "",
    val userDirectory: List<AdminAnggotaDto> = emptyList(),
    val massPercentage: Int = 100,
    val showConfirmMassal: Boolean = false,
    val pendingDebtOffset: ShuAnggotaDto? = null,
    val selectedIndividualAnggotaId: Int? = null,
    val individualNominalDigits: String = "",
    val searchAnggota: String = "",
    val consentPage: Int = 1,
    val distribusiPage: Int = 1,
    val topupForm: TopupShuFormState? = null,
    val errorMessage: String? = null,
) {
    val indebtedMembers: List<ShuAnggotaDto>
        get() = anggotaList.filter { it.hutang > 0.0 && it.shu > 0.0 }

    val filteredConsentMembers: List<ShuAnggotaDto>
        get() {
            val q = searchAnggota.trim().lowercase()
            if (q.isEmpty()) return anggotaList
            return anggotaList.filter {
                it.namaLengkap.lowercase().contains(q) || it.anggotaId.toString().contains(q)
            }
        }

    val totalConsentPages: Int
        get() = ((filteredConsentMembers.size + PAGE_SIZE - 1) / PAGE_SIZE).coerceAtLeast(1)

    val pagedConsentMembers: List<ShuAnggotaDto>
        get() {
            val safe = consentPage.coerceIn(1, totalConsentPages)
            val from = (safe - 1) * PAGE_SIZE
            val to = minOf(from + PAGE_SIZE, filteredConsentMembers.size)
            return if (from < to) filteredConsentMembers.subList(from, to) else emptyList()
        }

    val totalDistribusiPages: Int
        get() = ((distribusiItems.size + PAGE_SIZE - 1) / PAGE_SIZE).coerceAtLeast(1)

    val pagedDistribusiItems: List<ShuDistribusiItemDto>
        get() {
            val safe = distribusiPage.coerceIn(1, totalDistribusiPages)
            val from = (safe - 1) * PAGE_SIZE
            val to = minOf(from + PAGE_SIZE, distribusiItems.size)
            return if (from < to) distribusiItems.subList(from, to) else emptyList()
        }

    companion object {
        const val PAGE_SIZE = 15
    }
}

sealed interface AdminShuEvent {
    data object Load : AdminShuEvent
    data object Refresh : AdminShuEvent
    data class TabChanged(val tab: ShuTab) : AdminShuEvent
    data class MassPercentageChanged(val pct: Int) : AdminShuEvent
    data object RequestMassalConfirm : AdminShuEvent
    data object DismissMassalConfirm : AdminShuEvent
    data object ConfirmMassal : AdminShuEvent

    data class RequestDebtOffset(val item: ShuAnggotaDto) : AdminShuEvent
    data object DismissDebtOffset : AdminShuEvent
    data object ConfirmDebtOffset : AdminShuEvent

    data class IndividualMemberSelected(val anggotaId: Int) : AdminShuEvent
    data class IndividualNominalChanged(val digits: String) : AdminShuEvent
    data object SubmitIndividual : AdminShuEvent

    data class SearchChanged(val query: String) : AdminShuEvent
    data class ConsentPageChanged(val page: Int) : AdminShuEvent

    data class DistribusiTahunChanged(val tahun: String) : AdminShuEvent
    data object ApplyDistribusiFilter : AdminShuEvent
    data class DistribusiPageChanged(val page: Int) : AdminShuEvent

    data object OpenTopup : AdminShuEvent
    data class UpdateTopupForm(val form: TopupShuFormState) : AdminShuEvent
    data object DismissTopup : AdminShuEvent
    data object SubmitTopup : AdminShuEvent
}

sealed interface AdminShuEffect {
    data class ShowMessage(val message: String, val isError: Boolean = false) : AdminShuEffect
}

class AdminShuViewModel(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminShuUiState())
    val uiState: StateFlow<AdminShuUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AdminShuEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var writeJob: Job? = null

    init {
        loadAll(isRefresh = false)
    }

    fun onEvent(event: AdminShuEvent) {
        when (event) {
            AdminShuEvent.Load -> loadAll(isRefresh = false)
            AdminShuEvent.Refresh -> loadAll(isRefresh = true)
            is AdminShuEvent.TabChanged -> _uiState.update { it.copy(activeTab = event.tab) }
            is AdminShuEvent.MassPercentageChanged -> _uiState.update { it.copy(massPercentage = event.pct) }
            AdminShuEvent.RequestMassalConfirm -> _uiState.update { it.copy(showConfirmMassal = true) }
            AdminShuEvent.DismissMassalConfirm -> _uiState.update { it.copy(showConfirmMassal = false) }
            AdminShuEvent.ConfirmMassal -> submitMassal()

            is AdminShuEvent.RequestDebtOffset -> _uiState.update { it.copy(pendingDebtOffset = event.item) }
            AdminShuEvent.DismissDebtOffset -> _uiState.update { it.copy(pendingDebtOffset = null) }
            AdminShuEvent.ConfirmDebtOffset -> submitDebtOffset()

            is AdminShuEvent.IndividualMemberSelected -> _uiState.update { it.copy(selectedIndividualAnggotaId = event.anggotaId) }
            is AdminShuEvent.IndividualNominalChanged -> _uiState.update { it.copy(individualNominalDigits = event.digits) }
            AdminShuEvent.SubmitIndividual -> submitIndividual()

            is AdminShuEvent.SearchChanged -> _uiState.update { it.copy(searchAnggota = event.query, consentPage = 1) }
            is AdminShuEvent.ConsentPageChanged -> _uiState.update { it.copy(consentPage = event.page.coerceIn(1, it.totalConsentPages)) }

            is AdminShuEvent.DistribusiTahunChanged -> _uiState.update { it.copy(distribusiTahunFilter = event.tahun) }
            AdminShuEvent.ApplyDistribusiFilter -> loadAll(isRefresh = true)
            is AdminShuEvent.DistribusiPageChanged -> _uiState.update { it.copy(distribusiPage = event.page.coerceIn(1, it.totalDistribusiPages)) }

            AdminShuEvent.OpenTopup -> {
                val first = _uiState.value.userDirectory.firstOrNull()?.username.orEmpty()
                _uiState.update { it.copy(topupForm = TopupShuFormState(selectedUsername = first)) }
            }
            is AdminShuEvent.UpdateTopupForm -> _uiState.update { it.copy(topupForm = event.form) }
            AdminShuEvent.DismissTopup -> _uiState.update { it.copy(topupForm = null) }
            AdminShuEvent.SubmitTopup -> submitTopup()
        }
    }

    private fun loadAll(isRefresh: Boolean) {
        if (loadJob?.isActive == true) return
        val tahun = _uiState.value.distribusiTahunFilter.trim().ifBlank { null }
        loadJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.anggotaList.isEmpty(),
                    isRefreshing = isRefresh || it.anggotaList.isNotEmpty(),
                    errorMessage = null,
                )
            }
            try {
                val (shuRes, distRes, dirRes) = coroutineScope {
                    val s = async { repository.getShuManagement() }
                    val d = async { repository.getShuDistribusi(tahun = tahun, limit = 100) }
                    val u = async { repository.getAnggota() }
                    Triple(s.await(), d.await(), u.await())
                }
                when (shuRes) {
                    is ApiResult.Success -> {
                        val distSuccess = distRes as? ApiResult.Success
                        val dirSuccess = dirRes as? ApiResult.Success
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                summary = shuRes.data.summary,
                                anggotaList = shuRes.data.anggota,
                                riwayatKonversi = shuRes.data.riwayatKonversi,
                                distribusiItems = distSuccess?.data?.data ?: it.distribusiItems,
                                distribusiSummary = distSuccess?.data?.summary ?: it.distribusiSummary,
                                userDirectory = dirSuccess?.data ?: it.userDirectory,
                                errorMessage = null,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = if (it.anggotaList.isEmpty()) shuRes.message else null,
                            )
                        }
                        if (_uiState.value.anggotaList.isNotEmpty()) {
                            _effects.send(AdminShuEffect.ShowMessage(shuRes.message, isError = true))
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

    private fun submitMassal() {
        if (writeJob?.isActive == true) return
        val pct = _uiState.value.massPercentage
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, showConfirmMassal = false) }
            try {
                val res = repository.prosesKonversiShu(
                    ProsesKonversiShuRequest(
                        mode = "massal_ke_saldo",
                        persentase = pct.toDouble(),
                        keterangan = "Distribusi Massal $pct% SHU ke Saldo Belanja Hari Raya",
                    )
                )
                when (res) {
                    is ApiResult.Success -> {
                        _effects.send(AdminShuEffect.ShowMessage(res.data))
                        loadAll(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminShuEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun submitDebtOffset() {
        val target = _uiState.value.pendingDebtOffset ?: return
        if (writeJob?.isActive == true) return
        val maxPotong = minOf(target.shu, target.hutang)
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, pendingDebtOffset = null) }
            try {
                val res = repository.prosesKonversiShu(
                    ProsesKonversiShuRequest(
                        mode = "pelunasan_hutang",
                        anggotaId = target.anggotaId,
                        nominal = maxPotong,
                        keterangan = "Kompensasi Pelunasan Hutang dari Saldo SHU",
                    )
                )
                when (res) {
                    is ApiResult.Success -> {
                        _effects.send(AdminShuEffect.ShowMessage(res.data))
                        loadAll(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminShuEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun submitIndividual() {
        val state = _uiState.value
        val anggotaId = state.selectedIndividualAnggotaId
        val nominal = state.individualNominalDigits.toDoubleOrNull()
        if (anggotaId == null || nominal == null || nominal <= 0.0) {
            viewModelScope.launch { _effects.send(AdminShuEffect.ShowMessage("Pilih anggota dan masukkan nominal valid", isError = true)) }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                val res = repository.prosesKonversiShu(
                    ProsesKonversiShuRequest(
                        mode = "individual",
                        anggotaId = anggotaId,
                        nominal = nominal,
                        keterangan = "Konversi Mandiri SHU ke Saldo Belanja E-Wallet",
                    )
                )
                when (res) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(selectedIndividualAnggotaId = null, individualNominalDigits = "") }
                        _effects.send(AdminShuEffect.ShowMessage(res.data))
                        loadAll(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminShuEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun submitTopup() {
        val form = _uiState.value.topupForm ?: return
        val username = form.selectedUsername.trim()
        val nominal = form.nominalDigits.toDoubleOrNull()
        if (username.isEmpty() || nominal == null || nominal <= 0.0) {
            viewModelScope.launch { _effects.send(AdminShuEffect.ShowMessage("Pilih anggota dan masukkan nominal topup valid", isError = true)) }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                when (val res = repository.topupShu(username, nominal)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(topupForm = null) }
                        _effects.send(AdminShuEffect.ShowMessage(res.data))
                        loadAll(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminShuEffect.ShowMessage(res.message, isError = true))
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
                    return AdminShuViewModel(repository) as T
                }
            }
    }
}
