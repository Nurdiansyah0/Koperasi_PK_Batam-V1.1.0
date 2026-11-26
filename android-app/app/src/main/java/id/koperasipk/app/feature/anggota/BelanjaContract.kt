package id.koperasipk.app.feature.anggota

import androidx.compose.runtime.Immutable
import id.koperasipk.app.core.database.CachedBarangEntity

@Immutable
data class CartItemUi(
    val barangId: Int,
    val namaBarang: String,
    val hargaSatuan: Double,
    val stokTersedia: Int,
    val qty: Int,
) {
    val subtotal: Double
        get() = hargaSatuan * qty
}

enum class MetodePembayaranOption(val apiValue: String, val label: String) {
    CASH("cash", "Tunai"),
    EWALLET("ewallet", "Saldo"),
    QR("qr", "QRIS"),
    TRANSFER("transfer", "Transfer"),
    HUTANG("hutang", "Hutang"),
}

@Immutable
data class BelanjaUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSubmitting: Boolean = false,
    val searchQuery: String = "",
    val selectedFilter: String = FILTER_ALL,
    val catalogItems: List<CachedBarangEntity> = emptyList(),
    val paketList: List<PaketBelanjaDto> = emptyList(),
    val seringDibeli: PaketBelanjaDto? = null,
    val cartItems: List<CartItemUi> = emptyList(),
    val selectedMetode: MetodePembayaranOption = MetodePembayaranOption.CASH,
    val showCartSheet: Boolean = false,
    val errorMessage: String? = null,
    val createdTicket: CheckoutTarikTunaiDto? = null,
) {
    val cartTotalItemCount: Int
        get() = cartItems.sumOf { it.qty }

    val cartEstimatedTotal: Double
        get() = cartItems.sumOf { it.subtotal }

    val allPackages: List<PaketBelanjaDto>
        get() = buildList {
            seringDibeli?.let { add(it) }
            addAll(paketList)
        }

    val filteredCatalogItems: List<CachedBarangEntity>
        get() = when (selectedFilter) {
            FILTER_LOW_STOCK -> catalogItems.filter { it.stok <= 2 }
            else -> catalogItems
        }

    companion object {
        const val FILTER_ALL = "Semua"
        const val FILTER_LOW_STOCK = "Stok Menipis"
        const val FILTER_BUNDLES = "Paket Hemat"
        val filterOptions = listOf(FILTER_ALL, FILTER_LOW_STOCK, FILTER_BUNDLES)
    }
}

sealed interface BelanjaEvent {
    data object Refresh : BelanjaEvent
    data class SearchChanged(val query: String) : BelanjaEvent
    data class FilterSelected(val filter: String) : BelanjaEvent
    data class AddBarang(val item: CachedBarangEntity) : BelanjaEvent
    data class AddPaket(val paket: PaketBelanjaDto) : BelanjaEvent
    data class UpdateCartQty(val barangId: Int, val delta: Int) : BelanjaEvent
    data class RemoveCartItem(val barangId: Int) : BelanjaEvent
    data class MetodeSelected(val metode: MetodePembayaranOption) : BelanjaEvent
    data object OpenCartSheet : BelanjaEvent
    data object DismissCartSheet : BelanjaEvent
    data object DismissTicketDialog : BelanjaEvent
    data object SubmitCheckout : BelanjaEvent
}

sealed interface BelanjaEffect {
    data class ShowMessage(val message: String) : BelanjaEffect
}
