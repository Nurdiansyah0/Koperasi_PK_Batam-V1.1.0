package id.koperasipk.app.feature.kasir.ui.pesanan

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
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
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.FilterChipBar
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.TransactionRowCard
import id.koperasipk.app.core.designsystem.statusBadgeVariant
import id.koperasipk.app.feature.kasir.data.PesananAnggotaDto

@Composable
fun PesananAnggotaScreen(
    viewModel: PesananAnggotaViewModel,
    orderRefreshTick: Int,
    onTriggerTestNotification: () -> Unit,
    onOrdersMutated: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(orderRefreshTick) {
        if (orderRefreshTick > 0) {
            viewModel.onEvent(PesananAnggotaEvent.SilentRefresh)
        }
    }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is PesananAnggotaEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
                PesananAnggotaEffect.OrdersMutated -> onOrdersMutated()
            }
        }
    }

    state.rejectDialogTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { viewModel.onEvent(PesananAnggotaEvent.DismissRejectDialog) },
            title = { Text("Tolak ${target.transaksiIds.size} Pesanan?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Stok barang dan saldo/limit hutang anggota akan otomatis dikembalikan oleh server.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(
                        value = target.alasan,
                        onValueChange = { viewModel.onEvent(PesananAnggotaEvent.RejectReasonChanged(it)) },
                        label = { Text("Alasan penolakan (opsional)") },
                        placeholder = { Text("Misal: Stok fisik habis") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.onEvent(PesananAnggotaEvent.ConfirmRejectOrders) },
                    enabled = !state.isSubmittingAction,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error,
                        contentColor = MaterialTheme.colorScheme.onError,
                    ),
                ) {
                    Text("Ya, Tolak")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { viewModel.onEvent(PesananAnggotaEvent.DismissRejectDialog) },
                    enabled = !state.isSubmittingAction,
                ) {
                    Text("Batal")
                }
            },
        )
    }

    val activeGroup = state.activeGroup

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = activeGroup?.namaAnggota ?: "Pesanan Anggota",
                subtitle = if (activeGroup != null) {
                    "${activeGroup.orders.size} pesanan • ${CurrencyFormatter.format(activeGroup.totalHarga)}"
                } else {
                    "Antrean pesanan belanja online"
                },
                onBack = if (activeGroup != null) {
                    { viewModel.onEvent(PesananAnggotaEvent.SelectGroup(null)) }
                } else {
                    null
                },
                actions = {
                    if (activeGroup == null) {
                        IconButton(onClick = onTriggerTestNotification) {
                            Icon(
                                imageVector = Icons.Rounded.NotificationsActive,
                                contentDescription = "Simulasi Notifikasi Pesanan",
                            )
                        }
                        IconButton(onClick = { viewModel.onEvent(PesananAnggotaEvent.Refresh) }) {
                            Icon(
                                imageVector = Icons.Rounded.Refresh,
                                contentDescription = "Segarkan",
                            )
                        }
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (activeGroup != null) {
                Surface(
                    tonalElevation = 3.dp,
                    shadowElevation = 6.dp,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    val selectedIds = state.selectedOrderIds.toList()
                    if (selectedIds.isNotEmpty()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            OutlinedButton(
                                onClick = { viewModel.onEvent(PesananAnggotaEvent.OpenRejectDialog(selectedIds)) },
                                enabled = !state.isSubmittingAction,
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                                modifier = Modifier.weight(1f),
                            ) {
                                Text("Tolak (${selectedIds.size})")
                            }
                            Button(
                                onClick = { viewModel.onEvent(PesananAnggotaEvent.ApproveOrders(selectedIds)) },
                                enabled = !state.isSubmittingAction,
                                modifier = Modifier.weight(1f),
                            ) {
                                Text("Selesai (${selectedIds.size})")
                            }
                        }
                    } else {
                        Box(modifier = Modifier.padding(12.dp)) {
                            Button(
                                onClick = {
                                    viewModel.onEvent(
                                        PesananAnggotaEvent.ApproveOrders(activeGroup.orders.map { it.transaksiId })
                                    )
                                },
                                enabled = !state.isSubmittingAction,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp),
                            ) {
                                Icon(Icons.Rounded.CheckCircle, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Selesaikan Semua (${activeGroup.orders.size})")
                            }
                        }
                    }
                }
            }
        },
    ) { innerPadding ->
        when {
            state.isLoading -> {
                LoadingState(
                    message = "Memuat antrean pesanan...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.groups.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(PesananAnggotaEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            activeGroup != null -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(
                        items = activeGroup.orders,
                        key = { it.transaksiId },
                    ) { order ->
                        PesananOrderDetailCard(
                            order = order,
                            isSelected = state.selectedOrderIds.contains(order.transaksiId),
                            hasAnyBatchSelection = state.selectedOrderIds.isNotEmpty(),
                            isSubmitting = state.isSubmittingAction,
                            onToggleSelect = {
                                viewModel.onEvent(PesananAnggotaEvent.ToggleOrderSelection(order.transaksiId))
                            },
                            onApproveSingle = {
                                viewModel.onEvent(PesananAnggotaEvent.ApproveOrders(listOf(order.transaksiId)))
                            },
                            onRejectSingle = {
                                viewModel.onEvent(PesananAnggotaEvent.OpenRejectDialog(listOf(order.transaksiId)))
                            },
                        )
                    }
                }
            }
            else -> {
                val filterLabels = remember { PesananFilter.entries.map { it.label } }
                val displayedGroups = state.filteredGroups
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    if (state.groups.isNotEmpty()) {
                        FilterChipBar(
                            options = filterLabels,
                            selected = state.filter.label,
                            onSelect = { label ->
                                PesananFilter.entries.find { it.label == label }?.let {
                                    viewModel.onEvent(PesananAnggotaEvent.FilterSelected(it))
                                }
                            },
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        )
                    }
                    KoperasiPullToRefreshBox(
                        isRefreshing = state.isRefreshing,
                        onRefresh = { viewModel.onEvent(PesananAnggotaEvent.Refresh) },
                        modifier = Modifier.weight(1f),
                    ) {
                        if (displayedGroups.isEmpty()) {
                            EmptyState(
                                title = "Tidak Ada Pesanan Menunggu",
                                description = if (state.groups.isEmpty()) {
                                    "Semua pesanan anggota telah diproses."
                                } else {
                                    "Tidak ada pesanan yang cocok dengan filter ini."
                                },
                                icon = Icons.Rounded.ShoppingBag,
                                actionLabel = "Muat Ulang",
                                onAction = { viewModel.onEvent(PesananAnggotaEvent.Refresh) },
                            )
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                items(
                                    items = displayedGroups,
                                    key = { it.anggotaId },
                                ) { group ->
                                    TransactionRowCard(
                                        title = group.namaAnggota,
                                        subtitle = "${group.orders.size} pesanan menunggu konfirmasi",
                                        amount = CurrencyFormatter.format(group.totalHarga),
                                        status = "PENDING",
                                        icon = Icons.Rounded.ShoppingBag,
                                        onClick = { viewModel.onEvent(PesananAnggotaEvent.SelectGroup(group.anggotaId)) },
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
private fun PesananOrderDetailCard(
    order: PesananAnggotaDto,
    isSelected: Boolean,
    hasAnyBatchSelection: Boolean,
    isSubmitting: Boolean,
    onToggleSelect: () -> Unit,
    onApproveSingle: () -> Unit,
    onRejectSingle: () -> Unit,
) {
    Card(
        onClick = onToggleSelect,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(
            width = if (isSelected) 1.5.dp else 1.dp,
            color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = isSelected,
                        onCheckedChange = { onToggleSelect() },
                    )
                    Column {
                        Text(
                            text = "#${order.transaksiId}",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = DateFormatter.formatDateTime(order.createdAt),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                StatusBadge(
                    text = order.metodePembayaran.uppercase(),
                    variant = statusBadgeVariant(order.metodePembayaran),
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                order.items.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            text = "${item.jumlah}x ${item.namaBarang}",
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = CurrencyFormatter.format(item.hargaSatuan * item.jumlah),
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }

            order.tarikTunai?.let { tt ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.55f),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier.padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text("Tiket #${tt.kodePenarikan}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
                            StatusBadge(text = tt.sumberDana.uppercase(), variant = BadgeVariant.SUCCESS)
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text("Tarik: ${CurrencyFormatter.format(tt.nominal)}", style = MaterialTheme.typography.bodySmall)
                            Text("Potong Belanja: -${CurrencyFormatter.format(order.totalHarga)}", style = MaterialTheme.typography.bodySmall)
                        }
                        Text(
                            text = "Kas Bersih Diserahkan: ${CurrencyFormatter.format(tt.uangBersihDiserahkan)}",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.secondary,
                        )
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
                    text = CurrencyFormatter.format(order.totalHarga),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
                if (!hasAnyBatchSelection) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(
                            onClick = onRejectSingle,
                            enabled = !isSubmitting,
                        ) {
                            Text("Tolak", color = MaterialTheme.colorScheme.error)
                        }
                        Button(
                            onClick = onApproveSingle,
                            enabled = !isSubmitting,
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                        ) {
                            Text("Selesai")
                        }
                    }
                }
            }
        }
    }
}
