package id.koperasipk.app.feature.kasir.ui.tariktunai

import androidx.compose.runtime.Immutable
import id.koperasipk.app.feature.kasir.data.AnggotaKasirDto
import id.koperasipk.app.feature.kasir.data.AntreanTarikTunaiDto
import id.koperasipk.app.feature.kasir.data.KelayakanTarikTunaiDto
import id.koperasipk.app.feature.kasir.data.RiwayatTarikTunaiDto
import id.koperasipk.app.feature.kasir.data.TarikTunaiReceiptDto

enum class TarikTunaiTab(val label: String) {
    ANTREAN("Antrean Tiket"),
    MANUAL("Input Manual"),
    RIWAYAT("Riwayat"),
}

enum class SumberDanaTarik(val apiValue: String, val label: String) {
    SHU("shu", "Akumulasi SHU"),
    SALDO("saldo", "Saldo E-Wallet"),
}

@Immutable
data class TarikTunaiUiState(
    val activeTab: TarikTunaiTab = TarikTunaiTab.ANTREAN,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val antreanList: List<AntreanTarikTunaiDto> = emptyList(),
    val anggotaList: List<AnggotaKasirDto> = emptyList(),
    val riwayatList: List<RiwayatTarikTunaiDto> = emptyList(),
    val processingQueueId: Int? = null,
    val rejectQueueTarget: AntreanTarikTunaiDto? = null,
    val rejectQueueReason: String = "",
    val anggotaSearchQuery: String = "",
    val selectedAnggota: AnggotaKasirDto? = null,
    val isLoadingEligibility: Boolean = false,
    val eligibility: KelayakanTarikTunaiDto? = null,
    val eligibilityError: String? = null,
    val sumberDana: SumberDanaTarik = SumberDanaTarik.SHU,
    val selectedTransaksiId: Int? = null,
    val nominalText: String = "",
    val persetujuanShu: Boolean = false,
    val keterangan: String = "",
    val isSubmittingManual: Boolean = false,
    val receipt: TarikTunaiReceiptDto? = null,
) {
    val filteredAnggota: List<AnggotaKasirDto>
        get() {
            val q = anggotaSearchQuery.trim().lowercase()
            val list = if (q.isEmpty()) {
                anggotaList
            } else {
                anggotaList.filter {
                    it.displayName.lowercase().contains(q) ||
                        it.username.lowercase().contains(q) ||
                        it.anggotaId.toString().contains(q)
                }
            }
            return list.take(15)
        }
}

sealed interface TarikTunaiEvent {
    data object Load : TarikTunaiEvent
    data object Refresh : TarikTunaiEvent
    data class TabSelected(val tab: TarikTunaiTab) : TarikTunaiEvent
    data class ApproveQueueItem(val tarikId: Int) : TarikTunaiEvent
    data class OpenRejectQueueDialog(val item: AntreanTarikTunaiDto) : TarikTunaiEvent
    data class RejectQueueReasonChanged(val reason: String) : TarikTunaiEvent
    data object DismissRejectQueueDialog : TarikTunaiEvent
    data object ConfirmRejectQueueItem : TarikTunaiEvent
    data class AnggotaSearchChanged(val query: String) : TarikTunaiEvent
    data class SelectAnggota(val anggota: AnggotaKasirDto) : TarikTunaiEvent
    data object ClearSelectedAnggota : TarikTunaiEvent
    data class SumberDanaSelected(val sumber: SumberDanaTarik) : TarikTunaiEvent
    data class TransaksiSelected(val transaksiId: Int) : TarikTunaiEvent
    data class NominalChanged(val digits: String) : TarikTunaiEvent
    data class PersetujuanShuChanged(val checked: Boolean) : TarikTunaiEvent
    data class KeteranganChanged(val text: String) : TarikTunaiEvent
    data object SubmitManualTarikTunai : TarikTunaiEvent
    data object DismissReceipt : TarikTunaiEvent
}

sealed interface TarikTunaiEffect {
    data class ShowMessage(val message: String) : TarikTunaiEffect
}
