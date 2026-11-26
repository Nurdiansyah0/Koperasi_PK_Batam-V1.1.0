package id.koperasipk.app.feature.kasir.ui.hutang

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
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.core.designsystem.BrandEmeraldDark
import id.koperasipk.app.core.designsystem.ConfirmDialog
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.statusBadgeVariant
import id.koperasipk.app.feature.kasir.data.PembayaranHutangDto

@Composable
fun PembayaranHutangScreen(
    viewModel: PembayaranHutangViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is PembayaranHutangEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    ConfirmDialog(
        visible = state.confirmRejectItem != null,
        title = "Tolak Pembayaran Hutang?",
        message = "Pembayaran dari ${state.confirmRejectItem?.namaAnggota.orEmpty()} sebesar ${
            CurrencyFormatter.format(state.confirmRejectItem?.nominal ?: 0.0)
        } akan ditandai ditolak.",
        confirmLabel = "Ya, Tolak",
        isDestructive = true,
        isLoading = state.processingId != null,
        onConfirm = { viewModel.onEvent(PembayaranHutangEvent.ConfirmReject) },
        onDismiss = { viewModel.onEvent(PembayaranHutangEvent.DismissRejectDialog) },
    )

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Pembayaran Hutang",
                subtitle = "Konfirmasi cicilan hutang anggota",
                onBack = onBack,
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading -> {
                LoadingState(
                    message = "Memuat pembayaran hutang...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.items.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(PembayaranHutangEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                            HutangTab.entries.forEachIndexed { idx, tab ->
                                val label = if (tab == HutangTab.PENDING) {
                                    "${tab.label} (${state.pendingCount})"
                                } else {
                                    tab.label
                                }
                                SegmentedButton(
                                    selected = state.activeTab == tab,
                                    onClick = { viewModel.onEvent(PembayaranHutangEvent.TabSelected(tab)) },
                                    shape = SegmentedButtonDefaults.itemShape(
                                        index = idx,
                                        count = HutangTab.entries.size,
                                    ),
                                ) {
                                    Text(label)
                                }
                            }
                        }

                        OutlinedTextField(
                            value = state.searchQuery,
                            onValueChange = { viewModel.onEvent(PembayaranHutangEvent.SearchChanged(it)) },
                            placeholder = { Text("Cari nama anggota...") },
                            leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
                            trailingIcon = {
                                if (state.searchQuery.isNotEmpty()) {
                                    IconButton(onClick = { viewModel.onEvent(PembayaranHutangEvent.SearchChanged("")) }) {
                                        Icon(Icons.Rounded.Clear, contentDescription = "Hapus")
                                    }
                                }
                            },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }

                    KoperasiPullToRefreshBox(
                        isRefreshing = state.isRefreshing,
                        onRefresh = { viewModel.onEvent(PembayaranHutangEvent.Refresh) },
                        modifier = Modifier.weight(1f),
                    ) {
                        val list = state.filteredItems
                        if (list.isEmpty()) {
                            EmptyState(
                                title = if (state.activeTab == HutangTab.PENDING) {
                                    "Tidak ada pembayaran menunggu"
                                } else {
                                    "Belum ada riwayat pembayaran"
                                },
                                description = "Tarik ke bawah untuk memperbarui daftar.",
                                icon = Icons.Rounded.CreditCard,
                            )
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                items(
                                    items = list,
                                    key = { it.pembayaranId },
                                ) { item ->
                                    PembayaranHutangCard(
                                        item = item,
                                        isPendingTab = state.activeTab == HutangTab.PENDING,
                                        isBusy = state.processingId != null,
                                        onApproveCash = {
                                            viewModel.onEvent(PembayaranHutangEvent.Approve(item.pembayaranId, "cash"))
                                        },
                                        onApproveTransfer = {
                                            viewModel.onEvent(PembayaranHutangEvent.Approve(item.pembayaranId, "transfer"))
                                        },
                                        onReject = {
                                            viewModel.onEvent(PembayaranHutangEvent.RequestReject(item))
                                        },
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
private fun PembayaranHutangCard(
    item: PembayaranHutangDto,
    isPendingTab: Boolean,
    isBusy: Boolean,
    onApproveCash: () -> Unit,
    onApproveTransfer: () -> Unit,
    onReject: () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.namaAnggota,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = DateFormatter.formatDateTime(item.createdAt),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    item.namaKasir?.takeIf { it.isNotBlank() }?.let { kasir ->
                        Text(
                            text = "Diproses oleh @$kasir",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = CurrencyFormatter.format(item.nominal),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    if (!isPendingTab) {
                        Spacer(modifier = Modifier.height(4.dp))
                        val statusLabel = when (item.status.lowercase()) {
                            "approved" -> "Disetujui"
                            "rejected" -> "Ditolak"
                            else -> item.status
                        }
                        StatusBadge(
                            text = statusLabel,
                            variant = statusBadgeVariant(item.status),
                        )
                    }
                }
            }

            if (isPendingTab) {
                HorizontalDivider()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(
                        onClick = onReject,
                        enabled = !isBusy,
                    ) {
                        Text("Tolak", color = MaterialTheme.colorScheme.error)
                    }
                    Spacer(modifier = Modifier.weight(1f))
                    Button(
                        onClick = onApproveCash,
                        enabled = !isBusy,
                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmeraldDark),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    ) {
                        Text("Cash")
                    }
                    FilledTonalButton(
                        onClick = onApproveTransfer,
                        enabled = !isBusy,
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    ) {
                        Text("Transfer")
                    }
                }
            }
        }
    }
}
