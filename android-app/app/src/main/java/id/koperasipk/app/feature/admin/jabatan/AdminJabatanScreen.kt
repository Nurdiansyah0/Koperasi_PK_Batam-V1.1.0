package id.koperasipk.app.feature.admin.jabatan

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AdminPanelSettings
import androidx.compose.material.icons.rounded.Badge
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.VerifiedUser
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.designsystem.BadgeVariant
import id.koperasipk.app.core.designsystem.BrandEmeraldDark
import id.koperasipk.app.core.designsystem.ConfirmDialog
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.StatCard
import id.koperasipk.app.core.designsystem.StatusBadge
import id.koperasipk.app.core.designsystem.statusBadgeVariant
import id.koperasipk.app.feature.admin.ui.AdminPaginationFooter
import id.koperasipk.app.feature.admin.ui.AdminSearchField
import id.koperasipk.app.feature.admin.ui.AdminSurfaceCard

@Composable
fun AdminJabatanScreen(
    viewModel: AdminJabatanViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AdminJabatanEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    ConfirmDialog(
        visible = state.confirmRevokePending,
        title = "Cabut Mandat Jabatan?",
        message = "Nonaktifkan peran ${state.revokeForm?.target?.role?.uppercase().orEmpty()} untuk ${state.revokeForm?.target?.namaLengkap.orEmpty()}?",
        confirmLabel = "Cabut Mandat",
        isDestructive = true,
        isLoading = state.isSubmitting,
        onConfirm = { viewModel.onEvent(AdminJabatanEvent.ConfirmRevoke) },
        onDismiss = { viewModel.onEvent(AdminJabatanEvent.DismissConfirmRevoke) },
    )

    state.assignForm?.let { form ->
        var memberQuery by remember { mutableStateOf("") }
        val filteredMembers = remember(state.anggotaOptions, memberQuery) {
            val q = memberQuery.trim().lowercase()
            state.anggotaOptions.filter {
                q.isEmpty() || it.displayName.lowercase().contains(q) || it.username.lowercase().contains(q)
            }.take(30)
        }
        AlertDialog(
            onDismissRequest = { if (!state.isSubmitting) viewModel.onEvent(AdminJabatanEvent.DismissAssign) },
            title = { Text("Tugaskan Mandat Staf") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("kasir" to "Kasir", "admin" to "Admin", "pengurus" to "Pengurus").forEach { (key, label) ->
                            FilterChip(
                                selected = form.role == key,
                                onClick = { viewModel.onEvent(AdminJabatanEvent.UpdateAssignForm(form.copy(role = key))) },
                                label = { Text(label) },
                            )
                        }
                    }
                    OutlinedTextField(
                        value = memberQuery,
                        onValueChange = { memberQuery = it },
                        label = { Text("Cari Anggota") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    LazyColumn(modifier = Modifier.heightIn(max = 170.dp)) {
                        items(filteredMembers, key = { it.userId }) { member ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        viewModel.onEvent(AdminJabatanEvent.UpdateAssignForm(form.copy(selectedUserId = member.userId)))
                                    }
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                RadioButton(
                                    selected = form.selectedUserId == member.userId,
                                    onClick = { viewModel.onEvent(AdminJabatanEvent.UpdateAssignForm(form.copy(selectedUserId = member.userId))) },
                                )
                                Column {
                                    Text(member.displayName, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                                    Text("@${member.username}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                    OutlinedTextField(
                        value = form.catatan,
                        onValueChange = { viewModel.onEvent(AdminJabatanEvent.UpdateAssignForm(form.copy(catatan = it))) },
                        label = { Text("Catatan / Nomor SK") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                Button(onClick = { viewModel.onEvent(AdminJabatanEvent.SubmitAssign) }, enabled = !state.isSubmitting) {
                    Text(if (state.isSubmitting) "Menyimpan..." else "Tugaskan")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.onEvent(AdminJabatanEvent.DismissAssign) }, enabled = !state.isSubmitting) {
                    Text("Batal")
                }
            },
        )
    }

    state.revokeForm?.let { form ->
        AlertDialog(
            onDismissRequest = { if (!state.isSubmitting) viewModel.onEvent(AdminJabatanEvent.DismissRevoke) },
            title = { Text("Cabut Mandat Jabatan") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "${form.target.namaLengkap} (@${form.target.username}) • Peran: ${form.target.role.uppercase()}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    OutlinedTextField(
                        value = form.alasan,
                        onValueChange = { viewModel.onEvent(AdminJabatanEvent.UpdateRevokeForm(form.copy(alasan = it))) },
                        label = { Text("Alasan Pencabutan (opsional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.onEvent(AdminJabatanEvent.RequestConfirmRevoke) },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                ) {
                    Text("Cabut Mandat")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.onEvent(AdminJabatanEvent.DismissRevoke) }) { Text("Batal") }
            },
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            KoperasiTopBar(
                title = "Manajemen Jabatan",
                subtitle = "Tata kelola hak akses staf koperasi",
                onBack = onBack,
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.onEvent(AdminJabatanEvent.OpenAssign) },
                containerColor = MaterialTheme.colorScheme.primary,
            ) {
                Icon(Icons.Rounded.Add, contentDescription = "Tugaskan Mandat")
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && state.items.isEmpty() -> {
                LoadingState(message = "Memuat mandat jabatan...", modifier = Modifier.padding(innerPadding))
            }
            state.errorMessage != null && state.items.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(AdminJabatanEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(AdminJabatanEvent.Refresh) },
                    modifier = Modifier.fillMaxSize().padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item(key = "jabatan_kpi_1") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard(
                                    title = "Admin Aktif",
                                    value = "${state.summary.adminAktif}",
                                    icon = Icons.Rounded.AdminPanelSettings,
                                    accentColor = Color(0xFF4338CA),
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Kasir Aktif",
                                    value = "${state.summary.kasirAktif}",
                                    icon = Icons.Rounded.VerifiedUser,
                                    accentColor = BrandEmeraldDark,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                        item(key = "jabatan_kpi_2") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard(
                                    title = "Pengurus",
                                    value = "${state.summary.pengurusAktif}",
                                    icon = Icons.Rounded.Badge,
                                    accentColor = Color(0xFFD97706),
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Total Riwayat",
                                    value = "${state.summary.totalRiwayat}",
                                    icon = Icons.Rounded.History,
                                    accentColor = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }

                        item(key = "jabatan_filters") {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    listOf(
                                        "all" to "Semua",
                                        "admin" to "Admin",
                                        "kasir" to "Kasir",
                                        "pengurus" to "Pengurus",
                                        "nonaktif" to "Nonaktif",
                                    ).forEach { (key, label) ->
                                        FilterChip(
                                            selected = state.roleFilter == key,
                                            onClick = { viewModel.onEvent(AdminJabatanEvent.RoleFilterChanged(key)) },
                                            label = { Text(label) },
                                        )
                                    }
                                }
                                AdminSearchField(
                                    query = state.searchQuery,
                                    onQueryChange = { viewModel.onEvent(AdminJabatanEvent.SearchChanged(it)) },
                                    placeholder = "Cari nama anggota / SK...",
                                )
                            }
                        }

                        if (state.pagedItems.isEmpty()) {
                            item(key = "empty_jabatan") {
                                EmptyState(
                                    title = "Tidak ada mandat jabatan",
                                    description = "Sesuaikan filter atau tugaskan mandat baru.",
                                    modifier = Modifier.height(220.dp),
                                )
                            }
                        } else {
                            items(state.pagedItems, key = { it.jabatanId }) { item ->
                                AdminSurfaceCard {
                                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(item.namaLengkap, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                                Text("@${item.username}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                StatusBadge(text = item.role.uppercase(), variant = statusBadgeVariant(item.role))
                                                StatusBadge(
                                                    text = if (item.status == "aktif") "Aktif" else "Nonaktif",
                                                    variant = if (item.status == "aktif") BadgeVariant.SUCCESS else BadgeVariant.DEFAULT,
                                                )
                                            }
                                        }
                                        Text(
                                            text = "Pemberi: ${item.ditugaskanOleh} • Mulai: ${item.assignedAt ?: "-"}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        if (!item.catatan.isNullOrBlank()) {
                                            Surface(
                                                shape = RoundedCornerShape(10.dp),
                                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
                                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
                                            ) {
                                                Text(
                                                    text = item.catatan,
                                                    style = MaterialTheme.typography.labelSmall,
                                                    modifier = Modifier.fillMaxWidth().padding(8.dp),
                                                )
                                            }
                                        }
                                        if (item.status == "aktif") {
                                            OutlinedButton(
                                                onClick = { viewModel.onEvent(AdminJabatanEvent.OpenRevoke(item)) },
                                                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                                                shape = RoundedCornerShape(10.dp),
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Text("Cabut Mandat")
                                            }
                                        }
                                    }
                                }
                            }
                            if (state.totalPages > 1) {
                                item(key = "pagination_jabatan") {
                                    AdminPaginationFooter(
                                        currentPage = state.currentPage,
                                        totalPages = state.totalPages,
                                        totalItems = state.filteredItems.size,
                                        onPrevPage = { viewModel.onEvent(AdminJabatanEvent.PageChanged(state.currentPage - 1)) },
                                        onNextPage = { viewModel.onEvent(AdminJabatanEvent.PageChanged(state.currentPage + 1)) },
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
