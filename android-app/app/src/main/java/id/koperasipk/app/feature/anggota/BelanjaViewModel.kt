package id.koperasipk.app.feature.anggota

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.database.CachedBarangEntity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@OptIn(ExperimentalCoroutinesApi::class)
class BelanjaViewModel(
    private val repository: AnggotaRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BelanjaUiState())
    val uiState: StateFlow<BelanjaUiState> = _uiState.asStateFlow()

    private val _effects = Channel<BelanjaEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private val searchFlow = MutableStateFlow("")
    private var refreshJob: Job? = null
    private var submitJob: Job? = null

    init {
        observeCatalog()
        refresh(isInitial = true)
    }

    private fun observeCatalog() {
        viewModelScope.launch {
            searchFlow
                .flatMapLatest { query ->
                    repository.observeAvailableBarang(query = query, limit = 200)
                }
                .map { items ->
                    items.sortedBy { if (it.stok <= 2) 0 else 1 }
                }
                .collect { sortedItems ->
                    _uiState.update { state ->
                        state.copy(
                            catalogItems = sortedItems,
                            isLoading = if (sortedItems.isNotEmpty()) false else state.isLoading,
                        )
                    }
                }
        }
    }

    fun onEvent(event: BelanjaEvent) {
        when (event) {
            BelanjaEvent.Refresh -> refresh(isInitial = false)
            is BelanjaEvent.SearchChanged -> {
                searchFlow.value = event.query
                _uiState.update { it.copy(searchQuery = event.query) }
            }
            is BelanjaEvent.FilterSelected -> _uiState.update { it.copy(selectedFilter = event.filter) }
            is BelanjaEvent.AddBarang -> addBarangToCart(event.item)
            is BelanjaEvent.AddPaket -> addPaketToCart(event.paket)
            is BelanjaEvent.UpdateCartQty -> updateCartQty(event.barangId, event.delta)
            is BelanjaEvent.RemoveCartItem -> removeCartItem(event.barangId)
            is BelanjaEvent.MetodeSelected -> _uiState.update { it.copy(selectedMetode = event.metode) }
            BelanjaEvent.OpenCartSheet -> _uiState.update { it.copy(showCartSheet = true) }
            BelanjaEvent.DismissCartSheet -> _uiState.update { it.copy(showCartSheet = false) }
            BelanjaEvent.DismissTicketDialog -> _uiState.update { it.copy(createdTicket = null) }
            BelanjaEvent.SubmitCheckout -> submitCheckout()
        }
    }

    private fun refresh(isInitial: Boolean) {
        if (refreshJob?.isActive == true) return
        refreshJob = viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    isLoading = isInitial && state.catalogItems.isEmpty(),
                    isRefreshing = !isInitial || state.catalogItems.isNotEmpty(),
                    errorMessage = if (state.catalogItems.isEmpty()) null else state.errorMessage,
                )
            }
            try {
                val (barangRes, paketRes) = coroutineScope {
                    val b = async { repository.refreshBarangCatalog() }
                    val p = async { repository.getPaketBelanja() }
                    b.await() to p.await()
                }

                when (barangRes) {
                    is ApiResult.Success -> {
                        val bundles = (paketRes as? ApiResult.Success)?.data
                        _uiState.update { state ->
                            state.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = null,
                                paketList = bundles?.packages ?: state.paketList,
                                seringDibeli = bundles?.seringDibeli ?: state.seringDibeli,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        val hasCached = _uiState.value.catalogItems.isNotEmpty()
                        _uiState.update { state ->
                            state.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = if (hasCached) null else barangRes.message,
                            )
                        }
                        if (hasCached) {
                            _effects.send(BelanjaEffect.ShowMessage(barangRes.message))
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    private fun addBarangToCart(barang: CachedBarangEntity) {
        if (barang.stok < 1) {
            viewModelScope.launch { _effects.send(BelanjaEffect.ShowMessage("Stok habis")) }
            return
        }
        val current = _uiState.value.cartItems
        val existing = current.find { it.barangId == barang.barangId }
        if (existing != null && existing.qty >= barang.stok) {
            viewModelScope.launch { _effects.send(BelanjaEffect.ShowMessage("Stok tidak mencukupi")) }
            return
        }
        val updated = if (existing != null) {
            current.map { item ->
                if (item.barangId == barang.barangId) item.copy(qty = item.qty + 1) else item
            }
        } else {
            current + CartItemUi(
                barangId = barang.barangId,
                namaBarang = barang.namaBarang,
                hargaSatuan = barang.hargaJual,
                stokTersedia = barang.stok,
                qty = 1,
            )
        }
        _uiState.update { it.copy(cartItems = updated) }
    }

    private fun addPaketToCart(paket: PaketBelanjaDto) {
        if (!paket.isAvailable) {
            viewModelScope.launch {
                _effects.send(BelanjaEffect.ShowMessage("Beberapa item dalam paket ini sedang habis stok"))
            }
            return
        }
        val catalogById = _uiState.value.catalogItems.associateBy { it.barangId }
        val updated = _uiState.value.cartItems.toMutableList()
        var addedAny = false
        for (bundleItem in paket.items) {
            val catalog = catalogById[bundleItem.barangId]
            val price = catalog?.hargaJual ?: bundleItem.hargaSatuan
            val maxStock = catalog?.stok ?: bundleItem.stokTersedia
            val reqQty = bundleItem.resolvedQty.coerceAtLeast(1)
            val idx = updated.indexOfFirst { it.barangId == bundleItem.barangId }
            if (idx >= 0) {
                val existing = updated[idx]
                val nextQty = if (maxStock > 0) (existing.qty + reqQty).coerceAtMost(maxStock) else existing.qty + reqQty
                updated[idx] = existing.copy(qty = nextQty)
                addedAny = true
            } else if (maxStock > 0) {
                updated.add(
                    CartItemUi(
                        barangId = bundleItem.barangId,
                        namaBarang = catalog?.namaBarang ?: bundleItem.namaBarang,
                        hargaSatuan = price,
                        stokTersedia = maxStock,
                        qty = reqQty.coerceAtMost(maxStock),
                    )
                )
                addedAny = true
            }
        }
        if (addedAny) {
            _uiState.update { it.copy(cartItems = updated) }
            viewModelScope.launch {
                _effects.send(BelanjaEffect.ShowMessage("${paket.namaPaket} ditambahkan ke keranjang"))
            }
        }
    }

    private fun updateCartQty(barangId: Int, delta: Int) {
        val current = _uiState.value.cartItems
        val target = current.find { it.barangId == barangId } ?: return
        val nextQty = target.qty + delta
        if (nextQty < 1) return
        if (nextQty > target.stokTersedia) {
            viewModelScope.launch { _effects.send(BelanjaEffect.ShowMessage("Stok maksimal tercapai")) }
            return
        }
        _uiState.update { state ->
            state.copy(
                cartItems = state.cartItems.map { item ->
                    if (item.barangId == barangId) item.copy(qty = nextQty) else item
                }
            )
        }
    }

    private fun removeCartItem(barangId: Int) {
        _uiState.update { state ->
            val filtered = state.cartItems.filterNot { it.barangId == barangId }
            state.copy(
                cartItems = filtered,
                showCartSheet = if (filtered.isEmpty()) false else state.showCartSheet,
            )
        }
    }

    private fun submitCheckout() {
        if (submitJob?.isActive == true) return
        val state = _uiState.value
        if (state.cartItems.isEmpty()) {
            viewModelScope.launch { _effects.send(BelanjaEffect.ShowMessage("Keranjang belanja kosong")) }
            return
        }

        val request = SimpanTransaksiRequest(
            metodePembayaran = state.selectedMetode.apiValue,
            items = state.cartItems.map { item ->
                CheckoutItemRequest(barangId = item.barangId, jumlah = item.qty)
            },
        )

        submitJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                when (val result = repository.simpanTransaksi(request)) {
                    is ApiResult.Success -> {
                        val ticket = result.data.tarikTunai
                        val msg = result.data.message.ifBlank {
                            if (ticket != null) {
                                "Tiket Tarik Tunai #${ticket.kodePenarikan} berhasil dibuat"
                            } else {
                                "Pesanan berhasil dibuat! Silakan menuju kasir."
                            }
                        }
                        _uiState.update {
                            it.copy(
                                isSubmitting = false,
                                cartItems = emptyList(),
                                selectedMetode = MetodePembayaranOption.CASH,
                                showCartSheet = false,
                                createdTicket = ticket,
                            )
                        }
                        _effects.send(BelanjaEffect.ShowMessage(msg))
                        refresh(isInitial = false)
                    }
                    is ApiResult.Error -> {
                        _uiState.update { it.copy(isSubmitting = false) }
                        _effects.send(BelanjaEffect.ShowMessage(result.message))
                    }
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    companion object {
        fun factory(repository: AnggotaRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return BelanjaViewModel(repository) as T
                }
            }
    }
}
