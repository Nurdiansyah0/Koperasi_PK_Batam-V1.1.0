package id.koperasipk.app.feature.admin.barang

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.admin.data.AdminBarangDto
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.AutoRefillItemRequest
import id.koperasipk.app.feature.admin.data.AutoRefillRequest
import id.koperasipk.app.feature.admin.data.MutasiStokRequest
import id.koperasipk.app.feature.admin.data.RestockBarangRequest
import id.koperasipk.app.feature.admin.data.RiwayatRestockDto
import id.koperasipk.app.feature.admin.data.TambahBarangRequest
import id.koperasipk.app.feature.admin.data.UpdateBarangRequest
import id.koperasipk.app.feature.admin.data.WriteOffExpiredRequest
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class BarangFilterTab {
    ALL,
    EXPIRED,
    NEAR_EXPIRY,
    REFILL,
}

@Immutable
data class RefillDraftItem(
    val barangId: Int,
    val namaBarang: String,
    val stokToko: Int,
    val pkm: Int,
    val stokGudang: Int,
    val tglKadaluarsaGudang: String? = null,
    val jumlahAmbil: Int,
    val isSelected: Boolean = true,
)

@Immutable
data class BarangFormState(
    val isEditing: Boolean = false,
    val barangId: Int = 0,
    val namaBarang: String = "",
    val hargaModalDigits: String = "",
    val hargaJualDigits: String = "",
    val stokToko: String = "",
    val stokGudang: String = "",
    val pkm: String = "4",
    val tglKadaluarsaToko: String = "",
    val tglKadaluarsaGudang: String = "",
)

@Immutable
data class RestockFormState(
    val barangId: Int = 0,
    val namaBarang: String = "",
    val jumlahTambah: String = "",
    val hargaBeliDigits: String = "",
    val sumberDana: String = "kas_koperasi",
    val alokasi: String = "gudang",
    val tanggalKadaluarsa: String = "",
    val catatan: String = "",
)

@Immutable
data class MutasiFormState(
    val barang: AdminBarangDto,
    val tipe: String = "gudang_ke_toko",
    val jumlah: String = "1",
    val catatan: String = "",
)

@Immutable
data class WriteOffFormState(
    val barang: AdminBarangDto,
    val lokasi: String = "toko",
    val jumlah: String = "1",
    val alasan: String = "Pemusnahan barang kadaluarsa",
)

@Immutable
data class AdminBarangUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val allItems: List<AdminBarangDto> = emptyList(),
    val searchQuery: String = "",
    val filterTab: BarangFilterTab = BarangFilterTab.ALL,
    val currentPage: Int = 1,
    val errorMessage: String? = null,
    val isSubmitting: Boolean = false,
    val barangForm: BarangFormState? = null,
    val deleteTarget: AdminBarangDto? = null,
    val restockForm: RestockFormState? = null,
    val mutasiForm: MutasiFormState? = null,
    val writeOffForm: WriteOffFormState? = null,
    val confirmWriteOffPending: Boolean = false,
    val showRefillDialog: Boolean = false,
    val refillItems: List<RefillDraftItem> = emptyList(),
    val confirmRefillPending: Boolean = false,
    val showHistoryDialog: Boolean = false,
    val isLoadingHistory: Boolean = false,
    val historyItems: List<RiwayatRestockDto> = emptyList(),
    val totalHistoryPengeluaran: Double = 0.0,
) {
    val expiredCount: Int
        get() = allItems.count { it.isAnyExpired }

    val nearExpiryCount: Int
        get() = allItems.count { it.isAnyNearExpiry }

    val deficitItems: List<AdminBarangDto>
        get() = allItems.filter { it.isTokoUnderPkm }

    val outOfStockGudangItems: List<AdminBarangDto>
        get() = deficitItems.filter { it.effectiveStokGudang <= 0 }

    val filteredItems: List<AdminBarangDto>
        get() {
            val q = searchQuery.trim().lowercase()
            return allItems.filter { item ->
                val matchesSearch = q.isEmpty() || item.namaBarang.lowercase().contains(q)
                val matchesTab = when (filterTab) {
                    BarangFilterTab.ALL -> true
                    BarangFilterTab.EXPIRED -> item.isAnyExpired
                    BarangFilterTab.NEAR_EXPIRY -> item.isAnyNearExpiry
                    BarangFilterTab.REFILL -> item.isTokoUnderPkm
                }
                matchesSearch && matchesTab
            }
        }

    val totalPages: Int
        get() = ((filteredItems.size + PAGE_SIZE - 1) / PAGE_SIZE).coerceAtLeast(1)

    val pagedItems: List<AdminBarangDto>
        get() {
            val safePage = currentPage.coerceIn(1, totalPages)
            val from = (safePage - 1) * PAGE_SIZE
            val to = minOf(from + PAGE_SIZE, filteredItems.size)
            return if (from < to) filteredItems.subList(from, to) else emptyList()
        }

    companion object {
        const val PAGE_SIZE = 12
    }
}

