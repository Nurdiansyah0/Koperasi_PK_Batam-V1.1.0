package id.koperasipk.app.feature.kasir.ui.pesanan

import androidx.compose.runtime.Immutable
import id.koperasipk.app.feature.kasir.data.PesananAnggotaDto

@Immutable
data class PesananGroupUi(
    val anggotaId: Int,
    val namaAnggota: String,
    val totalHarga: Double,
    val orders: List<PesananAnggotaDto>,
)

@Immutable
data class PendingRejectTarget(
    val transaksiIds: List<Int>,
    val alasan: String = "",
)

enum class PesananFilter(val label: String) {
    SEMUA("Semua"),
    TUNAI("Tunai"),
    HUTANG("Hutang"),
    SALDO("Saldo / QR"),
    TARIK_TUNAI("Dengan Tarik Tunai"),
}

@Immutable
data class PesananAnggotaUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val groups: List<PesananGroupUi> = emptyList(),
    val filter: PesananFilter = PesananFilter.SEMUA,
    val selectedAnggotaId: Int? = null,
    val selectedOrderIds: Set<Int> = emptySet(),
    val isSubmittingAction: Boolean = false,
    val rejectDialogTarget: PendingRejectTarget? = null,
) {
    val filteredGroups: List<PesananGroupUi>
        get() = when (filter) {
            PesananFilter.SEMUA -> groups
            PesananFilter.TUNAI -> groups.mapNotNull { g ->
                val filtered = g.orders.filter { o ->
                    o.metodePembayaran.lowercase().let { it == "cash" || it == "tunai" }
                }
                if (filtered.isEmpty()) null else g.copy(orders = filtered, totalHarga = filtered.sumOf { it.totalHarga })
            }
            PesananFilter.HUTANG -> groups.mapNotNull { g ->
                val filtered = g.orders.filter { it.metodePembayaran.equals("hutang", ignoreCase = true) }
                if (filtered.isEmpty()) null else g.copy(orders = filtered, totalHarga = filtered.sumOf { it.totalHarga })
            }
            PesananFilter.SALDO -> groups.mapNotNull { g ->
                val filtered = g.orders.filter { o ->
                    o.metodePembayaran.lowercase().let { it == "ewallet" || it == "saldo" || it == "qr" || it == "transfer" }
                }
                if (filtered.isEmpty()) null else g.copy(orders = filtered, totalHarga = filtered.sumOf { it.totalHarga })
            }
            PesananFilter.TARIK_TUNAI -> groups.mapNotNull { g ->
                val filtered = g.orders.filter { it.tarikTunai != null }
                if (filtered.isEmpty()) null else g.copy(orders = filtered, totalHarga = filtered.sumOf { it.totalHarga })
            }
        }

    val activeGroup: PesananGroupUi?
        get() = selectedAnggotaId?.let { id -> groups.find { it.anggotaId == id } }
}

sealed interface PesananAnggotaEvent {
    data object Load : PesananAnggotaEvent
    data object Refresh : PesananAnggotaEvent
    data object SilentRefresh : PesananAnggotaEvent
    data class FilterSelected(val filter: PesananFilter) : PesananAnggotaEvent
    data class SelectGroup(val anggotaId: Int?) : PesananAnggotaEvent
    data class ToggleOrderSelection(val transaksiId: Int) : PesananAnggotaEvent
    data class ApproveOrders(val transaksiIds: List<Int>) : PesananAnggotaEvent
    data class OpenRejectDialog(val transaksiIds: List<Int>) : PesananAnggotaEvent
    data class RejectReasonChanged(val reason: String) : PesananAnggotaEvent
    data object DismissRejectDialog : PesananAnggotaEvent
    data object ConfirmRejectOrders : PesananAnggotaEvent
}

sealed interface PesananAnggotaEffect {
    data class ShowMessage(val message: String) : PesananAnggotaEffect
    data object OrdersMutated : PesananAnggotaEffect
}
