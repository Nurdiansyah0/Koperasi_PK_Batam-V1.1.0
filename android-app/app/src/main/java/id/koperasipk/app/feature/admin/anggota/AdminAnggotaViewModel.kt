package id.koperasipk.app.feature.admin.anggota

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.admin.data.AdminAnggotaDto
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.ProsesKonversiShuRequest
import id.koperasipk.app.feature.admin.data.TambahUserRequest
import id.koperasipk.app.feature.admin.data.UpdateUserRequest
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
data class UserCrudFormState(
    val isEditing: Boolean = false,
    val userId: Int = 0,
    val username: String = "",
    val namaLengkap: String = "",
    val role: String = "anggota",
    val password: String = "",
)

@Immutable
data class ResetPasswordFormState(
    val target: AdminAnggotaDto,
    val newPassword: String = "",
    val confirmPassword: String = "",
)

@Immutable
data class CairkanShuFormState(
    val target: AdminAnggotaDto,
    val nominalDigits: String = "",
)

@Immutable
data class AdminAnggotaUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSubmitting: Boolean = false,
    val items: List<AdminAnggotaDto> = emptyList(),
    val searchQuery: String = "",
    val currentPage: Int = 1,
    val errorMessage: String? = null,
    val userForm: UserCrudFormState? = null,
    val resetPasswordForm: ResetPasswordFormState? = null,
    val confirmResetPending: Boolean = false,
    val deleteTarget: AdminAnggotaDto? = null,
    val cairkanShuForm: CairkanShuFormState? = null,
) {
    val totalAnggota: Int get() = items.size
    val anggotaAktifSaldo: Int get() = items.count { it.saldo > 0.0 }
    val anggotaBerhutang: Int get() = items.count { it.hutang > 0.0 }
    val rataRataSaldo: Double
        get() = if (items.isNotEmpty()) items.sumOf { it.saldo } / items.size else 0.0

    val filteredItems: List<AdminAnggotaDto>
        get() {
            val sorted = items.sortedBy { it.displayName.lowercase() }
            val q = searchQuery.trim().lowercase()
            if (q.isEmpty()) return sorted
            return sorted.filter {
                it.displayName.lowercase().contains(q) || it.username.lowercase().contains(q)
            }
        }

    val totalPages: Int
        get() = ((filteredItems.size + PAGE_SIZE - 1) / PAGE_SIZE).coerceAtLeast(1)

    val pagedItems: List<AdminAnggotaDto>
        get() {
            val safePage = currentPage.coerceIn(1, totalPages)
            val from = (safePage - 1) * PAGE_SIZE
            val to = minOf(from + PAGE_SIZE, filteredItems.size)
            return if (from < to) filteredItems.subList(from, to) else emptyList()
        }

    companion object {
        const val PAGE_SIZE = 10
    }
}

sealed interface AdminAnggotaEvent {
    data object Load : AdminAnggotaEvent
    data object Refresh : AdminAnggotaEvent
    data class SearchChanged(val query: String) : AdminAnggotaEvent
    data class PageChanged(val page: Int) : AdminAnggotaEvent

    data class OpenAddOrEditUser(val target: AdminAnggotaDto? = null) : AdminAnggotaEvent
    data class UpdateUserForm(val form: UserCrudFormState) : AdminAnggotaEvent
    data object DismissUserForm : AdminAnggotaEvent
    data object SubmitUserForm : AdminAnggotaEvent

    data class OpenResetPassword(val target: AdminAnggotaDto) : AdminAnggotaEvent
    data class UpdateResetPasswordForm(val form: ResetPasswordFormState) : AdminAnggotaEvent
    data object RequestConfirmReset : AdminAnggotaEvent
    data object DismissConfirmReset : AdminAnggotaEvent
    data object DismissResetPassword : AdminAnggotaEvent
    data object ConfirmResetPassword : AdminAnggotaEvent

    data class RequestDeleteUser(val target: AdminAnggotaDto) : AdminAnggotaEvent
    data object DismissDeleteUser : AdminAnggotaEvent
    data object ConfirmDeleteUser : AdminAnggotaEvent