sealed interface AdminBarangEvent {
    data object Load : AdminBarangEvent
    data object Refresh : AdminBarangEvent
    data class SearchChanged(val query: String) : AdminBarangEvent
    data class FilterChanged(val tab: BarangFilterTab) : AdminBarangEvent
    data class PageChanged(val page: Int) : AdminBarangEvent

    data class OpenAddOrEdit(val item: AdminBarangDto? = null) : AdminBarangEvent
    data class UpdateBarangForm(val form: BarangFormState) : AdminBarangEvent
    data object DismissBarangForm : AdminBarangEvent
    data object SubmitBarangForm : AdminBarangEvent

    data class RequestDelete(val item: AdminBarangDto) : AdminBarangEvent
    data object DismissDelete : AdminBarangEvent
    data object ConfirmDelete : AdminBarangEvent

    data class OpenRestock(val item: AdminBarangDto) : AdminBarangEvent
    data class UpdateRestockForm(val form: RestockFormState) : AdminBarangEvent
    data object DismissRestock : AdminBarangEvent
    data object SubmitRestock : AdminBarangEvent

    data class OpenMutasi(val item: AdminBarangDto) : AdminBarangEvent
    data class UpdateMutasiForm(val form: MutasiFormState) : AdminBarangEvent
    data object DismissMutasi : AdminBarangEvent
    data object SubmitMutasi : AdminBarangEvent

    data class OpenWriteOff(val item: AdminBarangDto) : AdminBarangEvent
    data class UpdateWriteOffForm(val form: WriteOffFormState) : AdminBarangEvent
    data object RequestConfirmWriteOff : AdminBarangEvent
    data object DismissConfirmWriteOff : AdminBarangEvent
    data object DismissWriteOff : AdminBarangEvent
    data object ConfirmWriteOff : AdminBarangEvent

    data object OpenRefillDialog : AdminBarangEvent
    data object DismissRefillDialog : AdminBarangEvent
    data class ToggleRefillItem(val barangId: Int) : AdminBarangEvent
    data class UpdateRefillQty(val barangId: Int, val qty: Int) : AdminBarangEvent
    data object RequestConfirmRefill : AdminBarangEvent
    data object DismissConfirmRefill : AdminBarangEvent
    data object ConfirmRefill : AdminBarangEvent

    data object OpenHistory : AdminBarangEvent
    data object DismissHistory : AdminBarangEvent
}

sealed interface AdminBarangEffect {
    data class ShowMessage(val message: String, val isError: Boolean = false) : AdminBarangEffect
}

