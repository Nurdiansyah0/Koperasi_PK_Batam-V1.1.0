package id.koperasipk.app.feature.anggota

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.QrCode2
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
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
import id.koperasipk.app.core.designsystem.RupiahTextField
import id.koperasipk.app.core.designsystem.SectionHeader
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.statusBadgeVariant
import kotlin.math.roundToLong

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TarikTunaiScreen(
    viewModel: TarikTunaiViewModel,
    onBack: () -> Unit,
    onNavigateBelanja: () -> Unit,
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

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Tarik Tunai & SHU",
                subtitle = "Verifikasi Otomatis & Tiket Kasir",
                onBack = onBack,
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
    ) { innerPadding ->
        val eligibility = state.eligibility
        when {
            state.isLoading && eligibility == null -> {
                LoadingState(
                    message = "Memeriksa kelayakan tarik tunai...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && eligibility == null -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(TarikTunaiEvent.Refresh) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(TarikTunaiEvent.Refresh) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .imePadding(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        item(key = "header_banner") {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(containerColor = BrandEmeraldDark),
                            ) {
                                Column(
                                    modifier = Modifier.padding(18.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    Text(
                                        text = "Tarik Tunai & Saldo SHU",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Black,
                                        color = androidx.compose.ui.graphics.Color.White,
                                    )
                                    Text(
                                        text = "Cairkan saldo E-Wallet dan akumulasi SHU Anda di kasir toko dengan verifikasi sistem.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.9f),
                                    )
                                }
                            }
                        }

                        eligibility?.pendingTicket?.let { ticket ->
                            item(key = "pending_ticket_${ticket.tarikId}") {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(20.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.secondaryContainer,
                                    ),
                                    border = BorderStroke(1.5.dp, BrandEmeraldDark),
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Column(
                                            modifier = Modifier.weight(1f),
                                            verticalArrangement = Arrangement.spacedBy(4.dp),
                                        ) {
                                            StatusBadge(
                                                text = "Menunggu Pencairan di Kasir",
                                                variant = BadgeVariant.SUCCESS,
                                            )
                                            Text(
                                                text = "Tiket Penarikan Aktif",
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                            )
                                            Text(
                                                text = "Tunjukkan kode tiket ke kasir untuk mengambil ${CurrencyFormatter.format(ticket.nominal)}.",
                                                style = MaterialTheme.typography.bodySmall,
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Surface(
                                            shape = RoundedCornerShape(14.dp),
                                            color = MaterialTheme.colorScheme.surface,
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(12.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally,
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Rounded.QrCode2,
                                                    contentDescription = null,
                                                    tint = BrandEmeraldDark,
                                                    modifier = Modifier.size(32.dp),
                                                )
                                                Text(
                                                    text = ticket.kodePenarikan,
                                                    fontFamily = FontFamily.Monospace,
                                                    fontWeight = FontWeight.Black,
                                                    style = MaterialTheme.typography.labelMedium,
                                                )
                                                Text(
                                                    text = ticket.sumberDana.uppercase(),
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (eligibility != null) {
                            item(key = "eligibility_summary") {
                                EligibilityStatusCard(
                                    eligibility = eligibility,
                                    onNavigateBelanja = onNavigateBelanja,
                                )
                            }

                            item(key = "master_consent") {
                                MasterConsentCard(
                                    hasMasterConsent = eligibility.hasMasterConsent,
                                    isSubmitting = state.isConsentSubmitting,
                                    checked = state.persetujuanShuChecked,
                                    onCheckedChange = { viewModel.onEvent(TarikTunaiEvent.PersetujuanChanged(it)) },
                                    onAgreeMasterConsent = { viewModel.onEvent(TarikTunaiEvent.AgreeMasterConsent) },
                                )
                            }

                            if (eligibility.isEligible && eligibility.pendingTicket == null) {
                                item(key = "withdrawal_form") {
                                    TarikTunaiFormCard(
                                        state = state,
                                        eligibility = eligibility,
                                        onEvent = viewModel::onEvent,
                                    )
                                }
                            }
                        }

                        item(key = "riwayat_header") {
                            SectionHeader(
                                title = "Riwayat Penarikan Tunai Saya",
                                subtitle = "${state.history.size} mutasi",
                            )
                        }

                        if (state.history.isEmpty()) {
                            item(key = "riwayat_empty") {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(160.dp),
                                ) {
                                    EmptyState(
                                        title = "Belum ada riwayat penarikan",
                                        description = "Pengajuan tarik tunai Anda akan tampil di sini.",
                                        icon = Icons.Rounded.History,
                                    )
                                }
                            }
                        } else {
                            items(
                                items = state.history,
                                key = { it.tarikId },
                            ) { item ->
                                TarikTunaiHistoryItemCard(item = item)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EligibilityStatusCard(
    eligibility: KelayakanTarikTunaiDto,
    onNavigateBelanja: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Shield,
                        contentDescription = null,
                        tint = BrandEmeraldDark,
                    )
                    Text(
                        text = "Verifikasi Kelayakan Sistem",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                }
                StatusBadge(
                    text = if (eligibility.isEligible) "Memenuhi Syarat" else "Belum Memenuhi",
                    variant = if (eligibility.isEligible) BadgeVariant.SUCCESS else BadgeVariant.DANGER,
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                CheckRuleRow(
                    title = "1. Status Hutang",
                    value = if (!eligibility.hasDebt) {
                        "Bebas Hutang (Rp 0)"
                    } else {
                        "Ada Hutang ${CurrencyFormatter.format(eligibility.hutang)}"
                    },
                    passed = !eligibility.hasDebt,
                )
                CheckRuleRow(
                    title = "2. Belanja Toko Hari Ini",
                    value = CurrencyFormatter.format(eligibility.totalBelanjaHariIni),
                    passed = eligibility.hasQualifyingPurchase,
                )
                CheckRuleRow(
                    title = "3. Kuota Maksimal Tarik SHU",
                    value = CurrencyFormatter.format(eligibility.resolvedMaxQuota),
                    passed = eligibility.resolvedMaxQuota > 0.0,
                )
            }

            if (!eligibility.isEligible && eligibility.ineligibleReasons.isNotEmpty()) {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.errorContainer,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Warning,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onErrorContainer,
                                modifier = Modifier.size(16.dp),
                            )
                            Text(
                                text = "Alasan Belum Dapat Diproses:",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            )
                        }
                        eligibility.ineligibleReasons.forEach { reason ->
                            Text(
                                text = "• $reason",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            )
                        }
                    }
                }
            }

            if (!eligibility.isEligible) {
                OutlinedButton(
                    onClick = onNavigateBelanja,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(
                        imageVector = Icons.Rounded.ShoppingBag,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Belanja di Katalog Toko")
                }
            }
        }
    }
}

@Composable
private fun CheckRuleRow(
    title: String,
    value: String,
    passed: Boolean,
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = value,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
            Icon(
                imageVector = if (passed) Icons.Rounded.CheckCircle else Icons.Rounded.ErrorOutline,
                contentDescription = null,
                tint = if (passed) BrandEmeraldDark else MaterialTheme.colorScheme.error,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun MasterConsentCard(
    hasMasterConsent: Boolean,
    isSubmitting: Boolean,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    onAgreeMasterConsent: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = if (hasMasterConsent) {
            MaterialTheme.colorScheme.secondaryContainer
        } else {
            MaterialTheme.colorScheme.surfaceVariant
        },
        border = BorderStroke(
            width = 1.dp,
            color = if (hasMasterConsent) BrandEmeraldDark else MaterialTheme.colorScheme.outline,
        ),
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
                    text = "Pakta Integritas SHU (Master Consent)",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                )
                StatusBadge(
                    text = if (hasMasterConsent) "Aktif" else "Perlu Persetujuan",
                    variant = if (hasMasterConsent) BadgeVariant.SUCCESS else BadgeVariant.WARNING,
                )
            }
            Text(
                text = "Penarikan SHU akan mengurangi saldo SHU dan nilai pembagian SHU pada Hari Raya / RAT Tahunan.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (!hasMasterConsent) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Checkbox(
                        checked = checked,
                        onCheckedChange = onCheckedChange,
                    )
                    Text(
                        text = "Saya memahami dan menyetujui konsekuensi pemotongan SHU ini.",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                }
                OutlinedButton(
                    onClick = onAgreeMasterConsent,
                    enabled = !isSubmitting,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Setujui Master Consent Permanen")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TarikTunaiFormCard(
    state: TarikTunaiUiState,
    eligibility: KelayakanTarikTunaiDto,
    onEvent: (TarikTunaiEvent) -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Formulir Pengajuan Tiket Tarik Tunai",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                SumberDanaOptionCard(
                    label = "Akumulasi SHU",
                    amount = CurrencyFormatter.format(eligibility.saldoShu),
                    selected = state.sumberDana == SumberDanaTarikTunai.SHU,
                    onClick = { onEvent(TarikTunaiEvent.SumberDanaSelected(SumberDanaTarikTunai.SHU)) },
                    modifier = Modifier.weight(1f),
                )
                SumberDanaOptionCard(
                    label = "Saldo E-Wallet",
                    amount = CurrencyFormatter.format(eligibility.saldoEwallet),
                    selected = state.sumberDana == SumberDanaTarikTunai.SALDO,
                    onClick = { onEvent(TarikTunaiEvent.SumberDanaSelected(SumberDanaTarikTunai.SALDO)) },
                    modifier = Modifier.weight(1f),
                )
            }

            RupiahTextField(
                value = state.nominalInput,
                onValueChange = { onEvent(TarikTunaiEvent.NominalChanged(it)) },
                label = "Nominal Penarikan",
                supportingText = if (state.sumberDana == SumberDanaTarikTunai.SHU) {
                    "Kuota SHU tersedia: ${CurrencyFormatter.format(eligibility.resolvedMaxQuota)}"
                } else {
                    "Minimal Rp 1.000 (divalidasi server)"
                },
                enabled = !state.isSubmitting,
            )

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                listOf(25_000L, 50_000L, 75_000L, 100_000L).forEach { amount ->
                    FilterChip(
                        selected = state.nominalInput == amount.toString(),
                        onClick = { onEvent(TarikTunaiEvent.QuickAmountSelected(amount)) },
                        label = { Text(CurrencyFormatter.format(amount)) },
                    )
                }
                val serverQuota = eligibility.resolvedMaxQuota.roundToLong()
                if (state.sumberDana == SumberDanaTarikTunai.SHU && serverQuota > 0L) {
                    FilterChip(
                        selected = state.nominalInput == serverQuota.toString(),
                        onClick = { onEvent(TarikTunaiEvent.QuickAmountSelected(serverQuota)) },
                        label = { Text("Maksimal (${CurrencyFormatter.format(serverQuota)})") },
                    )
                }
            }

            OutlinedTextField(
                value = state.keteranganInput,
                onValueChange = { onEvent(TarikTunaiEvent.KeteranganChanged(it)) },
                label = { Text("Keterangan (Opsional)") },
                singleLine = true,
                enabled = !state.isSubmitting,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            if (state.formError != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.errorContainer)
                        .padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Rounded.ErrorOutline,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = state.formError.orEmpty(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                    )
                }
            }

            Button(
                onClick = { onEvent(TarikTunaiEvent.SubmitTarikTunai) },
                enabled = !state.isSubmitting && state.nominalInput.isNotBlank(),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
            ) {
                if (state.isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.5.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                } else {
                    Text("Buat Tiket Penarikan Kas")
                }
            }
        }
    }
}

