package id.koperasipk.app.feature.admin.shu

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.VerifiedUser
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
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
import id.koperasipk.app.core.designsystem.StatCard
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.feature.admin.ui.AdminPaginationFooter
import id.koperasipk.app.feature.admin.ui.AdminSearchField
import id.koperasipk.app.feature.admin.ui.AdminSurfaceCard

@Composable
fun AdminShuScreen(
    viewModel: AdminShuViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AdminShuEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    ConfirmDialog(
        visible = state.showConfirmMassal,
        title = "Eksekusi Distribusi Massal SHU?",
        message = "Distribusikan ${state.massPercentage}% jatah SHU ke Saldo E-Wallet seluruh anggota?",
        confirmLabel = "Ya, Distribusikan",
        isLoading = state.isSubmitting,
        onConfirm = { viewModel.onEvent(AdminShuEvent.ConfirmMassal) },
        onDismiss = { viewModel.onEvent(AdminShuEvent.DismissMassalConfirm) },
    )

    val debtTarget = state.pendingDebtOffset
    ConfirmDialog(
        visible = debtTarget != null,
        title = "Potong SHU untuk Hutang?",
        message = "Potong SHU sebesar ${CurrencyFormatter.format(minOf(debtTarget?.shu ?: 0.0, debtTarget?.hutang ?: 0.0))} untuk melunasi hutang ${debtTarget?.namaLengkap.orEmpty()}?",
        confirmLabel = "Potong SHU",
        isLoading = state.isSubmitting,
        onConfirm = { viewModel.onEvent(AdminShuEvent.ConfirmDebtOffset) },
        onDismiss = { viewModel.onEvent(AdminShuEvent.DismissDebtOffset) },
    )

    state.topupForm?.let { form ->
        val filteredUsers = remember(state.userDirectory, form.memberQuery) {
            val q = form.memberQuery.trim().lowercase()
            state.userDirectory.filter {
                q.isEmpty() || it.displayName.lowercase().contains(q) || it.username.lowercase().contains(q)
            }.take(30)
        }
        AlertDialog(
            onDismissRequest = { if (!state.isSubmitting) viewModel.onEvent(AdminShuEvent.DismissTopup) },
            title = { Text("Topup Saldo SHU Anggota") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = form.memberQuery,
                        onValueChange = { viewModel.onEvent(AdminShuEvent.UpdateTopupForm(form.copy(memberQuery = it))) },
                        label = { Text("Cari Anggota / Username") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    LazyColumn(modifier = Modifier.heightIn(max = 170.dp)) {
                        items(filteredUsers, key = { it.userId }) { u ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        viewModel.onEvent(AdminShuEvent.UpdateTopupForm(form.copy(selectedUsername = u.username)))
                                    }
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                RadioButton(
                                    selected = form.selectedUsername == u.username,
                                    onClick = { viewModel.onEvent(AdminShuEvent.UpdateTopupForm(form.copy(selectedUsername = u.username))) },
                                )
                                Column {
                                    Text(u.displayName, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                                    Text("@${u.username} • SHU: ${CurrencyFormatter.format(u.shu)}", style = MaterialTheme.typography.labelSmall)
                                }
                            }
                        }
                    }
                    RupiahTextField(
                        value = form.nominalDigits,
                        onValueChange = { viewModel.onEvent(AdminShuEvent.UpdateTopupForm(form.copy(nominalDigits = it))) },
                        label = "Nominal Topup SHU",
                    )
                }
            },
            confirmButton = {
                Button(onClick = { viewModel.onEvent(AdminShuEvent.SubmitTopup) }, enabled = !state.isSubmitting) {
                    Text(if (state.isSubmitting) "Memproses..." else "Topup SHU")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.onEvent(AdminShuEvent.DismissTopup) }, enabled = !state.isSubmitting) {
                    Text("Batal")
                }
            },
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            KoperasiTopBar(
                title = "Manajemen SHU & Distribusi",
                subtitle = "Konversi, pelunasan hutang & distribusi tahunan",
                onBack = onBack,
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.onEvent(AdminShuEvent.OpenTopup) },
                containerColor = MaterialTheme.colorScheme.primary,
            ) {
                Icon(Icons.Rounded.Add, contentDescription = "Topup SHU")
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && state.anggotaList.isEmpty() -> {
                LoadingState(message = "Memuat data manajemen SHU...", modifier = Modifier.padding(innerPadding))
            }
            state.errorMessage != null && state.anggotaList.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(AdminShuEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(AdminShuEvent.Refresh) },
                    modifier = Modifier.fillMaxSize().padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item(key = "shu_kpi_1") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard(
                                    title = "Total Hak SHU",
                                    value = CurrencyFormatter.format(state.summary.totalShu),
                                    icon = Icons.Rounded.CardGiftcard,
                                    accentColor = BrandEmeraldDark,
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Saldo E-Wallet",
                                    value = CurrencyFormatter.format(state.summary.totalSaldo),
                                    icon = Icons.Rounded.AccountBalanceWallet,
                                    accentColor = Color(0xFF1D4ED8),
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                        item(key = "shu_kpi_2") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard(
                                    title = "Total Piutang",
                                    value = CurrencyFormatter.format(state.summary.totalHutang),
                                    icon = Icons.Rounded.CreditCard,
                                    accentColor = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Master Consent",
                                    value = "${state.summary.anggotaConsentCount}/${state.summary.totalAnggota}",
                                    subtitle = "${state.summary.consentPercentage}% setuju",
                                    icon = Icons.Rounded.VerifiedUser,
                                    accentColor = Color(0xFF4338CA),
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }

                        item(key = "shu_tabs") {
                            Row(
                                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                listOf(
                                    ShuTab.MASSAL to "Distribusi Massal",
                                    ShuTab.KOMPENSASI to "Potong Hutang (${state.indebtedMembers.size})",
                                    ShuTab.INDIVIDUAL to "Individual",
                                    ShuTab.CONSENT to "Consent (${state.anggotaList.size})",
                                    ShuTab.RIWAYAT to "Log Mutasi",
                                    ShuTab.DISTRIBUSI to "Distribusi Tahunan",
                                ).forEach { (tab, label) ->
                                    FilterChip(
                                        selected = state.activeTab == tab,
                                        onClick = { viewModel.onEvent(AdminShuEvent.TabChanged(tab)) },
                                        label = { Text(label) },
                                    )
                                }
                            }
                        }

                        when (state.activeTab) {
                            ShuTab.MASSAL -> {
                                item(key = "tab_massal") {
                                    AdminSurfaceCard {
                                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                            Text("Distribusi Massal SHU ke Saldo Belanja", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                            Text(
                                                text = "Pindahkan persentase saldo SHU seluruh anggota ke Saldo E-Wallet belanja secara serentak.",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                listOf(25, 50, 75, 100).forEach { pct ->
                                                    FilterChip(
                                                        selected = state.massPercentage == pct,
                                                        onClick = { viewModel.onEvent(AdminShuEvent.MassPercentageChanged(pct)) },
                                                        label = { Text("$pct%") },
                                                    )
                                                }
                                            }
                                            Text(
                                                text = "Estimasi dipindahkan: ${CurrencyFormatter.format(state.summary.totalShu * state.massPercentage / 100.0)}",
                                                style = MaterialTheme.typography.titleSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.primary,
                                            )
                                            Button(
                                                onClick = { viewModel.onEvent(AdminShuEvent.RequestMassalConfirm) },
                                                enabled = !state.isSubmitting && state.summary.totalShu > 0.0,
                                                shape = RoundedCornerShape(12.dp),
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Text("Eksekusi Distribusi Massal ${state.massPercentage}%")
                                            }
                                        }
                                    }
                                }
                            }

                            ShuTab.KOMPENSASI -> {
                                if (state.indebtedMembers.isEmpty()) {
                                    item(key = "empty_kompensasi") {
                                        EmptyState(
                                            title = "Tidak ada hutang yang perlu dikompensasi",
                                            description = "Semua anggota berhutang tidak memiliki SHU atau sudah bebas hutang.",
                                            modifier = Modifier.height(200.dp),
                                        )
                                    }
                                } else {
                                    items(state.indebtedMembers, key = { "debt_${it.anggotaId}" }) { a ->
                                        val maxPotong = minOf(a.shu, a.hutang)
                                        AdminSurfaceCard {
                                            Row(
                                                modifier = Modifier.fillMaxWidth().padding(14.dp),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Text(a.namaLengkap, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                                    Text(
                                                        text = "Hutang: ${CurrencyFormatter.format(a.hutang)} • SHU: ${CurrencyFormatter.format(a.shu)}",
                                                        style = MaterialTheme.typography.bodySmall,
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    )
                                                }
                                                Button(
                                                    onClick = { viewModel.onEvent(AdminShuEvent.RequestDebtOffset(a)) },
                                                    enabled = !state.isSubmitting,
                                                    shape = RoundedCornerShape(10.dp),
                                                ) {
                                                    Text("Potong ${CurrencyFormatter.format(maxPotong)}")
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            ShuTab.INDIVIDUAL -> {
                                item(key = "tab_individual") {
                                    val eligible = state.anggotaList.filter { it.shu > 0.0 }
                                    AdminSurfaceCard {
                                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                            Text("Konversi Mandiri SHU ke Saldo", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                            LazyColumn(modifier = Modifier.heightIn(max = 200.dp)) {
                                                items(eligible, key = { "ind_${it.anggotaId}" }) { a ->
                                                    Row(
                                                        modifier = Modifier
                                                            .fillMaxWidth()
                                                            .clickable { viewModel.onEvent(AdminShuEvent.IndividualMemberSelected(a.anggotaId)) }
                                                            .padding(vertical = 4.dp),
                                                        verticalAlignment = Alignment.CenterVertically,
                                                    ) {
                                                        RadioButton(
                                                            selected = state.selectedIndividualAnggotaId == a.anggotaId,
                                                            onClick = { viewModel.onEvent(AdminShuEvent.IndividualMemberSelected(a.anggotaId)) },
                                                        )
                                                        Column {
                                                            Text(a.namaLengkap, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                                                            Text("SHU: ${CurrencyFormatter.format(a.shu)}", style = MaterialTheme.typography.labelSmall, color = BrandEmeraldDark)
                                                        }
                                                    }
                                                }
                                            }
                                            RupiahTextField(
                                                value = state.individualNominalDigits,
                                                onValueChange = { viewModel.onEvent(AdminShuEvent.IndividualNominalChanged(it)) },
                                                label = "Nominal Konversi ke Saldo",
                                            )
                                            Button(
                                                onClick = { viewModel.onEvent(AdminShuEvent.SubmitIndividual) },
                                                enabled = !state.isSubmitting && state.selectedIndividualAnggotaId != null,
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Text(if (state.isSubmitting) "Memproses..." else "Pindahkan ke Saldo Belanja")
                                            }
                                        }
                                    }
                                }
                            }

                            ShuTab.CONSENT -> {
                                item(key = "search_consent") {
                                    AdminSearchField(
                                        query = state.searchAnggota,
                                        onQueryChange = { viewModel.onEvent(AdminShuEvent.SearchChanged(it)) },
                                        placeholder = "Cari nama anggota...",
                                    )
                                }
                                items(state.pagedConsentMembers, key = { "consent_${it.anggotaId}" }) { a ->
                                    AdminSurfaceCard {
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(14.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(a.namaLengkap, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                                Text(
                                                    text = "Saldo: ${CurrencyFormatter.format(a.saldo)} • SHU: ${CurrencyFormatter.format(a.shu)}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                            StatusBadge(
                                                text = if (a.hasMasterConsent) "Disetujui" else "Belum Diisi",
                                                variant = if (a.hasMasterConsent) BadgeVariant.SUCCESS else BadgeVariant.WARNING,
                                            )
                                        }
                                    }
                                }
                                if (state.totalConsentPages > 1) {
                                    item(key = "pagination_consent") {
                                        AdminPaginationFooter(
                                            currentPage = state.consentPage,
                                            totalPages = state.totalConsentPages,
                                            totalItems = state.filteredConsentMembers.size,
                                            onPrevPage = { viewModel.onEvent(AdminShuEvent.ConsentPageChanged(state.consentPage - 1)) },
                                            onNextPage = { viewModel.onEvent(AdminShuEvent.ConsentPageChanged(state.consentPage + 1)) },
                                        )
                                    }
                                }
                            }

                            ShuTab.RIWAYAT -> {
                                if (state.riwayatKonversi.isEmpty()) {
                                    item(key = "empty_riwayat_shu") {
                                        EmptyState(title = "Belum ada log mutasi SHU", modifier = Modifier.height(180.dp))
                                    }
                                } else {
                                    items(state.riwayatKonversi, key = { "konv_${it.konversiId}" }) { r ->
                                        AdminSurfaceCard {
                                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                ) {
                                                    Text(r.namaAnggota, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                                    Text(CurrencyFormatter.format(r.nominal), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                                                }
                                                StatusBadge(text = r.tipeKonversi.replace('_', ' '), variant = BadgeVariant.INFO)
                                                Text(
                                                    text = "${r.keterangan ?: "-"} • ${r.adminName} • ${DateFormatter.formatDateTime(r.createdAt)}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            ShuTab.DISTRIBUSI -> {
                                item(key = "distribusi_filter") {
                                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            OutlinedTextField(
                                                value = state.distribusiTahunFilter,
                                                onValueChange = { viewModel.onEvent(AdminShuEvent.DistribusiTahunChanged(it.filter(Char::isDigit))) },
                                                label = { Text("Filter Tahun (opsional)") },
                                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                                singleLine = true,
                                                modifier = Modifier.weight(1f),
                                            )
                                            Button(onClick = { viewModel.onEvent(AdminShuEvent.ApplyDistribusiFilter) }) {
                                                Text("Terapkan")
                                            }
                                        }
                                        state.distribusiSummary?.let { ds ->
                                            AdminSurfaceCard {
                                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                    Text("Total Distribusi (${ds.totalDistribusi} catatan)", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                                    Text("60% Anggota: ${CurrencyFormatter.format(ds.totalShu60)}", style = MaterialTheme.typography.bodySmall)
                                                    Text("10% Pengurus: ${CurrencyFormatter.format(ds.totalShu10)} • 30% Koperasi: ${CurrencyFormatter.format(ds.totalShu30)}", style = MaterialTheme.typography.bodySmall)
                                                }
                                            }
                                        }
                                    }
                                }
                                if (state.pagedDistribusiItems.isEmpty()) {
                                    item(key = "empty_distribusi") {
                                        EmptyState(title = "Belum ada catatan distribusi SHU", modifier = Modifier.height(180.dp))
                                    }
                                } else {
                                    items(state.pagedDistribusiItems, key = { "dist_${it.shuId}" }) { d ->
                                        AdminSurfaceCard {
                                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                    Text("${d.namaAnggota} (${d.tahun})", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                                    Text(CurrencyFormatter.format(d.totalShu), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.ExtraBold, color = BrandEmeraldDark)
                                                }
                                                Text(
                                                    text = "60%: ${CurrencyFormatter.format(d.shu60Percent)} | 10%: ${CurrencyFormatter.format(d.shu10Percent)} | 30%: ${CurrencyFormatter.format(d.shu30Percent)}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                        }
                                    }
                                    if (state.totalDistribusiPages > 1) {
                                        item(key = "pagination_distribusi") {
                                            AdminPaginationFooter(
                                                currentPage = state.distribusiPage,
                                                totalPages = state.totalDistribusiPages,
                                                totalItems = state.distribusiItems.size,
                                                onPrevPage = { viewModel.onEvent(AdminShuEvent.DistribusiPageChanged(state.distribusiPage - 1)) },
                                                onNextPage = { viewModel.onEvent(AdminShuEvent.DistribusiPageChanged(state.distribusiPage + 1)) },
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
}
