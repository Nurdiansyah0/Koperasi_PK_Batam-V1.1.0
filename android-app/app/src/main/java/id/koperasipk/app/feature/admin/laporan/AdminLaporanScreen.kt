package id.koperasipk.app.feature.admin.laporan

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.FilterList
import androidx.compose.material.icons.rounded.Receipt
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.common.DateFormatter
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.BrandEmeraldDark
import id.koperasipk.app.core.designsystem.ConfirmDialog
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.RupiahTextField
import id.koperasipk.app.core.designsystem.SectionHeader
import id.koperasipk.app.core.designsystem.StatCard
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.statusBadgeVariant
import id.koperasipk.app.feature.admin.data.AnalisisKesehatanDto
import id.koperasipk.app.feature.admin.data.BreakdownPembayaranDto
import id.koperasipk.app.feature.admin.data.CashAdjustmentDto
import id.koperasipk.app.feature.admin.data.KasirDropdownDto
import id.koperasipk.app.feature.admin.data.LaporanSummaryDto
import id.koperasipk.app.feature.admin.data.LaporanTransaksiItemDto
import id.koperasipk.app.feature.admin.data.LaporanTransaksiResponse
import id.koperasipk.app.feature.admin.data.PengeluaranDto
import id.koperasipk.app.feature.admin.ui.AdminPaginationFooter
import id.koperasipk.app.feature.admin.ui.AdminSearchField
import id.koperasipk.app.feature.admin.ui.AdminSurfaceCard
import java.util.Locale

