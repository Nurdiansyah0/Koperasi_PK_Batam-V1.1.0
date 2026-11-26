package id.koperasipk.app.feature.admin.pkm

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.BulkRestockItemRequest
import id.koperasipk.app.feature.admin.data.BulkRestockRequest
import id.koperasipk.app.feature.admin.data.PkmItemDto
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
data class PkmShoppingItem(
    val barangId: Int,
    val namaBarang: String,
    val totalSold: Int,
    val stokToko: Int,
    val stokGudang: Int,
    val stokTotal: Int,
    val pkm: Int,
    val recommendedPkm: Int,
    val statusPkm: String,
    val hargaModal: Double,
    val hargaJual: Double,
    val jumlahBeli: Int,
    val isSelected: Boolean,
)

@Immutable
data class InboundDraftRow(
    val barangId: Int,
    val namaBarang: String,
    val jumlahTambah: Int,
    val hargaBeliSatuan: Double,
    val alokasi: String = "gudang",
    val tanggalKadaluarsa: String = "",
)

@Immutable
data class InboundFakturFormState(
    val nomorFaktur: String,
    val namaSupplier: String = "",
    val sumberDana: String = "kas_koperasi",
    val catatan: String = "",
    val items: List<InboundDraftRow> = emptyList(),
) {
    val totalCost: Double get() = items.sumOf { it.jumlahTambah * it.hargaBeliSatuan }
    val totalPieces: Int get() = items.sumOf { it.jumlahTambah }
}

@Immutable
data class EditPkmFormState(
    val item: PkmShoppingItem,
    val pkmInput: String,
)

@Immutable
data class AdminPkmUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSubmitting: Boolean = false,
    val days: Int = 7,
    val leadTimeDays: Int = 4,
    val searchQuery: String = "",
    val shoppingItems: List<PkmShoppingItem> = emptyList(),
    val currentPage: Int = 1,
    val errorMessage: String? = null,
    val showConfirmAutoCalc: Boolean = false,
    val editPkmForm: EditPkmFormState? = null,
    val inboundForm: InboundFakturFormState? = null,
) {
    val selectedActiveItems: List<PkmShoppingItem>
        get() = shoppingItems.filter { it.isSelected && it.jumlahBeli > 0 }

    val totalBudgetSelected: Double
        get() = selectedActiveItems.sumOf { it.jumlahBeli * it.hargaModal }

    val totalPiecesToBuy: Int
        get() = selectedActiveItems.sumOf { it.jumlahBeli }

    val totalPages: Int
        get() = ((shoppingItems.size + PAGE_SIZE - 1) / PAGE_SIZE).coerceAtLeast(1)

    val pagedItems: List<PkmShoppingItem>
        get() {
            val safe = currentPage.coerceIn(1, totalPages)
            val from = (safe - 1) * PAGE_SIZE
            val to = minOf(from + PAGE_SIZE, shoppingItems.size)
            return if (from < to) shoppingItems.subList(from, to) else emptyList()
        }

    companion object {
        const val PAGE_SIZE = 15
    }
}

sealed interface AdminPkmEvent {
    data object Load : AdminPkmEvent
    data object Refresh : AdminPkmEvent
    data class DaysChanged(val days: Int) : AdminPkmEvent
    data class LeadTimeChanged(val leadTimeDays: Int) : AdminPkmEvent
    data class SearchChanged(val query: String) : AdminPkmEvent
    data object SubmitSearch : AdminPkmEvent
    data class PageChanged(val page: Int) : AdminPkmEvent
    data class ToggleItemSelection(val barangId: Int) : AdminPkmEvent
    data object ToggleSelectAll : AdminPkmEvent
    data class UpdateBuyQty(val barangId: Int, val qty: Int) : AdminPkmEvent

    data object RequestAutoCalc : AdminPkmEvent
    data object DismissAutoCalc : AdminPkmEvent
    data object ConfirmAutoCalc : AdminPkmEvent

    data class OpenEditPkm(val item: PkmShoppingItem) : AdminPkmEvent
    data class UpdateEditPkmInput(val value: String) : AdminPkmEvent
    data object DismissEditPkm : AdminPkmEvent
    data object SubmitEditPkm : AdminPkmEvent

    data object OpenInboundModal : AdminPkmEvent
    data class UpdateInboundHeader(
        val nomorFaktur: String? = null,
        val namaSupplier: String? = null,
        val sumberDana: String? = null,
        val catatan: String? = null,
    ) : AdminPkmEvent
    data class UpdateInboundRow(
        val barangId: Int,
        val jumlahTambah: Int? = null,
        val hargaBeliSatuan: Double? = null,
        val alokasi: String? = null,
        val tanggalKadaluarsa: String? = null,
    ) : AdminPkmEvent
    data class RemoveInboundRow(val barangId: Int) : AdminPkmEvent
    data object DismissInboundModal : AdminPkmEvent
    data object SubmitInbound : AdminPkmEvent
}

sealed interface AdminPkmEffect {
    data class ShowMessage(val message: String, val isError: Boolean = false) : AdminPkmEffect
}

