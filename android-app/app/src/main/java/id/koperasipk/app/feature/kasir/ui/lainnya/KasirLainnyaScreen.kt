package id.koperasipk.app.feature.kasir.ui.lainnya

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.LocalAtm
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.SectionHeader

@Immutable
data class KasirMenuEntry(
    val id: String,
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val onClick: () -> Unit,
)

@Composable
fun KasirLainnyaScreen(
    onOpenPembayaranHutang: () -> Unit,
    onOpenTarikTunai: () -> Unit,
    onOpenSerahTerima: () -> Unit,
    onOpenSetoran: () -> Unit,
    onOpenRiwayat: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val layananItems = listOf(
        KasirMenuEntry(
            id = "hutang",
            title = "Pembayaran Hutang",
            subtitle = "Konfirmasi atau tolak cicilan hutang anggota",
            icon = Icons.Rounded.CreditCard,
            onClick = onOpenPembayaranHutang,
        ),
        KasirMenuEntry(
            id = "tarik_tunai",
            title = "Tarik Tunai & SHU",
            subtitle = "Proses antrean tiket & pencairan kas manual",
            icon = Icons.Rounded.LocalAtm,
            onClick = onOpenTarikTunai,
        ),
    )

    val operasionalItems = listOf(
        KasirMenuEntry(
            id = "serah_terima",
            title = "Serah Terima Shift",
            subtitle = "Validasi shift masuk & buat serah terima kasir",
            icon = Icons.Rounded.SwapHoriz,
            onClick = onOpenSerahTerima,
        ),
        KasirMenuEntry(
            id = "setoran",
            title = "Setoran Kasir ke Admin",
            subtitle = "Setor uang kas fisik & lihat riwayat setoran",
            icon = Icons.Rounded.AccountBalance,
            onClick = onOpenSetoran,
        ),
        KasirMenuEntry(
            id = "riwayat",
            title = "Riwayat Transaksi POS",
            subtitle = "Filter tanggal, metode bayar & rincian struk",
            icon = Icons.Rounded.History,
            onClick = onOpenRiwayat,
        ),
    )

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Menu Lainnya",
                subtitle = "Layanan & Operasional Kasir",
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item(key = "header_layanan") {
                SectionHeader(title = "Layanan Anggota")
            }
            items(
                items = layananItems,
                key = { it.id },
            ) { item ->
                KasirMenuCard(entry = item)
            }
            item(key = "header_operasional") {
                SectionHeader(title = "Operasional Toko")
            }
            items(
                items = operasionalItems,
                key = { it.id },
            ) { item ->
                KasirMenuCard(entry = item)
            }
        }
    }
}

@Composable
private fun KasirMenuCard(entry: KasirMenuEntry) {
    Card(
        onClick = entry.onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
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
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                ) {
                    Icon(
                        imageVector = entry.icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier
                            .padding(10.dp)
                            .size(22.dp),
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = entry.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = entry.subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Icon(
                imageVector = Icons.AutoMirrored.Rounded.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
