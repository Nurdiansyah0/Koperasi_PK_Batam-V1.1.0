package id.koperasipk.app.feature.anggota

import androidx.compose.runtime.Immutable

@Immutable
data class RiwayatUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val selectedFilter: String = FILTER_ALL,
    val transactions: List<TransaksiAnggotaDto> = emptyList(),
    val currentPage: Int = 1,
    val lastPage: Int = 1,
    val totalItems: Int = 0,
    val selectedTransaction: TransaksiAnggotaDto? = null,
) {
    val filteredTransactions: List<TransaksiAnggotaDto>
        get() = when (selectedFilter) {
            FILTER_SELESAI -> transactions.filter { it.status.equals("selesai", ignoreCase = true) }
            FILTER_PENDING -> transactions.filter { it.status.equals("pending", ignoreCase = true) }
            FILTER_HUTANG -> transactions.filter { it.metodePembayaran.equals("hutang", ignoreCase = true) }
            else -> transactions
        }

    companion object {
        const val FILTER_ALL = "Semua"
        const val FILTER_SELESAI = "Selesai"
        const val FILTER_PENDING = "Pending"
        const val FILTER_HUTANG = "Hutang"
        val filterOptions = listOf(FILTER_ALL, FILTER_SELESAI, FILTER_PENDING, FILTER_HUTANG)
    }
}

sealed interface RiwayatEvent {
    data object Refresh : RiwayatEvent
    data class FilterSelected(val filter: String) : RiwayatEvent
    data class LoadPage(val page: Int) : RiwayatEvent
    data class SelectTransaction(val transaction: TransaksiAnggotaDto) : RiwayatEvent
    data object DismissReceipt : RiwayatEvent
}

sealed interface RiwayatEffect {
    data class ShowMessage(val message: String) : RiwayatEffect
}
