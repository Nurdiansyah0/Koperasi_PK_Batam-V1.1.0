package id.koperasipk.app.feature.anggota

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material3.AlertDialog
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.database.CachedBarangEntity
import id.koperasipk.app.core.datastore.UserSession
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.BrandEmeraldDark
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.FilterChipBar
import id.koperasipk.app.core.designsystem.KoperasiBottomSheet
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.SectionHeader
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.StickyCartBar

@Composable
fun BelanjaScreen(
    viewModel: BelanjaViewModel,
    session: UserSession,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is BelanjaEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    state.createdTicket?.let { ticket ->
        AlertDialog(
            onDismissRequest = { viewModel.onEvent(BelanjaEvent.DismissTicketDialog) },
            title = { Text("Tiket Tarik Tunai Terbit") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Tunjukkan kode ini kepada kasir toko:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant,
                    ) {
                        Text(
                            text = ticket.kodePenarikan,
                            style = MaterialTheme.typography.titleLarge,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.padding(12.dp),
                        )
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Hak ${ticket.sumberDana.uppercase()} ditarik:", style = MaterialTheme.typography.bodySmall)
                        Text(CurrencyFormatter.format(ticket.nominalTarik), fontWeight = FontWeight.Bold)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Potong belanja:", style = MaterialTheme.typography.bodySmall)
                        Text("-${CurrencyFormatter.format(ticket.potongBelanja)}", fontWeight = FontWeight.Bold)
                    }
                    HorizontalDivider()
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Kas bersih diterima:", fontWeight = FontWeight.Bold)
                        Text(
                            text = CurrencyFormatter.format(ticket.uangBersihDiserahkan),
                            fontWeight = FontWeight.ExtraBold,
                            color = BrandEmeraldDark,
                        )
                    }
                }
            },
            confirmButton = {
                Button(onClick = { viewModel.onEvent(BelanjaEvent.DismissTicketDialog) }) {
                    Text("Saya Mengerti")
                }
            },
        )
    }

    if (state.showCartSheet) {
        KoperasiBottomSheet(
            onDismissRequest = { viewModel.onEvent(BelanjaEvent.DismissCartSheet) },
            title = "Keranjang Belanja",
            subtitle = "${state.cartTotalItemCount} item terpilih",
            footer = {
                Button(
                    onClick = { viewModel.onEvent(BelanjaEvent.SubmitCheckout) },
                    enabled = !state.isSubmitting && state.cartItems.isNotEmpty(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    if (state.isSubmitting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary,
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Memproses Transaksi...")
                    } else {
                        Text(
                            text = "Konfirmasi Checkout (${CurrencyFormatter.format(state.cartEstimatedTotal)})",
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            },
        ) {
            CartCheckoutSheetContent(
                state = state,
                session = session,
                onEvent = viewModel::onEvent,
            )
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Katalog Belanja",
                subtitle = "${state.filteredCatalogItems.size} barang tersedia",
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && state.catalogItems.isEmpty() -> {
                LoadingState(
                    message = "Memuat katalog barang...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.catalogItems.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(BelanjaEvent.Refresh) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                val cartQtyMap = remember(state.cartItems) {
                    state.cartItems.associate { it.barangId to it.qty }
                }

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    KoperasiPullToRefreshBox(
                        isRefreshing = state.isRefreshing,
                        onRefresh = { viewModel.onEvent(BelanjaEvent.Refresh) },
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(
                                start = 16.dp,
                                end = 16.dp,
                                top = 12.dp,
                                bottom = if (state.cartItems.isNotEmpty()) 96.dp else 20.dp,
                            ),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            item(key = "search_bar") {
                                OutlinedTextField(
                                    value = state.searchQuery,
                                    onValueChange = { viewModel.onEvent(BelanjaEvent.SearchChanged(it)) },
                                    placeholder = { Text("Cari nama barang di katalog...") },
                                    leadingIcon = {
                                        Icon(Icons.Rounded.Search, contentDescription = null)
                                    },
                                    trailingIcon = {
                                        if (state.searchQuery.isNotEmpty()) {
                                            IconButton(onClick = { viewModel.onEvent(BelanjaEvent.SearchChanged("")) }) {
                                                Icon(Icons.Rounded.Clear, contentDescription = "Hapus pencarian")
                                            }
                                        }
                                    },
                                    singleLine = true,
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }

                            item(key = "filter_chips") {
                                FilterChipBar(
                                    options = BelanjaUiState.filterOptions,
                                    selected = state.selectedFilter,
                                    onSelect = { viewModel.onEvent(BelanjaEvent.FilterSelected(it)) },
                                )
                            }

                            if (state.selectedFilter != BelanjaUiState.FILTER_LOW_STOCK &&
                                state.searchQuery.isBlank() &&
                                state.allPackages.isNotEmpty()
                            ) {
                                item(key = "paket_header") {
                                    SectionHeader(
                                        title = "Paket Belanja & Favorit",
                                        subtitle = "Paket genap tanpa pecahan 500",
                                    )
                                }
                                item(key = "paket_carousel") {
                                    LazyRow(
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    ) {
                                        items(
                                            items = state.allPackages,
                                            key = { it.id },
                                        ) { paket ->
                                            PaketCard(
                                                paket = paket,
                                                onAdd = { viewModel.onEvent(BelanjaEvent.AddPaket(paket)) },
                                            )
                                        }
                                    }
                                }
                            }

                            item(key = "catalog_header") {
                                SectionHeader(
                                    title = when {
                                        state.searchQuery.isNotBlank() -> "Hasil Pencarian"
                                        state.selectedFilter == BelanjaUiState.FILTER_LOW_STOCK -> "Barang Stok Menipis"
                                        state.selectedFilter == BelanjaUiState.FILTER_BUNDLES -> "Semua Barang (Kombinasi Paket)"
                                        else -> "Semua Barang & Minuman"
                                    },
                                    subtitle = "${state.filteredCatalogItems.size} produk",
                                )
                            }

                            if (state.filteredCatalogItems.isEmpty()) {
                                item(key = "catalog_empty") {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(220.dp),
                                    ) {
                                        EmptyState(
                                            title = "Barang tidak ditemukan",
                                            description = if (state.searchQuery.isNotBlank()) {
                                                "Coba kata kunci lain atau hapus pencarian"
                                            } else {
                                                "Belum ada barang tersedia untuk kategori ini"
                                            },
                                            icon = Icons.Rounded.ShoppingCart,
                                        )
                                    }
                                }
                            } else {
                                items(
                                    items = state.filteredCatalogItems,
                                    key = { it.barangId },
                                ) { item ->
                                    BarangCatalogItemCard(
                                        item = item,
                                        qtyInCart = cartQtyMap[item.barangId] ?: 0,
                                        onAdd = { viewModel.onEvent(BelanjaEvent.AddBarang(item)) },
                                        onIncrement = { viewModel.onEvent(BelanjaEvent.UpdateCartQty(item.barangId, 1)) },
                                        onDecrement = {
                                            val qty = cartQtyMap[item.barangId] ?: 0
                                            if (qty <= 1) {
                                                viewModel.onEvent(BelanjaEvent.RemoveCartItem(item.barangId))
                                            } else {
                                                viewModel.onEvent(BelanjaEvent.UpdateCartQty(item.barangId, -1))
                                            }
                                        },
                                    )
                                }
                            }
                        }
                    }

                    if (state.cartItems.isNotEmpty()) {
                        StickyCartBar(
                            itemCount = state.cartTotalItemCount,
                            totalFormatted = CurrencyFormatter.format(state.cartEstimatedTotal),
                            ctaLabel = "Keranjang",
                            onClick = { viewModel.onEvent(BelanjaEvent.OpenCartSheet) },
                            modifier = Modifier.align(Alignment.BottomCenter),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PaketCard(
    paket: PaketBelanjaDto,
    onAdd: () -> Unit,
) {
    val isFavorite = paket.id == "sering_dibeli"
    Card(
        modifier = Modifier.width(270.dp),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(
            width = if (isFavorite) 1.5.dp else 1.dp,
            color = if (isFavorite) BrandEmeraldDark else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
        ),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    if (paket.icon.isNotBlank()) {
                        Text(paket.icon, style = MaterialTheme.typography.titleMedium)
                    } else {
                        Icon(
                            imageVector = Icons.Rounded.Bolt,
                            contentDescription = null,
                            tint = BrandEmeraldDark,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                    Column {
                        Text(
                            text = paket.namaPaket,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        if (paket.tag.isNotBlank()) {
                            Spacer(modifier = Modifier.height(2.dp))
                            StatusBadge(
                                text = paket.tag,
                                variant = if (isFavorite) BadgeVariant.SUCCESS else BadgeVariant.WARNING,
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = CurrencyFormatter.format(paket.totalHarga),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.primary,
                )
            }

            if (paket.items.isNotEmpty()) {
                Text(
                    text = paket.items.joinToString(", ") { "${it.namaBarang} (${it.resolvedQty}x)" },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            Button(
                onClick = onAdd,
                enabled = paket.isAvailable,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(if (paket.isAvailable) "Tambah Paket" else "Stok Habis")
            }
        }
    }
}

@Composable
private fun BarangCatalogItemCard(
    item: CachedBarangEntity,
    qtyInCart: Int,
    onAdd: () -> Unit,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit,
) {
    val isLowStock = item.stok <= 2
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(
            width = 1.dp,
            color = if (isLowStock) {
                ColorBorderAmber
            } else {
                MaterialTheme.colorScheme.outline.copy(alpha = 0.45f)
            },
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = "#${item.barangId}",
                        style = MaterialTheme.typography.labelSmall,
                        fontFamily = FontFamily.Monospace,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    StatusBadge(
                        text = if (isLowStock) "Sisa ${item.stok}" else "Stok ${item.stok}",
                        variant = if (isLowStock) BadgeVariant.WARNING else BadgeVariant.DEFAULT,
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.namaBarang,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = CurrencyFormatter.format(item.hargaJual),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.primary,
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            if (qtyInCart == 0) {
                OutlinedButton(
                    onClick = onAdd,
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Tambah")
                }
            } else {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    IconButton(onClick = onDecrement) {
                        Icon(Icons.Rounded.Remove, contentDescription = "Kurangi")
                    }
                    Text(
                        text = qtyInCart.toString(),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    IconButton(onClick = onIncrement) {
                        Icon(Icons.Rounded.Add, contentDescription = "Tambah")
                    }
                }
            }
        }
    }
}

private val ColorBorderAmber = androidx.compose.ui.graphics.Color(0xFFF59E0B)

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CartCheckoutSheetContent(
    state: BelanjaUiState,
    session: UserSession,
    onEvent: (BelanjaEvent) -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 240.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(
                items = state.cartItems,
                key = { it.barangId },
            ) { item ->
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
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
                                text = CurrencyFormatter.format(item.subtotal),
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                        IconButton(onClick = { onEvent(BelanjaEvent.UpdateCartQty(item.barangId, -1)) }) {
                            Icon(Icons.Rounded.Remove, contentDescription = "Kurangi")
                        }
                        Text(
                            text = item.qty.toString(),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        IconButton(onClick = { onEvent(BelanjaEvent.UpdateCartQty(item.barangId, 1)) }) {
                            Icon(Icons.Rounded.Add, contentDescription = "Tambah")
                        }
                        IconButton(onClick = { onEvent(BelanjaEvent.RemoveCartItem(item.barangId)) }) {
                            Icon(
                                imageVector = Icons.Rounded.Delete,
                                contentDescription = "Hapus",
                                tint = MaterialTheme.colorScheme.error,
                            )
                        }
                    }
                }
            }
        }

        HorizontalDivider()

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    text = "Estimasi Total Tagihan",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "Pesanan atas nama ${session.name}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                text = CurrencyFormatter.format(state.cartEstimatedTotal),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.primary,
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = "Metode Pembayaran",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                MetodePembayaranOption.entries.forEach { option ->
                    FilterChip(
                        selected = state.selectedMetode == option,
                        onClick = { onEvent(BelanjaEvent.MetodeSelected(option)) },
                        label = { Text(option.label) },
                    )
                }
            }
            if (state.selectedMetode == MetodePembayaranOption.HUTANG) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.secondaryContainer,
                ) {
                    Text(
                        text = "Jaminan Simpanan Pokok: Belanja kredit menggunakan pagu jaminan simpanan pokok Anda di koperasi.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.padding(10.dp),
                    )
                }
            }
        }
    }
}
