package id.koperasipk.app.feature.kasir.ui.tariktunai

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.LocalAtm
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.WarningAmber
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
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
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.RupiahTextField
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.feature.kasir.data.AntreanTarikTunaiDto
import id.koperasipk.app.feature.kasir.data.KelayakanTarikTunaiDto
import id.koperasipk.app.feature.kasir.data.TarikTunaiReceiptDto

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TarikTunaiScreen(
    viewModel: TarikTunaiViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is TarikTunaiEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    state.rejectQueueTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { viewModel.onEvent(TarikTunaiEvent.DismissRejectQueueDialog) },
            title = { Text("Tolak Tiket #${target.kodePenarikan}?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Pengajuan tarik tunai ${target.namaAnggota} sebesar ${CurrencyFormatter.format(target.nominal)} akan ditolak.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                    OutlinedTextField(
                        value = state.rejectQueueReason,
                        onValueChange = { viewModel.onEvent(TarikTunaiEvent.RejectQueueReasonChanged(it)) },
                        label = { Text("Alasan penolakan (opsional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.onEvent(TarikTunaiEvent.ConfirmRejectQueueItem) },
                    enabled = state.processingQueueId == null,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error,
                        contentColor = MaterialTheme.colorScheme.onError,
                    ),
                ) {
                    Text("Tolak Tiket")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.onEvent(TarikTunaiEvent.DismissRejectQueueDialog) }) {
                    Text("Batal")
                }
            },
        )
    }

    state.receipt?.let { receipt ->
        TarikTunaiReceiptDialog(
            receipt = receipt,
            onDismiss = { viewModel.onEvent(TarikTunaiEvent.DismissReceipt) },
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Tarik Tunai & SHU",
                subtitle = "Antrean tiket, pencairan kas & riwayat",
                onBack = onBack,
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading -> {
                LoadingState(
                    message = "Memuat data tarik tunai...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.antreanList.isEmpty() && state.riwayatList.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(TarikTunaiEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    SingleChoiceSegmentedButtonRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                    ) {
                        TarikTunaiTab.entries.forEachIndexed { idx, tab ->
                            val label = when (tab) {
                                TarikTunaiTab.ANTREAN -> "Antrean (${state.antreanList.size})"
                                TarikTunaiTab.MANUAL -> tab.label
                                TarikTunaiTab.RIWAYAT -> "Riwayat (${state.riwayatList.size})"
                            }
                            SegmentedButton(
                                selected = state.activeTab == tab,
                                onClick = { viewModel.onEvent(TarikTunaiEvent.TabSelected(tab)) },
                                shape = SegmentedButtonDefaults.itemShape(
                                    index = idx,
                                    count = TarikTunaiTab.entries.size,
                                ),
                            ) {
                                Text(label, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }

                    KoperasiPullToRefreshBox(
                        isRefreshing = state.isRefreshing,
                        onRefresh = { viewModel.onEvent(TarikTunaiEvent.Refresh) },
                        modifier = Modifier.weight(1f),
                    ) {
                        when (state.activeTab) {
                            TarikTunaiTab.ANTREAN -> {
                                if (state.antreanList.isEmpty()) {
                                    EmptyState(
                                        title = "Tidak ada antrean tiket",
                                        description = "Tiket tarik tunai yang diajukan anggota akan tampil di sini.",
                                        icon = Icons.Rounded.LocalAtm,
                                    )
                                } else {
                                    LazyColumn(
                                        modifier = Modifier.fillMaxSize(),
                                        contentPadding = PaddingValues(16.dp),
                                        verticalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        items(
                                            items = state.antreanList,
                                            key = { it.tarikId },
                                        ) { item ->
                                            AntreanTarikTunaiCard(
                                                item = item,
                                                isBusy = state.processingQueueId != null,
                                                onApprove = {
                                                    viewModel.onEvent(TarikTunaiEvent.ApproveQueueItem(item.tarikId))
                                                },
                                                onReject = {
                                                    viewModel.onEvent(TarikTunaiEvent.OpenRejectQueueDialog(item))
                                                },
                                            )
                                        }
                                    }
                                }
                            }

                            TarikTunaiTab.MANUAL -> {
                                ManualTarikTunaiContent(
                                    state = state,
                                    onEvent = viewModel::onEvent,
                                )
                            }

                            TarikTunaiTab.RIWAYAT -> {
                                if (state.riwayatList.isEmpty()) {
                                    EmptyState(
                                        title = "Belum ada riwayat penarikan",
                                        description = "Riwayat pencairan tunai kasir tampil di sini.",
                                        icon = Icons.Rounded.LocalAtm,
                                    )
                                } else {
                                    LazyColumn(
                                        modifier = Modifier.fillMaxSize(),
                                        contentPadding = PaddingValues(16.dp),
                                        verticalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        items(
                                            items = state.riwayatList,
                                            key = { it.tarikId },
                                        ) { item ->
                                            Card(
                                                shape = RoundedCornerShape(14.dp),
                                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Column(
                                                    modifier = Modifier.padding(14.dp),
                                                    verticalArrangement = Arrangement.spacedBy(6.dp),
                                                ) {
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                        verticalAlignment = Alignment.CenterVertically,
                                                    ) {
                                                        Text(
                                                            text = item.namaAnggota,
                                                            style = MaterialTheme.typography.titleSmall,
                                                            fontWeight = FontWeight.Bold,
                                                        )
                                                        Text(
                                                            text = CurrencyFormatter.format(item.nominal),
                                                            style = MaterialTheme.typography.titleMedium,
                                                            fontWeight = FontWeight.Bold,
                                                            color = BrandEmeraldDark,
                                                        )
                                                    }
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                        verticalAlignment = Alignment.CenterVertically,
                                                    ) {
                                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                            StatusBadge(
                                                                text = item.sumberDana.uppercase(),
                                                                variant = BadgeVariant.INFO,
                                                            )
                                                            item.transaksiId?.let { trxId ->
                                                                StatusBadge(
                                                                    text = "Trx #$trxId",
                                                                    variant = BadgeVariant.DEFAULT,
                                                                )
                                                            }
                                                        }
                                                        Text(
                                                            text = DateFormatter.formatDateTime(item.createdAt),
                                                            style = MaterialTheme.typography.labelSmall,
                                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
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
                }
            }
        }
    }
}

@Composable
private fun AntreanTarikTunaiCard(
    item: AntreanTarikTunaiDto,
    isBusy: Boolean,
    onApprove: () -> Unit,
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
                    StatusBadge(text = "#${item.kodePenarikan}", variant = BadgeVariant.SUCCESS)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = item.namaAnggota,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Sumber: ${item.sumberDana.uppercase()} • Struk #${item.transaksiId ?: "-"} (${CurrencyFormatter.format(item.belanjaNominal)})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = CurrencyFormatter.format(item.nominal),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = BrandEmeraldDark,
                    )
                    Text(
                        text = DateFormatter.formatDateTime(item.createdAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            HorizontalDivider()

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedButton(
                    onClick = onReject,
                    enabled = !isBusy,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Tolak")
                }
                Button(
                    onClick = onApprove,
                    enabled = !isBusy,
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmeraldDark),
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Serahkan Kas")
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ManualTarikTunaiContent(
    state: TarikTunaiUiState,
    onEvent: (TarikTunaiEvent) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (state.selectedAnggota == null) {
            item(key = "manual_search") {
                OutlinedTextField(
                    value = state.anggotaSearchQuery,
                    onValueChange = { onEvent(TarikTunaiEvent.AnggotaSearchChanged(it)) },
                    placeholder = { Text("Cari nama atau ID anggota...") },
                    leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
                    trailingIcon = {
                        if (state.anggotaSearchQuery.isNotEmpty()) {
                            IconButton(onClick = { onEvent(TarikTunaiEvent.AnggotaSearchChanged("")) }) {
                                Icon(Icons.Rounded.Clear, contentDescription = "Hapus")
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            items(
                items = state.filteredAnggota,
                key = { it.anggotaId },
            ) { anggota ->
                Card(
                    onClick = { onEvent(TarikTunaiEvent.SelectAnggota(anggota)) },
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(anggota.displayName, fontWeight = FontWeight.Bold)
                            Text(
                                text = "ID #${anggota.anggotaId} • @${anggota.username}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "SHU: ${CurrencyFormatter.format(anggota.shu)}",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                color = BrandEmeraldDark,
                            )
                            Text(
                                text = "Saldo: ${CurrencyFormatter.format(anggota.saldo)}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        } else {
            val selected = state.selectedAnggota
            item(key = "selected_header") {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(selected.displayName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text(
                                text = "SHU: ${CurrencyFormatter.format(selected.shu)} • Saldo: ${CurrencyFormatter.format(selected.saldo)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        TextButton(onClick = { onEvent(TarikTunaiEvent.ClearSelectedAnggota) }) {
                            Text("Ganti")
                        }
                    }
                }
            }

            item(key = "server_eligibility") {
                if (state.isLoadingEligibility) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Memeriksa kelayakan dari server...", style = MaterialTheme.typography.bodySmall)
                    }
                } else {
                    state.eligibility?.let { elig ->
                        ServerEligibilityCard(
                            eligibility = elig,
                            selectedTransaksiId = state.selectedTransaksiId,
                            onSelectTransaksi = { onEvent(TarikTunaiEvent.TransaksiSelected(it)) },
                        )
                    }
                }
            }

            item(key = "manual_form") {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text("Sumber Dana Penarikan", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            SumberDanaTarik.entries.forEach { sumber ->
                                FilterChip(
                                    selected = state.sumberDana == sumber,
                                    onClick = { onEvent(TarikTunaiEvent.SumberDanaSelected(sumber)) },
                                    label = { Text(sumber.label) },
                                )
                            }
                        }

                        RupiahTextField(
                            value = state.nominalText,
                            onValueChange = { onEvent(TarikTunaiEvent.NominalChanged(it)) },
                            label = "Nominal Penarikan Tunai",
                            enabled = !state.isSubmittingManual,
                        )

                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf(25_000L, 50_000L, 75_000L, 100_000L).forEach { amt ->
                                FilterChip(
                                    selected = false,
                                    onClick = { onEvent(TarikTunaiEvent.NominalChanged(amt.toString())) },
                                    label = { Text(CurrencyFormatter.format(amt)) },
                                )
                            }
                            val maxServer = state.eligibility?.maxKuotaTarikTunai?.toLong() ?: 0L
                            if (state.sumberDana == SumberDanaTarik.SHU && maxServer > 0L) {
                                FilterChip(
                                    selected = false,
                                    onClick = { onEvent(TarikTunaiEvent.NominalChanged(maxServer.toString())) },
                                    label = { Text("Maks. Server (${CurrencyFormatter.format(maxServer)})") },
                                )
                            }
                        }

                        OutlinedTextField(
                            value = state.keterangan,
                            onValueChange = { onEvent(TarikTunaiEvent.KeteranganChanged(it)) },
                            label = { Text("Keterangan (Opsional)") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth(),
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Checkbox(
                                checked = state.persetujuanShu,
                                onCheckedChange = { onEvent(TarikTunaiEvent.PersetujuanShuChanged(it)) },
                            )
                            Text(
                                text = "Anggota menyetujui ketentuan pemotongan SHU Hari Besar secara sadar.",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }

                        Button(
                            onClick = { onEvent(TarikTunaiEvent.SubmitManualTarikTunai) },
                            enabled = !state.isSubmittingManual,
                            colors = ButtonDefaults.buttonColors(containerColor = BrandEmeraldDark),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                        ) {
                            if (state.isSubmittingManual) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp,
                                    color = MaterialTheme.colorScheme.onPrimary,
                                )
                            } else {
                                Text("Proses & Serahkan Uang Tunai", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ServerEligibilityCard(
    eligibility: KelayakanTarikTunaiDto,
    selectedTransaksiId: Int?,
    onSelectTransaksi: (Int) -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (eligibility.isEligible) {
            MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.5f)
        } else {
            MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.45f)
        },
        border = BorderStroke(
            1.dp,
            if (eligibility.isEligible) BrandEmeraldDark.copy(alpha = 0.4f) else MaterialTheme.colorScheme.error.copy(alpha = 0.4f),
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    imageVector = if (eligibility.isEligible) Icons.Rounded.CheckCircle else Icons.Rounded.WarningAmber,
                    contentDescription = null,
                    tint = if (eligibility.isEligible) BrandEmeraldDark else MaterialTheme.colorScheme.error,
                )
                Text(
                    text = if (eligibility.isEligible) {
                        "Memenuhi Syarat Tarik Tunai (Server)"
                    } else {
                        "Belum Memenuhi Syarat (Server)"
                    },
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
            }

            Text(
                text = "Kuota SHU Server: ${CurrencyFormatter.format(eligibility.maxKuotaTarikTunai)} • Hutang: ${CurrencyFormatter.format(eligibility.hutang)}",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold,
            )

            if (eligibility.ineligibleReasons.isNotEmpty()) {
                eligibility.ineligibleReasons.forEach { reason ->
                    Text(
                        text = "• $reason",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            if (eligibility.transaksiValidHariIni.isNotEmpty()) {
                Text(
                    text = "Transaksi Belanja Valid Hari Ini (> Rp 25.000):",
                    style = MaterialTheme.typography.labelMedium,
                )
                eligibility.transaksiValidHariIni.forEach { trx ->
                    FilterChip(
                        selected = selectedTransaksiId == trx.transaksiId,
                        onClick = { onSelectTransaksi(trx.transaksiId) },
                        label = {
                            Text("Trx #${trx.transaksiId} • ${CurrencyFormatter.format(trx.totalHarga)}")
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun TarikTunaiReceiptDialog(
    receipt: TarikTunaiReceiptDto,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Icon(
                imageVector = Icons.Rounded.CheckCircle,
                contentDescription = null,
                tint = BrandEmeraldDark,
                modifier = Modifier.size(36.dp),
            )
        },
        title = { Text("Penarikan Tunai Sukses") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("No. Tiket: #${receipt.kodePenarikan.ifBlank { "TRK-${receipt.tarikId}" }}", fontWeight = FontWeight.Bold)
                Text("Nama Anggota: ${receipt.namaAnggota}")
                Text(
                    text = "Nominal Diserahkan: ${CurrencyFormatter.format(receipt.nominal)}",
                    fontWeight = FontWeight.Bold,
                    color = BrandEmeraldDark,
                )
                receipt.transaksiId?.let { Text("Struk Belanja Terkait: Trx #$it") }
                HorizontalDivider()
                Text("Sisa SHU: ${CurrencyFormatter.format(receipt.sisaShu)}", style = MaterialTheme.typography.bodySmall)
                Text("Sisa Saldo: ${CurrencyFormatter.format(receipt.sisaSaldo)}", style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = {
            Button(onClick = onDismiss) {
                Text("Tutup Selesai")
            }
        },
    )
}
