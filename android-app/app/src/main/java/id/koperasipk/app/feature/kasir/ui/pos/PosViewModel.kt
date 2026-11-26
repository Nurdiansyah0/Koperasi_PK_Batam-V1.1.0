package id.koperasipk.app.feature.kasir.ui.pos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.kasir.data.AnggotaKasirDto
import id.koperasipk.app.feature.kasir.data.BarangKasirDto
import id.koperasipk.app.feature.kasir.data.BuatTransaksiRequest
import id.koperasipk.app.feature.kasir.data.CheckoutItemRequest
import id.koperasipk.app.feature.kasir.data.KasirRepository
import id.koperasipk.app.feature.kasir.data.PaketBelanjaDto
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class PosViewModel(
    private val repository: KasirRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PosUiState())
    val uiState: StateFlow<PosUiState> = _uiState.asStateFlow()

    private val _effects = Channel<PosEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    private var loadJob: Job? = null
    private var submitJob: Job? = null
    private var anggotaDetailJob: Job? = null

    init {
        loadCatalog(isRefresh = false)
    }

    fun onEvent(event: PosEvent) {
        when (event) {
            PosEvent.Refresh -> loadCatalog(isRefresh = true)
            is PosEvent.SearchBarangChanged -> _uiState.update { it.copy(searchQuery = event.query) }
            is PosEvent.CatalogFilterSelected -> _uiState.update { it.copy(catalogFilter = event.filter) }
            is PosEvent.SearchAnggotaChanged -> _uiState.update { it.copy(anggotaSearchQuery = event.query) }
            is PosEvent.AddBarang -> addBarang(event.barang)
            is PosEvent.AddPaket -> addPaket(event.paket)
            is PosEvent.UpdateCartQty -> updateCartQty(event.barangId, event.delta)
            is PosEvent.RemoveCartItem -> _uiState.update { state ->
                state.copy(cart = state.cart.filterNot { it.barangId == event.barangId })
            }
            PosEvent.ClearCart -> _uiState.update { it.copy(cart = emptyList()) }
            is PosEvent.SelectAnggota -> selectAnggota(event.anggota)
            PosEvent.ClearSelectedAnggota -> _uiState.update {
                it.copy(selectedAnggota = null, anggotaSearchQuery = "")
            }
            is PosEvent.PaymentMethodSelected -> _uiState.update {
                it.copy(metodePembayaran = event.method)
            }
            is PosEvent.UangDiterimaChanged -> _uiState.update {
                it.copy(uangDiterimaText = event.digits.filter(Char::isDigit))
            }
            is PosEvent.SetAnggotaPickerVisible -> _uiState.update {
                it.copy(showAnggotaPicker = event.visible)
            }
            is PosEvent.SetCartSheetVisible -> _uiState.update {
                it.copy(showCartSheet = event.visible)
            }
            PosEvent.DismissReceipt -> _uiState.update { it.copy(lastReceipt = null) }
            PosEvent.SubmitCheckout -> submitCheckout()
        }
    }

    private fun loadCatalog(isRefresh: Boolean) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = !isRefresh && it.barangList.isEmpty(),
                    isRefreshing = isRefresh,
                    errorMessage = null,
                )
            }
            try {
                val (barangRes, paketRes, anggotaRes) = coroutineScope {
                    val b = async { repository.getDataBarang() }
                    val p = async { repository.getPaketBelanja() }
                    val a = async { repository.getAllAnggota() }
                    Triple(b.await(), p.await(), a.await())
                }

                when (barangRes) {
                    is ApiResult.Success -> {
                        val packets = (paketRes as? ApiResult.Success)?.data?.data.orEmpty()
                        val members = (anggotaRes as? ApiResult.Success)?.data ?: _uiState.value.anggotaList
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                errorMessage = null,
                                barangList = barangRes.data,
                                paketList = packets,
                                anggotaList = members,
                            )
                        }
                    }
                    is ApiResult.Error -> {
                        if (_uiState.value.barangList.isEmpty()) {
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    isRefreshing = false,
                                    errorMessage = barangRes.message,
                                )
                            }
                        } else {
                            _uiState.update { it.copy(isLoading = false, isRefreshing = false) }
                            emitMessage(barangRes.message)
                        }
                    }
                }
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    private fun selectAnggota(anggota: AnggotaKasirDto) {
        _uiState.update {
            it.copy(
                selectedAnggota = anggota,
                showAnggotaPicker = false,
                isLoadingAnggotaDetail = true,
            )
        }
        anggotaDetailJob?.cancel()
        anggotaDetailJob = viewModelScope.launch {
            when (val res = repository.cariProfilAnggota(anggotaId = anggota.anggotaId)) {
                is ApiResult.Success -> {
                    _uiState.update { state ->
                        if (state.selectedAnggota?.anggotaId == res.data.anggotaId) {
                            state.copy(selectedAnggota = res.data, isLoadingAnggotaDetail = false)
                        } else {
                            state.copy(isLoadingAnggotaDetail = false)
                        }
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isLoadingAnggotaDetail = false) }
                }
            }
        }
    }

    private fun addBarang(barang: BarangKasirDto) {
        if (barang.stok <= 0) {
            emitMessage("Stok ${barang.namaBarang} habis")
            return
        }
        val currentCart = _uiState.value.cart
        val existing = currentCart.find { it.barangId == barang.barangId }
        if (existing != null && existing.qty >= barang.stok) {
            emitMessage("Jumlah melebihi stok tercatat (${barang.stok})")
            return
        }
        val updated = if (existing != null) {
            currentCart.map {
                if (it.barangId == barang.barangId) it.copy(qty = it.qty + 1) else it
            }
        } else {
            currentCart + PosCartItem(
                barangId = barang.barangId,
                namaBarang = barang.namaBarang,
                hargaSatuan = barang.effectivePrice,
                stokTersedia = barang.stok,
                qty = 1,
            )
        }
        _uiState.update { it.copy(cart = updated) }
    }

    private fun addPaket(paket: PaketBelanjaDto) {
        if (!paket.isAvailable) {
            emitMessage("Stok untuk ${paket.namaPaket} tidak mencukupi")
            return
        }
        val currentCatalog = _uiState.value.barangList.associateBy { it.barangId }
        val mutableCart = _uiState.value.cart.toMutableList()
        for (item in paket.items) {
            val catalogItem = currentCatalog[item.barangId]
            val available = catalogItem?.stok ?: item.stokTersedia
            val idx = mutableCart.indexOfFirst { it.barangId == item.barangId }
            val addQty = item.effectiveQty
            if (idx >= 0) {
                val existing = mutableCart[idx]
                if (existing.qty + addQty > available) {
                    emitMessage("Stok ${item.namaBarang} tidak mencukupi untuk paket ini")
                    return
                }
                mutableCart[idx] = existing.copy(qty = existing.qty + addQty)
            } else {
                if (addQty > available) {
                    emitMessage("Stok ${item.namaBarang} tidak mencukupi untuk paket ini")
                    return
                }
                mutableCart.add(
                    PosCartItem(
                        barangId = item.barangId,
                        namaBarang = item.namaBarang,
                        hargaSatuan = catalogItem?.effectivePrice ?: item.hargaSatuan,
                        stokTersedia = available,
                        qty = addQty,
                    )
                )
            }
        }
        _uiState.update { it.copy(cart = mutableCart) }
        emitMessage("${paket.namaPaket} ditambahkan ke keranjang")
    }

    private fun updateCartQty(barangId: Int, delta: Int) {
        val current = _uiState.value.cart
        val target = current.find { it.barangId == barangId } ?: return
        val newQty = target.qty + delta
        if (newQty < 1) {
            _uiState.update { it.copy(cart = current.filterNot { item -> item.barangId == barangId }) }
            return
        }
        if (newQty > target.stokTersedia) {
            emitMessage("Stok maksimal tercapai (${target.stokTersedia})")
            return
        }
        _uiState.update {
            it.copy(
                cart = current.map { item ->
                    if (item.barangId == barangId) item.copy(qty = newQty) else item
                }
            )
        }
    }

    private fun submitCheckout() {
        if (submitJob?.isActive == true) return
        val state = _uiState.value
        if (state.cart.isEmpty()) {
            emitMessage("Keranjang belanja kosong")
            return
        }
        val anggota = state.selectedAnggota
        if (anggota == null) {
            _uiState.update { it.copy(showAnggotaPicker = true) }
            emitMessage("Wajib memilih Anggota Koperasi terlebih dahulu")
            return
        }

        submitJob = viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            val request = BuatTransaksiRequest(
                items = state.cart.map {
                    CheckoutItemRequest(
                        barangId = it.barangId,
                        jumlah = it.qty,
                        hargaSatuan = it.hargaSatuan,
                    )
                },
                anggotaId = anggota.anggotaId,
                metodePembayaran = state.metodePembayaran.apiValue,
                total = state.cartPreviewTotal,
            )
            when (val res = repository.buatTransaksiKasir(request)) {
                is ApiResult.Success -> {
                    val receipt = res.data
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            cart = emptyList(),
                            selectedAnggota = null,
                            anggotaSearchQuery = "",
                            uangDiterimaText = "",
                            metodePembayaran = PosPaymentMethod.CASH,
                            showCartSheet = false,
                            lastReceipt = receipt,
                        )
                    }
                    loadCatalog(isRefresh = true)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isSubmitting = false) }
                    emitMessage(res.message)
                }
            }
        }
    }

    private fun emitMessage(message: String) {
        viewModelScope.launch {
            _effects.send(PosEffect.ShowMessage(message))
        }
    }

    companion object {
        fun factory(repository: KasirRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return PosViewModel(repository) as T
                }
            }
    }
}
