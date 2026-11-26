package id.koperasipk.app.feature.admin.barang

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AddShoppingCart
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
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
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.BrandEmeraldDark
import id.koperasipk.app.core.designsystem.ConfirmDialog
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.RupiahTextField
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.feature.admin.data.AdminBarangDto
import id.koperasipk.app.feature.admin.ui.AdminPaginationFooter
import id.koperasipk.app.feature.admin.ui.AdminSearchField
import id.koperasipk.app.feature.admin.ui.AdminSurfaceCard

@Composable
fun AdminBarangScreen(
    viewModel: AdminBarangViewModel,
    onNavigatePkm: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val clipboard = LocalClipboardManager.current

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AdminBarangEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    // Confirm Delete
    val deleteTarget = state.deleteTarget
    ConfirmDialog(
        visible = deleteTarget != null,
        title = "Hapus Barang?",
        message = "Barang \"${deleteTarget?.namaBarang.orEmpty()}\" akan dihapus permanen dari katalog jika belum memiliki riwayat penjualan/restock.",
        confirmLabel = "Hapus",
        isDestructive = true,
        isLoading = state.isSubmitting,
        onConfirm = { viewModel.onEvent(AdminBarangEvent.ConfirmDelete) },
        onDismiss = { viewModel.onEvent(AdminBarangEvent.DismissDelete) },
    )

    // Confirm Write-Off
    ConfirmDialog(
        visible = state.confirmWriteOffPending,
        title = "Konfirmasi Pemusnahan Stok",
        message = "Tarik ${state.writeOffForm?.jumlah.orEmpty()} pcs \"${state.writeOffForm?.barang?.namaBarang.orEmpty()}\" dari lokasi ${state.writeOffForm?.lokasi.orEmpty()}? Stok akan langsung berkurang.",
        confirmLabel = "Ya, Musnahkan",
        isDestructive = true,
        isLoading = state.isSubmitting,
        onConfirm = { viewModel.onEvent(AdminBarangEvent.ConfirmWriteOff) },
        onDismiss = { viewModel.onEvent(AdminBarangEvent.DismissConfirmWriteOff) },
    )

    // Confirm Refill
    ConfirmDialog(
        visible = state.confirmRefillPending,
        title = "Konfirmasi Refill Rak Toko",
        message = "Pindahkan ${state.refillItems.filter { it.isSelected }.sumOf { it.jumlahAmbil }} pcs dari gudang ke display rak toko?",
        confirmLabel = "Konfirmasi Refill",
        isLoading = state.isSubmitting,
        onConfirm = { viewModel.onEvent(AdminBarangEvent.ConfirmRefill) },
        onDismiss = { viewModel.onEvent(AdminBarangEvent.DismissConfirmRefill) },
    )

    state.barangForm?.let { form ->
        BarangCrudDialog(
            form = form,
            isSubmitting = state.isSubmitting,
            onUpdate = { viewModel.onEvent(AdminBarangEvent.UpdateBarangForm(it)) },
            onDismiss = { viewModel.onEvent(AdminBarangEvent.DismissBarangForm) },
            onSubmit = { viewModel.onEvent(AdminBarangEvent.SubmitBarangForm) },
        )
    }

    state.restockForm?.let { form ->
        RestockDialog(
            form = form,
            isSubmitting = state.isSubmitting,
            onUpdate = { viewModel.onEvent(AdminBarangEvent.UpdateRestockForm(it)) },
            onDismiss = { viewModel.onEvent(AdminBarangEvent.DismissRestock) },
            onSubmit = { viewModel.onEvent(AdminBarangEvent.SubmitRestock) },
        )
    }

    state.mutasiForm?.let { form ->
        MutasiDialog(
            form = form,
            isSubmitting = state.isSubmitting,
            onUpdate = { viewModel.onEvent(AdminBarangEvent.UpdateMutasiForm(it)) },
            onDismiss = { viewModel.onEvent(AdminBarangEvent.DismissMutasi) },
            onSubmit = { viewModel.onEvent(AdminBarangEvent.SubmitMutasi) },
        )
    }

    state.writeOffForm?.let { form ->
        WriteOffDialog(
            form = form,
            isSubmitting = state.isSubmitting,
            onUpdate = { viewModel.onEvent(AdminBarangEvent.UpdateWriteOffForm(it)) },
            onDismiss = { viewModel.onEvent(AdminBarangEvent.DismissWriteOff) },
            onSubmit = { viewModel.onEvent(AdminBarangEvent.RequestConfirmWriteOff) },
        )
    }

    if (state.showRefillDialog) {
        RefillWorkOrderDialog(
            state = state,
            onToggleItem = { viewModel.onEvent(AdminBarangEvent.ToggleRefillItem(it)) },
            onUpdateQty = { id, qty -> viewModel.onEvent(AdminBarangEvent.UpdateRefillQty(id, qty)) },
            onCopyChecklist = {
                val selected = state.refillItems.filter { it.isSelected }
                val lines = buildString {
                    appendLine("DAFTAR PICKING REFILL TOKO (KOPERASI PK)")
                    appendLine("Total SKU: ${selected.size}")
                    selected.forEachIndexed { idx, it ->
                        appendLine("${idx + 1}. [ ] ${it.namaBarang} -> Ambil ${it.jumlahAmbil} pcs (Rak: ${it.stokToko}/${it.pkm}, Gudang: ${it.stokGudang})")
                    }
                }
                clipboard.setText(AnnotatedString(lines))
            },
            onConfirmRefill = { viewModel.onEvent(AdminBarangEvent.RequestConfirmRefill) },
            onOpenRestock = {
                viewModel.onEvent(AdminBarangEvent.DismissRefillDialog)
                viewModel.onEvent(AdminBarangEvent.OpenRestock(it))
            },
            onOpenPkm = {
                viewModel.onEvent(AdminBarangEvent.DismissRefillDialog)
                onNavigatePkm()
            },
            onDismiss = { viewModel.onEvent(AdminBarangEvent.DismissRefillDialog) },
        )
    }

    if (state.showHistoryDialog) {
        RiwayatRestockDialog(
            state = state,
            onDismiss = { viewModel.onEvent(AdminBarangEvent.DismissHistory) },
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            KoperasiTopBar(
                title = "Katalog & Expired Radar",
                subtitle = "${state.allItems.size} produk • Stok Toko & Gudang",
                actions = {
                    IconButton(onClick = { viewModel.onEvent(AdminBarangEvent.OpenRefillDialog) }) {
                        Icon(Icons.Rounded.Bolt, contentDescription = "Rencanakan Refill")
                    }
                    IconButton(onClick = { viewModel.onEvent(AdminBarangEvent.OpenHistory) }) {
                        Icon(Icons.Rounded.History, contentDescription = "Riwayat Kulakan")
                    }
                },
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.onEvent(AdminBarangEvent.OpenAddOrEdit(null)) },
                containerColor = MaterialTheme.colorScheme.primary,
            ) {
                Icon(Icons.Rounded.Add, contentDescription = "Tambah Barang")
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && state.allItems.isEmpty() -> {
                LoadingState(
                    message = "Memuat katalog inventori...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.allItems.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(AdminBarangEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(AdminBarangEvent.Refresh) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item(key = "filter_chips") {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                FilterChip(
                                    selected = state.filterTab == BarangFilterTab.ALL,
                                    onClick = { viewModel.onEvent(AdminBarangEvent.FilterChanged(BarangFilterTab.ALL)) },
                                    label = { Text("Semua (${state.allItems.size})") },
                                )
                                FilterChip(
                                    selected = state.filterTab == BarangFilterTab.EXPIRED,
                                    onClick = { viewModel.onEvent(AdminBarangEvent.FilterChanged(BarangFilterTab.EXPIRED)) },
                                    label = { Text("Kadaluarsa (${state.expiredCount})") },
                                )
                                FilterChip(
                                    selected = state.filterTab == BarangFilterTab.NEAR_EXPIRY,
                                    onClick = { viewModel.onEvent(AdminBarangEvent.FilterChanged(BarangFilterTab.NEAR_EXPIRY)) },
                                    label = { Text("Kritis ≤30H (${state.nearExpiryCount})") },
                                )
                                FilterChip(
                                    selected = state.filterTab == BarangFilterTab.REFILL,
                                    onClick = { viewModel.onEvent(AdminBarangEvent.FilterChanged(BarangFilterTab.REFILL)) },
                                    label = { Text("Butuh Refill (${state.deficitItems.size})") },
                                )
                            }
                        }

                        item(key = "search_bar") {
                            AdminSearchField(
                                query = state.searchQuery,
                                onQueryChange = { viewModel.onEvent(AdminBarangEvent.SearchChanged(it)) },
                                placeholder = "Cari nama barang...",
                            )
                        }

                        if (state.pagedItems.isEmpty()) {
                            item(key = "empty_barang") {
                                EmptyState(
                                    title = "Tidak ada barang ditemukan",
                                    description = "Coba ubah filter kategori atau kata kunci pencarian.",
                                    icon = Icons.Rounded.Inventory2,
                                    modifier = Modifier.height(260.dp),
                                )
                            }
                        } else {
                            items(
                                items = state.pagedItems,
                                key = { it.barangId },
                            ) { item ->
                                BarangItemCard(
                                    item = item,
                                    onMutasi = { viewModel.onEvent(AdminBarangEvent.OpenMutasi(item)) },
                                    onWriteOff = { viewModel.onEvent(AdminBarangEvent.OpenWriteOff(item)) },
                                    onRestock = { viewModel.onEvent(AdminBarangEvent.OpenRestock(item)) },
                                    onEdit = { viewModel.onEvent(AdminBarangEvent.OpenAddOrEdit(item)) },
                                    onDelete = { viewModel.onEvent(AdminBarangEvent.RequestDelete(item)) },
                                )
                            }

                            if (state.totalPages > 1) {
                                item(key = "pagination") {
                                    AdminPaginationFooter(
                                        currentPage = state.currentPage,
                                        totalPages = state.totalPages,
                                        totalItems = state.filteredItems.size,
                                        onPrevPage = { viewModel.onEvent(AdminBarangEvent.PageChanged(state.currentPage - 1)) },
                                        onNextPage = { viewModel.onEvent(AdminBarangEvent.PageChanged(state.currentPage + 1)) },
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BarangItemCard(
    item: AdminBarangDto,
    onMutasi: () -> Unit,
    onWriteOff: () -> Unit,
    onRestock: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    val borderColor = when {
        item.isAnyExpired -> MaterialTheme.colorScheme.error.copy(alpha = 0.65f)
        item.isAnyNearExpiry -> Color(0xFFEA580C).copy(alpha = 0.55f)
        item.isTokoUnderPkm -> Color(0xFFD97706).copy(alpha = 0.55f)
        else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.45f)
    }
    AdminSurfaceCard(borderColor = borderColor) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "ID #${item.barangId}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (item.isAnyExpired) {
                        StatusBadge(text = "KADALUARSA", variant = BadgeVariant.DANGER)
                    } else if (item.isAnyNearExpiry) {
                        StatusBadge(text = "≤30 Hari", variant = BadgeVariant.WARNING)
                    }
                    if (item.isTokoUnderPkm) {
                        StatusBadge(
                            text = if (item.effectiveStokGudang > 0) "Perlu Refill" else "Gudang OOS",
                            variant = if (item.effectiveStokGudang > 0) BadgeVariant.WARNING else BadgeVariant.DANGER,
                        )
                    }
                }
            }

            Text(
                text = item.namaBarang,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Display Toko:", style = MaterialTheme.typography.bodySmall)
                        Text(
                            text = "${item.effectiveStokToko} / PKM ${item.effectivePkm}",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                            color = if (item.isTokoUnderPkm) Color(0xFFD97706) else BrandEmeraldDark,
                        )
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Expired Rak:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            text = item.tglKadaluarsaToko?.substringBefore("T")?.let { "$it (${item.hariKadaluarsaToko ?: 0}h)" } ?: "Belum diisi",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = if (item.isTokoExpired) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Cadangan Gudang:", style = MaterialTheme.typography.bodySmall)
                        Text(
                            text = "${item.effectiveStokGudang} pcs",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                            color = if (item.effectiveStokGudang == 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
                        )
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Expired Gudang:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            text = item.tglKadaluarsaGudang?.substringBefore("T")?.let { "$it (${item.hariKadaluarsaGudang ?: 0}h)" } ?: "Belum diisi",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = if (item.isGudangExpired) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Total Persediaan:", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                        Text("${item.stok} pcs", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.ExtraBold)
                    }
                }
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("Harga Jual POS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        text = CurrencyFormatter.format(item.hargaJual),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Harga Modal", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        text = CurrencyFormatter.format(item.hargaModal),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (item.isAnyExpired) {
                    Button(
                        onClick = onWriteOff,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Rounded.DeleteOutline, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Tarik Exp", style = MaterialTheme.typography.labelSmall, maxLines = 1)
                    }
                } else {
                    OutlinedButton(
                        onClick = onMutasi,
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Rounded.SwapHoriz, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Pindah Rak", style = MaterialTheme.typography.labelSmall, maxLines = 1)
                    }
                }
                OutlinedButton(
                    onClick = onRestock,
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Rounded.AddShoppingCart, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Restock", style = MaterialTheme.typography.labelSmall, maxLines = 1)
                }
                IconButton(onClick = onEdit) {
                    Icon(Icons.Rounded.Edit, contentDescription = "Edit Barang")
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Rounded.DeleteOutline, contentDescription = "Hapus Barang", tint = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

@Composable
private fun BarangCrudDialog(
    form: BarangFormState,
    isSubmitting: Boolean,
    onUpdate: (BarangFormState) -> Unit,
    onDismiss: () -> Unit,
    onSubmit: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!isSubmitting) onDismiss() },
        title = { Text(if (form.isEditing) "Edit Barang & Expired" else "Tambah Barang Baru") },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 430.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedTextField(
                    value = form.namaBarang,
                    onValueChange = { onUpdate(form.copy(namaBarang = it)) },
                    label = { Text("Nama Barang") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                RupiahTextField(
                    value = form.hargaModalDigits,
                    onValueChange = { onUpdate(form.copy(hargaModalDigits = it)) },
                    label = "Harga Modal",
                )
                RupiahTextField(
                    value = form.hargaJualDigits,
                    onValueChange = { onUpdate(form.copy(hargaJualDigits = it)) },
                    label = "Harga Jual POS",
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = form.stokToko,
                        onValueChange = { onUpdate(form.copy(stokToko = it.filter(Char::isDigit))) },
                        label = { Text("Stok Toko") },
                        enabled = !form.isEditing,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    OutlinedTextField(
                        value = form.stokGudang,
                        onValueChange = { onUpdate(form.copy(stokGudang = it.filter(Char::isDigit))) },
                        label = { Text("Stok Gudang") },
                        enabled = !form.isEditing,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                }
                OutlinedTextField(
                    value = form.pkm,
                    onValueChange = { onUpdate(form.copy(pkm = it.filter(Char::isDigit))) },
                    label = { Text("Batas Pajang Rak / PKM (pcs)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = form.tglKadaluarsaToko,
                    onValueChange = { onUpdate(form.copy(tglKadaluarsaToko = it)) },
                    label = { Text("Expired Rak Toko (YYYY-MM-DD)") },
                    placeholder = { Text("2026-12-31") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = form.tglKadaluarsaGudang,
                    onValueChange = { onUpdate(form.copy(tglKadaluarsaGudang = it)) },
                    label = { Text("Expired Gudang (YYYY-MM-DD)") },
                    placeholder = { Text("2026-12-31") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            Button(onClick = onSubmit, enabled = !isSubmitting) {
                Text(if (isSubmitting) "Menyimpan..." else "Simpan")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                Text("Batal")
            }
        },
    )
}

@Composable
private fun RestockDialog(
    form: RestockFormState,
    isSubmitting: Boolean,
    onUpdate: (RestockFormState) -> Unit,
    onDismiss: () -> Unit,
    onSubmit: () -> Unit,
) {
    val qty = form.jumlahTambah.toIntOrNull() ?: 0
    val harga = form.hargaBeliDigits.toDoubleOrNull() ?: 0.0
    AlertDialog(
        onDismissRequest = { if (!isSubmitting) onDismiss() },
        title = { Text("Restock: ${form.namaBarang}") },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 430.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedTextField(
                    value = form.jumlahTambah,
                    onValueChange = { onUpdate(form.copy(jumlahTambah = it.filter(Char::isDigit))) },
                    label = { Text("Jumlah Tambah (pcs)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                RupiahTextField(
                    value = form.hargaBeliDigits,
                    onValueChange = { onUpdate(form.copy(hargaBeliDigits = it)) },
                    label = "Harga Beli Satuan",
                )
                Text("Alokasi Stok Masuk", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    listOf("gudang" to "Gudang", "toko" to "Toko", "auto" to "Isi Rak Dulu").forEach { (key, label) ->
                        FilterChip(
                            selected = form.alokasi == key,
                            onClick = { onUpdate(form.copy(alokasi = key)) },
                            label = { Text(label) },
                        )
                    }
                }
                Text("Sumber Dana", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    listOf(
                        "kas_koperasi" to "Kas Tunai",
                        "rekening_bank" to "Bank",
                        "dana_talangan" to "Talangan",
                    ).forEach { (key, label) ->
                        FilterChip(
                            selected = form.sumberDana == key,
                            onClick = { onUpdate(form.copy(sumberDana = key)) },
                            label = { Text(label) },
                        )
                    }
                }
                OutlinedTextField(
                    value = form.tanggalKadaluarsa,
                    onValueChange = { onUpdate(form.copy(tanggalKadaluarsa = it)) },
                    label = { Text("Expired Batch (YYYY-MM-DD, opsional)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = form.catatan,
                    onValueChange = { onUpdate(form.copy(catatan = it)) },
                    label = { Text("Catatan Pembelian") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("Total Biaya:", style = MaterialTheme.typography.bodySmall)
                        Text(
                            text = CurrencyFormatter.format(qty * harga),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onSubmit, enabled = !isSubmitting) {
                Text(if (isSubmitting) "Memproses..." else "Proses Restock")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) { Text("Batal") }
        },
    )
}

@Composable
private fun MutasiDialog(
    form: MutasiFormState,
    isSubmitting: Boolean,
    onUpdate: (MutasiFormState) -> Unit,
    onDismiss: () -> Unit,
    onSubmit: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!isSubmitting) onDismiss() },
        title = { Text("Mutasi Stok Rak") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "${form.barang.namaBarang} • Toko: ${form.barang.effectiveStokToko} | Gudang: ${form.barang.effectiveStokGudang}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = form.tipe == "gudang_ke_toko",
                        onClick = { onUpdate(form.copy(tipe = "gudang_ke_toko")) },
                        label = { Text("Gudang -> Toko") },
                    )
                    FilterChip(
                        selected = form.tipe == "toko_ke_gudang",
                        onClick = { onUpdate(form.copy(tipe = "toko_ke_gudang")) },
                        label = { Text("Toko -> Gudang") },
                    )
                }
                OutlinedTextField(
                    value = form.jumlah,
                    onValueChange = { onUpdate(form.copy(jumlah = it.filter(Char::isDigit))) },
                    label = { Text("Jumlah (pcs)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = form.catatan,
                    onValueChange = { onUpdate(form.copy(catatan = it)) },
                    label = { Text("Catatan (opsional)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            Button(onClick = onSubmit, enabled = !isSubmitting) {
                Text(if (isSubmitting) "Memproses..." else "Eksekusi Mutasi")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) { Text("Batal") }
        },
    )
}

@Composable
private fun WriteOffDialog(
    form: WriteOffFormState,
    isSubmitting: Boolean,
    onUpdate: (WriteOffFormState) -> Unit,
    onDismiss: () -> Unit,
    onSubmit: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!isSubmitting) onDismiss() },
        title = { Text("Tarik / Write-Off Expired") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "${form.barang.namaBarang} • Toko: ${form.barang.effectiveStokToko} | Gudang: ${form.barang.effectiveStokGudang}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    listOf("toko" to "Toko", "gudang" to "Gudang", "semua" to "Semua").forEach { (key, label) ->
                        FilterChip(
                            selected = form.lokasi == key,
                            onClick = { onUpdate(form.copy(lokasi = key)) },
                            label = { Text(label) },
                        )
                    }
                }
                OutlinedTextField(
                    value = form.jumlah,
                    onValueChange = { onUpdate(form.copy(jumlah = it.filter(Char::isDigit))) },
                    label = { Text("Jumlah Ditarik (pcs)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = form.alasan,
                    onValueChange = { onUpdate(form.copy(alasan = it)) },
                    label = { Text("Alasan Penarikan") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            Button(
                onClick = onSubmit,
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
            ) {
                Text("Lanjut Konfirmasi")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) { Text("Batal") }
        },
    )
}

@Composable
private fun RefillWorkOrderDialog(
    state: AdminBarangUiState,
    onToggleItem: (Int) -> Unit,
    onUpdateQty: (Int, Int) -> Unit,
    onCopyChecklist: () -> Unit,
    onConfirmRefill: () -> Unit,
    onOpenRestock: (AdminBarangDto) -> Unit,
    onOpenPkm: () -> Unit,
    onDismiss: () -> Unit,
) {
    var selectedTab by remember { mutableIntStateOf(if (state.refillItems.isNotEmpty()) 0 else 1) }
    val selectedItems = state.refillItems.filter { it.isSelected }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Lembar Kerja Refill Toko") },
        text = {
            Column(modifier = Modifier.heightIn(max = 430.dp)) {
                TabRow(selectedTabIndex = selectedTab) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text("Siap Refill (${state.refillItems.size})") },
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("Gudang OOS (${state.outOfStockGudangItems.size})") },
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                if (selectedTab == 0) {
                    if (state.refillItems.isEmpty()) {
                        Text(
                            text = "Tidak ada item defisit yang memiliki cadangan stok gudang.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "Terpilih: ${selectedItems.size} SKU (${selectedItems.sumOf { it.jumlahAmbil }} pcs)",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            TextButton(onClick = onCopyChecklist) {
                                Icon(Icons.Rounded.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Salin")
                            }
                        }
                        LazyColumn(
                            modifier = Modifier.heightIn(max = 280.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(state.refillItems, key = { it.barangId }) { item ->
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)),
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Checkbox(
                                            checked = item.isSelected,
                                            onCheckedChange = { onToggleItem(item.barangId) },
                                        )
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(item.namaBarang, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                            Text(
                                                text = "Rak ${item.stokToko}/${item.pkm} • Gudang ${item.stokGudang}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                        OutlinedTextField(
                                            value = item.jumlahAmbil.toString(),
                                            onValueChange = { raw ->
                                                raw.filter(Char::isDigit).toIntOrNull()?.let { onUpdateQty(item.barangId, it) }
                                            },
                                            enabled = item.isSelected,
                                            singleLine = true,
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            modifier = Modifier.width(68.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = onOpenPkm, modifier = Modifier.fillMaxWidth()) {
                            Text("Buka Rencana Belanja PKM")
                        }
                        LazyColumn(
                            modifier = Modifier.heightIn(max = 260.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(state.outOfStockGudangItems, key = { it.barangId }) { item ->
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.3f)),
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(item.namaBarang, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                            Text(
                                                text = "Rak ${item.effectiveStokToko}/${item.effectivePkm} • Gudang 0",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.error,
                                            )
                                        }
                                        TextButton(onClick = { onOpenRestock(item) }) { Text("Kulakan") }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (selectedTab == 0 && selectedItems.isNotEmpty()) {
                Button(onClick = onConfirmRefill, enabled = !state.isSubmitting) {
                    Text("Konfirmasi Refill")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Tutup") }
        },
    )
}

@Composable
private fun RiwayatRestockDialog(
    state: AdminBarangUiState,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Riwayat Kulakan") },
        text = {
            Column(modifier = Modifier.heightIn(max = 420.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.45f),
                ) {
                    Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                        Text("Total Pengeluaran Kulakan", style = MaterialTheme.typography.labelSmall)
                        Text(
                            text = CurrencyFormatter.format(state.totalHistoryPengeluaran),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
                if (state.isLoadingHistory) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(20.dp),
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.heightIn(max = 280.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(state.historyItems, key = { it.restockId }) { h ->
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)),
                            ) {
                                Column(modifier = Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(h.namaBarang, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                        Text(h.tanggal, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("+${h.jumlahTambah} pcs @ ${CurrencyFormatter.format(h.hargaBeliSatuan)}", style = MaterialTheme.typography.bodySmall)
                                        Text("-${CurrencyFormatter.format(h.totalBiaya)}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                                    }
                                    Text(
                                        text = "Admin: ${h.namaAdmin} • ${h.sumberDana.replace('_', ' ')}",
                                        style = MaterialTheme.typography.labelSmall,
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
            TextButton(onClick = onDismiss) { Text("Tutup") }
        },
    )
}
