package id.koperasipk.app.feature.anggota

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ReceiptLong
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.FilterChipBar
import id.koperasipk.app.core.designsystem.KoperasiBottomSheet
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.PullToRefreshList
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.TransactionRowCard
import id.koperasipk.app.core.designsystem.statusBadgeVariant

@Composable
fun RiwayatScreen(
    viewModel: RiwayatViewModel,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is RiwayatEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    state.selectedTransaction?.let { selected ->
        KoperasiBottomSheet(
            onDismissRequest = { viewModel.onEvent(RiwayatEvent.DismissReceipt) },
            title = "Struk Pembelian",
            subtitle = "No. Transaksi #${selected.transaksiId}",
            footer = {
                Button(
                    onClick = { viewModel.onEvent(RiwayatEvent.DismissReceipt) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Text("Tutup Struk")
                }
            },
        ) {
            TransaksiReceiptContent(transaksi = selected)
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Riwayat Transaksi",
                subtitle = "Daftar pembelian di Koperasi PKPPK BTH",
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && state.transactions.isEmpty() -> {
                LoadingState(
                    message = "Memuat riwayat transaksi...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.transactions.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(RiwayatEvent.Refresh) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.transactions.isEmpty() -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    EmptyState(
                        title = "Belum ada histori transaksi",
                        description = "Riwayat pesanan belanja Anda akan tampil di sini.",
                        icon = Icons.Rounded.ReceiptLong,
                        actionLabel = "Muat Ulang",
                        onAction = { viewModel.onEvent(RiwayatEvent.Refresh) },
                    )
                }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    FilterChipBar(
                        options = RiwayatUiState.filterOptions,
                        selected = state.selectedFilter,
                        onSelect = { viewModel.onEvent(RiwayatEvent.FilterSelected(it)) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                    )

                    if (state.filteredTransactions.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                        ) {
                            EmptyState(
                                title = "Tidak ada transaksi",
                                description = "Tidak ditemukan transaksi untuk filter '${state.selectedFilter}'",
                                icon = Icons.Rounded.ReceiptLong,
                            )
                        }
                    } else {
                        PullToRefreshList(
                            isRefreshing = state.isRefreshing,
                            onRefresh = { viewModel.onEvent(RiwayatEvent.Refresh) },
                            modifier = Modifier.weight(1f),
                        ) {
                            items(
                                items = state.filteredTransactions,
                                key = { it.transaksiId },
                            ) { tx ->
                                TransactionRowCard(
                                    title = "Transaksi #${tx.transaksiId}",
                                    subtitle = DateFormatter.formatDateTime(tx.createdAt),
                                    amount = CurrencyFormatter.format(tx.totalHarga),
                                    status = "${tx.metodePembayaran.uppercase()} • ${tx.status}",
                                    icon = Icons.Rounded.ReceiptLong,
                                    onClick = { viewModel.onEvent(RiwayatEvent.SelectTransaction(tx)) },
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }

                            if (state.lastPage > 1) {
                                item(key = "pagination_controls") {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Text(
                                            text = "Halaman ${state.currentPage} dari ${state.lastPage}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            OutlinedButton(
                                                onClick = {
                                                    viewModel.onEvent(RiwayatEvent.LoadPage(state.currentPage - 1))
                                                },
                                                enabled = state.currentPage > 1 && !state.isRefreshing,
                                                shape = RoundedCornerShape(10.dp),
                                            ) {
                                                Text("Sebelumnya")
                                            }
                                            OutlinedButton(
                                                onClick = {
                                                    viewModel.onEvent(RiwayatEvent.LoadPage(state.currentPage + 1))
                                                },
                                                enabled = state.currentPage < state.lastPage && !state.isRefreshing,
                                                shape = RoundedCornerShape(10.dp),
                                            ) {
                                                Text("Selanjutnya")
                                            }
                                        }
                                    }
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
private fun TransaksiReceiptContent(transaksi: TransaksiAnggotaDto) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            color = MaterialTheme.colorScheme.surfaceVariant,
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                ReceiptMetaRow("No. Transaksi", "#${transaksi.transaksiId}", mono = true)
                ReceiptMetaRow("Waktu", DateFormatter.formatDateTime(transaksi.createdAt))
                ReceiptMetaRow("Metode Pembayaran", transaksi.metodePembayaran.uppercase())
                if (!transaksi.namaKasir.isNullOrBlank()) {
                    ReceiptMetaRow("Kasir Melayani", "@${transaksi.namaKasir}")
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Status",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    StatusBadge(
                        text = transaksi.status.replaceFirstChar { it.uppercase() },
                        variant = statusBadgeVariant(transaksi.status),
                    )
                }
            }
        }

        if (transaksi.items.isNotEmpty()) {
            Text(
                text = "Rincian Barang",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
            )
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 220.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(
                    items = transaksi.items,
                    key = { "${it.transaksiDetailId ?: 0}_${it.barangId}_${it.namaBarang}" },
                ) { detail ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = detail.namaBarang,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                text = "${detail.jumlah} x ${CurrencyFormatter.format(detail.hargaSatuan)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(
                            text = CurrencyFormatter.format(detail.subtotal),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                        )
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
            Text(
                text = "Total Transaksi",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = CurrencyFormatter.format(transaksi.totalHarga),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}

@Composable
private fun ReceiptMetaRow(
    label: String,
    value: String,
    mono: Boolean = false,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold,
            fontFamily = if (mono) FontFamily.Monospace else FontFamily.Default,
        )
    }
}