@Composable
fun AdminLaporanScreen(
    viewModel: AdminLaporanViewModel,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AdminLaporanEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    ConfirmDialog(
        visible = state.deletePengeluaranTarget != null,
        title = "Hapus Pengeluaran?",
        message = state.deletePengeluaranTarget?.let {
            "Pengeluaran \"${it.namaPengeluaran}\" sebesar ${CurrencyFormatter.format(it.nominal)} akan dihapus permanen dari pembukuan."
        } ?: "",
        confirmLabel = "Hapus",
        isDestructive = true,
        isLoading = state.isSubmitting,
        onConfirm = { viewModel.onEvent(AdminLaporanEvent.ConfirmDeletePengeluaran) },
        onDismiss = { viewModel.onEvent(AdminLaporanEvent.DismissDeletePengeluaran) },
    )

    if (state.showFilterDialog) {
        LaporanFilterDialog(
            state = state,
            onDismiss = { viewModel.onEvent(AdminLaporanEvent.DismissFilterDialog) },
            onReset = { viewModel.onEvent(AdminLaporanEvent.ResetFilters) },
            onApply = { start, end, metode, pembeli, kasir, perPage, custom ->
                viewModel.onEvent(
                    AdminLaporanEvent.ApplyFilters(
                        tanggalAwal = start,
                        tanggalAkhir = end,
                        metodeFilter = metode,
                        pembeliFilter = pembeli,
                        kasirFilter = kasir,
                        perPage = perPage,
                        isCustomDate = custom,
                    ),
                )
            },
        )
    }

    state.selectedReceipt?.let { receipt ->
        ReceiptDetailDialog(
            item = receipt,
            kasirName = resolveKasirName(receipt, state.kasirNameMap),
            onDismiss = { viewModel.onEvent(AdminLaporanEvent.SelectReceipt(null)) },
        )
    }

    if (state.showPengeluaranDialog) {
        PengeluaranFormDialog(
            state = state,
            onUpdate = { nama, nominal, tgl, kat, ket ->
                viewModel.onEvent(
                    AdminLaporanEvent.UpdatePengeluaranForm(
                        nama = nama,
                        nominalDigits = nominal,
                        tanggal = tgl,
                        kategori = kat,
                        keterangan = ket,
                    ),
                )
            },
            onSubmit = { viewModel.onEvent(AdminLaporanEvent.SubmitPengeluaran) },
            onDismiss = { viewModel.onEvent(AdminLaporanEvent.DismissPengeluaranDialog) },
        )
    }

    if (state.showCashAdjDialog) {
        CashAdjustmentFormDialog(
            state = state,
            onUpdate = { date, type, dir, src, amt, reason, ref ->
                viewModel.onEvent(
                    AdminLaporanEvent.UpdateCashAdjForm(
                        date = date,
                        type = type,
                        direction = dir,
                        source = src,
                        amountDigits = amt,
                        reason = reason,
                        reference = ref,
                    ),
                )
            },
            onSubmit = { viewModel.onEvent(AdminLaporanEvent.SubmitCashAdj) },
            onDismiss = { viewModel.onEvent(AdminLaporanEvent.DismissCashAdjDialog) },
        )
    }

    val subtitleText = remember(state.tanggalAwal, state.tanggalAkhir, state.selectedPreset) {
        if (state.tanggalAwal.isBlank() && state.tanggalAkhir.isBlank()) {
            "Semua Periode"
        } else {
            "${DateFormatter.formatShortDate(state.tanggalAwal)} - ${DateFormatter.formatShortDate(state.tanggalAkhir)}"
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            KoperasiTopBar(
                title = "Laporan Keuangan",
                subtitle = subtitleText,
                actions = {
                    IconButton(onClick = { viewModel.onEvent(AdminLaporanEvent.OpenFilterDialog) }) {
                        Icon(
                            imageVector = Icons.Rounded.FilterList,
                            contentDescription = "Filter Laporan",
                            tint = if (state.activeFilterCount > 0) {
                                MaterialTheme.colorScheme.secondary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            },
                        )
                    }
                    IconButton(onClick = { viewModel.onEvent(AdminLaporanEvent.Refresh) }) {
                        Icon(Icons.Rounded.Refresh, contentDescription = "Muat ulang")
                    }
                },
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                LaporanDatePreset.entries.forEach { preset ->
                    FilterChip(
                        selected = state.selectedPreset == preset,
                        onClick = { viewModel.onEvent(AdminLaporanEvent.SelectPreset(preset)) },
                        label = { Text(preset.label) },
                    )
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                LaporanTab.entries.forEach { tab ->
                    FilterChip(
                        selected = state.activeTab == tab,
                        onClick = { viewModel.onEvent(AdminLaporanEvent.SelectTab(tab)) },
                        label = { Text(tab.label) },
                    )
                }
            }

            val report = state.report
            when {
                state.isLoading && report == null -> {
                    LoadingState(message = "Menyusun laporan keuangan & akuntansi...")
                }
                state.errorMessage != null && report == null -> {
                    ErrorState(
                        message = state.errorMessage.orEmpty(),
                        onRetry = { viewModel.onEvent(AdminLaporanEvent.Load) },
                    )
                }
                report != null -> {
                    KoperasiPullToRefreshBox(
                        isRefreshing = state.isRefreshing,
                        onRefresh = { viewModel.onEvent(AdminLaporanEvent.Refresh) },
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        LaporanTabContent(
                            state = state,
                            report = report,
                            onEvent = viewModel::onEvent,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LaporanTabContent(
    state: AdminLaporanUiState,
    report: LaporanTransaksiResponse,
    onEvent: (AdminLaporanEvent) -> Unit,
) {
    val summary = report.summary ?: LaporanSummaryDto()
    val health = report.analisisKesehatan ?: summary.analisisKesehatan

    when (state.activeTab) {
        LaporanTab.RINGKASAN -> {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item(key = "hero_kpis") {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        StatCard(
                            title = "Omset Penjualan",
                            value = CurrencyFormatter.format(summary.totalPendapatan),
                            subtitle = "${summary.totalTransaksi} struk",
                            icon = Icons.AutoMirrored.Rounded.TrendingUp,
                            modifier = Modifier.weight(1f),
                        )
                        StatCard(
                            title = "Laba Bersih",
                            value = CurrencyFormatter.format(summary.totalLabaBersih),
                            subtitle = "Laba kotor ${CurrencyFormatter.format(summary.totalLabaKotor)}",
                            accentColor = if (summary.totalLabaBersih >= 0) BrandEmeraldDark else MaterialTheme.colorScheme.error,
                            icon = Icons.Rounded.AccountBalance,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                if (health != null) {
                    item(key = "health_card") {
                        KesehatanKoperasiCard(health)
                    }
                }

                item(key = "laba_rugi_card") {
                    AdminSurfaceCard {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Text(
                                text = "Laporan Laba Rugi (Akuntansi)",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                            )
                            HorizontalDivider()
                            KeyValueRow("Pendapatan Kotor (Omset)", CurrencyFormatter.format(summary.totalPendapatan))
                            KeyValueRow("Harga Pokok Penjualan (HPP)", "- ${CurrencyFormatter.format(summary.totalHpp)}")
                            KeyValueRow(
                                "Laba Kotor (Gross Profit)",
                                CurrencyFormatter.format(summary.totalLabaKotor),
                                valueColor = BrandEmeraldDark,
                                bold = true,
                            )
                            KeyValueRow("Beban Operasional", "- ${CurrencyFormatter.format(summary.totalBebanOperasional)}")
                            HorizontalDivider()
                            KeyValueRow(
                                "Laba Bersih Usaha",
                                CurrencyFormatter.format(summary.totalLabaBersih),
                                valueColor = if (summary.totalLabaBersih >= 0) BrandEmeraldDark else MaterialTheme.colorScheme.error,
                                bold = true,
                            )
                        }
                    }
                }

                item(key = "arus_kas_card") {
                    AdminSurfaceCard {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Text(
                                text = "Arus Kas & Modal Kerja",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                            )
                            HorizontalDivider()
                            KeyValueRow(
                                "Net Cash Flow",
                                CurrencyFormatter.format(summary.netCashFlow),
                                valueColor = if (summary.netCashFlow >= 0) BrandEmeraldDark else MaterialTheme.colorScheme.error,
                                bold = true,
                            )
                            KeyValueRow("Pembelian Stok (Restock)", CurrencyFormatter.format(summary.totalPembelianInventory))
                            KeyValueRow("Penyesuaian Kas Historis", CurrencyFormatter.format(summary.historicalCashAdjustment))
                            KeyValueRow("Estimasi Nilai Persediaan", CurrencyFormatter.format(summary.estimatedInventoryValue))
                            KeyValueRow("Piutang / Hutang Anggota", CurrencyFormatter.format(summary.totalHutang))
                            KeyValueRow("Rata-rata Nilai Struk", CurrencyFormatter.format(summary.avgTransaksi))
                            KeyValueRow("Omset Anggota", CurrencyFormatter.format(summary.omsetAnggota))
                            KeyValueRow("Omset Pelanggan Umum", CurrencyFormatter.format(summary.omsetUmum))
                        }
                    }
                }

                item(key = "alokasi_shu_card") {
                    AdminSurfaceCard {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Text(
                                text = "Proyeksi Pembagian SHU Usaha",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                            )
                            HorizontalDivider()
                            KeyValueRow("Porsi Anggota (60%)", CurrencyFormatter.format(summary.shuAnggota60), valueColor = BrandEmeraldDark, bold = true)
                            KeyValueRow("Dana Cadangan (30%)", CurrencyFormatter.format(summary.shuCadangan30))
                            KeyValueRow("Jasa Pengurus & Kasir (10%)", CurrencyFormatter.format(summary.shuPengurus10))
                        }
                    }
                }
            }
        }

        LaporanTab.TRANSAKSI -> {
            val totalServer = report.pagination?.total ?: report.data.size
            val lastPage = report.pagination?.lastPage ?: 1
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item(key = "trx_search") {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AdminSearchField(
                            query = state.searchQuery,
                            onQueryChange = { onEvent(AdminLaporanEvent.UpdateSearchQuery(it)) },
                            placeholder = "Cari ID struk, anggota, barang...",
                            modifier = Modifier.weight(1f),
                        )
                        Button(onClick = { onEvent(AdminLaporanEvent.SubmitSearch) }) {
                            Text("Cari")
                        }
                    }
                }

                if (report.data.isEmpty()) {
                    item(key = "trx_empty") {
                        EmptyState(
                            title = "Belum Ada Transaksi",
                            description = "Tidak ada transaksi yang cocok dengan filter dan periode terpilih.",
                            icon = Icons.Rounded.Receipt,
                        )
                    }
                } else {
                    items(report.data, key = { it.transaksiId }) { trx ->
                        AdminSurfaceCard(
                            modifier = Modifier.clickable {
                                onEvent(AdminLaporanEvent.SelectReceipt(trx))
                            },
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
                                        text = "#${trx.transaksiId} • ${trx.namaAnggota}",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.weight(1f),
                                    )
                                    StatusBadge(
                                        text = trx.metodePembayaran.uppercase(Locale.getDefault()),
                                        variant = statusBadgeVariant(trx.metodePembayaran),
                                    )
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(
                                        text = "${DateFormatter.formatDateTime(trx.createdAt)} • Kasir: ${resolveKasirName(trx, state.kasirNameMap)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(
                                        text = "${trx.itemsCount} item • Margin ${CurrencyFormatter.format(trx.totalKeuntungan)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = BrandEmeraldDark,
                                    )
                                    Text(
                                        text = CurrencyFormatter.format(trx.totalHarga),
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }
                        }
                    }

                    if (lastPage > 1 || totalServer > state.perPage) {
                        item(key = "trx_pagination") {
                            AdminPaginationFooter(
                                currentPage = report.pagination?.currentPage ?: state.page,
                                totalPages = lastPage,
                                totalItems = totalServer,
                                onPrevPage = { onEvent(AdminLaporanEvent.SetPage(state.page - 1)) },
                                onNextPage = { onEvent(AdminLaporanEvent.SetPage(state.page + 1)) },
                            )
                        }
                    }
                }
            }
        }

        LaporanTab.PENGELUARAN -> {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item(key = "pengeluaran_header") {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        StatCard(
                            title = "Total Beban Operasional",
                            value = CurrencyFormatter.format(summary.totalBebanOperasional),
                            subtitle = "${state.pengeluaranList.size} catatan pada periode ini",
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Button(
                            onClick = { onEvent(AdminLaporanEvent.OpenPengeluaranDialog) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Icon(Icons.Rounded.Add, contentDescription = null)
                            Spacer(modifier = Modifier.padding(horizontal = 4.dp))
                            Text("Catat Pengeluaran Operasional")
                        }
                    }
                }

                if (state.pagedPengeluaran.isEmpty()) {
                    item(key = "pengeluaran_empty") {
                        EmptyState(
                            title = "Belum Ada Pengeluaran",
                            description = "Catatan pengeluaran operasional pada periode ini masih kosong.",
                        )
                    }
                } else {
                    items(state.pagedPengeluaran, key = { it.pengeluaranId }) { item ->
                        PengeluaranItemCard(
                            item = item,
                            onDelete = { onEvent(AdminLaporanEvent.RequestDeletePengeluaran(item)) },
                        )
                    }
                    if (state.pengeluaranTotalPages > 1) {
                        item(key = "pengeluaran_pagination") {
                            AdminPaginationFooter(
                                currentPage = state.pengeluaranPage,
                                totalPages = state.pengeluaranTotalPages,
                                totalItems = state.pengeluaranList.size,
                                onPrevPage = { onEvent(AdminLaporanEvent.SetPengeluaranPage(state.pengeluaranPage - 1)) },
                                onNextPage = { onEvent(AdminLaporanEvent.SetPengeluaranPage(state.pengeluaranPage + 1)) },
                            )
                        }
                    }
                }
            }
        }

        LaporanTab.PENYESUAIAN -> {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item(key = "cash_adj_header") {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        StatCard(
                            title = "Penyesuaian Kas Historis",
                            value = CurrencyFormatter.format(summary.historicalCashAdjustment),
                            subtitle = "${state.cashAdjustmentList.size} entri buku penyesuaian",
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Button(
                            onClick = { onEvent(AdminLaporanEvent.OpenCashAdjDialog) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Icon(Icons.Rounded.Add, contentDescription = null)
                            Spacer(modifier = Modifier.padding(horizontal = 4.dp))
                            Text("Tambah Penyesuaian Kas")
                        }
                    }
                }

                if (state.pagedCashAdjustments.isEmpty()) {
                    item(key = "cash_adj_empty") {
                        EmptyState(
                            title = "Belum Ada Penyesuaian Kas",
                            description = "Penyesuaian kas historis atau rekonsiliasi saldo kas akan tampil di sini.",
                        )
                    }
                } else {
                    items(state.pagedCashAdjustments, key = { it.adjustmentId }) { adj ->
                        CashAdjustmentCard(adj)
                    }
                    if (state.cashAdjTotalPages > 1) {
                        item(key = "cash_adj_pagination") {
                            AdminPaginationFooter(
                                currentPage = state.cashAdjPage,
                                totalPages = state.cashAdjTotalPages,
                                totalItems = state.cashAdjustmentList.size,
                                onPrevPage = { onEvent(AdminLaporanEvent.SetCashAdjPage(state.cashAdjPage - 1)) },
                                onNextPage = { onEvent(AdminLaporanEvent.SetCashAdjPage(state.cashAdjPage + 1)) },
                            )
                        }
                    }
                }
            }
        }

        LaporanTab.KINERJA -> {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                report.breakdownPembayaran?.let { bp ->
                    item(key = "breakdown_pembayaran") {
                        BreakdownPembayaranCard(bp)
                    }
                }

                item(key = "header_kasir") {
                    SectionHeader(
                        title = "Kinerja Per Kasir",
                        subtitle = "${report.breakdownKasir.size} kasir aktif pada periode",
                    )
                }
                items(
                    items = report.breakdownKasir,
                    key = { "${it.kasirId ?: -1}_${it.kasirUsername}" },
                ) { kasir ->
                    AdminSurfaceCard {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(kasir.kasirUsername, fontWeight = FontWeight.Bold)
                                Text(
                                    "${kasir.totalTransaksi} transaksi",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(CurrencyFormatter.format(kasir.totalOmset), fontWeight = FontWeight.Bold)
                                Text(
                                    "Laba ${CurrencyFormatter.format(kasir.totalLaba)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = BrandEmeraldDark,
                                )
                            }
                        }
                    }
                }

                if (report.rekapBulanan.isNotEmpty()) {
                    item(key = "header_bulanan") {
                        SectionHeader(title = "Rekap Bulanan", subtitle = "Tren omset dan piutang")
                    }
                    items(report.rekapBulanan, key = { it.periodeBulan }) { bln ->
                        AdminSurfaceCard {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(bln.periodeBulan, fontWeight = FontWeight.Bold)
                                    Text("${bln.totalTransaksi} struk", style = MaterialTheme.typography.bodySmall)
                                }
                                KeyValueRow("Omset", CurrencyFormatter.format(bln.omsetBulan))
                                KeyValueRow("Margin", CurrencyFormatter.format(bln.marginBulan), valueColor = BrandEmeraldDark)
                                KeyValueRow("Piutang", CurrencyFormatter.format(bln.piutangBulan))
                            }
                        }
                    }
                }

                item(key = "header_harian") {
                    SectionHeader(
                        title = "Transaksi Harian",
                        subtitle = "${state.harianList.size} hari tercatat",
                    )
                }
                items(state.pagedHarian, key = { it.tanggal }) { h ->
                    AdminSurfaceCard {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(DateFormatter.formatShortDate(h.tanggal), fontWeight = FontWeight.Bold)
                                Text(
                                    "${h.jumlahTransaksi} transaksi",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(CurrencyFormatter.format(h.totalPendapatan), fontWeight = FontWeight.Bold)
                                Text(
                                    "Margin ${CurrencyFormatter.format(h.totalKeuntungan)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = BrandEmeraldDark,
                                )
                            }
                        }
                    }
                }
                if (state.harianTotalPages > 1) {
                    item(key = "harian_pagination") {
                        AdminPaginationFooter(
                            currentPage = state.harianPage,
                            totalPages = state.harianTotalPages,
                            totalItems = state.harianList.size,
                            onPrevPage = { onEvent(AdminLaporanEvent.SetHarianPage(state.harianPage - 1)) },
                            onNextPage = { onEvent(AdminLaporanEvent.SetHarianPage(state.harianPage + 1)) },
                        )
                    }
                }
            }
        }

        LaporanTab.REKAP -> {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item(key = "rekap_controls") {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            RekapSubTab.entries.forEach { sub ->
                                FilterChip(
                                    selected = state.activeRekapSubTab == sub,
                                    onClick = { onEvent(AdminLaporanEvent.SelectRekapSubTab(sub)) },
                                    label = { Text(sub.label) },
                                )
                            }
                        }
                        AdminSearchField(
                            query = state.rekapSearchQuery,
                            onQueryChange = { onEvent(AdminLaporanEvent.UpdateRekapSearch(it)) },
                            placeholder = if (state.activeRekapSubTab == RekapSubTab.ANGGOTA) {
                                "Cari nama anggota..."
                            } else {
                                "Cari nama barang..."
                            },
                        )
                    }
                }

                if (state.activeRekapSubTab == RekapSubTab.ANGGOTA) {
                    if (state.pagedRekapAnggota.isEmpty()) {
                        item(key = "rekap_anggota_empty") {
                            EmptyState(
                                title = "Data SHU Anggota Kosong",
                                description = "Belum ada pembelanjaan anggota pada periode terpilih.",
                            )
                        }
                    } else {
                        items(state.pagedRekapAnggota, key = { it.anggotaId }) { row ->
                            AdminSurfaceCard {
                                Column(
                                    modifier = Modifier.padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            text = row.namaLengkap,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.weight(1f),
                                        )
                                        StatusBadge(
                                            text = String.format(Locale.US, "%.1f%%", row.porsiPersen),
                                            variant = BadgeVariant.INFO,
                                        )
                                    }
                                    KeyValueRow("Frekuensi Belanja", "${row.frekuensiBelanja}x")
                                    KeyValueRow("Total Belanja", CurrencyFormatter.format(row.totalBelanja))
                                    KeyValueRow("Saldo Hutang", CurrencyFormatter.format(row.saldoHutangKoperasi))
                                    KeyValueRow(
                                        "Hak SHU",
                                        CurrencyFormatter.format(row.hakShu),
                                        valueColor = BrandEmeraldDark,
                                        bold = true,
                                    )
                                }
                            }
                        }
                    }
                } else {
                    if (state.pagedRekapBarang.isEmpty()) {
                        item(key = "rekap_barang_empty") {
                            EmptyState(
                                title = "Data Penjualan Barang Kosong",
                                description = "Belum ada penjualan barang pada periode terpilih.",
                            )
                        }
                    } else {
                        items(state.pagedRekapBarang, key = { it.barangId }) { row ->
                            AdminSurfaceCard {
                                Column(
                                    modifier = Modifier.padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            text = row.namaBarang,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.weight(1f),
                                        )
                                        StatusBadge(
                                            text = "${row.qtyTerjual} terjual",
                                            variant = BadgeVariant.DEFAULT,
                                        )
                                    }
                                    KeyValueRow("Omset", CurrencyFormatter.format(row.revenue))
                                    KeyValueRow("HPP Historis", CurrencyFormatter.format(row.historicalHpp))
                                    KeyValueRow(
                                        "Laba Kotor",
                                        CurrencyFormatter.format(row.grossProfit),
                                        valueColor = BrandEmeraldDark,
                                        bold = true,
                                    )
                                }
                            }
                        }
                    }
                }

                if (state.rekapTotalPages > 1) {
                    item(key = "rekap_pagination") {
                        AdminPaginationFooter(
                            currentPage = state.rekapPage,
                            totalPages = state.rekapTotalPages,
                            totalItems = state.rekapTotalItems,
                            onPrevPage = { onEvent(AdminLaporanEvent.SetRekapPage(state.rekapPage - 1)) },
                            onNextPage = { onEvent(AdminLaporanEvent.SetRekapPage(state.rekapPage + 1)) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun KesehatanKoperasiCard(health: AnalisisKesehatanDto) {
    val variant = when (health.badgeColor.lowercase(Locale.getDefault())) {
        "green", "emerald" -> BadgeVariant.SUCCESS
        "yellow", "amber", "orange" -> BadgeVariant.WARNING
        "red" -> BadgeVariant.DANGER
        else -> BadgeVariant.INFO
    }
    AdminSurfaceCard {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Kesehatan Koperasi", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                StatusBadge(
                    text = "${health.skorKesehatan}/100 • ${health.statusKesehatan.ifBlank { "Normal" }}",
                    variant = variant,
                )
            }
            if (health.kesimpulanEvaluasi.isNotBlank()) {
                Text(
                    text = health.kesimpulanEvaluasi,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            HorizontalDivider()
            KeyValueRow(
                "Partisipasi Anggota",
                "${health.jumlahAnggotaAktif}/${health.totalAnggotaTerdaftar} (${formatPercent(health.rasioPartisipasiPersen)})",
            )
            KeyValueRow("Rasio Piutang / Omset", formatPercent(health.rasioPiutangOmsetPersen))
            KeyValueRow("Cash Coverage Ratio", formatPercent(health.cashCoverageRatioPersen))
            KeyValueRow("Gross Profit Margin", formatPercent(health.grossProfitMarginPersen))
            KeyValueRow("Net Profit Margin", formatPercent(health.netProfitMarginPersen))
            KeyValueRow("Operating Expense Ratio", formatPercent(health.operatingExpenseRatioPersen))
        }
    }
}

@Composable
private fun BreakdownPembayaranCard(bp: BreakdownPembayaranDto) {
    val items = listOf(
        "Cash / Tunai" to bp.cash,
        "E-Wallet" to bp.ewallet,
        "QRIS" to bp.qr,
        "Transfer Bank" to bp.transfer,
        "Hutang Anggota" to bp.hutang,
    )
    val total = items.sumOf { it.second }.coerceAtLeast(1.0)
    AdminSurfaceCard {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = "Komposisi Metode Pembayaran",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
            )
            items.forEach { (label, amount) ->
                val ratio = (amount / total).toFloat().coerceIn(0f, 1f)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(label, style = MaterialTheme.typography.bodySmall)
                        Text(
                            "${CurrencyFormatter.format(amount)} (${String.format(Locale.US, "%.1f%%", ratio * 100f)})",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                    LinearProgressIndicator(
                        progress = { ratio },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun PengeluaranItemCard(
    item: PengeluaranDto,
    onDelete: () -> Unit,
) {
    AdminSurfaceCard {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(item.namaPengeluaran, fontWeight = FontWeight.Bold)
                    item.kategori?.takeIf { it.isNotBlank() }?.let { kat ->
                        StatusBadge(text = kat, variant = BadgeVariant.DEFAULT)
                    }
                }
                Text(
                    text = DateFormatter.formatShortDate(item.tanggal),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                item.keterangan?.takeIf { it.isNotBlank() }?.let { ket ->
                    Text(
                        text = ket,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = CurrencyFormatter.format(item.nominal),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.error,
                )
                IconButton(onClick = onDelete) {
                    Icon(
                        imageVector = Icons.Rounded.DeleteOutline,
                        contentDescription = "Hapus pengeluaran",
                        tint = MaterialTheme.colorScheme.error,
                    )
                }
            }
        }
    }
}

@Composable
private fun CashAdjustmentCard(adj: CashAdjustmentDto) {
    val isIn = adj.direction.equals("IN", ignoreCase = true)
    AdminSurfaceCard {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    StatusBadge(
                        text = if (isIn) "MASUK (IN)" else "KELUAR (OUT)",
                        variant = if (isIn) BadgeVariant.SUCCESS else BadgeVariant.DANGER,
                    )
                    StatusBadge(text = adj.source, variant = BadgeVariant.INFO)
                }
                Text(
                    text = (if (isIn) "+ " else "- ") + CurrencyFormatter.format(adj.amount),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = if (isIn) BrandEmeraldDark else MaterialTheme.colorScheme.error,
                )
            }
            Text(adj.reason, fontWeight = FontWeight.SemiBold)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "${DateFormatter.formatShortDate(adj.adjustmentDate)} • ${adj.type}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            val meta = listOfNotNull(
                adj.reference?.takeIf { it.isNotBlank() }?.let { "Ref: $it" },
                adj.creator?.username?.takeIf { it.isNotBlank() }?.let { "Oleh: $it" },
            ).joinToString(" • ")
            if (meta.isNotBlank()) {
                Text(
                    text = meta,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun LaporanFilterDialog(
    state: AdminLaporanUiState,
    onDismiss: () -> Unit,
    onReset: () -> Unit,
    onApply: (String, String, String, String, String, Int, Boolean) -> Unit,
) {
    var start by remember(state) { mutableStateOf(state.tanggalAwal) }
    var end by remember(state) { mutableStateOf(state.tanggalAkhir) }
    var metode by remember(state) { mutableStateOf(state.metodeFilter) }
    var pembeli by remember(state) { mutableStateOf(state.pembeliFilter) }
    var kasir by remember(state) { mutableStateOf(state.kasirFilter) }
    var perPage by remember(state) { mutableIntStateOf(state.perPage) }
    val dateChanged = start != state.tanggalAwal || end != state.tanggalAkhir

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Filter Laporan", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 460.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedTextField(
                    value = start,
                    onValueChange = { start = it },
                    label = { Text("Tanggal Awal (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = end,
                    onValueChange = { end = it },
                    label = { Text("Tanggal Akhir (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("Metode Pembayaran", style = MaterialTheme.typography.labelLarge)
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    listOf("all" to "Semua", "cash" to "Cash", "ewallet" to "E-Wallet", "qr" to "QRIS", "transfer" to "Transfer", "hutang" to "Hutang").forEach { (k, label) ->
                        FilterChip(
                            selected = metode == k,
                            onClick = { metode = k },
                            label = { Text(label) },
                        )
                    }
                }
                Text("Tipe Pelanggan", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("all" to "Semua", "anggota" to "Anggota", "umum" to "Umum").forEach { (k, label) ->
                        FilterChip(
                            selected = pembeli == k,
                            onClick = { pembeli = k },
                            label = { Text(label) },
                        )
                    }
                }
                if (state.kasirList.isNotEmpty()) {
                    Text("Kasir", style = MaterialTheme.typography.labelLarge)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        FilterChip(
                            selected = kasir == "all",
                            onClick = { kasir = "all" },
                            label = { Text("Semua Kasir") },
                        )
                        state.kasirList.forEach { k: KasirDropdownDto ->
                            val idStr = k.userId.toString()
                            FilterChip(
                                selected = kasir == idStr,
                                onClick = { kasir = idStr },
                                label = { Text(k.namaLengkap?.takeIf { it.isNotBlank() } ?: k.username) },
                            )
                        }
                    }
                }
                Text("Baris Per Halaman", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(20, 50, 100).forEach { size ->
                        FilterChip(
                            selected = perPage == size,
                            onClick = { perPage = size },
                            label = { Text("$size") },
                        )
                    }
                }
            }
        },
        dismissButton = {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                TextButton(onClick = onReset) { Text("Reset") }
                TextButton(onClick = onDismiss) { Text("Batal") }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onApply(
                        start,
                        end,
                        metode,
                        pembeli,
                        kasir,
                        perPage,
                        dateChanged || state.selectedPreset == LaporanDatePreset.CUSTOM,
                    )
                },
            ) {
                Text("Terapkan")
            }
        },
    )
}

@Composable
private fun ReceiptDetailDialog(
    item: LaporanTransaksiItemDto,
    kasirName: String,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Struk #${item.transaksiId}", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 420.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                KeyValueRow("Pembeli", item.namaAnggota)
                KeyValueRow("Kasir", kasirName)
                KeyValueRow("Tanggal", DateFormatter.formatDateTime(item.createdAt))
                KeyValueRow("Metode", item.metodePembayaran.uppercase(Locale.getDefault()))
                HorizontalDivider()
                item.details.forEach { d ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(d.namaBarang, fontWeight = FontWeight.SemiBold)
                            Text(
                                "${d.jumlah} x ${CurrencyFormatter.format(d.hargaSatuan)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(CurrencyFormatter.format(d.subtotal), fontWeight = FontWeight.SemiBold)
                    }
                }
                HorizontalDivider()
                KeyValueRow("Total HPP", CurrencyFormatter.format(item.modalHpp))
                KeyValueRow("Keuntungan", CurrencyFormatter.format(item.totalKeuntungan), valueColor = BrandEmeraldDark)
                KeyValueRow("Total Tagihan", CurrencyFormatter.format(item.totalHarga), bold = true)
            }
        },
        confirmButton = {
            Button(onClick = onDismiss) { Text("Tutup") }
        },
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PengeluaranFormDialog(
    state: AdminLaporanUiState,
    onUpdate: (String?, String?, String?, String?, String?) -> Unit,
    onSubmit: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Catat Pengeluaran Operasional", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 440.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedTextField(
                    value = state.pengeluaranNama,
                    onValueChange = { onUpdate(it, null, null, null, null) },
                    label = { Text("Nama Pengeluaran") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                RupiahTextField(
                    value = state.pengeluaranNominalDigits,
                    onValueChange = { onUpdate(null, it, null, null, null) },
                    label = "Nominal Pengeluaran",
                    enabled = !state.isSubmitting,
                )
                OutlinedTextField(
                    value = state.pengeluaranTanggal,
                    onValueChange = { onUpdate(null, null, it, null, null) },
                    label = { Text("Tanggal (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("Kategori", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("Operasional", "Perlengkapan", "Listrik & Internet", "Lainnya").forEach { kat ->
                        FilterChip(
                            selected = state.pengeluaranKategori == kat,
                            onClick = { onUpdate(null, null, null, kat, null) },
                            label = { Text(kat) },
                        )
                    }
                }
                OutlinedTextField(
                    value = state.pengeluaranKeterangan,
                    onValueChange = { onUpdate(null, null, null, null, it) },
                    label = { Text("Keterangan (Opsional)") },
                    modifier = Modifier.fillMaxWidth(),
                )
                state.pengeluaranError?.let { err ->
                    Text(err, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !state.isSubmitting) { Text("Batal") }
        },
        confirmButton = {
            Button(onClick = onSubmit, enabled = !state.isSubmitting) {
                Text(if (state.isSubmitting) "Menyimpan..." else "Simpan")
            }
        },
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CashAdjustmentFormDialog(
    state: AdminLaporanUiState,
    onUpdate: (String?, String?, String?, String?, String?, String?, String?) -> Unit,
    onSubmit: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Tambah Penyesuaian Kas", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 460.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedTextField(
                    value = state.cashAdjDate,
                    onValueChange = { onUpdate(it, null, null, null, null, null, null) },
                    label = { Text("Tanggal Penyesuaian (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("Jenis Penyesuaian", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(
                        "HISTORICAL_INVENTORY_PURCHASE" to "Stok Historis",
                        "CASH_RECONCILIATION" to "Rekonsiliasi Kas",
                    ).forEach { (k, label) ->
                        FilterChip(
                            selected = state.cashAdjType == k,
                            onClick = { onUpdate(null, k, null, null, null, null, null) },
                            label = { Text(label) },
                        )
                    }
                }
                Text("Arah Mutasi & Sumber", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("OUT" to "Kas Keluar (OUT)", "IN" to "Kas Masuk (IN)").forEach { (k, label) ->
                        FilterChip(
                            selected = state.cashAdjDirection == k,
                            onClick = { onUpdate(null, null, k, null, null, null, null) },
                            label = { Text(label) },
                        )
                    }
                    listOf("CASH" to "Tunai", "BANK" to "Bank").forEach { (k, label) ->
                        FilterChip(
                            selected = state.cashAdjSource == k,
                            onClick = { onUpdate(null, null, null, k, null, null, null) },
                            label = { Text(label) },
                        )
                    }
                }
                RupiahTextField(
                    value = state.cashAdjAmountDigits,
                    onValueChange = { onUpdate(null, null, null, null, it, null, null) },
                    label = "Nominal Penyesuaian",
                    enabled = !state.isSubmitting,
                )
                OutlinedTextField(
                    value = state.cashAdjReason,
                    onValueChange = { onUpdate(null, null, null, null, null, it, null) },
                    label = { Text("Alasan / Keterangan") },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = state.cashAdjReference,
                    onValueChange = { onUpdate(null, null, null, null, null, null, it) },
                    label = { Text("Referensi / No. Bukti (Opsional)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                state.cashAdjError?.let { err ->
                    Text(err, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !state.isSubmitting) { Text("Batal") }
        },
        confirmButton = {
            Button(onClick = onSubmit, enabled = !state.isSubmitting) {
                Text(if (state.isSubmitting) "Menyimpan..." else "Simpan")
            }
        },
    )
}

@Composable
private fun KeyValueRow(
    label: String,
    value: String,
    valueColor: Color = MaterialTheme.colorScheme.onSurface,
    bold: Boolean = false,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.SemiBold,
            color = valueColor,
        )
    }
}

private fun formatPercent(value: Double): String =
    String.format(Locale.US, "%.1f%%", value)

private fun resolveKasirName(
    item: LaporanTransaksiItemDto,
    kasirMap: Map<Int, String>,
): String {
    item.kasirUsername?.takeIf { it.isNotBlank() }?.let { return it }
    val id = item.kasirId ?: return "System"
    return kasirMap[id] ?: "Kasir #$id"
}
