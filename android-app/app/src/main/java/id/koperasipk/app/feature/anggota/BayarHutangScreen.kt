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
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.BrandEmeraldDark
import id.koperasipk.app.core.designsystem.BrandNavy
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
fun BayarHutangScreen(
    viewModel: BayarHutangViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is BayarHutangEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Bayar Hutang",
                subtitle = "Pelunasan & Plafon Kredit",
                onBack = onBack,
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
    ) { innerPadding ->
        val profil = state.profil
        when {
            state.isLoading && profil == null -> {
                LoadingState(
                    message = "Memuat data hutang...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && profil == null -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(BayarHutangEvent.Refresh) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                val totalHutang = profil?.hutang ?: 0.0
                val simpananPokok = profil?.simpananPokok ?: 0.0
                val limitHutang = profil?.limitHutang ?: 0.0
                val sisaLimitHutang = profil?.sisaLimitHutang ?: 0.0
                val usageFraction = if (limitHutang > 0.0) {
                    (totalHutang / limitHutang).toFloat().coerceIn(0f, 1f)
                } else {
                    0f
                }
                val usagePercent = (usageFraction * 100f).roundToLong()

                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(BayarHutangEvent.Refresh) },
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
                        item(key = "debt_summary") {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.error),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(20.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    Text(
                                        text = "TOTAL HUTANG BELANJA SAAT INI",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onError.copy(alpha = 0.85f),
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        text = CurrencyFormatter.format(totalHutang),
                                        style = MaterialTheme.typography.headlineMedium,
                                        fontWeight = FontWeight.Black,
                                        color = MaterialTheme.colorScheme.onError,
                                    )
                                    Text(
                                        text = if (totalHutang <= 0.0) {
                                            "Tidak ada kewajiban hutang aktif"
                                        } else {
                                            "Plafon kredit terpakai untuk belanja"
                                        },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onError.copy(alpha = 0.9f),
                                    )
                                }
                            }
                        }

                        item(key = "collateral_panel") {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(containerColor = BrandNavy),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            modifier = Modifier.weight(1f),
                                        ) {
                                            Icon(
                                                imageVector = Icons.Rounded.Shield,
                                                contentDescription = null,
                                                tint = Color(0xFF93C5FD),
                                            )
                                            Column {
                                                Text(
                                                    text = "Sistem Jaminan Simpanan",
                                                    style = MaterialTheme.typography.titleSmall,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.White,
                                                )
                                                Text(
                                                    text = "Plafon ${CurrencyFormatter.format(limitHutang)}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = Color(0xFF93C5FD),
                                                )
                                            }
                                        }
                                    }

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        CollateralMetricBox(
                                            label = "Jaminan Pokok",
                                            value = CurrencyFormatter.format(simpananPokok),
                                            valueColor = Color(0xFFFCD34D),
                                            modifier = Modifier.weight(1f),
                                        )
                                        CollateralMetricBox(
                                            label = "Hutang",
                                            value = CurrencyFormatter.format(totalHutang),
                                            valueColor = Color(0xFFFCA5A5),
                                            modifier = Modifier.weight(1f),
                                        )
                                        CollateralMetricBox(
                                            label = "Sisa Pagu",
                                            value = CurrencyFormatter.format(sisaLimitHutang),
                                            valueColor = Color(0xFF6EE7B7),
                                            modifier = Modifier.weight(1f),
                                        )
                                    }

                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                        ) {
                                            Text(
                                                text = "Penggunaan Plafon",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = Color(0xFFCBD5E1),
                                            )
                                            Text(
                                                text = "$usagePercent%",
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF93C5FD),
                                            )
                                        }
                                        LinearProgressIndicator(
                                            progress = { usageFraction },
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(8.dp)
                                                .clip(RoundedCornerShape(999.dp)),
                                        )
                                    }
                                }
                            }
                        }

                        item(key = "payment_form") {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Text(
                                        text = "Formulir Pembayaran Hutang",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                    )

                                    if (totalHutang <= 0.0) {
                                        Surface(
                                            shape = RoundedCornerShape(14.dp),
                                            color = MaterialTheme.colorScheme.secondaryContainer,
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(16.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                verticalArrangement = Arrangement.spacedBy(6.dp),
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Rounded.CheckCircle,
                                                    contentDescription = null,
                                                    tint = BrandEmeraldDark,
                                                    modifier = Modifier.size(32.dp),
                                                )
                                                Text(
                                                    text = "Hutang Anda Nihil",
                                                    style = MaterialTheme.typography.titleSmall,
                                                    fontWeight = FontWeight.Bold,
                                                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                                                )
                                                Text(
                                                    text = "Pagu kredit Anda utuh dan siap digunakan untuk berbelanja.",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    textAlign = TextAlign.Center,
                                                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                                                )
                                            }
                                        }
                                    } else {
                                        val presets = listOf(10_000L, 25_000L, 50_000L, 100_000L)
                                            .filter { it < totalHutang.roundToLong() }
                                        FlowRow(
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            verticalArrangement = Arrangement.spacedBy(4.dp),
                                        ) {
                                            presets.forEach { preset ->
                                                FilterChip(
                                                    selected = state.nominalInput == preset.toString(),
                                                    onClick = { viewModel.onEvent(BayarHutangEvent.PresetSelected(preset)) },
                                                    label = { Text(CurrencyFormatter.format(preset)) },
                                                )
                                            }
                                            val fullDebt = totalHutang.roundToLong()
                                            if (fullDebt > 0L) {
                                                FilterChip(
                                                    selected = state.nominalInput == fullDebt.toString(),
                                                    onClick = { viewModel.onEvent(BayarHutangEvent.PresetSelected(fullDebt)) },
                                                    label = { Text("Bayar Lunas") },
                                                )
                                            }
                                        }

                                        RupiahTextField(
                                            value = state.nominalInput,
                                            onValueChange = { viewModel.onEvent(BayarHutangEvent.NominalChanged(it)) },
                                            label = "Nominal Pembayaran",
                                            supportingText = "Serahkan uang ke kasir setelah mengajukan pembayaran",
                                            enabled = !state.isSubmitting,
                                        )

                                        if (state.submitError != null) {
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
                                                    text = state.submitError.orEmpty(),
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                                )
                                            }
                                        }

                                        if (state.submitSuccess != null) {
                                            Surface(
                                                shape = RoundedCornerShape(12.dp),
                                                color = MaterialTheme.colorScheme.secondaryContainer,
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Text(
                                                    text = state.submitSuccess.orEmpty(),
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                                                    modifier = Modifier.padding(10.dp),
                                                )
                                            }
                                        }

                                        Button(
                                            onClick = { viewModel.onEvent(BayarHutangEvent.SubmitPayment) },
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
                                                Text("Ajukan Pembayaran ke Kasir")
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        item(key = "history_header") {
                            SectionHeader(
                                title = "Riwayat Pembayaran Hutang",
                                subtitle = "${state.history.size} pengajuan tercatat",
                            )
                        }

                        if (state.history.isEmpty()) {
                            item(key = "history_empty") {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(160.dp),
                                ) {
                                    EmptyState(
                                        title = "Belum ada riwayat pembayaran hutang",
                                        icon = Icons.Rounded.CreditCard,
                                    )
                                }
                            }
                        } else {
                            items(
                                items = state.history,
                                key = { it.pembayaranId },
                            ) { item ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.45f)),
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = CurrencyFormatter.format(item.resolvedNominal),
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                            )
                                            Text(
                                                text = DateFormatter.formatDateTime(item.createdAt),
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                        val statusLabel = when (item.status.lowercase()) {
                                            "approved" -> "Disetujui"
                                            "rejected" -> "Ditolak"
                                            else -> "Menunggu Kasir"
                                        }
                                        StatusBadge(
                                            text = statusLabel,
                                            variant = statusBadgeVariant(item.status),
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

@Composable
private fun CollateralMetricBox(
    label: String,
    value: String,
    valueColor: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = Color.White.copy(alpha = 0.08f),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = valueColor,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.bodySmall,
                color = valueColor,
                fontWeight = FontWeight.ExtraBold,
            )
        }
    }
}
