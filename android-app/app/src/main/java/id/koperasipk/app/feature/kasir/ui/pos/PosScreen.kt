package id.koperasipk.app.feature.kasir.ui.pos

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.PersonSearch
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.FilterChipBar
import id.koperasipk.app.core.designsystem.KoperasiBottomSheet
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.RupiahTextField
import id.koperasipk.app.core.designsystem.SectionHeader
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.StickyCartBar
import id.koperasipk.app.feature.kasir.data.AnggotaKasirDto
import id.koperasipk.app.feature.kasir.data.BarangKasirDto
import id.koperasipk.app.feature.kasir.data.BuatTransaksiResponse
import id.koperasipk.app.feature.kasir.data.PaketBelanjaDto

@Composable
fun PosScreen(
    viewModel: PosViewModel,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is PosEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    if (state.showAnggotaPicker) {
        AnggotaPickerDialog(
            query = state.anggotaSearchQuery,
            anggotaList = state.filteredAnggota,
            selectedId = state.selectedAnggota?.anggotaId,
            onQueryChange = { viewModel.onEvent(PosEvent.SearchAnggotaChanged(it)) },
            onSelect = { viewModel.onEvent(PosEvent.SelectAnggota(it)) },
            onDismiss = { viewModel.onEvent(PosEvent.SetAnggotaPickerVisible(false)) },
        )
    }

    state.lastReceipt?.let { receipt ->
        PosReceiptDialog(
            receipt = receipt,
            onDismiss = { viewModel.onEvent(PosEvent.DismissReceipt) },
        )
    }

    if (state.showCartSheet) {
        KoperasiBottomSheet(
            onDismissRequest = { viewModel.onEvent(PosEvent.SetCartSheetVisible(false)) },
            title = "Keranjang POS (${state.totalItemCount} item)",
            subtitle = state.selectedAnggota?.displayName ?: "Pilih anggota sebelum proses pembayaran",
            footer = {
                PosCheckoutFooter(
                    state = state,
                    onEvent = viewModel::onEvent,
                )
            },
        ) {
            PosCheckoutSheetBody(
                state = state,
                onEvent = viewModel::onEvent,
            )
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Kasir POS",
                subtitle = state.selectedAnggota?.displayName ?: "Katalog & Transaksi Toko",
                actions = {
                    IconButton(onClick = { viewModel.onEvent(PosEvent.SetCartSheetVisible(true)) }) {
                        BadgedBox(
                            badge = {
                                if (state.totalItemCount > 0) {
                                    Badge {
                                        Text(state.totalItemCount.toString())
                                    }
                                }
                            },
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.ShoppingCart,
                                contentDescription = "Keranjang POS",
                            )
                        }
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (state.cart.isNotEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                ) {
                    StickyCartBar(
                        itemCount = state.totalItemCount,
                        totalFormatted = CurrencyFormatter.format(state.cartPreviewTotal),
                        ctaLabel = "Lanjut Bayar",
                        onClick = { viewModel.onEvent(PosEvent.SetCartSheetVisible(true)) },
                    )
                }
            }
        },
    ) { innerPadding ->
        when {
            state.isLoading -> {
                LoadingState(
                    message = "Memuat katalog POS...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.barangList.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(PosEvent.Refresh) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                val cartQtyMap = remember(state.cart) {
                    state.cart.associate { it.barangId to it.qty }
                }
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(PosEvent.Refresh) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 156.dp),
                        contentPadding = PaddingValues(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        item(key = "search_bar", span = { GridItemSpan(maxLineSpan) }) {
                            OutlinedTextField(
                                value = state.searchQuery,
                                onValueChange = { viewModel.onEvent(PosEvent.SearchBarangChanged(it)) },
                                placeholder = { Text("Cari nama barang...") },
                                leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
                                trailingIcon = {
                                    if (state.searchQuery.isNotEmpty()) {
                                        IconButton(onClick = { viewModel.onEvent(PosEvent.SearchBarangChanged("")) }) {
                                            Icon(Icons.Rounded.Clear, contentDescription = "Hapus pencarian")
                                        }
                                    }
                                },
                                singleLine = true,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }

                        if (state.paketList.isNotEmpty() && state.searchQuery.isBlank()) {
                            item(key = "paket_header", span = { GridItemSpan(maxLineSpan) }) {
                                SectionHeader(
                                    title = "Paket Belanja Genap",
                                    subtitle = "1-Klik tambah ke keranjang",
                                )
                            }
                            item(key = "paket_row", span = { GridItemSpan(maxLineSpan) }) {
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    items(
                                        items = state.paketList,
                                        key = { it.id },
                                    ) { paket ->
                                        PaketBelanjaCard(
                                            paket = paket,
                                            onAdd = { viewModel.onEvent(PosEvent.AddPaket(paket)) },
                                        )
                                    }
                                }
                            }
                        }

                        item(key = "catalog_header", span = { GridItemSpan(maxLineSpan) }) {
                            val catalogFilterLabels = remember { PosCatalogFilter.entries.map { it.label } }
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                SectionHeader(
                                    title = "Katalog Barang Toko",
                                    subtitle = "${state.filteredBarang.size} barang tersedia",
                                )
                                FilterChipBar(
                                    options = catalogFilterLabels,
                                    selected = state.catalogFilter.label,
                                    onSelect = { label ->
                                        PosCatalogFilter.entries.find { it.label == label }?.let {
                                            viewModel.onEvent(PosEvent.CatalogFilterSelected(it))
                                        }
                                    },
                                )
                            }
                        }

                        if (state.filteredBarang.isEmpty()) {
                            item(key = "catalog_empty", span = { GridItemSpan(maxLineSpan) }) {
                                EmptyState(
                                    title = "Barang tidak ditemukan",
                                    description = "Coba ubah kata kunci pencarian atau tarik untuk menyegarkan.",
                                    modifier = Modifier.height(220.dp),
                                )
                            }
                        } else {
                            items(
                                items = state.filteredBarang,
                                key = { it.barangId },
                            ) { barang ->
                                PosBarangCard(
                                    barang = barang,
                                    inCartQty = cartQtyMap[barang.barangId] ?: 0,
                                    onAdd = { viewModel.onEvent(PosEvent.AddBarang(barang)) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PaketBelanjaCard(
    paket: PaketBelanjaDto,
    onAdd: () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
        modifier = Modifier.width(260.dp),
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = paket.icon.ifBlank { "🛍️" },
                    style = MaterialTheme.typography.titleLarge,
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = paket.namaPaket,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (paket.tag.isNotBlank()) {
                        Text(
                            text = paket.tag,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            maxLines = 1,
                        )
                    }
                }
            }
            Text(
                text = paket.items.joinToString(", ") { "${it.effectiveQty}x ${it.namaBarang}" },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = CurrencyFormatter.format(paket.totalHarga),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
                Button(
                    onClick = onAdd,
                    enabled = paket.isAvailable,
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                ) {
                    Text(
                        text = if (paket.isAvailable) "Tambah" else "Habis",
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
            }
        }
    }
}

@Composable
private fun PosBarangCard(
    barang: BarangKasirDto,
    inCartQty: Int,
    onAdd: () -> Unit,
) {
    val lowStock = barang.stok <= 2
    Card(
        onClick = onAdd,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(
            width = if (inCartQty > 0) 1.5.dp else 1.dp,
            color = when {
                inCartQty > 0 -> MaterialTheme.colorScheme.primary
                lowStock -> Color(0xFFF59E0B)
                else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.45f)
            },
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (lowStock) {
                    StatusBadge(text = "Menipis", variant = BadgeVariant.WARNING)
                } else {
                    Spacer(modifier = Modifier.width(1.dp))
                }
                if (inCartQty > 0) {
                    StatusBadge(text = "${inCartQty}x", variant = BadgeVariant.INFO)
                }
            }
            Text(
                text = barang.namaBarang,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                minLines = 2,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = CurrencyFormatter.format(barang.effectivePrice),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = "Stok: ${barang.stok} ${barang.satuan ?: "pcs"}",
                style = MaterialTheme.typography.labelSmall,
                color = if (lowStock) Color(0xFFB45309) else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PosCheckoutSheetBody(
    state: PosUiState,
    onEvent: (PosEvent) -> Unit,
) {
    if (state.cart.isEmpty()) {
        EmptyState(
            title = "Keranjang masih kosong",
            description = "Pilih barang atau paket belanja dari katalog POS.",
            modifier = Modifier.height(160.dp),
        )
    } else {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End,
        ) {
            TextButton(onClick = { onEvent(PosEvent.ClearCart) }) {
                Text("Kosongkan Keranjang")
            }
        }
        state.cart.forEach { item ->
            key(item.barangId) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = item.namaBarang,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                text = "${CurrencyFormatter.format(item.hargaSatuan)} x ${item.qty} = ${CurrencyFormatter.format(item.subtotal)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(onClick = { onEvent(PosEvent.UpdateCartQty(item.barangId, -1)) }) {
                                Icon(Icons.Rounded.Remove, contentDescription = "Kurangi")
                            }
                            Text(
                                text = item.qty.toString(),
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                            )
                            IconButton(onClick = { onEvent(PosEvent.UpdateCartQty(item.barangId, 1)) }) {
                                Icon(Icons.Rounded.Add, contentDescription = "Tambah")
                            }
                            IconButton(onClick = { onEvent(PosEvent.RemoveCartItem(item.barangId)) }) {
                                Icon(
                                    Icons.Rounded.DeleteOutline,
                                    contentDescription = "Hapus",
                                    tint = MaterialTheme.colorScheme.error,
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    Text(
        text = "Pembeli (Anggota Koperasi)",
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.SemiBold,
    )
    OutlinedButton(
        onClick = { onEvent(PosEvent.SetAnggotaPickerVisible(true)) },
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Icon(Icons.Rounded.PersonSearch, contentDescription = null)
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = state.selectedAnggota?.displayName ?: "Pilih Anggota Koperasi...",
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }

    state.selectedAnggota?.let { anggota ->
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                modifier = Modifier.padding(10.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "${anggota.displayName} (#${anggota.anggotaId})",
                        style = MaterialTheme.typography.labelLarge,
                    )
                    if (state.isLoadingAnggotaDetail) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp)
                    }
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("Saldo: ${CurrencyFormatter.format(anggota.saldo)}", style = MaterialTheme.typography.bodySmall)
                    Text("Hutang: ${CurrencyFormatter.format(anggota.hutang)}", style = MaterialTheme.typography.bodySmall)
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("Sisa Limit: ${CurrencyFormatter.format(anggota.sisaLimitHutang)}", style = MaterialTheme.typography.bodySmall)
                    Text("SHU: ${CurrencyFormatter.format(anggota.shu)}", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }

    Text(
        text = "Metode Pembayaran",
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.SemiBold,
    )
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        PosPaymentMethod.entries.forEach { method ->
            FilterChip(
                selected = state.metodePembayaran == method,
                onClick = { onEvent(PosEvent.PaymentMethodSelected(method)) },
                label = { Text(method.label) },
            )
        }
    }

    if (state.metodePembayaran == PosPaymentMethod.CASH) {
        RupiahTextField(
            value = state.uangDiterimaText,
            onValueChange = { onEvent(PosEvent.UangDiterimaChanged(it)) },
            label = "Uang Diterima (Opsional)",
        )
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            val previewTotal = state.cartPreviewTotal.toLong()
            if (previewTotal > 0) {
                FilterChip(
                    selected = false,
                    onClick = { onEvent(PosEvent.UangDiterimaChanged(previewTotal.toString())) },
                    label = { Text("Uang Pas") },
                )
            }
            listOf(20_000L, 50_000L, 100_000L).forEach { amt ->
                FilterChip(
                    selected = false,
                    onClick = { onEvent(PosEvent.UangDiterimaChanged(amt.toString())) },
                    label = { Text(CurrencyFormatter.format(amt)) },
                )
            }
        }
        if (state.uangDiterimaNominal > 0.0) {
            val diff = state.uangDiterimaNominal - state.cartPreviewTotal
            Text(
                text = if (diff >= 0) {
                    "Kembalian: ${CurrencyFormatter.format(diff)}"
                } else {
                    "Kurang: ${CurrencyFormatter.format(-diff)}"
                },
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = if (diff >= 0) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.error,
            )
        }
    }
}

@Composable
private fun PosCheckoutFooter(
    state: PosUiState,
    onEvent: (PosEvent) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Estimasi Total", style = MaterialTheme.typography.titleMedium)
            Text(
                text = CurrencyFormatter.format(state.cartPreviewTotal),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
        }
        Button(
            onClick = { onEvent(PosEvent.SubmitCheckout) },
            enabled = !state.isSubmitting && state.cart.isNotEmpty(),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
        ) {
            if (state.isSubmitting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            } else {
                Text(
                    text = if (state.selectedAnggota == null) {
                        "Pilih Anggota & Bayar"
                    } else {
                        "Proses Pembayaran"
                    },
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

@Composable
private fun AnggotaPickerDialog(
    query: String,
    anggotaList: List<AnggotaKasirDto>,
    selectedId: Int?,
    onQueryChange: (String) -> Unit,
    onSelect: (AnggotaKasirDto) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Pilih Anggota Koperasi") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = query,
                    onValueChange = onQueryChange,
                    placeholder = { Text("Cari nama, username, atau ID...") },
                    leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 320.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (anggotaList.isEmpty()) {
                        item(key = "no_member") {
                            Text(
                                text = "Anggota tidak ditemukan",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(vertical = 12.dp),
                            )
                        }
                    } else {
                        items(
                            items = anggotaList,
                            key = { it.anggotaId },
                        ) { anggota ->
                            val isSelected = anggota.anggotaId == selectedId
                            Card(
                                onClick = { onSelect(anggota) },
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isSelected) {
                                        MaterialTheme.colorScheme.primaryContainer
                                    } else {
                                        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                                    },
                                ),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(
                                    modifier = Modifier.padding(10.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Text(
                                            text = anggota.displayName,
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                        )
                                        Text(
                                            text = "#${anggota.anggotaId}",
                                            style = MaterialTheme.typography.labelSmall,
                                        )
                                    }
                                    Text(
                                        text = "Sisa Plafon: ${CurrencyFormatter.format(anggota.sisaLimitHutang)} • Saldo: ${CurrencyFormatter.format(anggota.saldo)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Tutup")
            }
        },
    )
}

@Composable
private fun PosReceiptDialog(
    receipt: BuatTransaksiResponse,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Icon(
                imageVector = Icons.Rounded.CheckCircle,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.size(36.dp),
            )
        },
        title = { Text("Transaksi POS Berhasil") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = receipt.message.ifBlank { "Transaksi berhasil disimpan." },
                    style = MaterialTheme.typography.bodyMedium,
                )
                receipt.transaksiId?.let { id ->
                    Text(
                        text = "No. Transaksi: #$id",
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
                receipt.total?.let { totalServer ->
                    Text(
                        text = "Total Tagihan (Server): ${CurrencyFormatter.format(totalServer)}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                receipt.tarikTunai?.let { tt ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.6f),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Text("Tiket #${tt.kodePenarikan}", fontWeight = FontWeight.Bold)
                            Text("Kas Bersih Diserahkan: ${CurrencyFormatter.format(tt.uangBersihDiserahkan)}")
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onDismiss) {
                Text("Selesai")
            }
        },
    )
}
