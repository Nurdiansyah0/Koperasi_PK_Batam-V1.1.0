package id.koperasipk.app.feature.admin.jabatan

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.admin.data.AdminAnggotaDto
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.AssignJabatanRequest
import id.koperasipk.app.feature.admin.data.JabatanItemDto
import id.koperasipk.app.feature.admin.data.JabatanSummaryDto
import id.koperasipk.app.feature.admin.data.RevokeJabatanRequest
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

@Immutable
data class AssignMandateFormState(
    val selectedUserId: Int? = null,
    val role: String = "kasir",
    val catatan: String = "",
)

@Immutable
data class RevokeMandateFormState(
    val target: JabatanItemDto,
    val alasan: String = "",
)

@Immutable
data class AdminJabatanUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSubmitting: Boolean = false,
    val items: List<JabatanItemDto> = emptyList(),
    val summary: JabatanSummaryDto = JabatanSummaryDto(),
    val anggotaOptions: List<AdminAnggotaDto> = emptyList(),
    val roleFilter: String = "all",
    val searchQuery: String = "",
    val currentPage: Int = 1,
    val errorMessage: String? = null,
    val assignForm: AssignMandateFormState? = null,
    val revokeForm: RevokeMandateFormState? = null,
    val confirmRevokePending: Boolean = false,
) {
    val filteredItems: List<JabatanItemDto>
        get() {
            val q = searchQuery.trim().lowercase()
            return items.filter { item ->
                val matchesRole = when (roleFilter) {
                    "all" -> true
                    "nonaktif" -> item.status == "nonaktif"
                    else -> item.role == roleFilter && item.status == "aktif"
                }
                val matchesQuery = q.isEmpty() ||
                    item.namaLengkap.lowercase().contains(q) ||
                    item.username.lowercase().contains(q) ||
                    (item.catatan?.lowercase()?.contains(q) == true)
                matchesRole && matchesQuery
            }
        }

    val totalPages: Int
        get() = ((filteredItems.size + PAGE_SIZE - 1) / PAGE_SIZE).coerceAtLeast(1)

    val pagedItems: List<JabatanItemDto>
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

sealed interface AdminJabatanEvent {
    data object Load : AdminJabatanEvent
    data object Refresh : AdminJabatanEvent
    data class RoleFilterChanged(val filter: String) : AdminJabatanEvent
    data class SearchChanged(val query: String) : AdminJabatanEvent
    data class PageChanged(val page: Int) : AdminJabatanEvent
    data object OpenAssign : AdminJabatanEvent
    data class UpdateAssignForm(val form: AssignMandateFormState) : AdminJabatanEvent
    data object DismissAssign : AdminJabatanEvent
    data object SubmitAssign : AdminJabatanEvent
    data class OpenRevoke(val item: JabatanItemDto) : AdminJabatanEvent
    data class UpdateRevokeForm(val form: RevokeMandateFormState) : AdminJabatanEvent
    data object RequestConfirmRevoke : AdminJabatanEvent
    data object DismissConfirmRevoke : AdminJabatanEvent
    data object DismissRevoke : AdminJabatanEvent
    data object ConfirmRevoke : AdminJabatanEvent
}

sealed interface AdminJabatanEffect {
    data class ShowMessage(val message: String, val isError: Boolean = false) : AdminJabatanEffect
}

class AdminJabatanViewModel(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminJabatanUiState())
    val uiState: StateFlow<AdminJabatanUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AdminJabatanEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var writeJob: Job? = null

    init {
        loadData(isRefresh = false)
    }

    fun onEvent(event: AdminJabatanEvent) {
        when (event) {
            AdminJabatanEvent.Load -> loadData(isRefresh = false)
            AdminJabatanEvent.Refresh -> loadData(isRefresh = true)
            is AdminJabatanEvent.RoleFilterChanged -> _uiState.update { it.copy(roleFilter = event.filter, currentPage = 1) }
            is AdminJabatanEvent.SearchChanged -> _uiState.update { it.copy(searchQuery = event.query, currentPage = 1) }
            is AdminJabatanEvent.PageChanged -> _uiState.update { it.copy(currentPage = event.page.coerceIn(1, it.totalPages)) }
            AdminJabatanEvent.OpenAssign -> {
                val firstUserId = _uiState.value.anggotaOptions.firstOrNull()?.userId
                _uiState.update { it.copy(assignForm = AssignMandateFormState(selectedUserId = firstUserId)) }
            }
            is AdminJabatanEvent.UpdateAssignForm -> _uiState.update { it.copy(assignForm = event.form) }
            AdminJabatanEvent.DismissAssign -> _uiState.update { it.copy(assignForm = null) }
            AdminJabatanEvent.SubmitAssign -> submitAssign()
            is AdminJabatanEvent.OpenRevoke -> _uiState.update { it.copy(revokeForm = RevokeMandateFormState(target = event.item)) }
            is AdminJabatanEvent.UpdateRevokeForm -> _uiState.update { it.copy(revokeForm = event.form) }
            AdminJabatanEvent.RequestConfirmRevoke -> _uiState.update { it.copy(confirmRevokePending = true) }
            AdminJabatanEvent.DismissConfirmRevoke -> _uiState.update { it.copy(confirmRevokePending = false) }
            AdminJabatanEvent.DismissRevoke -> _uiState.update { it.copy(revokeForm = null, confirmRevokePending = false) }
            AdminJabatanEvent.ConfirmRevoke -> confirmRevoke()
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
                val (jabatanRes, anggotaRes) = coroutineScope {
                    val j = async { repository.getDaftarJabatan() }
                    val a = async { repository.getAnggota() }
                    j.await() to a.await()
                }
                when (jabatanRes) {
                    is ApiResult.Success -> {
                        val anggotaList = (anggotaRes as? ApiResult.Success)?.data ?: _uiState.value.anggotaOptions
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                items = jabatanRes.data.data,
                                summary = jabatanRes.data.summary ?: JabatanSummaryDto(),
                                anggotaOptions = anggotaList,
                                errorMessage = null,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = if (it.items.isEmpty()) jabatanRes.message else null,
                            )
                        }
                        if (_uiState.value.items.isNotEmpty()) {
                            _effects.send(AdminJabatanEffect.ShowMessage(jabatanRes.message, isError = true))
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

    private fun submitAssign() {
        val form = _uiState.value.assignForm ?: return
        val userId = form.selectedUserId
        if (userId == null) {
            viewModelScope.launch { _effects.send(AdminJabatanEffect.ShowMessage("Pilih anggota terlebih dahulu", isError = true)) }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                val res = repository.assignJabatan(
                    AssignJabatanRequest(
                        userId = userId,
                        role = form.role,
                        catatan = form.catatan.trim().ifBlank { null },
                    )
                )
                when (res) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(assignForm = null) }
                        _effects.send(AdminJabatanEffect.ShowMessage(res.data))
                        loadData(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminJabatanEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun confirmRevoke() {
        val form = _uiState.value.revokeForm ?: return
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, confirmRevokePending = false) }
            try {
                val res = repository.revokeJabatan(
                    RevokeJabatanRequest(
                        jabatanId = form.target.jabatanId,
                        alasan = form.alasan.trim().ifBlank { null },
                    )
                )
                when (res) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(revokeForm = null) }
                        _effects.send(AdminJabatanEffect.ShowMessage(res.data))
                        loadData(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminJabatanEffect.ShowMessage(res.message, isError = true))
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
                    return AdminJabatanViewModel(repository) as T
                }
            }
    }
}
