package id.koperasipk.app.feature.kasir.ui.serahterima

import androidx.compose.runtime.Immutable
import id.koperasipk.app.feature.kasir.data.ActiveShiftDetailDto
import id.koperasipk.app.feature.kasir.data.DaftarKasirDto
import id.koperasipk.app.feature.kasir.data.SerahTerimaDto

enum class SerahTerimaTab(val apiType: String, val label: String) {
    PENDING("pending", "Tugas Masuk"),
    HISTORY("history", "Riwayat Shift"),
}

enum class OpnameDetailFilter(val label: String) {
    ALL("Semua"),
    SELISIH("Selisih"),
    ROKOK("Rokok"),
}

@Immutable
data class SerahTerimaUiState(
    val activeTab: SerahTerimaTab = SerahTerimaTab.PENDING,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val items: List<SerahTerimaDto> = emptyList(),
    val currentPage: Int = 1,
    val lastPage: Int = 1,
    val activeShift: ActiveShiftDetailDto? = null,
    val hasPendingOutgoing: Boolean = false,
    val daftarKasir: List<DaftarKasirDto> = emptyList(),
    val selectedItem: SerahTerimaDto? = null,
    val detailFilter: OpnameDetailFilter = OpnameDetailFilter.ALL,
    val showRejectDialog: Boolean = false,
    val alasanPenolakan: String = "",
    val rejectError: String? = null,
    val processingId: Int? = null,
)

sealed interface SerahTerimaEvent {
    data object Refresh : SerahTerimaEvent
    data class TabSelected(val tab: SerahTerimaTab) : SerahTerimaEvent
    data class ChangePage(val page: Int) : SerahTerimaEvent
    data class SelectItem(val item: SerahTerimaDto) : SerahTerimaEvent
    data object DismissDetail : SerahTerimaEvent
    data class DetailFilterSelected(val filter: OpnameDetailFilter) : SerahTerimaEvent
    data class Approve(val serahId: Int) : SerahTerimaEvent
    data object OpenRejectDialog : SerahTerimaEvent
    data object DismissRejectDialog : SerahTerimaEvent
    data class AlasanPenolakanChanged(val value: String) : SerahTerimaEvent
    data object SubmitReject : SerahTerimaEvent
}

sealed interface SerahTerimaEffect {
    data class ShowMessage(val message: String) : SerahTerimaEffect
}
