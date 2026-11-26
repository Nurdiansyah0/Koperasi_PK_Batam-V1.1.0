package id.koperasipk.app.feature.admin.apikeys

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.ApiKeyItemDto
import id.koperasipk.app.feature.admin.data.CreateApiKeyRequest
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class ApiIntegrationTab {
    KEYS,
    DOCS,
    TESTER,
    WIDGETS,
}

@Immutable
data class CreateApiKeyFormState(
    val name: String = "",
    val allowedOrigins: String = "*",
    val selectedPermissions: Set<String> = setOf("*"),
    val expiresInDays: String = "0",
    val createdResult: ApiKeyItemDto? = null,
)

@Immutable
data class AdminApiIntegrationUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSubmitting: Boolean = false,
    val isTesting: Boolean = false,
    val activeTab: ApiIntegrationTab = ApiIntegrationTab.KEYS,
    val keys: List<ApiKeyItemDto> = emptyList(),
    val gatewayUrl: String = "",
    val createForm: CreateApiKeyFormState? = null,
    val deleteTarget: ApiKeyItemDto? = null,
    val selectedEndpoint: String = "/laravel/api/v1/summary",
    val selectedKeyForTest: String = "",
    val codeLang: String = "curl",
    val testResponseJson: String? = null,
    val errorMessage: String? = null,
) {
    val activeKeyCount: Int get() = keys.count { it.isActive && !it.isExpired }
}

sealed interface AdminApiIntegrationEvent {
    data object Load : AdminApiIntegrationEvent
    data object Refresh : AdminApiIntegrationEvent
    data class TabChanged(val tab: ApiIntegrationTab) : AdminApiIntegrationEvent
    data object OpenCreateDialog : AdminApiIntegrationEvent
    data class UpdateCreateForm(val form: CreateApiKeyFormState) : AdminApiIntegrationEvent
    data class TogglePermission(val perm: String) : AdminApiIntegrationEvent
    data object DismissCreateDialog : AdminApiIntegrationEvent
    data object SubmitCreateKey : AdminApiIntegrationEvent
    data class ToggleKeyActive(val keyId: Int) : AdminApiIntegrationEvent
    data class RequestDeleteKey(val item: ApiKeyItemDto) : AdminApiIntegrationEvent
    data object DismissDeleteKey : AdminApiIntegrationEvent
    data object ConfirmDeleteKey : AdminApiIntegrationEvent
    data class SelectedEndpointChanged(val path: String) : AdminApiIntegrationEvent
    data class SelectedTestKeyChanged(val key: String) : AdminApiIntegrationEvent
    data class CodeLangChanged(val lang: String) : AdminApiIntegrationEvent
    data object RunLiveTest : AdminApiIntegrationEvent
}

sealed interface AdminApiIntegrationEffect {
    data class ShowMessage(val message: String, val isError: Boolean = false) : AdminApiIntegrationEffect
}

