package id.koperasipk.app.feature.admin.laporan

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.CashAdjustmentDto
import id.koperasipk.app.feature.admin.data.CashAdjustmentRequest
import id.koperasipk.app.feature.admin.data.KasirDropdownDto
import id.koperasipk.app.feature.admin.data.LaporanTransaksiItemDto
import id.koperasipk.app.feature.admin.data.LaporanTransaksiRequest
import id.koperasipk.app.feature.admin.data.LaporanTransaksiResponse
import id.koperasipk.app.feature.admin.data.PengeluaranDto
import id.koperasipk.app.feature.admin.data.RekapAnggotaShuDto
import id.koperasipk.app.feature.admin.data.RekapBarangDto
import id.koperasipk.app.feature.admin.data.TambahPengeluaranRequest
import id.koperasipk.app.feature.admin.data.TransaksiHarianDto
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.Calendar
import kotlin.math.max

enum class LaporanDatePreset(val key: String, val label: String) {
    TODAY("today", "Hari Ini"),
    YESTERDAY("yesterday", "Kemarin"),
    SEVEN_DAYS("7days", "7 Hari"),
    THIS_MONTH("this_month", "Bulan Ini"),
    LAST_MONTH("last_month", "Bulan Lalu"),
    THREE_MONTHS("3_months", "3 Bulan"),
    SIX_MONTHS("6_months", "6 Bulan"),
    TWELVE_MONTHS("12_months", "1 Tahun"),
    ALL("all", "Semua"),
    CUSTOM("custom", "Kustom"),
}

enum class LaporanTab(val label: String) {
    RINGKASAN("Ringkasan"),
    TRANSAKSI("Transaksi"),
    PENGELUARAN("Pengeluaran"),
    PENYESUAIAN("Penyesuaian Kas"),
    KINERJA("Kasir & Tren"),
    REKAP("SHU & Barang"),
}

enum class RekapSubTab(val label: String) {
    ANGGOTA("SHU Anggota"),
    BARANG("Performa Barang"),
}

