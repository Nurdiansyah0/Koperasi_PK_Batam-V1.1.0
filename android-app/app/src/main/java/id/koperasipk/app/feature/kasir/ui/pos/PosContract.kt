package id.koperasipk.app.feature.kasir.ui.pos

import androidx.compose.runtime.Immutable
import id.koperasipk.app.feature.kasir.data.AnggotaKasirDto
import id.koperasipk.app.feature.kasir.data.BarangKasirDto
import id.koperasipk.app.feature.kasir.data.BuatTransaksiResponse
import id.koperasipk.app.feature.kasir.data.PaketBelanjaDto

@Immutable
data class PosCartItem(
    val barangId: Int,
    val namaBarang: String,
    val hargaSatuan: Double,
    val stokTersedia: Int,
    val qty: Int,
) {
    val subtotal: Double
        get() = hargaSatuan * qty
}

enum class PosCatalogFilter(val label: String) {
    SEMUA("Semua Produk"),
    STOK_MENIPIS("Stok Menipis"),
}

enum class PosPaymentMethod(val apiValue: String, val label: String) {
    CASH("cash", "Tunai"),
    EWALLET("ewallet", "Saldo"),
    QR("qr", "QRIS"),
    TRANSFER("transfer", "Transfer"),
    HUTANG("hutang", "Hutang"),
}

@Immutable
data class PosUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val barangList: List<BarangKasirDto> = emptyList(),
    val paketList: List<PaketBelanjaDto> = emptyList(),
    val anggotaList: List<AnggotaKasirDto> = emptyList(),
    val searchQuery: String = "",
    val catalogFilter: PosCatalogFilter = PosCatalogFilter.SEMUA,
    val anggotaSearchQuery: String = "",
    val selectedAnggota: AnggotaKasirDto? = null,
    val isLoadingAnggotaDetail: Boolean = false,
    val cart: List<PosCartItem> = emptyList(),
    val metodePembayaran: PosPaymentMethod = PosPaymentMethod.CASH,
    val uangDiterimaText: String = "",
    val isSubmitting: Boolean = false,
    val showAnggotaPicker: Boolean = false,
    val showCartSheet: Boolean = false,
    val lastReceipt: BuatTransaksiResponse? = null,
) {
    val filteredBarang: List<BarangKasirDto>
        get() {
            val q = searchQuery.trim().lowercase()
            return barangList
                .filter { b ->
                    val matchesStock = when (catalogFilter) {
                        PosCatalogFilter.SEMUA -> b.stok > 0
                        PosCatalogFilter.STOK_MENIPIS -> b.stok in 1..2
                    }
                    matchesStock && (q.isEmpty() || b.namaBarang.lowercase().contains(q))
                }
                .sortedWith(compareBy<BarangKasirDto> { if (it.stok <= 2) 0 else 1 }.thenBy { it.namaBarang.lowercase() })
        }

    val filteredAnggota: List<AnggotaKasirDto>
        get() {
            val q = anggotaSearchQuery.trim().lowercase()
            if (q.isEmpty()) return anggotaList
            return anggotaList.filter { a ->
                a.displayName.lowercase().contains(q) ||
                    a.username.lowercase().contains(q) ||
                    a.anggotaId.toString().contains(q)
            }
        }

    val totalItemCount: Int
        get() = cart.sumOf { it.qty }

    val cartPreviewTotal: Double
        get() = cart.sumOf { it.subtotal }

    val uangDiterimaNominal: Double
        get() = uangDiterimaText.toDoubleOrNull() ?: 0.0
}

sealed interface PosEvent {
    data object Refresh : PosEvent
    data class SearchBarangChanged(val query: String) : PosEvent
    data class CatalogFilterSelected(val filter: PosCatalogFilter) : PosEvent
    data class SearchAnggotaChanged(val query: String) : PosEvent
    data class AddBarang(val barang: BarangKasirDto) : PosEvent
    data class AddPaket(val paket: PaketBelanjaDto) : PosEvent
    data class UpdateCartQty(val barangId: Int, val delta: Int) : PosEvent
    data class RemoveCartItem(val barangId: Int) : PosEvent
    data object ClearCart : PosEvent
    data class SelectAnggota(val anggota: AnggotaKasirDto) : PosEvent
    data object ClearSelectedAnggota : PosEvent
    data class PaymentMethodSelected(val method: PosPaymentMethod) : PosEvent
    data class UangDiterimaChanged(val digits: String) : PosEvent
    data class SetAnggotaPickerVisible(val visible: Boolean) : PosEvent
    data class SetCartSheetVisible(val visible: Boolean) : PosEvent
    data object DismissReceipt : PosEvent
    data object SubmitCheckout : PosEvent
}

sealed interface PosEffect {
    data class ShowMessage(val message: String) : PosEffect
}
