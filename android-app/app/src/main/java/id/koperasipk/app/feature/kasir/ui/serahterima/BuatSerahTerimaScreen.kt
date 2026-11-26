package id.koperasipk.app.feature.kasir.ui.serahterima

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.RupiahTextField
import id.koperasipk.app.core.designsystem.SectionHeader
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.feature.kasir.data.CycleCountBarangDto

@Composable
fun BuatSerahTerimaScreen(
    viewModel: BuatSerahTerimaViewModel,
    onBack: () -> Unit,
    onSuccess: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    var showKasirDialog by remember { mutableStateOf(false) }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is BuatSerahTerimaEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
                BuatSerahTerimaEffect.SubmitSuccess -> onSuccess()
            }
        }
    }

    if (showKasirDialog) {
        AlertDialog(
            onDismissRequest = { showKasirDialog = false },
            title = { Text("Pilih Kasir Penerima Shift") },
            text = {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 320.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (state.kasirList.isEmpty()) {
                        item(key = "no_kasir") {
                            Text("Tidak ada kasir lain yang tersedia.")
                        }
                    } else {
                        items(
                            items = state.kasirList,
                            key = { it.userId },
                        ) { kasir ->
                            Card(
                                onClick = {
                                    viewModel.onEvent(BuatSerahTerimaEvent.SelectKasir(kasir))
                                    showKasirDialog = false
                                },
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (state.selectedKasir?.userId == kasir.userId) {
                                        MaterialTheme.colorScheme.primaryContainer
                                    } else {
                                        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                                    },
                                ),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        text = kasir.namaLengkap.ifBlank { kasir.username },
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        text = "@${kasir.username}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showKasirDialog = false }) {
                    Text("Tutup")
                }
            },
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            KoperasiTopBar(
                title = "Buat Serah Terima",
                subtitle = "Rekonsiliasi kas & stok fisik toko",
                onBack = onBack,
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (!state.isLoading && state.errorMessage == null) {
                Surface(tonalElevation = 3.dp, shadowElevation = 6.dp) {
                    Box(modifier = Modifier.padding(12.dp)) {
                        Button(
                            onClick = { viewModel.onEvent(BuatSerahTerimaEvent.SubmitSerahTerima) },
                            enabled = !state.isSubmitting,
                            shape = RoundedCornerShape(14.dp),
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
                                Icon(Icons.AutoMirrored.Rounded.Send, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Kirim Serah Terima Shift", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        },
    ) { innerPadding ->
        when {
            state.isLoading -> {
                LoadingState(
                    message = "Menyiapkan draft serah terima shift...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(BuatSerahTerimaEvent.LoadDraft) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    val pendingCash = state.pendingCashOrders
                    if (pendingCash != null && pendingCash.count > 0) {
                        item(key = "pending_cash_banner") {
                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.4f),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.4f)),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        text = "${pendingCash.count} Transaksi Tunai Pending (${CurrencyFormatter.format(pendingCash.nominal)})",
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        text = "Dicatat otomatis ke dalam berkas serah terima untuk transparansi kasir penerima.",
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                }
                            }
                        }
                    }

                    item(key = "step1_cash") {
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
                                SectionHeader(
                                    title = "1. Kasir Penerima & Kas Laci",
                                    subtitle = "Kas Sistem: ${CurrencyFormatter.format(state.saldoKasSistem)}",
                                )
                                OutlinedButton(
                                    onClick = { showKasirDialog = true },
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Icon(Icons.Rounded.Person, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = state.selectedKasir?.let {
                                            "${it.namaLengkap.ifBlank { it.username }} (@${it.username})"
                                        } ?: "Pilih Kasir Penerima Shift...",
                                    )
                                }
                                RupiahTextField(
                                    value = state.uangFisikText,
                                    onValueChange = { viewModel.onEvent(BuatSerahTerimaEvent.UangFisikChanged(it)) },
                                    label = "Jumlah Uang Fisik di Laci",
                                    enabled = !state.isSubmitting,
                                )
                                OutlinedTextField(
                                    value = state.catatan,
                                    onValueChange = { viewModel.onEvent(BuatSerahTerimaEvent.CatatanChanged(it)) },
                                    label = { Text("Catatan Kasir (Opsional)") },
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }
                        }
                    }

                    item(key = "step2_header") {
                        SectionHeader(
                            title = "2. Hitungan Fisik Stok Toko",
                            subtitle = "${state.cycleItems.size} item masuk hitungan",
                        )
                    }

                    item(key = "search_add_item") {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = state.searchItemQuery,
                                onValueChange = { viewModel.onEvent(BuatSerahTerimaEvent.SearchItemChanged(it)) },
                                placeholder = { Text("Cari & tambahkan barang ke hitungan...") },
                                leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
                                trailingIcon = {
                                    if (state.searchItemQuery.isNotEmpty()) {
                                        IconButton(onClick = { viewModel.onEvent(BuatSerahTerimaEvent.SearchItemChanged("")) }) {
                                            Icon(Icons.Rounded.Clear, contentDescription = "Hapus")
                                        }
                                    }
                                },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth(),
                            )
                            state.searchResults.forEach { resultItem ->
                                val alreadyInList = state.cycleItemIds.contains(resultItem.barangId)
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 12.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(resultItem.namaBarang, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
                                            Text(
                                                text = "Stok Toko: ${resultItem.stokToko} • Gudang: ${resultItem.stokGudang}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                        if (alreadyInList) {
                                            StatusBadge(text = "Di Daftar", variant = BadgeVariant.SUCCESS)
                                        } else {
                                            OutlinedButton(
                                                onClick = { viewModel.onEvent(BuatSerahTerimaEvent.AddItemToCount(resultItem)) },
                                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                            ) {
                                                Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Tambah")
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    items(
                        items = state.cycleItems,
                        key = { it.barangId },
                    ) { item ->
                        CycleCountItemCard(
                            item = item,
                            inputDigits = state.stokFisikInputs[item.barangId].orEmpty(),
                            isManuallyAdded = state.manuallyAddedIds.contains(item.barangId),
                            onInputChange = { digits ->
                                viewModel.onEvent(BuatSerahTerimaEvent.StokFisikChanged(item.barangId, digits))
                            },
                            onRemove = { viewModel.onEvent(BuatSerahTerimaEvent.RemoveAddedItem(item.barangId)) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CycleCountItemCard(
    item: CycleCountBarangDto,
    inputDigits: String,
    isManuallyAdded: Boolean,
    onInputChange: (String) -> Unit,
    onRemove: () -> Unit,
) {
    val parsedInput = inputDigits.toIntOrNull()
    val selisih = if (parsedInput != null) parsedInput - item.stokToko else null

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(
                            text = item.namaBarang,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false),
                        )
                        item.riskBadge?.takeIf { it.isNotBlank() }?.let { badge ->
                            StatusBadge(
                                text = badge,
                                variant = if (badge.equals("Rokok", ignoreCase = true)) BadgeVariant.DANGER else BadgeVariant.INFO,
                            )
                        }
                    }
                    Text(
                        text = "Toko: ${item.stokToko} pcs • Gudang (Ref): ${item.stokGudang} pcs • PKM: ${item.pkm}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (isManuallyAdded) {
                    IconButton(onClick = onRemove) {
                        Icon(
                            Icons.Rounded.DeleteOutline,
                            contentDescription = "Hapus item",
                            tint = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                if (selisih != null) {
                    StatusBadge(
                        text = when {
                            selisih == 0 -> "Pas"
                            selisih > 0 -> "+$selisih pcs"
                            else -> "$selisih pcs"
                        },
                        variant = when {
                            selisih == 0 -> BadgeVariant.SUCCESS
                            selisih > 0 -> BadgeVariant.INFO
                            else -> BadgeVariant.DANGER
                        },
                    )
                } else {
                    Text(
                        text = "Wajib isi fisik toko",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }

                OutlinedTextField(
                    value = inputDigits,
                    onValueChange = { onInputChange(it.filter(Char::isDigit)) },
                    label = { Text("Fisik (pcs)") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.width(120.dp),
                )
            }
        }
    }
}