@Immutable
data class AdminLaporanUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSubmitting: Boolean = false,
    val activeTab: LaporanTab = LaporanTab.RINGKASAN,
    val activeRekapSubTab: RekapSubTab = RekapSubTab.ANGGOTA,
    val selectedPreset: LaporanDatePreset = LaporanDatePreset.THIS_MONTH,
    val tanggalAwal: String = "",
    val tanggalAkhir: String = "",
    val metodeFilter: String = "all",
    val pembeliFilter: String = "all",
    val kasirFilter: String = "all",
    val searchQuery: String = "",
    val appliedSearchQuery: String = "",
    val page: Int = 1,
    val perPage: Int = 20,
    val report: LaporanTransaksiResponse? = null,
    val kasirList: List<KasirDropdownDto> = emptyList(),
    val errorMessage: String? = null,
    val pengeluaranPage: Int = 1,
    val cashAdjPage: Int = 1,
    val harianPage: Int = 1,
    val rekapSearchQuery: String = "",
    val rekapPage: Int = 1,
    val showFilterDialog: Boolean = false,
    val selectedReceipt: LaporanTransaksiItemDto? = null,
    val showPengeluaranDialog: Boolean = false,
    val pengeluaranNama: String = "",
    val pengeluaranNominalDigits: String = "",
    val pengeluaranTanggal: String = "",
    val pengeluaranKategori: String = "Operasional",
    val pengeluaranKeterangan: String = "",
    val pengeluaranError: String? = null,
    val deletePengeluaranTarget: PengeluaranDto? = null,
    val showCashAdjDialog: Boolean = false,
    val cashAdjDate: String = "",
    val cashAdjType: String = "HISTORICAL_INVENTORY_PURCHASE",
    val cashAdjDirection: String = "OUT",
    val cashAdjSource: String = "CASH",
    val cashAdjAmountDigits: String = "",
    val cashAdjReason: String = "",
    val cashAdjReference: String = "",
    val cashAdjError: String? = null,
) {
    val activeFilterCount: Int
        get() = listOf(
            metodeFilter != "all",
            pembeliFilter != "all",
            kasirFilter != "all",
            appliedSearchQuery.isNotBlank(),
            selectedPreset == LaporanDatePreset.CUSTOM,
        ).count { it }

    val kasirNameMap: Map<Int, String>
        get() = buildMap {
            kasirList.forEach { k ->
                put(k.userId, k.namaLengkap?.takeIf { it.isNotBlank() } ?: k.username)
            }
            report?.daftarKasir?.forEach { k ->
                putIfAbsent(k.userId, k.namaLengkap?.takeIf { it.isNotBlank() } ?: k.username)
            }
        }

    val pengeluaranList: List<PengeluaranDto>
        get() = report?.pengeluaranOperasional ?: emptyList()

    val pengeluaranTotalPages: Int
        get() = max(1, (pengeluaranList.size + SECONDARY_PAGE_SIZE - 1) / SECONDARY_PAGE_SIZE)

    val pagedPengeluaran: List<PengeluaranDto>
        get() = paginate(pengeluaranList, pengeluaranPage, SECONDARY_PAGE_SIZE)

    val cashAdjustmentList: List<CashAdjustmentDto>
        get() = report?.cashAdjustments ?: emptyList()

    val cashAdjTotalPages: Int
        get() = max(1, (cashAdjustmentList.size + SECONDARY_PAGE_SIZE - 1) / SECONDARY_PAGE_SIZE)

    val pagedCashAdjustments: List<CashAdjustmentDto>
        get() = paginate(cashAdjustmentList, cashAdjPage, SECONDARY_PAGE_SIZE)

    val harianList: List<TransaksiHarianDto>
        get() = report?.transaksiHarian ?: emptyList()

    val harianTotalPages: Int
        get() = max(1, (harianList.size + SECONDARY_PAGE_SIZE - 1) / SECONDARY_PAGE_SIZE)

    val pagedHarian: List<TransaksiHarianDto>
        get() = paginate(harianList, harianPage, SECONDARY_PAGE_SIZE)

    val filteredRekapAnggota: List<RekapAnggotaShuDto>
        get() {
            val all = report?.rekapAnggota ?: emptyList()
            val q = rekapSearchQuery.trim()
            if (q.isEmpty()) return all
            return all.filter { it.namaLengkap.contains(q, ignoreCase = true) }
        }

    val filteredRekapBarang: List<RekapBarangDto>
        get() {
            val all = report?.rekapBarang ?: emptyList()
            val q = rekapSearchQuery.trim()
            if (q.isEmpty()) return all
            return all.filter { it.namaBarang.contains(q, ignoreCase = true) }
        }

    val rekapTotalItems: Int
        get() = if (activeRekapSubTab == RekapSubTab.ANGGOTA) {
            filteredRekapAnggota.size
        } else {
            filteredRekapBarang.size
        }

    val rekapTotalPages: Int
        get() = max(1, (rekapTotalItems + SECONDARY_PAGE_SIZE - 1) / SECONDARY_PAGE_SIZE)

    val pagedRekapAnggota: List<RekapAnggotaShuDto>
        get() = paginate(filteredRekapAnggota, rekapPage, SECONDARY_PAGE_SIZE)

    val pagedRekapBarang: List<RekapBarangDto>
        get() = paginate(filteredRekapBarang, rekapPage, SECONDARY_PAGE_SIZE)

    companion object {
        const val SECONDARY_PAGE_SIZE = 15

        private fun <T> paginate(items: List<T>, page: Int, pageSize: Int): List<T> {
            if (items.isEmpty()) return emptyList()
            val totalPages = max(1, (items.size + pageSize - 1) / pageSize)
            val safePage = page.coerceIn(1, totalPages)
            val start = (safePage - 1) * pageSize
            val end = (start + pageSize).coerceAtMost(items.size)
            return items.subList(start, end)
        }
    }
}

