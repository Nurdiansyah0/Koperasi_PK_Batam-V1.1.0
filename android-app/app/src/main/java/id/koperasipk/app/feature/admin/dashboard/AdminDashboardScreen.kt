package id.koperasipk.app.feature.admin.dashboard

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
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
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.AddShoppingCart
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Scale
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material.icons.rounded.TrendingUp
import androidx.compose.material.icons.rounded.WarningAmber
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.BrandEmerald
import id.koperasipk.app.core.designsystem.BrandEmeraldDark
import id.koperasipk.app.core.designsystem.BrandNavy
import id.koperasipk.app.core.designsystem.BrandSlate
import id.koperasipk.app.core.designsystem.ConfirmDialog
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.SectionHeader
import id.koperasipk.app.core.designsystem.StatCard
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.feature.admin.ui.AdminSurfaceCard
import kotlin.math.roundToInt

@Composable
fun AdminDashboardScreen(
    viewModel: AdminDashboardViewModel,
    onNavigateBarang: () -> Unit,
    onNavigateAnggota: () -> Unit,
    onNavigateLaporan: () -> Unit,
    onNavigateSetoran: () -> Unit,
    onNavigatePkm: () -> Unit,
    onNavigateShu: () -> Unit,
    onNavigateSelisih: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AdminDashboardEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    ConfirmDialog(
        visible = state.showConfirmAutoPkm,
        title = "Hitung Ulang Batas Rak (PKM)?",
        message = "Sistem akan menghitung otomatis batas maksimal pajang rak toko (PKM 4 hari) berdasarkan penjualan 30 hari terakhir untuk seluruh produk.",
        confirmLabel = "Terapkan Sekarang",
        isLoading = state.isApplyingPkm,
        onConfirm = { viewModel.onEvent(AdminDashboardEvent.ConfirmAutoPkm) },
        onDismiss = { viewModel.onEvent(AdminDashboardEvent.DismissAutoPkm) },
    )

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            KoperasiTopBar(
                title = "Dashboard Eksekutif",
                subtitle = "Pusat Kendali Operasional Koperasi",
                actions = {
                    IconButton(onClick = { viewModel.onEvent(AdminDashboardEvent.Refresh) }) {
                        Icon(Icons.Rounded.Refresh, contentDescription = "Segarkan Metrik")
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        val data = state.data
        when {
            state.isLoading && data == null -> {
                LoadingState(
                    message = "Memuat metrik operasional koperasi...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && data == null -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(AdminDashboardEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            data != null -> {
                val realHutangRatio = if (data.totalSaldoAnggota > 0.0) {
                    ((data.totalHutangBeredar / data.totalSaldoAnggota) * 100.0).roundToInt()
                } else {
                    0
                }
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(AdminDashboardEvent.Refresh) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        item(key = "hero_omset") {
                            Card(
                                onClick = onNavigateLaporan,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(24.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(Brush.linearGradient(listOf(BrandNavy, BrandSlate, Color(0xFF1E3A8A))))
                                        .padding(20.dp),
                                ) {
                                    Column {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.Top,
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = "PENJUALAN TOKO HARI INI",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = Color(0xFF93C5FD),
                                                    fontWeight = FontWeight.Bold,
                                                )
                                                Spacer(modifier = Modifier.height(6.dp))
                                                Text(
                                                    text = CurrencyFormatter.format(data.totalPendapatanHariIni),
                                                    style = MaterialTheme.typography.headlineSmall,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    color = Color.White,
                                                )
                                            }
                                            Surface(
                                                shape = RoundedCornerShape(14.dp),
                                                color = Color.White.copy(alpha = 0.16f),
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Rounded.TrendingUp,
                                                    contentDescription = null,
                                                    tint = Color.White,
                                                    modifier = Modifier.padding(10.dp),
                                                )
                                            }
                                        }
                                        Spacer(modifier = Modifier.height(14.dp))
                                        HorizontalDivider(color = Color.White.copy(alpha = 0.2f))
                                        Spacer(modifier = Modifier.height(12.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(
                                                    imageVector = Icons.Rounded.ShoppingBag,
                                                    contentDescription = null,
                                                    tint = Color(0xFF93C5FD),
                                                    modifier = Modifier.size(16.dp),
                                                )
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(
                                                    text = "${data.totalTransaksiHariIni} struk selesai",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = Color.White,
                                                    fontWeight = FontWeight.SemiBold,
                                                )
                                            }
                                            Text(
                                                text = "Laba: ${CurrencyFormatter.format(data.totalKeuntunganHariIni)}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = Color(0xFFA7F3D0),
                                                fontWeight = FontWeight.Bold,
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        item(key = "quick_actions") {
                            AdminSurfaceCard {
                                Column(
                                    modifier = Modifier.padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    SectionHeader(
                                        title = "Aksi Cepat Admin",
                                        subtitle = "Navigasi & kontrol 1-sentuhan",
                                    )
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        QuickActionTile(
                                            label = "Atur Rak",
                                            subtitle = if (state.isApplyingPkm) "Memproses..." else "PKM 4 hari",
                                            icon = Icons.Rounded.Bolt,
                                            tint = Color(0xFF1D4ED8),
                                            isLoading = state.isApplyingPkm,
                                            onClick = { viewModel.onEvent(AdminDashboardEvent.RequestAutoPkm) },
                                            modifier = Modifier.weight(1f),
                                        )
                                        QuickActionTile(
                                            label = "Terima Setor",
                                            subtitle = "${data.setoranPendingCount} antrean",
                                            icon = Icons.Rounded.Payments,
                                            tint = Color(0xFFD97706),
                                            badgeCount = data.setoranPendingCount,
                                            onClick = onNavigateSetoran,
                                            modifier = Modifier.weight(1f),
                                        )
                                        QuickActionTile(
                                            label = "Kulakan",
                                            subtitle = "Restock stok",
                                            icon = Icons.Rounded.AddShoppingCart,
                                            tint = BrandEmeraldDark,
                                            onClick = onNavigateBarang,
                                            modifier = Modifier.weight(1f),
                                        )
                                        QuickActionTile(
                                            label = "Audit Kasir",
                                            subtitle = "Selisih shift",
                                            icon = Icons.Rounded.Scale,
                                            tint = Color(0xFF7E22CE),
                                            onClick = onNavigateSelisih,
                                            modifier = Modifier.weight(1f),
                                        )
                                    }
                                }
                            }
                        }

                        if (data.expiredCount > 0) {
                            item(key = "alert_expired") {
                                OperationalAlertBanner(
                                    title = "Waspada Kadaluarsa: ${data.expiredCount} Barang Lewat Tanggal",
                                    description = "Segera tarik / musnahkan (write-off) dari rak toko dan gudang.",
                                    icon = Icons.Rounded.ErrorOutline,
                                    accentColor = MaterialTheme.colorScheme.error,
                                    containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.6f),
                                    onClick = onNavigateBarang,
                                )
                            }
                        }

                        if (data.nearExpiryCount > 0) {
                            item(key = "alert_near_expiry") {
                                OperationalAlertBanner(
                                    title = "Mendekati Kadaluarsa: ${data.nearExpiryCount} Barang (≤ 30 Hari)",
                                    description = "Prioritaskan rotasi FEFO di etalase toko.",
                                    icon = Icons.Rounded.WarningAmber,
                                    accentColor = Color(0xFFC2410C),
                                    containerColor = Color(0xFFFFF7ED),
                                    onClick = onNavigateBarang,
                                )
                            }
                        }

                        if (data.stokKritisCount > 0) {
                            item(key = "alert_stok_kritis") {
                                OperationalAlertBanner(
                                    title = "Peringatan Restock: ${data.stokKritisCount} Barang Kritis (< PKM)",
                                    description = "Buka rencana belanja PKM untuk pengadaan stok.",
                                    icon = Icons.Rounded.WarningAmber,
                                    accentColor = Color(0xFFB45309),
                                    containerColor = Color(0xFFFFFBEB),
                                    onClick = onNavigatePkm,
                                )
                            }
                        }

                        if (data.setoranPendingCount > 0) {
                            item(key = "alert_setoran_pending") {
                                OperationalAlertBanner(
                                    title = "Uang Kasir Tertahan: ${CurrencyFormatter.format(data.setoranPendingNominal)}",
                                    description = "${data.setoranPendingCount} setoran kasir menunggu validasi admin.",
                                    icon = Icons.Rounded.AccountBalanceWallet,
                                    accentColor = Color(0xFF1D4ED8),
                                    containerColor = Color(0xFFEFF6FF),
                                    onClick = onNavigateSetoran,
                                )
                            }
                        }

                        item(key = "grid_assets_1") {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                StatCard(
                                    title = "Total Anggota",
                                    value = "${data.totalAnggota}",
                                    subtitle = if (data.anggotaLimitKritisCount > 0) "${data.anggotaLimitKritisCount} limit kritis" else "Anggota terdaftar",
                                    icon = Icons.Rounded.Groups,
                                    accentColor = Color(0xFF1D4ED8),
                                    onClick = onNavigateAnggota,
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Aset Barang",
                                    value = CurrencyFormatter.format(data.totalAsetBarang),
                                    subtitle = "Restock bln ini: ${CurrencyFormatter.format(data.totalRestockBulanIni)}",
                                    icon = Icons.Rounded.Inventory2,
                                    accentColor = Color(0xFFD97706),
                                    onClick = onNavigateBarang,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }

                        item(key = "grid_assets_2") {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                StatCard(
                                    title = "Simpanan Saldo",
                                    value = CurrencyFormatter.format(data.totalSaldoAnggota),
                                    subtitle = "Saldo E-Wallet aktif",
                                    icon = Icons.Rounded.AccountBalanceWallet,
                                    accentColor = Color(0xFF4338CA),
                                    onClick = onNavigateAnggota,
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Dana SHU Anggota",
                                    value = CurrencyFormatter.format(data.totalShuTersedia),
                                    subtitle = "Pengurus: ${CurrencyFormatter.format(data.totalShuPengurus)}",
                                    icon = Icons.Rounded.CardGiftcard,
                                    accentColor = Color(0xFFBE185D),
                                    onClick = onNavigateShu,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }

                        item(key = "card_piutang") {
                            val ratioColor = when {
                                realHutangRatio > 80 -> MaterialTheme.colorScheme.error
                                realHutangRatio > 50 -> Color(0xFFD97706)
                                else -> BrandEmeraldDark
                            }
                            val statusLabel = when {
                                realHutangRatio > 80 -> "Risiko tinggi — dorong pelunasan hutang"
                                realHutangRatio > 50 -> "Perlu perhatian likuiditas"
                                else -> "Likuiditas sehat"
                            }
                            AdminSurfaceCard {
                                Column(
                                    modifier = Modifier
                                        .clickable(onClick = onNavigateAnggota)
                                        .padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Column {
                                            Text(
                                                text = "TOTAL PIUTANG ANGGOTA",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = CurrencyFormatter.format(data.totalHutangBeredar),
                                                style = MaterialTheme.typography.headlineSmall,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = MaterialTheme.colorScheme.error,
                                            )
                                        }
                                        Icon(
                                            imageVector = Icons.Rounded.CreditCard,
                                            contentDescription = null,
                                            tint = ratioColor,
                                        )
                                    }
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Text(
                                            text = "Rasio Piutang / Saldo Simpanan",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        Text(
                                            text = "$realHutangRatio%",
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.Bold,
                                            color = ratioColor,
                                        )
                                    }
                                    LinearProgressIndicator(
                                        progress = { (realHutangRatio.coerceIn(0, 100)) / 100f },
                                        color = ratioColor,
                                        trackColor = MaterialTheme.colorScheme.surfaceVariant,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(8.dp)
                                            .clip(RoundedCornerShape(999.dp)),
                                    )
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        StatusBadge(
                                            text = statusLabel,
                                            variant = when {
                                                realHutangRatio > 80 -> BadgeVariant.DANGER
                                                realHutangRatio > 50 -> BadgeVariant.WARNING
                                                else -> BadgeVariant.SUCCESS
                                            },
                                        )
                                        Text(
                                            text = "Cadangan SHU Kop: ${CurrencyFormatter.format(data.totalShuKoperasi)}",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }

                        if (data.stokKritisItems.isNotEmpty()) {
                            item(key = "header_stok_kritis") {
                                SectionHeader(
                                    title = "Top Barang Stok Kritis",
                                    subtitle = "5 barang dengan stok terendah",
                                    actionLabel = "Lihat PKM",
                                    onActionClick = onNavigatePkm,
                                )
                            }
                            items(
                                items = data.stokKritisItems,
                                key = { "kritis_${it.barangId}" },
                            ) { item ->
                                AdminSurfaceCard {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = item.namaBarang,
                                                style = MaterialTheme.typography.titleSmall,
                                                fontWeight = FontWeight.Bold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                            )
                                            Text(
                                                text = "Modal: ${CurrencyFormatter.format(item.hargaModal)} • PKM: ${item.pkm ?: 1} pcs",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                        StatusBadge(
                                            text = "Sisa ${item.stok} pcs",
                                            variant = if (item.stok <= 0) BadgeVariant.DANGER else BadgeVariant.WARNING,
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
private fun QuickActionTile(
    label: String,
    subtitle: String,
    icon: ImageVector,
    tint: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    badgeCount: Int = 0,
    isLoading: Boolean = false,
) {
    Surface(
        onClick = onClick,
        enabled = !isLoading,
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(tint.copy(alpha = 0.14f)),
                contentAlignment = Alignment.Center,
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = tint)
                } else {
                    Icon(imageVector = icon, contentDescription = label, tint = tint, modifier = Modifier.size(18.dp))
                }
            }
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = if (badgeCount > 0) "$badgeCount baru" else subtitle,
                style = MaterialTheme.typography.labelSmall,
                color = if (badgeCount > 0) tint else MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun OperationalAlertBanner(
    title: String,
    description: String,
    icon: ImageVector,
    accentColor: Color,
    containerColor: Color,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        border = BorderStroke(1.dp, accentColor.copy(alpha = 0.35f)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(accentColor.copy(alpha = 0.14f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(imageVector = icon, contentDescription = null, tint = accentColor)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = accentColor,
                )
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                imageVector = Icons.AutoMirrored.Rounded.KeyboardArrowRight,
                contentDescription = null,
                tint = accentColor,
            )
        }
    }
}
