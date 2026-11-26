package id.koperasipk.app.feature.admin.setoran

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.ConfirmDialog
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.SectionHeader
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.feature.admin.ui.AdminSurfaceCard

@Composable
fun AdminSetoranScreen(
    viewModel: AdminSetoranViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AdminSetoranEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    val confirm = state.pendingConfirm
    ConfirmDialog(
        visible = confirm != null,
        title = if (confirm?.action == "reject") "Tolak Setoran Kasir?" else "Setujui Setoran Kasir?",
        message = if (confirm?.action == "reject") {
            "Tolak setoran ${CurrencyFormatter.format(confirm.item.nominal)} dari ${confirm.item.resolvedKasirName}?"
        } else {
            "Konfirmasi penerimaan uang tunai ${CurrencyFormatter.format(confirm?.item?.nominal ?: 0.0)} dari ${confirm?.item?.resolvedKasirName.orEmpty()}?"
        },
        confirmLabel = if (confirm?.action == "reject") "Tolak Setoran" else "Terima Setoran",
        isDestructive = confirm?.action == "reject",
        isLoading = state.processingId != null,
        onConfirm = { viewModel.onEvent(AdminSetoranEvent.ConfirmAction) },
        onDismiss = { viewModel.onEvent(AdminSetoranEvent.DismissConfirm) },
    )

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            KoperasiTopBar(
                title = "Persetujuan Setoran Kasir",
                subtitle = "Validasi penerimaan uang ke brankas",
                onBack = onBack,
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && state.items.isEmpty() -> {
                LoadingState(message = "Memuat data setoran...", modifier = Modifier.padding(innerPadding))
            }
            state.errorMessage != null && state.items.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(AdminSetoranEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(AdminSetoranEvent.Refresh) },
                    modifier = Modifier.fillMaxSize().padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item(key = "header_pending") {
                            SectionHeader(
                                title = "Menunggu Persetujuan (${state.pendingItems.size})",
                                subtitle = "Setoran yang belum divalidasi admin",
                            )
                        }
                        if (state.pendingItems.isEmpty()) {
                            item(key = "empty_pending") {
                                EmptyState(
                                    title = "Tidak ada setoran tertunda",
                                    description = "Semua setoran kasir sudah diproses.",
                                    icon = Icons.Rounded.AccountBalanceWallet,
                                    modifier = Modifier.height(170.dp),
                                )
                            }
                        } else {
                            items(state.pendingItems, key = { "pending_${it.resolvedId}" }) { item ->
                                val isProcessing = state.processingId == item.resolvedId
                                AdminSurfaceCard(borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.45f)) {
                                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Column {
                                                Text(item.resolvedKasirName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                                Text(
                                                    text = DateFormatter.formatDateTime(item.resolvedTanggal),
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                            Text(
                                                text = CurrencyFormatter.format(item.nominal),
                                                style = MaterialTheme.typography.titleLarge,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = MaterialTheme.colorScheme.primary,
                                            )
                                        }
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            OutlinedButton(
                                                onClick = { viewModel.onEvent(AdminSetoranEvent.RequestAction(item, "reject")) },
                                                enabled = !isProcessing && state.processingId == null,
                                                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                                                shape = RoundedCornerShape(10.dp),
                                                modifier = Modifier.weight(1f),
                                            ) {
                                                Text("Tolak")
                                            }
                                            Button(
                                                onClick = { viewModel.onEvent(AdminSetoranEvent.RequestAction(item, "approve")) },
                                                enabled = !isProcessing && state.processingId == null,
                                                shape = RoundedCornerShape(10.dp),
                                                modifier = Modifier.weight(1f),
                                            ) {
                                                Text(if (isProcessing) "Memproses..." else "Terima")
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        item(key = "header_history") {
                            SectionHeader(
                                title = "Riwayat Setoran (${state.totalHistoryCount})",
                                subtitle = "Setoran yang telah disetujui atau ditolak",
                            )
                        }
                        if (state.historyItems.isEmpty()) {
                            item(key = "empty_history") {
                                Text(
                                    text = "Belum ada riwayat setoran.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        } else {
                            items(state.historyItems, key = { "history_${it.resolvedId}" }) { item ->
                                AdminSurfaceCard {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(item.resolvedKasirName, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                            Text(
                                                text = CurrencyFormatter.format(item.nominal),
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.ExtraBold,
                                            )
                                            Text(
                                                text = DateFormatter.formatDateTime(item.resolvedTanggal),
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                        StatusBadge(
                                            text = if (item.status == "approved") "Disetujui" else "Ditolak",
                                            variant = if (item.status == "approved") BadgeVariant.SUCCESS else BadgeVariant.DANGER,
                                        )
                                    }
                                }
                            }
                            if (state.historyItems.size < state.totalHistoryCount) {
                                item(key = "more_history") {
                                    OutlinedButton(
                                        onClick = { viewModel.onEvent(AdminSetoranEvent.LoadMoreHistory) },
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Text("Muat Riwayat Lainnya")
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
