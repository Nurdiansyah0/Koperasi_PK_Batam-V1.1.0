package id.koperasipk.app.feature.kasir.ui.serahterima

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.feature.kasir.data.CycleCountBarangDto
import id.koperasipk.app.feature.kasir.data.HasilOpnameDto
import id.koperasipk.app.feature.kasir.data.KasirRepository
import id.koperasipk.app.feature.kasir.data.OpnameItemDto
import id.koperasipk.app.feature.kasir.data.OpnameSummaryDto
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.math.abs

class BuatSerahTerimaViewModel(
    private val repository: KasirRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BuatSerahTerimaUiState())
    val uiState: StateFlow<BuatSerahTerimaUiState> = _uiState.asStateFlow()

    private val _effects = Channel<BuatSerahTerimaEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var submitJob: Job? = null

    init {
        loadDraft()
    }

    fun onEvent(event: BuatSerahTerimaEvent) {
        when (event) {
            BuatSerahTerimaEvent.LoadDraft -> loadDraft()
            is BuatSerahTerimaEvent.SelectKasir -> _uiState.update { it.copy(selectedKasir = event.kasir) }
            is BuatSerahTerimaEvent.UangFisikChanged -> _uiState.update {
                it.copy(uangFisikText = event.digits.filter(Char::isDigit))
            }
            is BuatSerahTerimaEvent.CatatanChanged -> _uiState.update { it.copy(catatan = event.value) }
            is BuatSerahTerimaEvent.SearchItemChanged -> _uiState.update {
                it.copy(searchItemQuery = event.query)
            }
            is BuatSerahTerimaEvent.AddItemToCount -> addItem(event.item)
            is BuatSerahTerimaEvent.RemoveAddedItem -> removeAddedItem(event.barangId)
            is BuatSerahTerimaEvent.StokFisikChanged -> _uiState.update { state ->
                val updated = state.stokFisikInputs.toMutableMap()
                updated[event.barangId] = event.digits.filter(Char::isDigit)
                state.copy(stokFisikInputs = updated)
            }
            BuatSerahTerimaEvent.SubmitSerahTerima -> submit()
        }
    }

    private fun loadDraft() {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val res = repository.getSerahTerimaDraft()) {
                is ApiResult.Success -> {
                    val draft = res.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = null,
                            kasirList = draft.kasirList,
                            saldoKasSistem = draft.saldoKasSistem,
                            pendingCashOrders = draft.pendingCashOrders,
                            cycleItems = draft.cycleCountItems,
                            allItems = draft.allItems.ifEmpty { draft.cycleCountItems },
                        )
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = res.message,
                        )
                    }
                }
            }
        }
    }

    private fun addItem(item: CycleCountBarangDto) {
        val state = _uiState.value
        if (state.cycleItemIds.contains(item.barangId)) {
            emitMessage("Barang ini sudah ada dalam daftar hitungan")
            return
        }
        _uiState.update {
            it.copy(
                cycleItems = listOf(item) + it.cycleItems,
                manuallyAddedIds = it.manuallyAddedIds + item.barangId,
                searchItemQuery = "",
            )
        }
        emitMessage("\"${item.namaBarang}\" ditambahkan ke hitungan fisik toko")
    }

    private fun removeAddedItem(barangId: Int) {
        _uiState.update { state ->
            val updatedInputs = state.stokFisikInputs.toMutableMap().apply { remove(barangId) }
            state.copy(
                cycleItems = state.cycleItems.filterNot { it.barangId == barangId },
                manuallyAddedIds = state.manuallyAddedIds - barangId,
                stokFisikInputs = updatedInputs,
            )
        }
    }

    private fun submit() {
        if (submitJob?.isActive == true) return
        val s = _uiState.value
        val kasirTo = s.selectedKasir
        if (kasirTo == null) {
            emitMessage("Pilih Kasir tujuan penerima shift")
            return
        }
        if (s.uangFisikText.isBlank()) {
            emitMessage("Masukkan jumlah uang kas fisik di laci")
            return
        }
        for (item in s.cycleItems) {
            val raw = s.stokFisikInputs[item.barangId]
            if (raw.isNullOrBlank()) {
                emitMessage("Harap isi hitungan fisik toko untuk barang: ${item.namaBarang}")
                return
            }
        }

        val nominalUangFisik = s.uangFisikText.toDoubleOrNull() ?: 0.0
        val selisihKas = nominalUangFisik - s.saldoKasSistem
        val itemsPayload = s.cycleItems.map { item ->
            val aktual = s.stokFisikInputs[item.barangId]?.toIntOrNull() ?: 0
            val input = item.stokToko
            val selisih = aktual - input
            val selisihNominal = selisih * item.hargaJual
            OpnameItemDto(
                barangId = item.barangId,
                namaBarang = item.namaBarang,
                hargaJual = item.hargaJual,
                stokAktual = aktual,
                stokInput = input,
                selisih = selisih,
                selisihNominal = selisihNominal,
                status = if (selisih == 0) "sesuai" else "selisih",
                auditReason = item.auditReason ?: "PKM Display: ${item.pkm} pcs",
                riskBadge = item.riskBadge ?: "Cycle Count",
            )
        }

        val barangSelisihCount = itemsPayload.count { it.status == "selisih" }
        val totalSelisihQty = itemsPayload.sumOf { it.selisih }
        val totalSelisihNominal = itemsPayload.sumOf { it.selisihNominal }
        val totalMinusNominal = itemsPayload.filter { it.selisih < 0 }.sumOf { abs(it.selisihNominal) }

        val opname = HasilOpnameDto(
            summary = OpnameSummaryDto(
                totalBarang = s.cycleItems.size,
                barangSesuai = s.cycleItems.size - barangSelisihCount,
                barangSelisih = barangSelisihCount,
                totalSelisihQty = totalSelisihQty,
                totalSelisihNominal = totalSelisihNominal,
                totalMinusNominal = totalMinusNominal,
                pendingCashOrdersCount = s.pendingCashOrders?.count ?: 0,
                pendingCashOrdersNominal = s.pendingCashOrders?.nominal ?: 0.0,
            ),
            pendingCashOrders = s.pendingCashOrders,
            saldoKasSistem = s.saldoKasSistem,
            uangFisik = nominalUangFisik,
            selisihKas = selisihKas,
            catatan = s.catatan.trim(),
            items = itemsPayload,
            type = "hybrid_cycle_count",
            timestamp = DateFormatter.todayApiDate(),
        )

        submitJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            when (val res = repository.createSerahTerima(kasirTo.userId, opname)) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false) }
                    _effects.send(BuatSerahTerimaEffect.ShowMessage(res.data))
                    _effects.send(BuatSerahTerimaEffect.SubmitSuccess)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isSubmitting = false) }
                    _effects.send(BuatSerahTerimaEffect.ShowMessage(res.message))
                }
            }
        }
    }

    private fun emitMessage(message: String) {
        viewModelScope.launch {
            _effects.send(BuatSerahTerimaEffect.ShowMessage(message))
        }
    }

    companion object {
        fun factory(repository: KasirRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return BuatSerahTerimaViewModel(repository) as T
                }
            }
    }
}