    data class OpenCairkanShu(val target: AdminAnggotaDto) : AdminAnggotaEvent
    data class UpdateCairkanShuForm(val form: CairkanShuFormState) : AdminAnggotaEvent
    data object DismissCairkanShu : AdminAnggotaEvent
    data object SubmitCairkanShu : AdminAnggotaEvent
}

sealed interface AdminAnggotaEffect {
    data class ShowMessage(val message: String, val isError: Boolean = false) : AdminAnggotaEffect
}

class AdminAnggotaViewModel(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminAnggotaUiState())
    val uiState: StateFlow<AdminAnggotaUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AdminAnggotaEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var writeJob: Job? = null

    init {
        loadAnggota(isRefresh = false)
    }

    fun onEvent(event: AdminAnggotaEvent) {
        when (event) {
            AdminAnggotaEvent.Load -> loadAnggota(isRefresh = false)
            AdminAnggotaEvent.Refresh -> loadAnggota(isRefresh = true)
            is AdminAnggotaEvent.SearchChanged -> _uiState.update { it.copy(searchQuery = event.query, currentPage = 1) }
            is AdminAnggotaEvent.PageChanged -> _uiState.update { it.copy(currentPage = event.page.coerceIn(1, it.totalPages)) }

            is AdminAnggotaEvent.OpenAddOrEditUser -> openAddOrEditUser(event.target)
            is AdminAnggotaEvent.UpdateUserForm -> _uiState.update { it.copy(userForm = event.form) }
            AdminAnggotaEvent.DismissUserForm -> _uiState.update { it.copy(userForm = null) }
            AdminAnggotaEvent.SubmitUserForm -> submitUserForm()

            is AdminAnggotaEvent.OpenResetPassword -> {
                _uiState.update { it.copy(resetPasswordForm = ResetPasswordFormState(target = event.target)) }
            }
            is AdminAnggotaEvent.UpdateResetPasswordForm -> _uiState.update { it.copy(resetPasswordForm = event.form) }
            AdminAnggotaEvent.RequestConfirmReset -> validateAndRequestReset()
            AdminAnggotaEvent.DismissConfirmReset -> _uiState.update { it.copy(confirmResetPending = false) }
            AdminAnggotaEvent.DismissResetPassword -> _uiState.update { it.copy(resetPasswordForm = null, confirmResetPending = false) }
            AdminAnggotaEvent.ConfirmResetPassword -> confirmResetPassword()

            is AdminAnggotaEvent.RequestDeleteUser -> _uiState.update { it.copy(deleteTarget = event.target) }
            AdminAnggotaEvent.DismissDeleteUser -> _uiState.update { it.copy(deleteTarget = null) }
            AdminAnggotaEvent.ConfirmDeleteUser -> confirmDeleteUser()

            is AdminAnggotaEvent.OpenCairkanShu -> {
                _uiState.update {
                    it.copy(
                        cairkanShuForm = CairkanShuFormState(
                            target = event.target,
                            nominalDigits = event.target.shu.toLong().takeIf { v -> v > 0L }?.toString().orEmpty(),
                        )
                    )
                }
            }
            is AdminAnggotaEvent.UpdateCairkanShuForm -> _uiState.update { it.copy(cairkanShuForm = event.form) }
            AdminAnggotaEvent.DismissCairkanShu -> _uiState.update { it.copy(cairkanShuForm = null) }
            AdminAnggotaEvent.SubmitCairkanShu -> submitCairkanShu()
        }
    }

    private fun loadAnggota(isRefresh: Boolean) {
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
                when (val res = repository.getAnggota()) {
                    is ApiResult.Success -> {
                        _uiState.update {
                            val totalPages = ((res.data.size + AdminAnggotaUiState.PAGE_SIZE - 1) / AdminAnggotaUiState.PAGE_SIZE).coerceAtLeast(1)
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                items = res.data,
                                currentPage = it.currentPage.coerceIn(1, totalPages),
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
                            _effects.send(AdminAnggotaEffect.ShowMessage(res.message, isError = true))
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

    private fun openAddOrEditUser(target: AdminAnggotaDto?) {
        val form = if (target != null) {
            UserCrudFormState(
                isEditing = true,
                userId = target.userId,
                username = target.username,
                namaLengkap = target.namaLengkap.orEmpty(),
                role = "anggota",
                password = "",
            )
        } else {
            UserCrudFormState(isEditing = false)
        }
        _uiState.update { it.copy(userForm = form) }
    }

    private fun submitUserForm() {
        val form = _uiState.value.userForm ?: return
        val username = form.username.trim()
        if (username.isEmpty()) {
            viewModelScope.launch { _effects.send(AdminAnggotaEffect.ShowMessage("Username wajib diisi", isError = true)) }
            return
        }
        if (!form.isEditing && form.password.length < 6) {
            viewModelScope.launch { _effects.send(AdminAnggotaEffect.ShowMessage("Password minimal 6 karakter", isError = true)) }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                val res = if (form.isEditing) {
                    repository.updateUser(
                        UpdateUserRequest(
                            userId = form.userId,
                            username = username,
                            role = form.role,
                            password = form.password.takeIf { it.isNotBlank() },
                            namaLengkap = form.namaLengkap.trim().ifBlank { null },
                        )
                    )
                } else {
                    repository.tambahUser(
                        TambahUserRequest(
                            username = username,
                            password = form.password,
                            role = form.role,
                            namaLengkap = form.namaLengkap.trim().ifBlank { username },
                        )
                    )
                }
                when (res) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(userForm = null) }
                        _effects.send(AdminAnggotaEffect.ShowMessage(res.data))
                        loadAnggota(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminAnggotaEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun validateAndRequestReset() {
        val form = _uiState.value.resetPasswordForm ?: return
        if (form.newPassword.length < 6) {
            viewModelScope.launch { _effects.send(AdminAnggotaEffect.ShowMessage("Password baru minimal 6 karakter", isError = true)) }
            return
        }
        if (form.newPassword != form.confirmPassword) {
            viewModelScope.launch { _effects.send(AdminAnggotaEffect.ShowMessage("Konfirmasi password tidak cocok", isError = true)) }
            return
        }
        _uiState.update { it.copy(confirmResetPending = true) }
    }

    private fun confirmResetPassword() {
        val form = _uiState.value.resetPasswordForm ?: return
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, confirmResetPending = false) }
            try {
                when (val res = repository.resetPasswordUser(form.target.userId, form.newPassword)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(resetPasswordForm = null) }
                        _effects.send(AdminAnggotaEffect.ShowMessage(res.data))
                    }
                    is ApiResult.Error -> _effects.send(AdminAnggotaEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun confirmDeleteUser() {
        val target = _uiState.value.deleteTarget ?: return
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                when (val res = repository.hapusUser(target.userId)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(deleteTarget = null) }
                        _effects.send(AdminAnggotaEffect.ShowMessage(res.data))
                        loadAnggota(isRefresh = true)
                    }
                    is ApiResult.Error -> {
                        _uiState.update { it.copy(deleteTarget = null) }
                        _effects.send(AdminAnggotaEffect.ShowMessage(res.message, isError = true))
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun submitCairkanShu() {
        val form = _uiState.value.cairkanShuForm ?: return
        val nominal = form.nominalDigits.toDoubleOrNull()
        if (nominal == null || nominal <= 0.0) {
            viewModelScope.launch { _effects.send(AdminAnggotaEffect.ShowMessage("Nominal pencairan harus lebih dari 0", isError = true)) }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                val res = repository.prosesKonversiShu(
                    ProsesKonversiShuRequest(
                        mode = "individual",
                        anggotaId = form.target.anggotaId,
                        nominal = nominal,
                        keterangan = "Pencairan SHU ke Saldo Belanja (via Data Anggota)",
                    )
                )
                when (res) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(cairkanShuForm = null) }
                        _effects.send(AdminAnggotaEffect.ShowMessage(res.data))
                        loadAnggota(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminAnggotaEffect.ShowMessage(res.message, isError = true))
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
                    return AdminAnggotaViewModel(repository) as T
                }
            }
    }
}