@Composable
private fun SumberDanaOptionCard(
    label: String,
    amount: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surface
            },
        ),
        border = BorderStroke(
            width = if (selected) 1.5.dp else 1.dp,
            color = if (selected) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
            },
        ),
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(
                    imageVector = Icons.Rounded.AccountBalanceWallet,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                )
            }
            Text(
                text = amount,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.ExtraBold,
            )
        }
    }
}

@Composable
private fun TarikTunaiHistoryItemCard(item: TarikTunaiItemDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.45f)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "#${item.kodePenarikan ?: "TRK-${item.tarikId}"}",
                        style = MaterialTheme.typography.labelSmall,
                        fontFamily = FontFamily.Monospace,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    StatusBadge(
                        text = item.sumberDana.uppercase(),
                        variant = BadgeVariant.INFO,
                    )
                    val statusLabel = when (item.status.lowercase()) {
                        "completed" -> "Diserahkan"
                        "pending" -> "Menunggu"
                        else -> "Ditolak"
                    }
                    StatusBadge(
                        text = statusLabel,
                        variant = statusBadgeVariant(
                            if (item.status.equals("completed", ignoreCase = true)) "selesai" else item.status
                        ),
                    )
                }
                Text(
                    text = CurrencyFormatter.format(item.nominal),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.ExtraBold,
                    color = if (item.status.equals("rejected", ignoreCase = true)) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        BrandEmeraldDark
                    },
                )
            }

            if (item.status.equals("rejected", ignoreCase = true) && !item.alasanTolak.isNullOrBlank()) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.errorContainer,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = item.alasanTolak,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(8.dp),
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "Verifikator: ${item.kasirName ?: "-"} • Struk #${item.transaksiId ?: "-"}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = DateFormatter.formatShortDate(item.createdAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
