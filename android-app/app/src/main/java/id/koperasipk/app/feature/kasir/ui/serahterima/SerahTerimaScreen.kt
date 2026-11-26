package id.koperasipk.app.feature.kasir.ui.serahterima

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
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
import id.koperasipk.app.core.designsystem.BrandEmeraldDark
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.FilterChipBar
import id.koperasipk.app.core.designsystem.KoperasiBottomSheet
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.statusBadgeVariant
import id.koperasipk.app.feature.kasir.data.SerahTerimaDto

@Composable
fun SerahTerimaScreen(
    viewModel: SerahTerimaViewModel,
    onBack: () -> Unit,
    onOpenCreate: () -> Unit,
    onOpenSetoran: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is SerahTerimaEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    state.selectedItem?.let { selected ->
        if (state.showRejectDialog) {
            AlertDialog(
                onDismissRequest = { viewModel.onEvent(SerahTerimaEvent.DismissRejectDialog) },
                title = { Text("Tolak Serah Terima Shift") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "Tuliskan rincian alasan penolakan (misalnya selisih uang fisik laci atau stok rokok).",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        OutlinedTextField(
                            value = state.alasanPenolakan,
                            onValueChange = { viewModel.onEvent(SerahTerimaEvent.AlasanPenolakanChanged(it)) },
                            label = { Text("Alasan Penolakan *") },
                            isError = state.rejectError != null,
                            supportingText = state.rejectError?.let { msg -> { Text(msg) } },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = { viewModel.onEvent(SerahTerimaEvent.SubmitReject) },
                        enabled = state.processingId == null,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error,
                            contentColor = MaterialTheme.colorScheme.onError,
                        ),
                    ) {
                        Text("Kirim Penolakan")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.onEvent(SerahTerimaEvent.DismissRejectDialog) }) {
                        Text("Batal")
                    }
                },
            )
        } else {
            SerahTerimaDetailDialog(
                item = selected,
                filter = state.detailFilter,
                isBusy = state.processingId != null,
                onFilterChange = { viewModel.onEvent(SerahTerimaEvent.DetailFilterSelected(it)) },
                onApprove = { viewModel.onEvent(SerahTerimaEvent.Approve(selected.resolvedId)) },
                onOpenReject = { viewModel.onEvent(SerahTerimaEvent.OpenRejectDialog) },
                onDismiss = { viewModel.onEvent(SerahTerimaEvent.DismissDetail) },
            )
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Serah Terima Shift",
                subtitle = "Rekonsiliasi kasir & audit stok toko",
                onBack = onBack,
                actions = {
                    IconButton(onClick = onOpenSetoran) {
                        Icon(Icons.Rounded.AccountBalance, contentDescription = "Setor Kas Admin")
                    }
                    IconButton(onClick = onOpenCreate) {
                        Icon(Icons.Rounded.Add, contentDescription = "Buat Serah Terima")
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading -> {
                LoadingState(
                    message = "Memuat data serah terima shift...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.items.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(SerahTerimaEvent.Refresh) },
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
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            OutlinedButton(
                                onClick = onOpenSetoran,
                                modifier = Modifier.weight(1f),
                            ) {
                                Text("Setor Admin")
                            }
                            Button(
                                onClick = onOpenCreate,
                                modifier = Modifier.weight(1f),
                            ) {
                                Text("Buat Shift")
                            }
                        }

                        if (state.hasPendingOutgoing) {
                            StatusBadge(
                                text = "Anda memiliki pengajuan serah terima keluar yang menunggu ACC",
                                variant = BadgeVariant.WARNING,
                            )
                        }

                        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                            SerahTerimaTab.entries.forEachIndexed { idx, tab ->
                                SegmentedButton(
                                    selected = state.activeTab == tab,
                                    onClick = { viewModel.onEvent(SerahTerimaEvent.TabSelected(tab)) },
                                    shape = SegmentedButtonDefaults.itemShape(
                                        index = idx,
                                        count = SerahTerimaTab.entries.size,
                                    ),
                                ) {
                                    Text(tab.label)
                                }
                            }
                        }
                    }

                    KoperasiPullToRefreshBox(
                        isRefreshing = state.isRefreshing,
                        onRefresh = { viewModel.onEvent(SerahTerimaEvent.Refresh) },
                        modifier = Modifier.weight(1f),
                    ) {
                        if (state.items.isEmpty()) {
                            EmptyState(
                                title = if (state.activeTab == SerahTerimaTab.PENDING) {
                                    "Tidak Ada Tugas Masuk"
                                } else {
                                    "Belum Ada Riwayat Shift"
                                },
                                description = "Data serah terima shift akan tampil di sini.",
                                icon = Icons.Rounded.SwapHoriz,
                            )
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                items(
                                    items = state.items,
                                    key = { it.resolvedId },
                                ) { item ->
                                    SerahTerimaCard(
                                        item = item,
                                        onClick = { viewModel.onEvent(SerahTerimaEvent.SelectItem(item)) },
                                    )
                                }

                                if (state.lastPage > 1) {
                                    item(key = "pagination") {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            OutlinedButton(
                                                onClick = { viewModel.onEvent(SerahTerimaEvent.ChangePage(state.currentPage - 1)) },
                                                enabled = state.currentPage > 1,
                                            ) {
                                                Text("Prev")
                                            }
                                            Text("Hal. ${state.currentPage} / ${state.lastPage}")
                                            Button(
                                                onClick = { viewModel.onEvent(SerahTerimaEvent.ChangePage(state.currentPage + 1)) },
                                                enabled = state.currentPage < state.lastPage,
                                            ) {
                                                Text("Next")
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
private fun SerahTerimaCard(
    item: SerahTerimaDto,
    onClick: () -> Unit,
) {
    val opname = item.hasilOpname
    val barangSelisih = opname?.summary?.barangSelisih ?: 0
    val statusText = when (item.status.lowercase()) {
        "pending" -> "Menunggu Validasi"
        "approved" -> "Shift Diterima"
        else -> "Shift Ditolak"
    }

    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
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
                StatusBadge(text = statusText, variant = statusBadgeVariant(item.status))
                Text(
                    text = DateFormatter.formatDateTime(item.createdAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "@${item.kasirFromName.ifBlank { item.kasirFromUsername }}",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null)
                Text(
                    text = "@${item.kasirToName.ifBlank { item.kasirToUsername }}",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
            }

            if (opname != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = "Uang Fisik: ${CurrencyFormatter.format(opname.uangFisik)}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    StatusBadge(
                        text = if (barangSelisih > 0) "$barangSelisih Selisih" else "100% Sesuai",
                        variant = if (barangSelisih > 0) BadgeVariant.DANGER else BadgeVariant.SUCCESS,
                    )
                }
            }

            item.alasanPenolakan?.takeIf { it.isNotBlank() }?.let { alasan ->
                Text(
                    text = "Alasan Tolak: $alasan",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }
    }
}

@Composable
private fun SerahTerimaDetailDialog(
    item: SerahTerimaDto,
    filter: OpnameDetailFilter,
    isBusy: Boolean,
    onFilterChange: (OpnameDetailFilter) -> Unit,
    onApprove: () -> Unit,
    onOpenReject: () -> Unit,
    onDismiss: () -> Unit,
) {
    val opname = item.hasilOpname
    val isPending = item.status.equals("pending", ignoreCase = true)
    val allItems = opname?.items.orEmpty()
    val filteredItems = allItems.filter { opItem ->
        when (filter) {
            OpnameDetailFilter.ALL -> true
            OpnameDetailFilter.SELISIH -> opItem.selisih != 0
            OpnameDetailFilter.ROKOK -> {
                opItem.riskBadge.equals("Rokok", ignoreCase = true) ||
                    opItem.namaBarang.lowercase().let { n ->
                        n.contains("rokok") || n.contains("samsu") || n.contains("surya") || n.contains("mild")
                    }
            }
        }
    }
    val filterLabels = remember { OpnameDetailFilter.entries.map { it.label } }

    KoperasiBottomSheet(
        onDismissRequest = onDismiss,
        title = "Rincian Serah Terima #${item.resolvedId}",
        subtitle = "@${item.kasirFromName.ifBlank { item.kasirFromUsername }} → @${item.kasirToName.ifBlank { item.kasirToUsername }} • ${DateFormatter.formatDateTime(item.createdAt)}",
        footer = {
            if (isPending) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    OutlinedButton(
                        onClick = onOpenReject,
                        enabled = !isBusy,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier.weight(1f),
                    ) {
                        Text("Tolak Shift")
                    }
                    Button(
                        onClick = onApprove,
                        enabled = !isBusy,
                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmeraldDark),
                        modifier = Modifier.weight(1f),
                    ) {
                        Text("Terima Shift")
                    }
                }
            } else {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Tutup")
                }
            }
        },
    ) {
        if (opname != null) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text("Uang Fisik Laci: ${CurrencyFormatter.format(opname.uangFisik)}", fontWeight = FontWeight.Bold)
                    Text("Kas Sistem: ${CurrencyFormatter.format(opname.saldoKasSistem)}", style = MaterialTheme.typography.bodySmall)
                    opname.selisihKas?.let { selKas ->
                        Text(
                            text = "Selisih Kas: ${CurrencyFormatter.format(selKas)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (selKas < 0) MaterialTheme.colorScheme.error else BrandEmeraldDark,
                        )
                    }
                    opname.catatan?.takeIf { it.isNotBlank() }?.let { note ->
                        Text("Catatan: \"$note\"", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            FilterChipBar(
                options = filterLabels,
                selected = filter.label,
                onSelect = { label ->
                    OpnameDetailFilter.entries.find { it.label == label }?.let(onFilterChange)
                },
            )

            filteredItems.forEach { opItem ->
                key(opItem.barangId) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = opItem.namaBarang,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Text(
                                    text = "Sistem: ${opItem.stokInput} → Fisik: ${opItem.stokAktual}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            StatusBadge(
                                text = if (opItem.selisih == 0) "Pas" else "${opItem.selisih} pcs",
                                variant = if (opItem.selisih == 0) BadgeVariant.SUCCESS else BadgeVariant.DANGER,
                            )
                        }
                    }
                }
            }
        }
    }
}
