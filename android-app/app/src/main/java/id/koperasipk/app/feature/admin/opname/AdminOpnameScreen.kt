package id.koperasipk.app.feature.admin.opname

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Save
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.ConfirmDialog
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.feature.admin.ui.AdminPaginationFooter
import id.koperasipk.app.feature.admin.ui.AdminSearchField
import id.koperasipk.app.feature.admin.ui.AdminSurfaceCard

@Composable
fun AdminOpnameScreen(
    viewModel: AdminOpnameViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AdminOpnameEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    ConfirmDialog(
        visible = state.showConfirmDialog,
        title = "Simpan Opname Massal?",
        message = "Anda akan menyesuaikan stok ${state.lokasi.uppercase()} untuk ${state.pendingAdjustments.size} barang. Lanjutkan?",
        confirmLabel = "Simpan Opname",
        isLoading = state.isSubmitting,
        onConfirm = { viewModel.onEvent(AdminOpnameEvent.ConfirmSubmit) },
        onDismiss = { viewModel.onEvent(AdminOpnameEvent.DismissConfirm) },
    )

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            KoperasiTopBar(
                title = "Opname Stok Massal",
                subtitle = "Audit fisik stok ${state.lokasi}",
                onBack = onBack,
            )
        },
        bottomBar = {
            if (state.items.isNotEmpty()) {
                Surface(
                    tonalElevation = 3.dp,
                    shadowElevation = 6.dp,
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column {
                            Text(
                                text = "${state.pendingAdjustments.size} barang berselisih",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = "Kosongkan kolom jika stok pas",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Button(
                            onClick = { viewModel.onEvent(AdminOpnameEvent.RequestSubmit) },
                            enabled = !state.isSubmitting && state.pendingAdjustments.isNotEmpty(),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Icon(Icons.Rounded.Save, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(if (state.isSubmitting) "Menyimpan..." else "Simpan")
                        }
                    }
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && state.items.isEmpty() -> {
                LoadingState(
                    message = "Memuat daftar barang untuk opname...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.items.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(AdminOpnameEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(AdminOpnameEvent.Refresh) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item(key = "opname_controls") {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilterChip(
                                        selected = state.lokasi == "toko",
                                        onClick = { viewModel.onEvent(AdminOpnameEvent.LokasiChanged("toko")) },
                                        label = { Text("Opname Toko") },
                                    )
                                    FilterChip(
                                        selected = state.lokasi == "gudang",
                                        onClick = { viewModel.onEvent(AdminOpnameEvent.LokasiChanged("gudang")) },
                                        label = { Text("Opname Gudang") },
                                    )
                                    FilterChip(
                                        selected = state.onlyChanged,
                                        onClick = { viewModel.onEvent(AdminOpnameEvent.ToggleOnlyChanged(!state.onlyChanged)) },
                                        label = { Text("Diisi (${state.physicalCounts.size})") },
                                    )
                                }
                                AdminSearchField(
                                    query = state.searchQuery,
                                    onQueryChange = { viewModel.onEvent(AdminOpnameEvent.SearchChanged(it)) },
                                    placeholder = "Cari nama barang...",
                                )
                            }
                        }

                        if (state.pagedItems.isEmpty()) {
                            item(key = "empty_opname") {
                                EmptyState(
                                    title = "Tidak ada barang ditemukan",
                                    description = "Sesuaikan pencarian atau filter item yang diisi.",
                                    modifier = Modifier.height(240.dp),
                                )
                            }
                        } else {
                            items(
                                items = state.pagedItems,
                                key = { it.barangId },
                            ) { item ->
                                val sistem = state.systemStockFor(item)
                                val rawInput = state.physicalCounts[item.barangId].orEmpty()
                                val fisik = rawInput.toIntOrNull() ?: sistem
                                val selisih = fisik - sistem
                                AdminSurfaceCard {
                                    Column(
                                        modifier = Modifier.padding(14.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.Top,
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = item.namaBarang,
                                                    style = MaterialTheme.typography.titleSmall,
                                                    fontWeight = FontWeight.Bold,
                                                )
                                                Text(
                                                    text = "${CurrencyFormatter.format(item.hargaJual)} • Total sistem: ${item.stok} pcs",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                            StatusBadge(
                                                text = "Sistem ${state.lokasi}: $sistem",
                                                variant = BadgeVariant.INFO,
                                            )
                                        }
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                                        ) {
                                            OutlinedTextField(
                                                value = rawInput,
                                                onValueChange = {
                                                    viewModel.onEvent(AdminOpnameEvent.PhysicalCountChanged(item.barangId, it))
                                                },
                                                label = { Text("Fisik (${state.lokasi})") },
                                                placeholder = { Text("$sistem") },
                                                singleLine = true,
                                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                                shape = RoundedCornerShape(12.dp),
                                                modifier = Modifier.weight(1f),
                                            )
                                            StatusBadge(
                                                text = when {
                                                    selisih == 0 -> "Pas (0)"
                                                    selisih > 0 -> "+$selisih Lebih"
                                                    else -> "$selisih Hilang"
                                                },
                                                variant = when {
                                                    selisih == 0 -> BadgeVariant.SUCCESS
                                                    selisih > 0 -> BadgeVariant.INFO
                                                    else -> BadgeVariant.DANGER
                                                },
                                            )
                                        }
                                    }
                                }
                            }

                            if (state.totalPages > 1) {
                                item(key = "pagination_opname") {
                                    AdminPaginationFooter(
                                        currentPage = state.currentPage,
                                        totalPages = state.totalPages,
                                        totalItems = state.filteredItems.size,
                                        onPrevPage = { viewModel.onEvent(AdminOpnameEvent.PageChanged(state.currentPage - 1)) },
                                        onNextPage = { viewModel.onEvent(AdminOpnameEvent.PageChanged(state.currentPage + 1)) },
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
