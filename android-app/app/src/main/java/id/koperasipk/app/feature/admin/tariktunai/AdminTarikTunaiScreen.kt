package id.koperasipk.app.feature.admin.tariktunai

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.Receipt
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material.icons.rounded.TrendingUp
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
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
import id.koperasipk.app.core.designsystem.statusBadgeVariant
import id.koperasipk.app.feature.admin.ui.AdminPaginationFooter
import id.koperasipk.app.feature.admin.ui.AdminSearchField
import id.koperasipk.app.feature.admin.ui.AdminSurfaceCard

@Composable
fun AdminTarikTunaiScreen(
    viewModel: AdminTarikTunaiViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AdminTarikTunaiEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            KoperasiTopBar(
                title = "Laporan Tarik Tunai & SHU",
                subtitle = "Penarikan kas & kontribusi omzet belanja",
                onBack = onBack,
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && state.items.isEmpty() -> {
                LoadingState(message = "Memuat laporan tarik tunai...", modifier = Modifier.padding(innerPadding))
            }
            state.errorMessage != null && state.items.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(AdminTarikTunaiEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(AdminTarikTunaiEvent.Refresh) },
                    modifier = Modifier.fillMaxSize().padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item(key = "tarik_kpi_1") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard(
                                    title = "Total Penarikan",
                                    value = CurrencyFormatter.format(state.summary.totalNominalKeluar),
                                    subtitle = "${state.summary.totalPenarikanCount} transaksi",
                                    icon = Icons.Rounded.Payments,
                                    accentColor = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Omzet Penyerta",
                                    value = CurrencyFormatter.format(state.summary.totalSalesKontribusi),
                                    subtitle = "Kontribusi toko masuk",
                                    icon = Icons.Rounded.ShoppingBag,
                                    accentColor = BrandEmeraldDark,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                        item(key = "tarik_kpi_2") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard(
                                    title = "Rasio Sales / Tarik",
                                    value = "${state.summary.rasioSalesToTarik}%",
                                    icon = Icons.Rounded.TrendingUp,
                                    accentColor = Color(0xFF1D4ED8),
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Syarat Min. Belanja",
                                    value = "Rp 25.000",
                                    icon = Icons.Rounded.Receipt,
                                    accentColor = Color(0xFFD97706),
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }

                        item(key = "search_tarik") {
                            AdminSearchField(
                                query = state.searchQuery,
                                onQueryChange = { viewModel.onEvent(AdminTarikTunaiEvent.SearchChanged(it)) },
                                placeholder = "Cari nama anggota / kasir / ID...",
                            )
                        }

                        if (state.pagedItems.isEmpty()) {
                            item(key = "empty_tarik") {
                                EmptyState(
                                    title = "Belum ada riwayat tarik tunai",
                                    description = "Belum ada catatan penarikan yang sesuai pencarian.",
                                    modifier = Modifier.height(220.dp),
                                )
                            }
                        } else {
                            items(state.pagedItems, key = { it.tarikId }) { item ->
                                AdminSurfaceCard {
                                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = "#TRK-${item.tarikId} • ${item.namaAnggota}",
                                                    style = MaterialTheme.typography.titleSmall,
                                                    fontWeight = FontWeight.Bold,
                                                )
                                                Text(
                                                    text = "Kasir: @${item.kasirName} • ${DateFormatter.formatDateTime(item.createdAt)}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                            Text(
                                                text = CurrencyFormatter.format(item.nominal),
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = MaterialTheme.colorScheme.error,
                                            )
                                        }
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Text(
                                                text = "Belanja: ${CurrencyFormatter.format(item.belanjaNominal)} (Trx #${item.transaksiId ?: "-"})",
                                                style = MaterialTheme.typography.bodySmall,
                                            )
                                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                StatusBadge(text = item.sumberDana.uppercase(), variant = statusBadgeVariant(item.sumberDana))
                                                if (item.persetujuanShu) {
                                                    StatusBadge(text = "Sadar SHU", variant = BadgeVariant.SUCCESS)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            if (state.totalPages > 1) {
                                item(key = "pagination_tarik") {
                                    AdminPaginationFooter(
                                        currentPage = state.currentPage,
                                        totalPages = state.totalPages,
                                        totalItems = state.filteredItems.size,
                                        onPrevPage = { viewModel.onEvent(AdminTarikTunaiEvent.PageChanged(state.currentPage - 1)) },
                                        onNextPage = { viewModel.onEvent(AdminTarikTunaiEvent.PageChanged(state.currentPage + 1)) },
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
