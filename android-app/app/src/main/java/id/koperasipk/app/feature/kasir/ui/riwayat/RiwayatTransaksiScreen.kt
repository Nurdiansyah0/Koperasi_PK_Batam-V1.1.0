package id.koperasipk.app.feature.kasir.ui.riwayat

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.core.designsystem.BrandEmeraldDark
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.FilterChipBar
import id.koperasipk.app.core.designsystem.KoperasiBottomSheet
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.StatCard
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.TransactionRowCard
import id.koperasipk.app.core.designsystem.statusBadgeVariant
import id.koperasipk.app.feature.kasir.data.RiwayatTransaksiDto

@Composable
fun RiwayatTransaksiScreen(
    viewModel: RiwayatTransaksiViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is RiwayatTransaksiEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    state.selectedReceipt?.let { trx ->
        RiwayatReceiptBottomSheet(
            trx = trx,
            onDismiss = { viewModel.onEvent(RiwayatTransaksiEvent.SelectReceipt(null)) },
            onShare = {
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, "Struk Transaksi #${trx.resolvedId}")
                    putExtra(Intent.EXTRA_TEXT, buildShareReceiptText(trx))
                }
                context.startActivity(Intent.createChooser(intent, "Bagikan Struk"))
            },
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Riwayat Transaksi",
                subtitle = "Halaman ${state.currentPage} dari ${state.lastPage}",
                onBack = onBack,
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading -> {
                LoadingState(
                    message = "Memuat riwayat transaksi kasir...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.items.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(RiwayatTransaksiEvent.Refresh) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                val dateLabels = remember { DateFilterPreset.entries.map { it.label } }
                val paymentLabels = remember { PaymentFilter.entries.map { it.label } }
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(RiwayatTransaksiEvent.Refresh) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        item(key = "kpi_row") {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                StatCard(
                                    title = "Omset Terfilter",
                                    value = CurrencyFormatter.format(state.totalOmsetFiltered),
                                    icon = Icons.AutoMirrored.Rounded.TrendingUp,
                                    accentColor = BrandEmeraldDark,
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Total Struk",
                                    value = "${state.filteredItems.size} struk",
                                    icon = Icons.AutoMirrored.Rounded.ReceiptLong,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }

                        item(key = "filters_card") {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(
                                    modifier = Modifier.padding(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    OutlinedTextField(
                                        value = state.searchQuery,
                                        onValueChange = { viewModel.onEvent(RiwayatTransaksiEvent.SearchChanged(it)) },
                                        placeholder = { Text("Cari No. ID atau Nama Anggota...") },
                                        leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
                                        trailingIcon = {
                                            if (state.searchQuery.isNotEmpty()) {
                                                IconButton(onClick = { viewModel.onEvent(RiwayatTransaksiEvent.SearchChanged("")) }) {
                                                    Icon(Icons.Rounded.Clear, contentDescription = "Hapus")
                                                }
                                            }
                                        },
                                        singleLine = true,
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.fillMaxWidth(),
                                    )

                                    FilterChipBar(
                                        options = dateLabels,
                                        selected = state.datePreset.label,
                                        onSelect = { label ->
                                            DateFilterPreset.entries.find { it.label == label }?.let {
                                                viewModel.onEvent(RiwayatTransaksiEvent.DatePresetSelected(it))
                                            }
                                        },
                                    )

                                    if (state.showCustomDateRow) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            OutlinedTextField(
                                                value = state.tanggalAwal,
                                                onValueChange = { viewModel.onEvent(RiwayatTransaksiEvent.TanggalAwalChanged(it)) },
                                                label = { Text("Dari (YYYY-MM-DD)") },
                                                singleLine = true,
                                                modifier = Modifier.weight(1f),
                                            )
                                            OutlinedTextField(
                                                value = state.tanggalAkhir,
                                                onValueChange = { viewModel.onEvent(RiwayatTransaksiEvent.TanggalAkhirChanged(it)) },
                                                label = { Text("Sampai (YYYY-MM-DD)") },
                                                singleLine = true,
                                                modifier = Modifier.weight(1f),
                                            )
                                        }
                                        Button(
                                            onClick = { viewModel.onEvent(RiwayatTransaksiEvent.ApplyCustomDate) },
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Text("Terapkan Filter Tanggal")
                                        }
                                    }

                                    FilterChipBar(
                                        options = paymentLabels,
                                        selected = state.paymentFilter.label,
                                        onSelect = { label ->
                                            PaymentFilter.entries.find { it.label == label }?.let {
                                                viewModel.onEvent(RiwayatTransaksiEvent.PaymentFilterSelected(it))
                                            }
                                        },
                                    )
                                }
                            }
                        }

                        if (state.filteredItems.isEmpty()) {
                            item(key = "empty_riwayat") {
                                EmptyState(
                                    title = "Tidak Ada Transaksi Ditemukan",
                                    description = "Coba ubah filter tanggal atau kata kunci pencarian.",
                                    icon = Icons.AutoMirrored.Rounded.ReceiptLong,
                                    modifier = Modifier.height(220.dp),
                                )
                            }
                        } else {
                            items(
                                items = state.filteredItems,
                                key = { it.resolvedId },
                            ) { trx ->
                                val isCancelled = trx.status.equals("batal", ignoreCase = true)
                                TransactionRowCard(
                                    title = "#${trx.resolvedId} • ${trx.namaAnggota ?: "Pelanggan Toko"}",
                                    subtitle = "${DateFormatter.formatDateTime(trx.createdAt)} • ${trx.metodePembayaran.uppercase()}",
                                    amount = CurrencyFormatter.format(trx.resolvedTotal),
                                    status = trx.status.uppercase(),
                                    icon = Icons.AutoMirrored.Rounded.ReceiptLong,
                                    amountColor = if (isCancelled) MaterialTheme.colorScheme.error else null,
                                    onClick = {
                                        viewModel.onEvent(RiwayatTransaksiEvent.SelectReceipt(trx))
                                    },
                                )
                            }
                        }

                        if (state.lastPage > 1) {
                            item(key = "pagination") {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    OutlinedButton(
                                        onClick = { viewModel.onEvent(RiwayatTransaksiEvent.ChangePage(state.currentPage - 1)) },
                                        enabled = state.currentPage > 1,
                                    ) {
                                        Text("Sebelumnya")
                                    }
                                    Text(
                                        text = "Hal. ${state.currentPage} / ${state.lastPage}",
                                        style = MaterialTheme.typography.labelLarge,
                                    )
                                    Button(
                                        onClick = { viewModel.onEvent(RiwayatTransaksiEvent.ChangePage(state.currentPage + 1)) },
                                        enabled = state.currentPage < state.lastPage,
                                    ) {
                                        Text("Berikutnya")
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
private fun RiwayatReceiptBottomSheet(
    trx: RiwayatTransaksiDto,
    onDismiss: () -> Unit,
    onShare: () -> Unit,
) {
    KoperasiBottomSheet(
        onDismissRequest = onDismiss,
        title = "Struk Transaksi #${trx.resolvedId}",
        subtitle = "${trx.namaAnggota ?: "Pelanggan Toko"} • ${DateFormatter.formatDateTime(trx.createdAt)}",
        footer = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Tutup")
                }
                Button(
                    onClick = onShare,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Rounded.Share, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Bagikan Struk")
                }
            }
        },
    ) {
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
            modifier = Modifier.fillMaxWidth(),
        ) {
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
                        text = "STRUK PENJUALAN KASIR POS",
                        style = MaterialTheme.typography.labelLarge,
                        fontFamily = FontFamily.Monospace,
                    )
                    StatusBadge(
                        text = trx.status.uppercase(),
                        variant = statusBadgeVariant(trx.status),
                    )
                }
                HorizontalDivider()
                if (trx.details.isEmpty()) {
                    Text(
                        text = "Rincian barang transaksi ini tidak tersedia.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    trx.details.forEach { detail ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = detail.namaBarang,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Text(
                                    text = "${detail.jumlah} x ${CurrencyFormatter.format(detail.hargaSatuan)}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text(
                                text = CurrencyFormatter.format(detail.subtotal),
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
                HorizontalDivider()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("TOTAL", fontWeight = FontWeight.Bold)
                    Text(
                        text = CurrencyFormatter.format(trx.resolvedTotal),
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = "Metode: ${trx.metodePembayaran.uppercase()}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = "Kasir: @${trx.namaKasir ?: "kasir"}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

private fun buildShareReceiptText(trx: RiwayatTransaksiDto): String {
    return buildString {
        appendLine("STRUK KOPERASI PKPPK BATAM #${trx.resolvedId}")
        appendLine("Tanggal: ${DateFormatter.formatDateTime(trx.createdAt)}")
        appendLine("Pembeli: ${trx.namaAnggota ?: "Pelanggan Toko"}")
        appendLine("Metode: ${trx.metodePembayaran.uppercase()}")
        appendLine("---")
        trx.details.forEach { d ->
            appendLine("${d.namaBarang} (${d.jumlah}x ${CurrencyFormatter.format(d.hargaSatuan)}) = ${CurrencyFormatter.format(d.subtotal)}")
        }
        appendLine("---")
        appendLine("TOTAL: ${CurrencyFormatter.format(trx.resolvedTotal)}")
        appendLine("Status: ${trx.status.uppercase()}")
    }
}