class AdminPkmViewModel(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminPkmUiState())
    val uiState: StateFlow<AdminPkmUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AdminPkmEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var writeJob: Job? = null

    init {
        loadData(isRefresh = false)
    }

    fun onEvent(event: AdminPkmEvent) {
        when (event) {
            AdminPkmEvent.Load -> loadData(isRefresh = false)
            AdminPkmEvent.Refresh -> loadData(isRefresh = true)
            is AdminPkmEvent.DaysChanged -> {
                _uiState.update { it.copy(days = event.days, currentPage = 1) }
                loadData(isRefresh = true)
            }
            is AdminPkmEvent.LeadTimeChanged -> {
                _uiState.update { it.copy(leadTimeDays = event.leadTimeDays, currentPage = 1) }
                loadData(isRefresh = true)
            }
            is AdminPkmEvent.SearchChanged -> _uiState.update { it.copy(searchQuery = event.query) }
            AdminPkmEvent.SubmitSearch -> {
                _uiState.update { it.copy(currentPage = 1) }
                loadData(isRefresh = true)
            }
            is AdminPkmEvent.PageChanged -> {
                _uiState.update { it.copy(currentPage = event.page.coerceIn(1, it.totalPages)) }
            }
            is AdminPkmEvent.ToggleItemSelection -> {
                _uiState.update { state ->
                    state.copy(
                        shoppingItems = state.shoppingItems.map {
                            if (it.barangId == event.barangId) it.copy(isSelected = !it.isSelected) else it
                        }
                    )
                }
            }
            AdminPkmEvent.ToggleSelectAll -> {
                _uiState.update { state ->
                    val allSelected = state.shoppingItems.isNotEmpty() && state.shoppingItems.all { it.isSelected }
                    state.copy(shoppingItems = state.shoppingItems.map { it.copy(isSelected = !allSelected) })
                }
            }
            is AdminPkmEvent.UpdateBuyQty -> {
                val safeQty = event.qty.coerceAtLeast(0)
                _uiState.update { state ->
                    state.copy(
                        shoppingItems = state.shoppingItems.map {
                            if (it.barangId == event.barangId) {
                                it.copy(jumlahBeli = safeQty, isSelected = safeQty > 0)
                            } else {
                                it
                            }
                        }
                    )
                }
            }
            AdminPkmEvent.RequestAutoCalc -> _uiState.update { it.copy(showConfirmAutoCalc = true) }
            AdminPkmEvent.DismissAutoCalc -> _uiState.update { it.copy(showConfirmAutoCalc = false) }
            AdminPkmEvent.ConfirmAutoCalc -> executeAutoCalc()

            is AdminPkmEvent.OpenEditPkm -> {
                _uiState.update { it.copy(editPkmForm = EditPkmFormState(event.item, event.item.pkm.toString())) }
            }
            is AdminPkmEvent.UpdateEditPkmInput -> {
                _uiState.update { state ->
                    state.copy(editPkmForm = state.editPkmForm?.copy(pkmInput = event.value.filter(Char::isDigit)))
                }
            }
            AdminPkmEvent.DismissEditPkm -> _uiState.update { it.copy(editPkmForm = null) }
            AdminPkmEvent.SubmitEditPkm -> submitEditPkm()

            AdminPkmEvent.OpenInboundModal -> openInboundModal()
            is AdminPkmEvent.UpdateInboundHeader -> {
                _uiState.update { state ->
                    val form = state.inboundForm ?: return@update state
                    state.copy(
                        inboundForm = form.copy(
                            nomorFaktur = event.nomorFaktur ?: form.nomorFaktur,
                            namaSupplier = event.namaSupplier ?: form.namaSupplier,
                            sumberDana = event.sumberDana ?: form.sumberDana,
                            catatan = event.catatan ?: form.catatan,
                        )
                    )
                }
            }
            is AdminPkmEvent.UpdateInboundRow -> {
                _uiState.update { state ->
                    val form = state.inboundForm ?: return@update state
                    state.copy(
                        inboundForm = form.copy(
                            items = form.items.map { row ->
                                if (row.barangId == event.barangId) {
                                    row.copy(
                                        jumlahTambah = event.jumlahTambah ?: row.jumlahTambah,
                                        hargaBeliSatuan = event.hargaBeliSatuan ?: row.hargaBeliSatuan,
                                        alokasi = event.alokasi ?: row.alokasi,
                                        tanggalKadaluarsa = event.tanggalKadaluarsa ?: row.tanggalKadaluarsa,
                                    )
                                } else {
                                    row
                                }
                            }
                        )
                    )
                }
            }
            is AdminPkmEvent.RemoveInboundRow -> {
                _uiState.update { state ->
                    val form = state.inboundForm ?: return@update state
                    state.copy(inboundForm = form.copy(items = form.items.filterNot { it.barangId == event.barangId }))
                }
            }
            AdminPkmEvent.DismissInboundModal -> _uiState.update { it.copy(inboundForm = null) }
            AdminPkmEvent.SubmitInbound -> submitInbound()
        }
    }

    private fun loadData(isRefresh: Boolean) {
        loadJob?.cancel()
        val state = _uiState.value
        loadJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.shoppingItems.isEmpty(),
                    isRefreshing = isRefresh || it.shoppingItems.isNotEmpty(),
                    errorMessage = null,
                )
            }
            try {
                val res = repository.getPkmAnalysis(
                    days = state.days,
                    leadTimeDays = state.leadTimeDays,
                    search = state.searchQuery.trim().ifBlank { null },
                )
                when (res) {
                    is ApiResult.Success -> {
                        val mapped = res.data.data.map { dto -> dto.toShoppingItem() }
                        _uiState.update {
                            val totalPages = ((mapped.size + AdminPkmUiState.PAGE_SIZE - 1) / AdminPkmUiState.PAGE_SIZE).coerceAtLeast(1)
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                shoppingItems = mapped,
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
                                errorMessage = if (it.shoppingItems.isEmpty()) res.message else null,
                            )
                        }
                        if (_uiState.value.shoppingItems.isNotEmpty()) {
                            _effects.send(AdminPkmEffect.ShowMessage(res.message, isError = true))
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

    private fun executeAutoCalc() {
        if (writeJob?.isActive == true) return
        val state = _uiState.value
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, showConfirmAutoCalc = false) }
            try {
                when (val res = repository.autoCalculatePkm(days = state.days, leadTimeDays = state.leadTimeDays)) {
                    is ApiResult.Success -> {
                        _effects.send(AdminPkmEffect.ShowMessage(res.data))
                        loadData(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminPkmEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun submitEditPkm() {
        val form = _uiState.value.editPkmForm ?: return
        val newPkm = form.pkmInput.toIntOrNull()
        if (newPkm == null || newPkm < 1) {
            viewModelScope.launch { _effects.send(AdminPkmEffect.ShowMessage("PKM minimal 1 pcs", isError = true)) }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                when (val res = repository.updatePkm(form.item.barangId, newPkm)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(editPkmForm = null) }
                        _effects.send(AdminPkmEffect.ShowMessage(res.data))
                        loadData(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminPkmEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun openInboundModal() {
        val active = _uiState.value.selectedActiveItems
        if (active.isEmpty()) {
            viewModelScope.launch {
                _effects.send(AdminPkmEffect.ShowMessage("Pilih minimal 1 barang untuk dicatat faktur masuknya", isError = true))
            }
            return
        }
        val today = DateFormatter.todayApiDate().replace("-", "").drop(2)
        val rows = active.map {
            InboundDraftRow(
                barangId = it.barangId,
                namaBarang = it.namaBarang,
                jumlahTambah = it.jumlahBeli,
                hargaBeliSatuan = it.hargaModal,
            )
        }
        _uiState.update {
            it.copy(
                inboundForm = InboundFakturFormState(
                    nomorFaktur = "FAK-$today",
                    catatan = "Kulakan ${rows.size} SKU",
                    items = rows,
                )
            )
        }
    }

    private fun submitInbound() {
        val form = _uiState.value.inboundForm ?: return
        if (form.items.isEmpty()) {
            viewModelScope.launch { _effects.send(AdminPkmEffect.ShowMessage("Daftar barang masuk tidak boleh kosong", isError = true)) }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                val req = BulkRestockRequest(
                    items = form.items.map {
                        BulkRestockItemRequest(
                            barangId = it.barangId,
                            jumlahTambah = it.jumlahTambah.coerceAtLeast(1),
                            hargaBeliSatuan = it.hargaBeliSatuan.coerceAtLeast(0.0),
                            alokasi = it.alokasi,
                            tanggalKadaluarsa = it.tanggalKadaluarsa.trim().ifBlank { null },
                        )
                    },
                    sumberDana = form.sumberDana,
                    nomorFaktur = form.nomorFaktur.trim().ifBlank { null },
                    namaSupplier = form.namaSupplier.trim().ifBlank { null },
                    catatan = form.catatan.trim().ifBlank { null },
                )
                when (val res = repository.bulkRestock(req)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(inboundForm = null) }
                        _effects.send(AdminPkmEffect.ShowMessage(res.data.message.ifBlank { "Faktur kulakan berhasil dicatat" }))
                        loadData(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminPkmEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun PkmItemDto.toShoppingItem(): PkmShoppingItem {
        val pkmVal = pkm.coerceAtLeast(1)
        val tokoVal = stokToko ?: minOf(stok, pkmVal)
        val gudangVal = stokGudang ?: maxOf(0, stok - tokoVal)
        return PkmShoppingItem(
            barangId = barangId,
            namaBarang = namaBarang,
            totalSold = totalSold,
            stokToko = tokoVal,
            stokGudang = gudangVal,
            stokTotal = stok,
            pkm = pkmVal,
            recommendedPkm = recommendedPkm,
            statusPkm = statusPkm,
            hargaModal = hargaModal,
            hargaJual = hargaJual,
            jumlahBeli = recommendedBuy,
            isSelected = recommendedBuy > 0,
        )
    }

    companion object {
        fun factory(repository: AdminRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return AdminPkmViewModel(repository) as T
                }
            }
    }
}