sealed interface AdminLaporanEvent {
    data object Load : AdminLaporanEvent
    data object Refresh : AdminLaporanEvent
    data class SelectTab(val tab: LaporanTab) : AdminLaporanEvent
    data class SelectRekapSubTab(val subTab: RekapSubTab) : AdminLaporanEvent
    data class UpdateRekapSearch(val query: String) : AdminLaporanEvent
    data class SetRekapPage(val page: Int) : AdminLaporanEvent
    data class SelectPreset(val preset: LaporanDatePreset) : AdminLaporanEvent
    data object OpenFilterDialog : AdminLaporanEvent
    data object DismissFilterDialog : AdminLaporanEvent
    data class ApplyFilters(
        val tanggalAwal: String,
        val tanggalAkhir: String,
        val metodeFilter: String,
        val pembeliFilter: String,
        val kasirFilter: String,
        val perPage: Int,
        val isCustomDate: Boolean,
    ) : AdminLaporanEvent
    data object ResetFilters : AdminLaporanEvent
    data class UpdateSearchQuery(val query: String) : AdminLaporanEvent
    data object SubmitSearch : AdminLaporanEvent
    data class SetPage(val page: Int) : AdminLaporanEvent
    data class SetPengeluaranPage(val page: Int) : AdminLaporanEvent
    data class SetCashAdjPage(val page: Int) : AdminLaporanEvent
    data class SetHarianPage(val page: Int) : AdminLaporanEvent
    data class SelectReceipt(val item: LaporanTransaksiItemDto?) : AdminLaporanEvent
    data object OpenPengeluaranDialog : AdminLaporanEvent
    data object DismissPengeluaranDialog : AdminLaporanEvent
    data class UpdatePengeluaranForm(
        val nama: String? = null,
        val nominalDigits: String? = null,
        val tanggal: String? = null,
        val kategori: String? = null,
        val keterangan: String? = null,
    ) : AdminLaporanEvent
    data object SubmitPengeluaran : AdminLaporanEvent
    data class RequestDeletePengeluaran(val item: PengeluaranDto) : AdminLaporanEvent
    data object DismissDeletePengeluaran : AdminLaporanEvent
    data object ConfirmDeletePengeluaran : AdminLaporanEvent
    data object OpenCashAdjDialog : AdminLaporanEvent
    data object DismissCashAdjDialog : AdminLaporanEvent
    data class UpdateCashAdjForm(
        val date: String? = null,
        val type: String? = null,
        val direction: String? = null,
        val source: String? = null,
        val amountDigits: String? = null,
        val reason: String? = null,
        val reference: String? = null,
    ) : AdminLaporanEvent
    data object SubmitCashAdj : AdminLaporanEvent
}

sealed interface AdminLaporanEffect {
    data class ShowMessage(val message: String, val isError: Boolean = false) : AdminLaporanEffect
}

