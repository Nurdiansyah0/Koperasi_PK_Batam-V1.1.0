package id.koperasipk.app.feature.anggota

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.QrCode2
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.core.datastore.UserSession
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.BalanceHeroCard
import id.koperasipk.app.core.designsystem.BrandEmerald
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.QuickActionItem
import id.koperasipk.app.core.designsystem.QuickActionRow
import id.koperasipk.app.core.designsystem.SectionHeader
import id.koperasipk.app.core.designsystem.ShimmerBox
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.TransactionRowCard

@Composable
fun AnggotaDashboardScreen(
    viewModel: AnggotaDashboardViewModel,
    session: UserSession,
    onNavigateBelanja: () -> Unit,
    onNavigateBayarHutang: () -> Unit,
    onNavigateTarikTunai: () -> Unit,
    onNavigateProfil: () -> Unit,
    onNavigateRiwayat: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AnggotaDashboardEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    val profil = state.profil
    if (state.showQrDialog) {
        val memberCode = "#${profil?.anggotaId ?: session.anggotaId ?: session.username}"
        val memberName = profil?.namaLengkap?.takeIf { it.isNotBlank() } ?: session.name
        AlertDialog(
            onDismissRequest = { viewModel.onEvent(AnggotaDashboardEvent.DismissQrDialog) },
            title = { Text("Kartu Digital Anggota") },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.QrCode2,
                                contentDescription = "QR Anggota",
                                modifier = Modifier.size(120.dp),
                                tint = MaterialTheme.colorScheme.onSurface,
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = memberCode,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleMedium,
                            )
                        }
                    }
                    Text(
                        text = memberName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    )
                    Text(
                        text = "Tunjukkan ID / QR ini ke kasir saat berbelanja di Koperasi",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = { viewModel.onEvent(AnggotaDashboardEvent.DismissQrDialog) }) {
                    Text("Tutup")
                }
            },
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Koperasi PKPPK",
                subtitle = "Beranda Anggota",
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && profil == null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    ShimmerBox(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp),
                        shape = RoundedCornerShape(24.dp),
                    )
                    ShimmerBox(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(84.dp),
                        shape = RoundedCornerShape(16.dp),
                    )
                    ShimmerBox(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp),
                        shape = RoundedCornerShape(16.dp),
                    )
                }
            }
            state.errorMessage != null && profil == null -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(AnggotaDashboardEvent.Refresh) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(AnggotaDashboardEvent.Refresh) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        item(key = "member_card") {
                            BalanceHeroCard(
                                greeting = "Selamat datang,",
                                userName = profil?.namaLengkap?.takeIf { it.isNotBlank() } ?: session.name,
                                balanceLabel = "Saldo Bebas Belanja",
                                balanceValue = CurrencyFormatter.format(profil?.saldo ?: 0.0),
                                secondaryMetrics = listOf(
                                    "Hutang" to CurrencyFormatter.format(profil?.hutang ?: 0.0),
                                    "SHU" to CurrencyFormatter.format(profil?.shu ?: 0.0),
                                    "Simpanan Pokok" to CurrencyFormatter.format(profil?.simpananPokok ?: 0.0),
                                ),
                                isBalanceHidden = state.isBalanceHidden,
                                onToggleVisibility = { viewModel.onEvent(AnggotaDashboardEvent.ToggleBalanceVisibility) },
                                badgeText = "ID: #${profil?.anggotaId ?: session.anggotaId ?: session.username}",
                            )
                        }

                        item(key = "membership_status") {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Column {
                                        Text(
                                            text = "Status Keanggotaan",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        Text(
                                            text = "Anggota Aktif Koperasi",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                        )
                                    }
                                    StatusBadge(
                                        text = "Terverifikasi",
                                        variant = BadgeVariant.SUCCESS,
                                    )
                                }
                            }
                        }

                        item(key = "quick_actions") {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                SectionHeader(title = "Layanan Anggota")
                                val quickActions = listOf(
                                    QuickActionItem(
                                        label = "Belanja",
                                        icon = Icons.Rounded.ShoppingCart,
                                        tint = MaterialTheme.colorScheme.primary,
                                        onClick = onNavigateBelanja,
                                    ),
                                    QuickActionItem(
                                        label = "Bayar Hutang",
                                        icon = Icons.Rounded.CreditCard,
                                        tint = MaterialTheme.colorScheme.error,
                                        onClick = onNavigateBayarHutang,
                                    ),
                                    QuickActionItem(
                                        label = "Tarik Tunai",
                                        icon = Icons.Rounded.AccountBalanceWallet,
                                        tint = BrandEmerald,
                                        onClick = onNavigateTarikTunai,
                                    ),
                                    QuickActionItem(
                                        label = "Kartu QR",
                                        icon = Icons.Rounded.QrCode2,
                                        tint = MaterialTheme.colorScheme.secondary,
                                        onClick = { viewModel.onEvent(AnggotaDashboardEvent.ShowQrDialog) },
                                    ),
                                    QuickActionItem(
                                        label = "Profil & Pagu",
                                        icon = Icons.Rounded.Person,
                                        tint = MaterialTheme.colorScheme.tertiary,
                                        onClick = onNavigateProfil,
                                    ),
                                )
                                QuickActionRow(actions = quickActions)
                            }
                        }

                        item(key = "promo_banner") {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                SectionHeader(
                                    title = "Promo & Paket Bundling",
                                    subtitle = "Belanja hemat anti-receh & reward laba SHU",
                                    actionLabel = "Lihat Promo",
                                    onActionClick = onNavigateBelanja,
                                )
                                Card(
                                    onClick = onNavigateBelanja,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)
                                    ),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)),
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
                                            Row(
                                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                StatusBadge(text = "PROMO SPESIAL", variant = BadgeVariant.SUCCESS)
                                                Text(
                                                    text = "Hemat s/d 10%",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = MaterialTheme.colorScheme.primary,
                                                    fontWeight = FontWeight.Bold,
                                                )
                                            }
                                            Text(
                                                text = "Paket Sembako & Sarapan",
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                            )
                                            Text(
                                                text = "Harga genap tanpa pecahan 500. Setiap belanja otomatis menambah tabungan SHU Anda!",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Surface(
                                            shape = CircleShape,
                                            color = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(40.dp),
                                        ) {
                                            Box(contentAlignment = Alignment.Center) {
                                                Icon(
                                                    imageVector = Icons.AutoMirrored.Rounded.ArrowForward,
                                                    contentDescription = "Buka Promo",
                                                    tint = MaterialTheme.colorScheme.onPrimary,
                                                    modifier = Modifier.size(20.dp),
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        item(key = "recent_header") {
                            SectionHeader(
                                title = "Aktivitas Belanja Terakhir",
                                subtitle = "Riwayat 5 transaksi pembelian terakhir",
                                actionLabel = "Lihat Semua",
                                onActionClick = onNavigateRiwayat,
                            )
                        }

                        if (state.recentTransactions.isEmpty()) {
                            item(key = "recent_empty") {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)),
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(160.dp),
                                    ) {
                                        EmptyState(
                                            title = "Belum ada transaksi belanja",
                                            description = "Mulai belanja di katalog toko koperasi",
                                            icon = Icons.Rounded.ShoppingBag,
                                            actionLabel = "Belanja Sekarang",
                                            onAction = onNavigateBelanja,
                                        )
                                    }
                                }
                            }
                        } else {
                            items(
                                items = state.recentTransactions,
                                key = { it.transaksiId },
                            ) { tx ->
                                TransactionRowCard(
                                    title = "Belanja #${tx.transaksiId}",
                                    subtitle = DateFormatter.formatDateTime(tx.createdAt),
                                    amount = CurrencyFormatter.format(tx.totalHarga),
                                    status = "${tx.metodePembayaran.uppercase()} • ${tx.status}",
                                    icon = Icons.Rounded.ShoppingBag,
                                    onClick = onNavigateRiwayat,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