class AdminApiIntegrationViewModel(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminApiIntegrationUiState())
    val uiState: StateFlow<AdminApiIntegrationUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AdminApiIntegrationEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var writeJob: Job? = null
    private var testJob: Job? = null

    init {
        loadKeys(isRefresh = false)
    }

    fun onEvent(event: AdminApiIntegrationEvent) {
        when (event) {
            AdminApiIntegrationEvent.Load -> loadKeys(isRefresh = false)
            AdminApiIntegrationEvent.Refresh -> loadKeys(isRefresh = true)
            is AdminApiIntegrationEvent.TabChanged -> _uiState.update { it.copy(activeTab = event.tab) }
            AdminApiIntegrationEvent.OpenCreateDialog -> _uiState.update { it.copy(createForm = CreateApiKeyFormState()) }
            is AdminApiIntegrationEvent.UpdateCreateForm -> _uiState.update { it.copy(createForm = event.form) }
            is AdminApiIntegrationEvent.TogglePermission -> togglePermission(event.perm)
            AdminApiIntegrationEvent.DismissCreateDialog -> _uiState.update { it.copy(createForm = null) }
            AdminApiIntegrationEvent.SubmitCreateKey -> submitCreateKey()
            is AdminApiIntegrationEvent.ToggleKeyActive -> toggleKeyActive(event.keyId)
            is AdminApiIntegrationEvent.RequestDeleteKey -> _uiState.update { it.copy(deleteTarget = event.item) }
            AdminApiIntegrationEvent.DismissDeleteKey -> _uiState.update { it.copy(deleteTarget = null) }
            AdminApiIntegrationEvent.ConfirmDeleteKey -> confirmDeleteKey()
            is AdminApiIntegrationEvent.SelectedEndpointChanged -> _uiState.update { it.copy(selectedEndpoint = event.path) }
            is AdminApiIntegrationEvent.SelectedTestKeyChanged -> _uiState.update { it.copy(selectedKeyForTest = event.key) }
            is AdminApiIntegrationEvent.CodeLangChanged -> _uiState.update { it.copy(codeLang = event.lang) }
            AdminApiIntegrationEvent.RunLiveTest -> runLiveTest()
        }
    }

    private fun loadKeys(isRefresh: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.keys.isEmpty(),
                    isRefreshing = isRefresh || it.keys.isNotEmpty(),
                    errorMessage = null,
                )
            }
            try {
                when (val res = repository.listApiKeys()) {
                    is ApiResult.Success -> {
                        _uiState.update { state ->
                            val firstKey = state.selectedKeyForTest.ifBlank { res.data.data.firstOrNull()?.key.orEmpty() }
                            state.copy(
                                isLoading = false,
                                isRefreshing = false,
                                keys = res.data.data,
                                gatewayUrl = res.data.gatewayUrl,
                                selectedKeyForTest = firstKey,
                                errorMessage = null,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = if (it.keys.isEmpty()) res.message else null,
                            )
                        }
                        if (_uiState.value.keys.isNotEmpty()) {
                            _effects.send(AdminApiIntegrationEffect.ShowMessage(res.message, isError = true))
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

    private fun togglePermission(perm: String) {
        _uiState.update { state ->
            val form = state.createForm ?: return@update state
            val next = if (perm == "*") {
                if (form.selectedPermissions.contains("*")) emptySet() else setOf("*")
            } else {
                val withoutAll = form.selectedPermissions - "*"
                if (withoutAll.contains(perm)) withoutAll - perm else withoutAll + perm
            }
            state.copy(createForm = form.copy(selectedPermissions = next))
        }
    }

    private fun submitCreateKey() {
        val form = _uiState.value.createForm ?: return
        val name = form.name.trim()
        if (name.isEmpty()) {
            viewModelScope.launch { _effects.send(AdminApiIntegrationEffect.ShowMessage("Nama API Key wajib diisi", isError = true)) }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                val daysInt = form.expiresInDays.toIntOrNull()?.takeIf { it > 0 }
                val perms = form.selectedPermissions.toList().ifEmpty { listOf("*") }
                val req = CreateApiKeyRequest(
                    name = name,
                    permissions = perms,
                    allowedOrigins = form.allowedOrigins.trim().ifBlank { "*" },
                    expiresInDays = daysInt,
                )
                when (val res = repository.createApiKey(req)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(createForm = form.copy(createdResult = res.data.data)) }
                        _effects.send(AdminApiIntegrationEffect.ShowMessage(res.data.message.ifBlank { "API Key berhasil dibuat" }))
                        loadKeys(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminApiIntegrationEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun toggleKeyActive(id: Int) {
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                when (val res = repository.toggleApiKey(id)) {
                    is ApiResult.Success -> {
                        _effects.send(AdminApiIntegrationEffect.ShowMessage(res.data.message.ifBlank { "Status API Key diubah" }))
                        loadKeys(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminApiIntegrationEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun confirmDeleteKey() {
        val target = _uiState.value.deleteTarget ?: return
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                when (val res = repository.deleteApiKey(target.id)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(deleteTarget = null) }
                        _effects.send(AdminApiIntegrationEffect.ShowMessage(res.data))
                        loadKeys(isRefresh = true)
                    }
                    is ApiResult.Error -> {
                        _uiState.update { it.copy(deleteTarget = null) }
                        _effects.send(AdminApiIntegrationEffect.ShowMessage(res.message, isError = true))
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun runLiveTest() {
        val state = _uiState.value
        val key = state.selectedKeyForTest.trim()
        if (key.isEmpty()) {
            viewModelScope.launch { _effects.send(AdminApiIntegrationEffect.ShowMessage("Pilih atau buat API Key terlebih dahulu", isError = true)) }
            return
        }
        if (testJob?.isActive == true) return
        testJob = viewModelScope.launch {
            _uiState.update { it.copy(isTesting = true, testResponseJson = null) }
            try {
                when (val res = repository.testExternalGateway(state.selectedEndpoint, key)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(testResponseJson = res.data) }
                        _effects.send(AdminApiIntegrationEffect.ShowMessage("Response diterima dari Gateway!"))
                    }
                    is ApiResult.Error -> {
                        _uiState.update { it.copy(testResponseJson = "{\"error\": \"${res.message}\"}") }
                        _effects.send(AdminApiIntegrationEffect.ShowMessage(res.message, isError = true))
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isTesting = false) }
            }
        }
    }

    companion object {
        fun factory(repository: AdminRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return AdminApiIntegrationViewModel(repository) as T
                }
            }
    }
}
