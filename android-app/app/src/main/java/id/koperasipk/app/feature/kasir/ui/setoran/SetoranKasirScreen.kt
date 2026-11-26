package id.koperasipk.app.feature.kasir.ui.setoran

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.RupiahTextField
import id.koperasipk.app.core.designsystem.SectionHeader
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.statusBadgeVariant

@Composable
fun SetoranKasirScreen(
    viewModel: SetoranKasirViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is SetoranKasirEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Setoran Kasir",
                subtitle = "Setor uang kas fisik harian ke Admin",
                onBack = onBack,
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading -> {
                LoadingState(
                    message = "Memuat riwayat setoran...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.riwayat.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(SetoranKasirEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(SetoranKasirEvent.Refresh) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        item(key = "setor_form") {
                            Card(
                                shape = RoundedCornerShape(18.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Text(
                                        text = "Ajukan Setoran Kas ke Admin",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    RupiahTextField(
                                        value = state.nominalText,
                                        onValueChange = { viewModel.onEvent(SetoranKasirEvent.NominalChanged(it)) },
                                        label = "Nominal Setoran",
                                        placeholder = "500000",
                                        errorMessage = state.nominalError,
                                        enabled = !state.isSubmitting,
                                        onImeAction = { viewModel.onEvent(SetoranKasirEvent.SubmitSetoran) },
                                    )
                                    Button(
                                        onClick = { viewModel.onEvent(SetoranKasirEvent.SubmitSetoran) },
                                        enabled = !state.isSubmitting,
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(48.dp),
                                    ) {
                                        if (state.isSubmitting) {
                                            CircularProgressIndicator(
                                                modifier = Modifier.size(20.dp),
                                                strokeWidth = 2.dp,
                                                color = MaterialTheme.colorScheme.onPrimary,
                                            )
                                        } else {
                                            Text("Ajukan Setoran", fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }

                        item(key = "riwayat_header") {
                            SectionHeader(
                                title = "Riwayat Setoran Saya",
                                subtitle = "${state.riwayat.size} pengajuan",
                            )
                        }

                        if (state.riwayat.isEmpty()) {
                            item(key = "empty_setoran") {
                                EmptyState(
                                    title = "Belum ada riwayat setoran",
                                    description = "Setoran kas yang Anda ajukan akan muncul di sini.",
                                    icon = Icons.Rounded.AccountBalance,
                                    modifier = Modifier.height(200.dp),
                                )
                            }
                        } else {
                            items(
                                items = state.riwayat,
                                key = { it.resolvedId },
                            ) { item ->
                                val statusLabel = when (item.status.lowercase()) {
                                    "pending" -> "Menunggu"
                                    "approved" -> "Disetujui"
                                    "rejected" -> "Ditolak"
                                    else -> item.status
                                }
                                Card(
                                    shape = RoundedCornerShape(14.dp),
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
                                        Column {
                                            Text(
                                                text = CurrencyFormatter.format(item.nominal),
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                text = DateFormatter.formatDateTime(item.createdAt),
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
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
