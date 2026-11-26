package id.koperasipk.app.feature.admin

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CompareArrows
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.Api
import androidx.compose.material.icons.rounded.Approval
import androidx.compose.material.icons.rounded.Badge
import androidx.compose.material.icons.rounded.Checklist
import androidx.compose.material.icons.rounded.LocalAtm
import androidx.compose.material.icons.rounded.ManageAccounts
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import id.koperasipk.app.core.datastore.UserSession
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.ConfirmDialog
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.SectionHeader
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.feature.admin.ui.AdminSurfaceCard

private data class LainnyaMenuEntry(
    val id: String,
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val onClick: () -> Unit,
)

@Composable
fun AdminLainnyaScreen(
    session: UserSession,
    onNavigateShu: () -> Unit,
    onNavigatePkm: () -> Unit,
    onNavigateOpname: () -> Unit,
    onNavigateJabatan: () -> Unit,
    onNavigateSetoran: () -> Unit,
    onNavigateTarikTunai: () -> Unit,
    onNavigateSelisih: () -> Unit,
    onNavigateApiIntegration: () -> Unit,
    onNavigateAkun: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showConfirmLogout by remember { mutableStateOf(false) }

    ConfirmDialog(
        visible = showConfirmLogout,
        title = "Keluar dari Portal Admin?",
        message = "Sesi login akun ${session.username} pada perangkat ini akan diakhiri.",
        confirmLabel = "Keluar",
        isDestructive = true,
        onConfirm = {
            showConfirmLogout = false
            onLogout()
        },
        onDismiss = { showConfirmLogout = false },
    )

    val stokMenu = remember(onNavigateOpname, onNavigatePkm) {
        listOf(
            LainnyaMenuEntry(
                id = "opname",
                title = "Stock Opname Massal",
                subtitle = "Audit stok fisik rak toko dan gudang",
                icon = Icons.Rounded.Checklist,
                onClick = onNavigateOpname,
            ),
            LainnyaMenuEntry(
                id = "pkm",
                title = "Analisis PKM & Kulakan",
                subtitle = "Batas rak, saran order supplier & faktur masuk",
                icon = Icons.AutoMirrored.Rounded.TrendingUp,
                onClick = onNavigatePkm,
            ),
        )
    }

    val keuanganMenu = remember(onNavigateSetoran, onNavigateShu, onNavigateTarikTunai, onNavigateSelisih) {
        listOf(
            LainnyaMenuEntry(
                id = "setoran",
                title = "Persetujuan Setoran Kasir",
                subtitle = "Verifikasi atau tolak setoran tutup shift kasir",
                icon = Icons.Rounded.Approval,
                onClick = onNavigateSetoran,
            ),
            LainnyaMenuEntry(
                id = "shu",
                title = "Manajemen SHU & Topup",
                subtitle = "Pencairan massal, pelunasan hutang, topup & distribusi",
                icon = Icons.Rounded.AccountBalanceWallet,
                onClick = onNavigateShu,
            ),
            LainnyaMenuEntry(
                id = "tariktunai",
                title = "Laporan Tarik Tunai",
                subtitle = "Audit penarikan tunai & pendapatan admin",
                icon = Icons.Rounded.LocalAtm,
                onClick = onNavigateTarikTunai,
            ),
            LainnyaMenuEntry(
                id = "selisih",
                title = "Laporan Selisih Kasir",
                subtitle = "Rekap potongan gaji & detail selisih shift",
                icon = Icons.Rounded.CompareArrows,
                onClick = onNavigateSelisih,
            ),
        )
    }

    val sistemMenu = remember(onNavigateJabatan, onNavigateApiIntegration, onNavigateAkun) {
        listOf(
            LainnyaMenuEntry(
                id = "jabatan",
                title = "Manajemen Jabatan",
                subtitle = "Penugasan dan pencabutan mandat pengurus",
                icon = Icons.Rounded.Badge,
                onClick = onNavigateJabatan,
            ),
            LainnyaMenuEntry(
                id = "apikeys",
                title = "Integrasi API Eksternal",
                subtitle = "API Key v1, contoh integrasi & live gateway tester",
                icon = Icons.Rounded.Api,
                onClick = onNavigateApiIntegration,
            ),
            LainnyaMenuEntry(
                id = "akun",
                title = "Akun Saya",
                subtitle = "Profil pribadi, ganti password & pengaturan akun",
                icon = Icons.Rounded.ManageAccounts,
                onClick = onNavigateAkun,
            ),
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            KoperasiTopBar(
                title = "Modul Admin Lainnya",
                subtitle = "Operasional, keuangan & sistem",
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item(key = "admin_profile_card") {
                AdminSurfaceCard {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(session.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text(
                                text = "@${session.username}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        StatusBadge(
                            text = session.role.uppercase(),
                            variant = BadgeVariant.INFO,
                        )
                    }
                }
            }

            item(key = "header_stok") {
                SectionHeader(title = "Stok & Operasional")
            }
            items(stokMenu, key = { it.id }) { item ->
                LainnyaMenuCard(item)
            }

            item(key = "header_keuangan") {
                SectionHeader(title = "Keuangan & Kasir")
            }
            items(keuanganMenu, key = { it.id }) { item ->
                LainnyaMenuCard(item)
            }

            item(key = "header_sistem") {
                SectionHeader(title = "Sistem & Akun")
            }
            items(sistemMenu, key = { it.id }) { item ->
                LainnyaMenuCard(item)
            }

            item(key = "logout_btn") {
                OutlinedButton(
                    onClick = { showConfirmLogout = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                ) {
                    Icon(Icons.AutoMirrored.Rounded.Logout, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Keluar dari Akun")
                }
            }
        }
    }
}

@Composable
private fun LainnyaMenuCard(entry: LainnyaMenuEntry) {
    AdminSurfaceCard(
        modifier = Modifier.clickable(onClick = entry.onClick),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.7f),
            ) {
                Icon(
                    imageVector = entry.icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSecondaryContainer,
                    modifier = Modifier
                        .padding(10.dp)
                        .size(22.dp),
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = entry.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = entry.subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                imageVector = Icons.AutoMirrored.Rounded.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
