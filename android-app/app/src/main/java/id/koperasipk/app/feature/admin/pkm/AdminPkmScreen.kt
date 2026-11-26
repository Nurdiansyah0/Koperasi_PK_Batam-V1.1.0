package id.koperasipk.app.feature.admin.pkm

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
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Inventory
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
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
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
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
import id.koperasipk.app.core.designsystem.StatCard
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.feature.admin.ui.AdminPaginationFooter
import id.koperasipk.app.feature.admin.ui.AdminSearchField
import id.koperasipk.app.feature.admin.ui.AdminSurfaceCard
import kotlinx.coroutines.launch

@Composable
fun AdminPkmScreen(
    viewModel: AdminPkmViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AdminPkmEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    ConfirmDialog(
        visible = state.showConfirmAutoCalc,
        title = "Kalkulasi Ulang PKM?",
        message = "Hitung otomatis batas PKM seluruh produk berdasarkan penjualan ${state.days} hari terakhir (target ${state.leadTimeDays} hari stok)?",
        confirmLabel = "Hitung & Terapkan",
        isLoading = state.isSubmitting,
        onConfirm = { viewModel.onEvent(AdminPkmEvent.ConfirmAutoCalc) },
        onDismiss = { viewModel.onEvent(AdminPkmEvent.DismissAutoCalc) },
    )

    state.editPkmForm?.let { form ->
        AlertDialog(
            onDismissRequest = { if (!state.isSubmitting) viewModel.onEvent(AdminPkmEvent.DismissEditPkm) },
            title = { Text("Ubah Batas PKM Rak") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(form.item.namaBarang, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Text(
                        text = "Rekomendasi sistem: ${form.item.recommendedPkm} pcs • Saat ini: ${form.item.pkm} pcs",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(
                        value = form.pkmInput,
                        onValueChange = { viewModel.onEvent(AdminPkmEvent.UpdateEditPkmInput(it)) },
                        label = { Text("Batas PKM Baru (pcs)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                Button(onClick = { viewModel.onEvent(AdminPkmEvent.SubmitEditPkm) }, enabled = !state.isSubmitting) {
                    Text(if (state.isSubmitting) "Menyimpan..." else "Simpan PKM")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.onEvent(AdminPkmEvent.DismissEditPkm) }, enabled = !state.isSubmitting) {
                    Text("Batal")
                }
            },
        )
    }

    state.inboundForm?.let { form ->
        InboundFakturDialog(
            form = form,
            isSubmitting = state.isSubmitting,
            onHeaderChange = { f, s, d, c ->
                viewModel.onEvent(AdminPkmEvent.UpdateInboundHeader(f, s, d, c))
            },
            onRowChange = { id, j, h, a, e ->
                viewModel.onEvent(AdminPkmEvent.UpdateInboundRow(id, j, h, a, e))
            },
            onRemoveRow = { viewModel.onEvent(AdminPkmEvent.RemoveInboundRow(it)) },
            onDismiss = { viewModel.onEvent(AdminPkmEvent.DismissInboundModal) },
            onSubmit = { viewModel.onEvent(AdminPkmEvent.SubmitInbound) },
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            KoperasiTopBar(
                title = "Manajemen PKM & Kulakan",
                subtitle = "Rencana belanja berbasis penjualan riil",
                onBack = onBack,
                actions = {
                    IconButton(onClick = { viewModel.onEvent(AdminPkmEvent.RequestAutoCalc) }) {
                        Icon(Icons.Rounded.Bolt, contentDescription = "Auto-Kalkulasi PKM")
                    }
                },
            )
        },
        bottomBar = {
            if (state.selectedActiveItems.isNotEmpty()) {
                Surface(tonalElevation = 3.dp, shadowElevation = 6.dp) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        OutlinedButton(
                            onClick = {
                                val text = buildString {
                                    appendLine("DAFTAR KULAKAN BELANJA (Basis ${state.days}H)")
                                    state.selectedActiveItems.forEachIndexed { idx, it ->
                                        appendLine("${idx + 1}. [ ] ${it.namaBarang} -> ${it.jumlahBeli} pcs @ ${CurrencyFormatter.format(it.hargaModal)}")
                                    }
                                    appendLine("Total: ${state.totalPiecesToBuy} pcs | ${CurrencyFormatter.format(state.totalBudgetSelected)}")
                                }
                                clipboard.setText(AnnotatedString(text))
                                scope.launch { snackbarHostState.showSnackbar("Daftar belanja disalin ke clipboard") }
                            },
                            shape = RoundedCornerShape(10.dp),
                        ) {
                            Icon(Icons.Rounded.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Salin WA")
                        }
                        Button(
                            onClick = { viewModel.onEvent(AdminPkmEvent.OpenInboundModal) },
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f),
                        ) {
                            Text("Catat Faktur Masuk (${state.selectedActiveItems.size})")
                        }
                    }
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && state.shoppingItems.isEmpty() -> {
                LoadingState(message = "Menganalisis penjualan produk...", modifier = Modifier.padding(innerPadding))
            }
            state.errorMessage != null && state.shoppingItems.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(AdminPkmEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(AdminPkmEvent.Refresh) },
                    modifier = Modifier.fillMaxSize().padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item(key = "pkm_kpis") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard(
                                    title = "Estimasi Modal",
                                    value = CurrencyFormatter.format(state.totalBudgetSelected),
                                    icon = Icons.Rounded.ShoppingCart,
                                    accentColor = Color(0xFF1D4ED8),
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Fisik Dibeli",
                                    value = "${state.totalPiecesToBuy} pcs",
                                    subtitle = "${state.selectedActiveItems.size} SKU terpilih",
                                    icon = Icons.Rounded.Inventory,
                                    accentColor = BrandEmeraldDark,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }

                        item(key = "pkm_controls") {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    listOf(3, 7, 14, 30).forEach { d ->
                                        FilterChip(
                                            selected = state.days == d,
                                            onClick = { viewModel.onEvent(AdminPkmEvent.DaysChanged(d)) },
                                            label = { Text("$d Hari") },
                                        )
                                    }
                                    listOf(4, 7).forEach { lt ->
                                        FilterChip(
                                            selected = state.leadTimeDays == lt,
                                            onClick = { viewModel.onEvent(AdminPkmEvent.LeadTimeChanged(lt)) },
                                            label = { Text("Target ${lt}H") },
                                        )
                                    }
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    AdminSearchField(
                                        query = state.searchQuery,
                                        onQueryChange = { viewModel.onEvent(AdminPkmEvent.SearchChanged(it)) },
                                        placeholder = "Cari barang...",
                                        modifier = Modifier.weight(1f),
                                    )
                                    Button(onClick = { viewModel.onEvent(AdminPkmEvent.SubmitSearch) }) {
                                        Text("Cari")
                                    }
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    TextButton(onClick = { viewModel.onEvent(AdminPkmEvent.ToggleSelectAll) }) {
                                        val allSel = state.shoppingItems.isNotEmpty() && state.shoppingItems.all { it.isSelected }
                                        Text(if (allSel) "Batal Pilih Semua" else "Pilih Semua")
                                    }
                                    Text(
                                        text = "${state.shoppingItems.size} SKU",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }

                        if (state.pagedItems.isEmpty()) {
                            item(key = "empty_pkm") {
                                EmptyState(
                                    title = "Data PKM kosong",
                                    description = "Tidak ada produk yang sesuai filter.",
                                    modifier = Modifier.height(220.dp),
                                )
                            }
                        } else {
                            items(state.pagedItems, key = { it.barangId }) { item ->
                                val subtotal = item.jumlahBeli * item.hargaModal
                                AdminSurfaceCard {
                                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Checkbox(
                                                checked = item.isSelected,
                                                onCheckedChange = { viewModel.onEvent(AdminPkmEvent.ToggleItemSelection(item.barangId)) },
                                            )
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(item.namaBarang, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                                Text(
                                                    text = "Laku ${item.totalSold} • Sisa ${item.stokTotal} (Toko ${item.stokToko}/Gudang ${item.stokGudang})",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                            IconButton(onClick = { viewModel.onEvent(AdminPkmEvent.OpenEditPkm(item)) }) {
                                                Icon(Icons.Rounded.Edit, contentDescription = "Ubah PKM")
                                            }
                                        }
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            StatusBadge(
                                                text = "PKM ${item.pkm} (Rek: ${item.recommendedPkm})",
                                                variant = if (item.stokTotal < item.pkm) BadgeVariant.WARNING else BadgeVariant.SUCCESS,
                                            )
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                OutlinedTextField(
                                                    value = item.jumlahBeli.toString(),
                                                    onValueChange = { raw ->
                                                        val qty = raw.filter(Char::isDigit).toIntOrNull() ?: 0
                                                        viewModel.onEvent(AdminPkmEvent.UpdateBuyQty(item.barangId, qty))
                                                    },
                                                    label = { Text("Beli") },
                                                    singleLine = true,
                                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                                    modifier = Modifier.width(82.dp),
                                                )
                                                Text(
                                                    text = CurrencyFormatter.format(subtotal),
                                                    style = MaterialTheme.typography.labelLarge,
                                                    fontWeight = FontWeight.Bold,
                                                    color = BrandEmeraldDark,
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                            if (state.totalPages > 1) {
                                item(key = "pagination_pkm") {
                                    AdminPaginationFooter(
                                        currentPage = state.currentPage,
                                        totalPages = state.totalPages,
                                        totalItems = state.shoppingItems.size,
                                        onPrevPage = { viewModel.onEvent(AdminPkmEvent.PageChanged(state.currentPage - 1)) },
                                        onNextPage = { viewModel.onEvent(AdminPkmEvent.PageChanged(state.currentPage + 1)) },
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
private fun InboundFakturDialog(
    form: InboundFakturFormState,
    isSubmitting: Boolean,
    onHeaderChange: (String?, String?, String?, String?) -> Unit,
    onRowChange: (Int, Int?, Double?, String?, String?) -> Unit,
    onRemoveRow: (Int) -> Unit,
    onDismiss: () -> Unit,
    onSubmit: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!isSubmitting) onDismiss() },
        title = { Text("Catat Faktur Kulakan (${form.items.size} SKU)") },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 450.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = form.nomorFaktur,
                    onValueChange = { onHeaderChange(it, null, null, null) },
                    label = { Text("Nomor Faktur") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = form.namaSupplier,
                    onValueChange = { onHeaderChange(null, it, null, null) },
                    label = { Text("Nama Supplier / Grosir") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    listOf("kas_koperasi" to "Kas Tunai", "rekening_bank" to "Bank", "dana_talangan" to "Talangan").forEach { (k, label) ->
                        FilterChip(
                            selected = form.sumberDana == k,
                            onClick = { onHeaderChange(null, null, k, null) },
                            label = { Text(label) },
                        )
                    }
                }
                OutlinedTextField(
                    value = form.catatan,
                    onValueChange = { onHeaderChange(null, null, null, it) },
                    label = { Text("Catatan") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                form.items.forEach { row ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)),
                    ) {
                        Column(modifier = Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(row.namaBarang, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                IconButton(onClick = { onRemoveRow(row.barangId) }) {
                                    Icon(Icons.Rounded.DeleteOutline, contentDescription = "Hapus baris", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                OutlinedTextField(
                                    value = row.jumlahTambah.toString(),
                                    onValueChange = { v ->
                                        v.filter(Char::isDigit).toIntOrNull()?.let { onRowChange(row.barangId, it.coerceAtLeast(1), null, null, null) }
                                    },
                                    label = { Text("Qty") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    modifier = Modifier.weight(1f),
                                )
                                OutlinedTextField(
                                    value = row.hargaBeliSatuan.toLong().toString(),
                                    onValueChange = { v ->
                                        v.filter(Char::isDigit).toDoubleOrNull()?.let { onRowChange(row.barangId, null, it, null, null) }
                                    },
                                    label = { Text("Modal") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    modifier = Modifier.weight(1.4f),
                                )
                            }
                            Row(
                                modifier = Modifier.horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                listOf("gudang" to "Gudang", "toko" to "Toko", "auto" to "Auto").forEach { (k, label) ->
                                    FilterChip(
                                        selected = row.alokasi == k,
                                        onClick = { onRowChange(row.barangId, null, null, k, null) },
                                        label = { Text(label) },
                                    )
                                }
                            }
                            OutlinedTextField(
                                value = row.tanggalKadaluarsa,
                                onValueChange = { onRowChange(row.barangId, null, null, null, it) },
                                label = { Text("Expired Batch (YYYY-MM-DD)") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                }
                Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("Total (${form.totalPieces} pcs):", style = MaterialTheme.typography.bodySmall)
                        Text(
                            text = CurrencyFormatter.format(form.totalCost),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onSubmit, enabled = !isSubmitting && form.items.isNotEmpty()) {
                Text(if (isSubmitting) "Menyimpan..." else "Simpan Faktur")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) { Text("Batal") }
        },
    )
}
