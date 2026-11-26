package id.koperasipk.app.feature.kasir.ui.dashboard

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.LocalAtm
import androidx.compose.material.icons.rounded.PointOfSale
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.material.icons.rounded.VerifiedUser
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.core.datastore.UserSession
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.BalanceHeroCard
import id.koperasipk.app.core.designsystem.BrandEmeraldDark
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.QuickActionItem
import id.koperasipk.app.core.designsystem.QuickActionRow
import id.koperasipk.app.core.designsystem.SectionHeader
import id.koperasipk.app.core.designsystem.StatCard
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.TransactionRowCard

@Composable
fun KasirDashboardScreen(
    viewModel: KasirDashboardViewModel,
    session: UserSession,
    onOpenPos: () -> Unit,
    onOpenPesanan: () -> Unit,
    onOpenHutang: () -> Unit,
    onOpenSetoran: () -> Unit,
    onOpenTarikTunai: () -> Unit,
    onOpenSerahTerima: () -> Unit,
    onOpenBuatSerahTerima: () -> Unit,
    onOpenRiwayat: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    var isBalanceHidden by remember { mutableStateOf(false) }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is KasirDashboardEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Dashboard Kasir",
                subtitle = "Portal Operasional POS",
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading -> {
                LoadingState(
                    message = "Memuat Dashboard Kasir POS...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.dashboard == null -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(KasirDashboardEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                val dash = state.dashboard
                val activeShift = state.activeShift
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(KasirDashboardEvent.Refresh) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        // 1. Hero Kasir Balance & Identity Card
                        item(key = "hero") {
                            BalanceHeroCard(
                                greeting = "Kasir Bertugas (@${session.username.ifBlank { "kasir" }})",
                                userName = session.name.ifBlank { session.username },
                                balanceLabel = "Saldo Kas Laci",
                                balanceValue = CurrencyFormatter.format(dash?.saldoKas ?: 0.0),
                                secondaryMetrics = listOf(
                                    "Omset Hari Ini" to CurrencyFormatter.format(dash?.totalPendapatanHariIni ?: 0.0),
                                    "Struk Hari Ini" to "${dash?.totalTransaksiHariIni ?: 0} (${dash?.totalItemTerjualHariIni ?: 0} pcs)",
                                ),
                                isBalanceHidden = isBalanceHidden,
                                onToggleVisibility = { isBalanceHidden = !isBalanceHidden },
                                badgeText = if (activeShift != null) "Shift Aktif" else "Kasir Aktif",
                            )
                        }

                        // 2. Quick Action Strip (Mobbin style)
                        item(key = "quick_actions") {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                SectionHeader(title = "Aksi Cepat Kasir")
                                QuickActionRow(
                                    actions = listOf(
                                        QuickActionItem(
                                            label = "Buka POS",
                                            icon = Icons.Rounded.PointOfSale,
                                            tint = BrandEmeraldDark,
                                            onClick = onOpenPos,
                                        ),
                                        QuickActionItem(
                                            label = "Pesanan",
                                            icon = Icons.Rounded.ShoppingBag,
                                            badgeCount = dash?.pendingPesanan ?: 0,
                                            onClick = onOpenPesanan,
                                        ),
                                        QuickActionItem(
                                            label = "Hutang",
                                            icon = Icons.Rounded.CreditCard,
                                            badgeCount = dash?.pendingHutang ?: 0,
                                            onClick = onOpenHutang,
                                        ),
                                        QuickActionItem(
                                            label = "Tarik Tunai",
                                            icon = Icons.Rounded.LocalAtm,
                                            tint = BrandEmeraldDark,
                                            onClick = onOpenTarikTunai,
                                        ),
                                        QuickActionItem(
                                            label = "Setor Kas",
                                            icon = Icons.Rounded.AccountBalance,
                                            onClick = onOpenSetoran,
                                        ),
                                        QuickActionItem(
                                            label = "Shift",
                                            icon = Icons.Rounded.SwapHoriz,
                                            badgeCount = dash?.pendingSerahTerima ?: 0,
                                            onClick = onOpenSerahTerima,
                                        ),
                                    ),
                                )
                            }
                        }

                        // 3. Urgent Serah Terima Banner
                        if ((dash?.pendingSerahTerima ?: 0) > 0) {
                            item(key = "urgent_serah_terima") {
                                Card(
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFD97706)),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.weight(1f),
                                        ) {
                                            Icon(
                                                imageVector = Icons.Rounded.SwapHoriz,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(28.dp),
                                            )
                                            Spacer(modifier = Modifier.width(10.dp))
                                            Column {
                                                Text(
                                                    text = "Tugas Serah Terima Masuk",
                                                    style = MaterialTheme.typography.titleMedium,
                                                    color = Color.White,
                                                )
                                                Text(
                                                    text = "${dash?.pendingSerahTerima} serah terima shift menunggu validasi Anda.",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = Color.White.copy(alpha = 0.9f),
                                                )
                                            }
                                        }
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Button(
                                            onClick = onOpenSerahTerima,
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = Color.White,
                                                contentColor = Color(0xFF78350F),
                                            ),
                                            shape = RoundedCornerShape(10.dp),
                                        ) {
                                            Text("Validasi")
                                        }
                                    }
                                }
                            }
                        }

                        // 4. Active Shift Telemetry Card
                        item(key = "shift_telemetry") {
                            Card(
                                shape = RoundedCornerShape(18.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                if (activeShift != null) {
                                    val opname = activeShift.hasilOpname
                                    val selisihBarang = opname?.summary?.barangSelisih ?: 0
                                    Column(
                                        modifier = Modifier.padding(14.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Rounded.VerifiedUser,
                                                    contentDescription = null,
                                                    tint = MaterialTheme.colorScheme.primary,
                                                )
                                                Text(
                                                    text = "Shift Aktif Toko",
                                                    style = MaterialTheme.typography.titleMedium,
                                                )
                                            }
                                            StatusBadge(text = "#ST-${activeShift.serahId}", variant = BadgeVariant.INFO)
                                        }
                                        Text(
                                            text = "Dari @${activeShift.kasirFromName} • Modal Awal: ${CurrencyFormatter.format(opname?.uangFisik ?: 0.0)}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            StatusBadge(
                                                text = if (selisihBarang > 0) {
                                                    "$selisihBarang barang selisih disinkronkan"
                                                } else {
                                                    "Cycle count 100% cocok"
                                                },
                                                variant = if (selisihBarang > 0) BadgeVariant.WARNING else BadgeVariant.SUCCESS,
                                            )
                                            TextButton(onClick = onOpenSerahTerima) {
                                                Text("Kelola Shift")
                                            }
                                        }
                                    }
                                } else {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.weight(1f),
                                        ) {
                                            Icon(
                                                imageVector = Icons.Rounded.Schedule,
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                            Spacer(modifier = Modifier.width(10.dp))
                                            Column {
                                                Text(
                                                    text = "Operasional Shift Mandiri",
                                                    style = MaterialTheme.typography.titleMedium,
                                                )
                                                Text(
                                                    text = "Buat serah terima saat pergantian shift kasir.",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                        }
                                        FilledTonalButton(onClick = onOpenBuatSerahTerima) {
                                            Text("Buat Shift")
                                        }
                                    }
                                }
                            }
                        }

                        // 5. Stat Cards
                        item(key = "stats_row") {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                StatCard(
                                    title = "Total Dilayani",
                                    value = "${dash?.totalTransaksiDilayani ?: 0} Struk",
                                    subtitle = "Hari ini: ${dash?.totalTransaksiHariIni ?: 0} struk",
                                    icon = Icons.AutoMirrored.Rounded.ReceiptLong,
                                    modifier = Modifier.weight(1f),
                                    onClick = onOpenRiwayat,
                                )
                                StatCard(
                                    title = "Serah Terima",
                                    value = "${dash?.pendingSerahTerima ?: 0} Antrean",
                                    subtitle = if (state.hasPendingOutgoingShift) {
                                        "1 kiriman menunggu ACC"
                                    } else {
                                        "Antrean validasi shift"
                                    },
                                    icon = Icons.Rounded.AccountBalanceWallet,
                                    accentColor = Color(0xFFD97706),
                                    modifier = Modifier.weight(1f),
                                    onClick = onOpenSerahTerima,
                                )
                            }
                        }

                        // 6. Transaksi Terbaru Header
                        item(key = "recent_header") {
                            SectionHeader(
                                title = "Transaksi Kasir Terbaru",
                                subtitle = "Aktivitas penjualan kasir terbaru",
                                actionLabel = "Lihat Semua",
                                onActionClick = onOpenRiwayat,
                            )
                        }

                        if (state.transaksiTerbaru.isEmpty()) {
                            item(key = "recent_empty") {
                                Card(
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)),
                                ) {
                                    EmptyState(
                                        title = "Belum ada transaksi",
                                        description = "Ketuk tombol POS untuk mulai melayani pembeli.",
                                        modifier = Modifier.height(180.dp),
                                    )
                                }
                            }
                        } else {
                            items(
                                items = state.transaksiTerbaru,
                                key = { item -> item.resolvedId },
                            ) { trx ->
                                TransactionRowCard(
                                    title = "#${trx.resolvedId} • ${trx.namaAnggota?.takeIf { it.isNotBlank() } ?: "Non-Anggota"}",
                                    subtitle = "${DateFormatter.formatDateTime(trx.createdAt)} • ${trx.metodePembayaran.uppercase()}",
                                    amount = CurrencyFormatter.format(trx.totalHarga),
                                    status = trx.status,
                                    icon = Icons.AutoMirrored.Rounded.ReceiptLong,
                                    onClick = onOpenRiwayat,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