class AdminBarangViewModel(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminBarangUiState())
    val uiState: StateFlow<AdminBarangUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AdminBarangEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var writeJob: Job? = null
    private var historyJob: Job? = null

    init {
        loadBarang(isRefresh = false)
    }

    fun onEvent(event: AdminBarangEvent) {
        when (event) {
            AdminBarangEvent.Load -> loadBarang(isRefresh = false)
            AdminBarangEvent.Refresh -> loadBarang(isRefresh = true)
            is AdminBarangEvent.SearchChanged -> {
                _uiState.update { it.copy(searchQuery = event.query, currentPage = 1) }
            }
            is AdminBarangEvent.FilterChanged -> {
                _uiState.update { it.copy(filterTab = event.tab, currentPage = 1) }
            }
            is AdminBarangEvent.PageChanged -> {
                _uiState.update { it.copy(currentPage = event.page.coerceIn(1, it.totalPages)) }
            }
            is AdminBarangEvent.OpenAddOrEdit -> openAddOrEdit(event.item)
            is AdminBarangEvent.UpdateBarangForm -> _uiState.update { it.copy(barangForm = event.form) }
            AdminBarangEvent.DismissBarangForm -> _uiState.update { it.copy(barangForm = null) }
            AdminBarangEvent.SubmitBarangForm -> submitBarangForm()

            is AdminBarangEvent.RequestDelete -> _uiState.update { it.copy(deleteTarget = event.item) }
            AdminBarangEvent.DismissDelete -> _uiState.update { it.copy(deleteTarget = null) }
            AdminBarangEvent.ConfirmDelete -> confirmDelete()

            is AdminBarangEvent.OpenRestock -> openRestock(event.item)
            is AdminBarangEvent.UpdateRestockForm -> _uiState.update { it.copy(restockForm = event.form) }
            AdminBarangEvent.DismissRestock -> _uiState.update { it.copy(restockForm = null) }
            AdminBarangEvent.SubmitRestock -> submitRestock()

            is AdminBarangEvent.OpenMutasi -> openMutasi(event.item)
            is AdminBarangEvent.UpdateMutasiForm -> _uiState.update { it.copy(mutasiForm = event.form) }
            AdminBarangEvent.DismissMutasi -> _uiState.update { it.copy(mutasiForm = null) }
            AdminBarangEvent.SubmitMutasi -> submitMutasi()

            is AdminBarangEvent.OpenWriteOff -> openWriteOff(event.item)
            is AdminBarangEvent.UpdateWriteOffForm -> _uiState.update { it.copy(writeOffForm = event.form) }
            AdminBarangEvent.RequestConfirmWriteOff -> _uiState.update { it.copy(confirmWriteOffPending = true) }
            AdminBarangEvent.DismissConfirmWriteOff -> _uiState.update { it.copy(confirmWriteOffPending = false) }
            AdminBarangEvent.DismissWriteOff -> _uiState.update { it.copy(writeOffForm = null, confirmWriteOffPending = false) }
            AdminBarangEvent.ConfirmWriteOff -> confirmWriteOff()

            AdminBarangEvent.OpenRefillDialog -> openRefillDialog()
            AdminBarangEvent.DismissRefillDialog -> _uiState.update { it.copy(showRefillDialog = false, confirmRefillPending = false) }
            is AdminBarangEvent.ToggleRefillItem -> {
                _uiState.update { state ->
                    state.copy(
                        refillItems = state.refillItems.map {
                            if (it.barangId == event.barangId) it.copy(isSelected = !it.isSelected) else it
                        }
                    )
                }
            }
            is AdminBarangEvent.UpdateRefillQty -> {
                _uiState.update { state ->
                    state.copy(
                        refillItems = state.refillItems.map {
                            if (it.barangId == event.barangId) {
                                val safe = event.qty.coerceIn(1, it.stokGudang.coerceAtLeast(1))
                                it.copy(jumlahAmbil = safe)
                            } else {
                                it
                            }
                        }
                    )
                }
            }
            AdminBarangEvent.RequestConfirmRefill -> _uiState.update { it.copy(confirmRefillPending = true) }
            AdminBarangEvent.DismissConfirmRefill -> _uiState.update { it.copy(confirmRefillPending = false) }
            AdminBarangEvent.ConfirmRefill -> confirmRefill()

            AdminBarangEvent.OpenHistory -> loadHistory()
            AdminBarangEvent.DismissHistory -> _uiState.update { it.copy(showHistoryDialog = false) }
        }
    }

    private fun loadBarang(isRefresh: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    isLoading = !isRefresh && state.allItems.isEmpty(),
                    isRefreshing = isRefresh || state.allItems.isNotEmpty(),
                    errorMessage = null,
                )
            }
            try {
                when (val res = repository.getBarang()) {
                    is ApiResult.Success -> {
                        _uiState.update {
                            val totalPages = ((res.data.size + AdminBarangUiState.PAGE_SIZE - 1) / AdminBarangUiState.PAGE_SIZE).coerceAtLeast(1)
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                allItems = res.data,
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
                                errorMessage = if (it.allItems.isEmpty()) res.message else null,
                            )
                        }
                        if (_uiState.value.allItems.isNotEmpty()) {
                            _effects.send(AdminBarangEffect.ShowMessage(res.message, isError = true))
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

    private fun openAddOrEdit(item: AdminBarangDto?) {
        val form = if (item != null) {
            BarangFormState(
                isEditing = true,
                barangId = item.barangId,
                namaBarang = item.namaBarang,
                hargaModalDigits = item.hargaModal.toLong().takeIf { it > 0L }?.toString().orEmpty(),
                hargaJualDigits = item.hargaJual.toLong().takeIf { it > 0L }?.toString().orEmpty(),
                stokToko = item.effectiveStokToko.toString(),
                stokGudang = item.effectiveStokGudang.toString(),
                pkm = item.effectivePkm.toString(),
                tglKadaluarsaToko = item.tglKadaluarsaToko?.substringBefore("T").orEmpty(),
                tglKadaluarsaGudang = item.tglKadaluarsaGudang?.substringBefore("T").orEmpty(),
            )
        } else {
            BarangFormState(isEditing = false)
        }
        _uiState.update { it.copy(barangForm = form) }
    }

    private fun submitBarangForm() {
        val form = _uiState.value.barangForm ?: return
        val nama = form.namaBarang.trim()
        val modal = form.hargaModalDigits.toDoubleOrNull()
        val jual = form.hargaJualDigits.toDoubleOrNull()
        if (nama.isEmpty() || modal == null || jual == null) {
            viewModelScope.launch {
                _effects.send(AdminBarangEffect.ShowMessage("Nama, harga modal, dan harga jual wajib diisi", isError = true))
            }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                val res = if (form.isEditing) {
                    repository.updateBarang(
                        UpdateBarangRequest(
                            barangId = form.barangId,
                            namaBarang = nama,
                            pkm = form.pkm.toIntOrNull()?.coerceAtLeast(1) ?: 1,
                            hargaModal = modal,
                            hargaJual = jual,
                            tglKadaluarsaToko = form.tglKadaluarsaToko.trim().ifBlank { null },
                            tglKadaluarsaGudang = form.tglKadaluarsaGudang.trim().ifBlank { null },
                        )
                    )
                } else {
                    repository.tambahBarang(
                        TambahBarangRequest(
                            namaBarang = nama,
                            stokToko = form.stokToko.toIntOrNull() ?: 0,
                            stokGudang = form.stokGudang.toIntOrNull() ?: 0,
                            pkm = form.pkm.toIntOrNull()?.coerceAtLeast(1) ?: 4,
                            hargaModal = modal,
                            hargaJual = jual,
                            tglKadaluarsaToko = form.tglKadaluarsaToko.trim().ifBlank { null },
                            tglKadaluarsaGudang = form.tglKadaluarsaGudang.trim().ifBlank { null },
                        )
                    )
                }
                when (res) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(barangForm = null) }
                        _effects.send(AdminBarangEffect.ShowMessage(res.data))
                        loadBarang(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminBarangEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun confirmDelete() {
        val target = _uiState.value.deleteTarget ?: return
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                when (val res = repository.hapusBarang(target.barangId)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(deleteTarget = null) }
                        _effects.send(AdminBarangEffect.ShowMessage(res.data))
                        loadBarang(isRefresh = true)
                    }
                    is ApiResult.Error -> {
                        _uiState.update { it.copy(deleteTarget = null) }
                        _effects.send(AdminBarangEffect.ShowMessage(res.message, isError = true))
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun openRestock(item: AdminBarangDto) {
        _uiState.update {
            it.copy(
                restockForm = RestockFormState(
                    barangId = item.barangId,
                    namaBarang = item.namaBarang,
                    jumlahTambah = "",
                    hargaBeliDigits = item.hargaModal.toLong().takeIf { v -> v > 0L }?.toString().orEmpty(),
                    tanggalKadaluarsa = item.tglKadaluarsaGudang?.substringBefore("T").orEmpty(),
                    catatan = "Kulakan pengadaan ${item.namaBarang}",
                )
            )
        }
    }

    private fun submitRestock() {
        val form = _uiState.value.restockForm ?: return
        val qty = form.jumlahTambah.toIntOrNull()
        val harga = form.hargaBeliDigits.toDoubleOrNull()
        if (qty == null || qty < 1 || harga == null) {
            viewModelScope.launch {
                _effects.send(AdminBarangEffect.ShowMessage("Jumlah tambah dan harga beli wajib valid", isError = true))
            }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                val res = repository.restockBarang(
                    RestockBarangRequest(
                        barangId = form.barangId,
                        jumlahTambah = qty,
                        hargaBeliSatuan = harga,
                        sumberDana = form.sumberDana,
                        alokasi = form.alokasi,
                        tanggalKadaluarsa = form.tanggalKadaluarsa.trim().ifBlank { null },
                        catatan = form.catatan.trim().ifBlank { null },
                    )
                )
                when (res) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(restockForm = null) }
                        _effects.send(AdminBarangEffect.ShowMessage(res.data.message.ifBlank { "Restock berhasil" }))
                        loadBarang(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminBarangEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun openMutasi(item: AdminBarangDto) {
        val defaultTipe = if (item.effectiveStokGudang > 0) "gudang_ke_toko" else "toko_ke_gudang"
        _uiState.update {
            it.copy(mutasiForm = MutasiFormState(barang = item, tipe = defaultTipe, jumlah = "1"))
        }
    }

    private fun submitMutasi() {
        val form = _uiState.value.mutasiForm ?: return
        val qty = form.jumlah.toIntOrNull()
        if (qty == null || qty < 1) {
            viewModelScope.launch {
                _effects.send(AdminBarangEffect.ShowMessage("Jumlah mutasi minimal 1 pcs", isError = true))
            }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                val res = repository.mutasiStok(
                    MutasiStokRequest(
                        barangId = form.barang.barangId,
                        tipe = form.tipe,
                        jumlah = qty,
                        catatan = form.catatan.trim().ifBlank { null },
                    )
                )
                when (res) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(mutasiForm = null) }
                        _effects.send(AdminBarangEffect.ShowMessage(res.data.message.ifBlank { "Mutasi stok berhasil" }))
                        loadBarang(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminBarangEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun openWriteOff(item: AdminBarangDto) {
        val tokoExpired = item.isTokoExpired
        val defaultLokasi = if (tokoExpired) "toko" else "gudang"
        val defaultQty = if (tokoExpired) item.effectiveStokToko.coerceAtLeast(1) else item.effectiveStokGudang.coerceAtLeast(1)
        _uiState.update {
            it.copy(
                writeOffForm = WriteOffFormState(
                    barang = item,
                    lokasi = defaultLokasi,
                    jumlah = defaultQty.toString(),
                )
            )
        }
    }

    private fun confirmWriteOff() {
        val form = _uiState.value.writeOffForm ?: return
        val qty = form.jumlah.toIntOrNull()
        if (qty == null || qty < 1) {
            viewModelScope.launch {
                _effects.send(AdminBarangEffect.ShowMessage("Jumlah write-off minimal 1 pcs", isError = true))
            }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, confirmWriteOffPending = false) }
            try {
                val res = repository.writeOffExpired(
                    WriteOffExpiredRequest(
                        barangId = form.barang.barangId,
                        lokasi = form.lokasi,
                        jumlah = qty,
                        alasan = form.alasan.trim().ifBlank { null },
                    )
                )
                when (res) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(writeOffForm = null) }
                        _effects.send(AdminBarangEffect.ShowMessage(res.data.message.ifBlank { "Write-off dicatat" }))
                        loadBarang(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminBarangEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun openRefillDialog() {
        val state = _uiState.value
        val available = state.deficitItems
            .filter { it.effectiveStokGudang > 0 }
            .map { item ->
                val pkm = item.effectivePkm
                val toko = item.effectiveStokToko
                val gudang = item.effectiveStokGudang
                val rec = minOf(pkm - toko, gudang).coerceAtLeast(1)
                RefillDraftItem(
                    barangId = item.barangId,
                    namaBarang = item.namaBarang,
                    stokToko = toko,
                    pkm = pkm,
                    stokGudang = gudang,
                    tglKadaluarsaGudang = item.tglKadaluarsaGudang,
                    jumlahAmbil = rec,
                    isSelected = true,
                )
            }
        _uiState.update {
            it.copy(showRefillDialog = true, refillItems = available, confirmRefillPending = false)
        }
    }

    private fun confirmRefill() {
        val selected = _uiState.value.refillItems.filter { it.isSelected && it.jumlahAmbil > 0 }
        if (selected.isEmpty()) {
            viewModelScope.launch {
                _effects.send(AdminBarangEffect.ShowMessage("Pilih minimal 1 barang untuk refill rak", isError = true))
            }
            return
        }
        if (writeJob?.isActive == true) return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, confirmRefillPending = false) }
            try {
                val req = AutoRefillRequest(
                    items = selected.map { AutoRefillItemRequest(barangId = it.barangId, jumlah = it.jumlahAmbil) }
                )
                when (val res = repository.autoRefillDisplay(req)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(showRefillDialog = false) }
                        _effects.send(AdminBarangEffect.ShowMessage(res.data.message.ifBlank { "Refill berhasil" }))
                        loadBarang(isRefresh = true)
                    }
                    is ApiResult.Error -> _effects.send(AdminBarangEffect.ShowMessage(res.message, isError = true))
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun loadHistory() {
        _uiState.update { it.copy(showHistoryDialog = true, isLoadingHistory = true) }
        historyJob?.cancel()
        historyJob = viewModelScope.launch {
            try {
                when (val res = repository.getRiwayatRestock()) {
                    is ApiResult.Success -> {
                        _uiState.update {
                            it.copy(
                                isLoadingHistory = false,
                                historyItems = res.data.data.take(100),
                                totalHistoryPengeluaran = res.data.totalPengeluaran,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        _uiState.update { it.copy(isLoadingHistory = false) }
                        _effects.send(AdminBarangEffect.ShowMessage(res.message, isError = true))
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isLoadingHistory = false) }
            }
        }
    }

    companion object {
        fun factory(repository: AdminRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return AdminBarangViewModel(repository) as T
                }
            }
    }
}