class AdminLaporanViewModel(
    private val repository: AdminRepository,
    private val dateRangeProvider: (LaporanDatePreset) -> Pair<String, String> = ::resolvePresetDates,
) : ViewModel() {

    private val initialDates = dateRangeProvider(LaporanDatePreset.THIS_MONTH)

    private val _uiState = MutableStateFlow(
        AdminLaporanUiState(
            tanggalAwal = initialDates.first,
            tanggalAkhir = initialDates.second,
        ),
    )
    val uiState: StateFlow<AdminLaporanUiState> = _uiState.asStateFlow()

    private val _effects = Channel<AdminLaporanEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var writeJob: Job? = null

    init {
        loadReport(isRefresh = false)
    }

    fun onEvent(event: AdminLaporanEvent) {
        when (event) {
            AdminLaporanEvent.Load -> loadReport(isRefresh = false)
            AdminLaporanEvent.Refresh -> loadReport(isRefresh = true)
            is AdminLaporanEvent.SelectTab -> _uiState.update { it.copy(activeTab = event.tab) }
            is AdminLaporanEvent.SelectRekapSubTab -> _uiState.update {
                it.copy(activeRekapSubTab = event.subTab, rekapPage = 1)
            }
            is AdminLaporanEvent.UpdateRekapSearch -> _uiState.update {
                it.copy(rekapSearchQuery = event.query, rekapPage = 1)
            }
            is AdminLaporanEvent.SetRekapPage -> _uiState.update {
                it.copy(rekapPage = event.page.coerceIn(1, it.rekapTotalPages))
            }
            is AdminLaporanEvent.SelectPreset -> handleSelectPreset(event.preset)
            AdminLaporanEvent.OpenFilterDialog -> _uiState.update { it.copy(showFilterDialog = true) }
            AdminLaporanEvent.DismissFilterDialog -> _uiState.update { it.copy(showFilterDialog = false) }
            is AdminLaporanEvent.ApplyFilters -> {
                _uiState.update {
                    it.copy(
                        selectedPreset = if (event.isCustomDate) LaporanDatePreset.CUSTOM else it.selectedPreset,
                        tanggalAwal = event.tanggalAwal.trim(),
                        tanggalAkhir = event.tanggalAkhir.trim(),
                        metodeFilter = event.metodeFilter,
                        pembeliFilter = event.pembeliFilter,
                        kasirFilter = event.kasirFilter,
                        perPage = event.perPage,
                        page = 1,
                        showFilterDialog = false,
                    )
                }
                loadReport(isRefresh = _uiState.value.report != null)
            }
            AdminLaporanEvent.ResetFilters -> {
                val monthDates = dateRangeProvider(LaporanDatePreset.THIS_MONTH)
                _uiState.update {
                    it.copy(
                        selectedPreset = LaporanDatePreset.THIS_MONTH,
                        tanggalAwal = monthDates.first,
                        tanggalAkhir = monthDates.second,
                        metodeFilter = "all",
                        pembeliFilter = "all",
                        kasirFilter = "all",
                        searchQuery = "",
                        appliedSearchQuery = "",
                        page = 1,
                        perPage = 20,
                        showFilterDialog = false,
                    )
                }
                loadReport(isRefresh = _uiState.value.report != null)
            }
            is AdminLaporanEvent.UpdateSearchQuery -> _uiState.update { it.copy(searchQuery = event.query) }
            AdminLaporanEvent.SubmitSearch -> {
                _uiState.update { it.copy(appliedSearchQuery = it.searchQuery.trim(), page = 1) }
                loadReport(isRefresh = _uiState.value.report != null)
            }
            is AdminLaporanEvent.SetPage -> {
                val maxPage = max(1, _uiState.value.report?.pagination?.lastPage ?: 1)
                val target = event.page.coerceIn(1, maxPage)
                if (target != _uiState.value.page) {
                    _uiState.update { it.copy(page = target) }
                    loadReport(isRefresh = true)
                }
            }
            is AdminLaporanEvent.SetPengeluaranPage -> _uiState.update {
                it.copy(pengeluaranPage = event.page.coerceIn(1, it.pengeluaranTotalPages))
            }
            is AdminLaporanEvent.SetCashAdjPage -> _uiState.update {
                it.copy(cashAdjPage = event.page.coerceIn(1, it.cashAdjTotalPages))
            }
            is AdminLaporanEvent.SetHarianPage -> _uiState.update {
                it.copy(harianPage = event.page.coerceIn(1, it.harianTotalPages))
            }
            is AdminLaporanEvent.SelectReceipt -> _uiState.update { it.copy(selectedReceipt = event.item) }
            AdminLaporanEvent.OpenPengeluaranDialog -> _uiState.update {
                it.copy(
                    showPengeluaranDialog = true,
                    pengeluaranNama = "",
                    pengeluaranNominalDigits = "",
                    pengeluaranTanggal = DateFormatter.todayApiDate(),
                    pengeluaranKategori = "Operasional",
                    pengeluaranKeterangan = "",
                    pengeluaranError = null,
                )
            }
            AdminLaporanEvent.DismissPengeluaranDialog -> _uiState.update {
                it.copy(showPengeluaranDialog = false, pengeluaranError = null)
            }
            is AdminLaporanEvent.UpdatePengeluaranForm -> _uiState.update {
                it.copy(
                    pengeluaranNama = event.nama ?: it.pengeluaranNama,
                    pengeluaranNominalDigits = event.nominalDigits ?: it.pengeluaranNominalDigits,
                    pengeluaranTanggal = event.tanggal ?: it.pengeluaranTanggal,
                    pengeluaranKategori = event.kategori ?: it.pengeluaranKategori,
                    pengeluaranKeterangan = event.keterangan ?: it.pengeluaranKeterangan,
                    pengeluaranError = null,
                )
            }
            AdminLaporanEvent.SubmitPengeluaran -> submitPengeluaran()
            is AdminLaporanEvent.RequestDeletePengeluaran -> _uiState.update {
                it.copy(deletePengeluaranTarget = event.item)
            }
            AdminLaporanEvent.DismissDeletePengeluaran -> _uiState.update {
                it.copy(deletePengeluaranTarget = null)
            }
            AdminLaporanEvent.ConfirmDeletePengeluaran -> confirmDeletePengeluaran()
            AdminLaporanEvent.OpenCashAdjDialog -> _uiState.update {
                it.copy(
                    showCashAdjDialog = true,
                    cashAdjDate = DateFormatter.todayApiDate(),
                    cashAdjType = "HISTORICAL_INVENTORY_PURCHASE",
                    cashAdjDirection = "OUT",
                    cashAdjSource = "CASH",
                    cashAdjAmountDigits = "",
                    cashAdjReason = "",
                    cashAdjReference = "",
                    cashAdjError = null,
                )
            }
            AdminLaporanEvent.DismissCashAdjDialog -> _uiState.update {
                it.copy(showCashAdjDialog = false, cashAdjError = null)
            }
            is AdminLaporanEvent.UpdateCashAdjForm -> _uiState.update {
                it.copy(
                    cashAdjDate = event.date ?: it.cashAdjDate,
                    cashAdjType = event.type ?: it.cashAdjType,
                    cashAdjDirection = event.direction ?: it.cashAdjDirection,
                    cashAdjSource = event.source ?: it.cashAdjSource,
                    cashAdjAmountDigits = event.amountDigits ?: it.cashAdjAmountDigits,
                    cashAdjReason = event.reason ?: it.cashAdjReason,
                    cashAdjReference = event.reference ?: it.cashAdjReference,
                    cashAdjError = null,
                )
            }
            AdminLaporanEvent.SubmitCashAdj -> submitCashAdjustment()
        }
    }

    private fun handleSelectPreset(preset: LaporanDatePreset) {
        if (preset == LaporanDatePreset.CUSTOM) {
            _uiState.update { it.copy(selectedPreset = preset, showFilterDialog = true) }
            return
        }
        val (start, end) = dateRangeProvider(preset)
        _uiState.update {
            it.copy(
                selectedPreset = preset,
                tanggalAwal = start,
                tanggalAkhir = end,
                page = 1,
            )
        }
        loadReport(isRefresh = _uiState.value.report != null)
    }

    private fun loadReport(isRefresh: Boolean) {
        loadJob?.cancel()
        val currentJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.report == null,
                    isRefreshing = isRefresh || it.report != null,
                    errorMessage = null,
                )
            }
            try {
                val snapshot = _uiState.value
                val request = LaporanTransaksiRequest(
                    tanggalAwal = snapshot.tanggalAwal.ifBlank { null },
                    tanggalAkhir = snapshot.tanggalAkhir.ifBlank { null },
                    metodePembayaran = snapshot.metodeFilter.takeIf { it != "all" },
                    kasirId = snapshot.kasirFilter.takeIf { it != "all" },
                    pembeliType = snapshot.pembeliFilter.takeIf { it != "all" },
                    search = snapshot.appliedSearchQuery.ifBlank { null },
                    page = snapshot.page,
                    perPage = snapshot.perPage,
                )
                when (val res = repository.getLaporanTransaksi(request)) {
                    is ApiResult.Success -> {
                        val kasir = res.data.daftarKasir.ifEmpty {
                            when (val kasirRes = repository.getDataKasir()) {
                                is ApiResult.Success -> kasirRes.data
                                is ApiResult.Error -> _uiState.value.kasirList
                            }
                        }
                        _uiState.update {
                            it.copy(
                                report = res.data,
                                kasirList = kasir,
                                errorMessage = null,
                                pengeluaranPage = 1,
                                cashAdjPage = 1,
                                harianPage = 1,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        _uiState.update {
                            it.copy(
                                errorMessage = if (it.report == null) res.message else null,
                            )
                        }
                        if (_uiState.value.report != null) {
                            _effects.send(AdminLaporanEffect.ShowMessage(res.message, isError = true))
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isLoading = false, isRefreshing = false) }
            }
        }
        loadJob = currentJob
    }

    private fun submitPengeluaran() {
        if (writeJob?.isActive == true) return
        val s = _uiState.value
        val nama = s.pengeluaranNama.trim()
        val nominal = s.pengeluaranNominalDigits.toDoubleOrNull() ?: 0.0
        val tanggal = s.pengeluaranTanggal.trim()
        if (nama.isEmpty()) {
            _uiState.update { it.copy(pengeluaranError = "Nama pengeluaran wajib diisi") }
            return
        }
        if (nominal <= 0.0) {
            _uiState.update { it.copy(pengeluaranError = "Nominal harus lebih dari 0") }
            return
        }
        if (tanggal.isNotEmpty() && !DATE_REGEX.matches(tanggal)) {
            _uiState.update { it.copy(pengeluaranError = "Format tanggal harus YYYY-MM-DD") }
            return
        }
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, pengeluaranError = null) }
            try {
                val request = TambahPengeluaranRequest(
                    namaPengeluaran = nama,
                    nominal = nominal,
                    tanggal = tanggal.ifEmpty { null },
                    kategori = s.pengeluaranKategori.trim().ifEmpty { "Operasional" },
                    keterangan = s.pengeluaranKeterangan.trim().ifEmpty { null },
                )
                when (val res = repository.tambahPengeluaran(request)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(showPengeluaranDialog = false) }
                        _effects.send(
                            AdminLaporanEffect.ShowMessage(
                                res.data.message.ifBlank { "Pengeluaran operasional berhasil dicatat" },
                            ),
                        )
                        loadReport(isRefresh = true)
                    }
                    is ApiResult.Error -> {
                        _uiState.update { it.copy(pengeluaranError = res.message) }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun confirmDeletePengeluaran() {
        if (writeJob?.isActive == true) return
        val target = _uiState.value.deletePengeluaranTarget ?: return
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                when (val res = repository.hapusPengeluaran(target.pengeluaranId)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(deletePengeluaranTarget = null) }
                        _effects.send(AdminLaporanEffect.ShowMessage(res.data))
                        loadReport(isRefresh = true)
                    }
                    is ApiResult.Error -> {
                        _uiState.update { it.copy(deletePengeluaranTarget = null) }
                        _effects.send(AdminLaporanEffect.ShowMessage(res.message, isError = true))
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun submitCashAdjustment() {
        if (writeJob?.isActive == true) return
        val s = _uiState.value
        val date = s.cashAdjDate.trim()
        val amount = s.cashAdjAmountDigits.toDoubleOrNull() ?: 0.0
        val reason = s.cashAdjReason.trim()
        if (!DATE_REGEX.matches(date)) {
            _uiState.update { it.copy(cashAdjError = "Tanggal wajib format YYYY-MM-DD") }
            return
        }
        if (amount <= 0.0) {
            _uiState.update { it.copy(cashAdjError = "Nominal penyesuaian harus lebih dari 0") }
            return
        }
        if (reason.isEmpty()) {
            _uiState.update { it.copy(cashAdjError = "Alasan / keterangan penyesuaian wajib diisi") }
            return
        }
        writeJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, cashAdjError = null) }
            try {
                val request = CashAdjustmentRequest(
                    adjustmentDate = date,
                    type = s.cashAdjType,
                    amount = amount,
                    direction = s.cashAdjDirection,
                    source = s.cashAdjSource,
                    reason = reason,
                    reference = s.cashAdjReference.trim().ifEmpty { null },
                )
                when (val res = repository.storeCashAdjustment(request)) {
                    is ApiResult.Success -> {
                        _uiState.update { it.copy(showCashAdjDialog = false) }
                        _effects.send(
                            AdminLaporanEffect.ShowMessage(
                                res.data.message.ifBlank { "Penyesuaian kas berhasil disimpan" },
                            ),
                        )
                        loadReport(isRefresh = true)
                    }
                    is ApiResult.Error -> {
                        _uiState.update { it.copy(cashAdjError = res.message) }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    companion object {
        private val DATE_REGEX = Regex("""^\d{4}-\d{2}-\d{2}$""")

        fun resolvePresetDates(preset: LaporanDatePreset): Pair<String, String> {
            if (preset == LaporanDatePreset.ALL) return "" to ""
            val endCal = Calendar.getInstance()
            val today = DateFormatter.formatApiDate(endCal.timeInMillis)
            val startCal = Calendar.getInstance()
            return when (preset) {
                LaporanDatePreset.TODAY -> today to today
                LaporanDatePreset.YESTERDAY -> {
                    startCal.add(Calendar.DAY_OF_MONTH, -1)
                    val yest = DateFormatter.formatApiDate(startCal.timeInMillis)
                    yest to yest
                }
                LaporanDatePreset.SEVEN_DAYS -> {
                    startCal.add(Calendar.DAY_OF_MONTH, -6)
                    DateFormatter.formatApiDate(startCal.timeInMillis) to today
                }
                LaporanDatePreset.THIS_MONTH -> {
                    startCal.set(Calendar.DAY_OF_MONTH, 1)
                    DateFormatter.formatApiDate(startCal.timeInMillis) to today
                }
                LaporanDatePreset.LAST_MONTH -> {
                    startCal.set(Calendar.DAY_OF_MONTH, 1)
                    startCal.add(Calendar.MONTH, -1)
                    val start = DateFormatter.formatApiDate(startCal.timeInMillis)
                    startCal.set(Calendar.DAY_OF_MONTH, startCal.getActualMaximum(Calendar.DAY_OF_MONTH))
                    val end = DateFormatter.formatApiDate(startCal.timeInMillis)
                    start to end
                }
                LaporanDatePreset.THREE_MONTHS -> {
                    startCal.set(Calendar.DAY_OF_MONTH, 1)
                    startCal.add(Calendar.MONTH, -2)
                    DateFormatter.formatApiDate(startCal.timeInMillis) to today
                }
                LaporanDatePreset.SIX_MONTHS -> {
                    startCal.set(Calendar.DAY_OF_MONTH, 1)
                    startCal.add(Calendar.MONTH, -5)
                    DateFormatter.formatApiDate(startCal.timeInMillis) to today
                }
                LaporanDatePreset.TWELVE_MONTHS -> {
                    startCal.set(Calendar.DAY_OF_MONTH, 1)
                    startCal.add(Calendar.MONTH, -11)
                    DateFormatter.formatApiDate(startCal.timeInMillis) to today
                }
                LaporanDatePreset.ALL, LaporanDatePreset.CUSTOM -> {
                    startCal.set(Calendar.DAY_OF_MONTH, 1)
                    DateFormatter.formatApiDate(startCal.timeInMillis) to today
                }
            }
        }

        fun factory(repository: AdminRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return AdminLaporanViewModel(repository) as T
                }
            }
    }
}
