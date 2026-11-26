package id.koperasipk.app.feature.kasir.ui.serahterima

import androidx.compose.runtime.Immutable
import id.koperasipk.app.feature.kasir.data.CycleCountBarangDto
import id.koperasipk.app.feature.kasir.data.DaftarKasirDto
import id.koperasipk.app.feature.kasir.data.PendingCashOrdersDto

@Immutable
data class BuatSerahTerimaUiState(
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val kasirList: List<DaftarKasirDto> = emptyList(),
    val saldoKasSistem: Double = 0.0,
    val pendingCashOrders: PendingCashOrdersDto? = null,
    val cycleItems: List<CycleCountBarangDto> = emptyList(),
    val allItems: List<CycleCountBarangDto> = emptyList(),
    val manuallyAddedIds: Set<Int> = emptySet(),
    val selectedKasir: DaftarKasirDto? = null,
    val uangFisikText: String = "",
    val catatan: String = "",
    val stokFisikInputs: Map<Int, String> = emptyMap(),
    val searchItemQuery: String = "",
    val isSubmitting: Boolean = false,
) {
    val cycleItemIds: Set<Int>
        get() = cycleItems.mapTo(hashSetOf()) { it.barangId }

    val searchResults: List<CycleCountBarangDto>
        get() {
            val q = searchItemQuery.trim().lowercase()
            if (q.isEmpty()) return emptyList()
            return allItems.filter { it.namaBarang.lowercase().contains(q) }.take(10)
        }
}

sealed interface BuatSerahTerimaEvent {
    data object LoadDraft : BuatSerahTerimaEvent
    data class SelectKasir(val kasir: DaftarKasirDto) : BuatSerahTerimaEvent
    data class UangFisikChanged(val digits: String) : BuatSerahTerimaEvent
    data class CatatanChanged(val value: String) : BuatSerahTerimaEvent
    data class SearchItemChanged(val query: String) : BuatSerahTerimaEvent
    data class AddItemToCount(val item: CycleCountBarangDto) : BuatSerahTerimaEvent
    data class RemoveAddedItem(val barangId: Int) : BuatSerahTerimaEvent
    data class StokFisikChanged(val barangId: Int, val digits: String) : BuatSerahTerimaEvent
    data object SubmitSerahTerima : BuatSerahTerimaEvent
}

sealed interface BuatSerahTerimaEffect {
    data class ShowMessage(val message: String) : BuatSerahTerimaEffect
    data object SubmitSuccess : BuatSerahTerimaEffect
}
