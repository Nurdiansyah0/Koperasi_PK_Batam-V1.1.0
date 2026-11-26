package id.koperasipk.app.feature.admin.selisih

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.Scale
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.BrandEmeraldDark
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

@Composable
fun AdminSelisihScreen(
    viewModel: AdminSelisihViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AdminSelisihEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    state.selectedShiftDetail?.let { shift ->
        AlertDialog(
            onDismissRequest = { viewModel.onEvent(AdminSelisihEvent.DismissShiftDetail) },
            title = { Text("Item Selisih Shift #${shift.serahId}") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "@${shift.kasirFromName} -> @${shift.kasirToName} • ${DateFormatter.formatDateTime(shift.createdAt)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    LazyColumn(modifier = Modifier.heightIn(max = 280.dp)) {
                        itemsIndexed(
                            items = shift.discrepantItems,
                            key = { idx, it -> "${shift.serahId}_${idx}_${it.namaBarang}" },
                        ) { _, it ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(it.namaBarang, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                                    Text("@ ${CurrencyFormatter.format(it.hargaJual)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text("${it.selisih} pcs", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                                    Text(CurrencyFormatter.format(it.selisihNominal), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                                }
                            }
                            HorizontalDivider()
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { viewModel.onEvent(AdminSelisihEvent.DismissShiftDetail) }) { Text("Tutup") }
            },
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            KoperasiTopBar(
                title = "Laporan Selisih Kasir",
                subtitle = "Audit minus barang & kas laci per shift",
                onBack = onBack,
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && state.rekapList.isEmpty() && state.riwayatList.isEmpty() -> {
                LoadingState(message = "Memuat laporan selisih kasir...", modifier = Modifier.padding(innerPadding))
            }
            state.errorMessage != null && state.rekapList.isEmpty() && state.riwayatList.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(AdminSelisihEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(AdminSelisihEvent.Refresh) },
                    modifier = Modifier.fillMaxSize().padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item(key = "selisih_kpi_1") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard(
                                    title = "Total Kerugian",
                                    value = CurrencyFormatter.format(state.totalKerugianAkumulasi),
                                    subtitle = "${state.totalShiftBermasalah} shift berselisih",
                                    icon = Icons.Rounded.Scale,
                                    accentColor = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Minus Barang",
                                    value = CurrencyFormatter.format(state.totalMinusBarang),
                                    icon = Icons.Rounded.Inventory2,
                                    accentColor = Color(0xFFD97706),
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                        item(key = "selisih_kpi_2") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard(
                                    title = "Minus Kas Laci",
                                    value = CurrencyFormatter.format(state.totalMinusKas),
                                    icon = Icons.Rounded.AccountBalanceWallet,
                                    accentColor = Color(0xFF1D4ED8),
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Kasir Tercatat",
                                    value = "${state.rekapList.size} petugas",
                                    icon = Icons.Rounded.Groups,
                                    accentColor = BrandEmeraldDark,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }

                        item(key = "selisih_controls") {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilterChip(
                                        selected = state.activeTab == SelisihTab.REKAP,
                                        onClick = { viewModel.onEvent(AdminSelisihEvent.TabChanged(SelisihTab.REKAP)) },
                                        label = { Text("Rekap Payroll (${state.rekapList.size})") },
                                    )
                                    FilterChip(
                                        selected = state.activeTab == SelisihTab.RIWAYAT,
                                        onClick = { viewModel.onEvent(AdminSelisihEvent.TabChanged(SelisihTab.RIWAYAT)) },
                                        label = { Text("Audit Log (${state.riwayatList.size})") },
                                    )
                                }
                                AdminSearchField(
                                    query = state.searchQuery,
                                    onQueryChange = { viewModel.onEvent(AdminSelisihEvent.SearchChanged(it)) },
                                    placeholder = "Cari kasir atau shift ID...",
                                )
                            }
                        }

                        if (state.activeTab == SelisihTab.REKAP) {
                            if (state.pagedRekap.isEmpty()) {
                                item(key = "empty_rekap") {
                                    EmptyState(title = "Tidak ada data rekap kasir", modifier = Modifier.height(200.dp))
                                }
                            } else {
                                items(state.pagedRekap, key = { "rekap_${it.kasirId}" }) { k ->
                                    val hasLoss = k.totalAkumulasiKerugian > 0.0
                                    AdminSurfaceCard(
                                        borderColor = if (hasLoss) MaterialTheme.colorScheme.error.copy(alpha = 0.5f) else MaterialTheme.colorScheme.outline.copy(alpha = 0.45f),
                                    ) {
                                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                Column {
                                                    Text(k.kasirName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                                    Text(
                                                        text = "ID #${k.kasirId} • ${k.totalShiftSelesai} shift (${k.totalShiftAdaSelisih} selisih)",
                                                        style = MaterialTheme.typography.bodySmall,
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    )
                                                }
                                                Text(
                                                    text = CurrencyFormatter.format(k.totalAkumulasiKerugian),
                                                    style = MaterialTheme.typography.titleMedium,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    color = if (hasLoss) MaterialTheme.colorScheme.error else BrandEmeraldDark,
                                                )
                                            }
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Text("Minus Barang: ${CurrencyFormatter.format(k.totalMinusBarangNominal)}", style = MaterialTheme.typography.bodySmall)
                                                Text("Minus Kas: ${CurrencyFormatter.format(k.totalMinusKasNominal)}", style = MaterialTheme.typography.bodySmall)
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            if (state.pagedRiwayat.isEmpty()) {
                                item(key = "empty_riwayat_selisih") {
                                    EmptyState(title = "Tidak ada log selisih shift", modifier = Modifier.height(200.dp))
                                }
                            } else {
                                items(state.pagedRiwayat, key = { "shift_${it.serahId}" }) { r ->
                                    val isLoss = r.totalKerugianShift > 0.0
                                    AdminSurfaceCard {
                                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                Text("Shift #${r.serahId} • @${r.kasirFromName} -> @${r.kasirToName}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                                StatusBadge(
                                                    text = if (isLoss) "Minus ${CurrencyFormatter.format(r.totalKerugianShift)}" else "Pas",
                                                    variant = if (isLoss) BadgeVariant.DANGER else BadgeVariant.SUCCESS,
                                                )
                                            }
                                            Text(
                                                text = "${DateFormatter.formatDateTime(r.createdAt)} • Uang Fisik: ${CurrencyFormatter.format(r.uangFisik)} • Selisih Kas: ${CurrencyFormatter.format(r.selisihKas)}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                            if (!r.catatan.isNullOrBlank()) {
                                                Text(
                                                    text = "\"${r.catatan}\"",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = Color(0xFFB45309),
                                                )
                                            }
                                            if (r.discrepantItems.isNotEmpty()) {
                                                OutlinedButton(
                                                    onClick = { viewModel.onEvent(AdminSelisihEvent.OpenShiftDetail(r)) },
                                                    shape = RoundedCornerShape(10.dp),
                                                    modifier = Modifier.fillMaxWidth(),
                                                ) {
                                                    Text("Lihat ${r.discrepantItems.size} Item Selisih")
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (state.totalPages > 1) {
                            item(key = "pagination_selisih") {
                                AdminPaginationFooter(
                                    currentPage = state.currentPage,
                                    totalPages = state.totalPages,
                                    totalItems = state.activeTotalCount,
                                    onPrevPage = { viewModel.onEvent(AdminSelisihEvent.PageChanged(state.currentPage - 1)) },
                                    onNextPage = { viewModel.onEvent(AdminSelisihEvent.PageChanged(state.currentPage + 1)) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
