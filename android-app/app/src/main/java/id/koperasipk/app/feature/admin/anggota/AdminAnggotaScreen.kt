package id.koperasipk.app.feature.admin.anggota

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Key
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.Savings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.CurrencyFormatter
import id.koperasipk.app.core.designsystem.BrandEmeraldDark
import id.koperasipk.app.core.designsystem.ConfirmDialog
import id.koperasipk.app.core.designsystem.EmptyState
import id.koperasipk.app.core.designsystem.ErrorState
import id.koperasipk.app.core.designsystem.KoperasiPullToRefreshBox
import id.koperasipk.app.core.designsystem.KoperasiTopBar
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.core.designsystem.RupiahTextField
import id.koperasipk.app.core.designsystem.StatCard
import id.koperasipk.app.feature.admin.ui.AdminPaginationFooter
import id.koperasipk.app.feature.admin.ui.AdminSearchField
import id.koperasipk.app.feature.admin.ui.AdminSurfaceCard

@Composable
fun AdminAnggotaScreen(
    viewModel: AdminAnggotaViewModel,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AdminAnggotaEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    val deleteTarget = state.deleteTarget
    ConfirmDialog(
        visible = deleteTarget != null,
        title = "Hapus User & Anggota?",
        message = "Hapus akun \"${deleteTarget?.displayName.orEmpty()}\" (@${deleteTarget?.username.orEmpty()}) secara permanen? Tindakan ini tidak dapat dibatalkan.",
        confirmLabel = "Hapus User",
        isDestructive = true,
        isLoading = state.isSubmitting,
        onConfirm = { viewModel.onEvent(AdminAnggotaEvent.ConfirmDeleteUser) },
        onDismiss = { viewModel.onEvent(AdminAnggotaEvent.DismissDeleteUser) },
    )

    ConfirmDialog(
        visible = state.confirmResetPending,
        title = "Konfirmasi Reset Password?",
        message = "Reset password untuk ${state.resetPasswordForm?.target?.displayName.orEmpty()}? Semua sesi aktif user akan otomatis keluar.",
        confirmLabel = "Ya, Reset Password",
        isDestructive = true,
        isLoading = state.isSubmitting,
        onConfirm = { viewModel.onEvent(AdminAnggotaEvent.ConfirmResetPassword) },
        onDismiss = { viewModel.onEvent(AdminAnggotaEvent.DismissConfirmReset) },
    )

    state.userForm?.let { form ->
        UserCrudDialog(
            form = form,
            isSubmitting = state.isSubmitting,
            onUpdate = { viewModel.onEvent(AdminAnggotaEvent.UpdateUserForm(it)) },
            onDismiss = { viewModel.onEvent(AdminAnggotaEvent.DismissUserForm) },
            onSubmit = { viewModel.onEvent(AdminAnggotaEvent.SubmitUserForm) },
        )
    }

    state.resetPasswordForm?.let { form ->
        AlertDialog(
            onDismissRequest = { if (!state.isSubmitting) viewModel.onEvent(AdminAnggotaEvent.DismissResetPassword) },
            title = { Text("Reset Password User") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "User: ${form.target.displayName} (@${form.target.username}). Semua sesi aktif akan keluar.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(
                        value = form.newPassword,
                        onValueChange = { viewModel.onEvent(AdminAnggotaEvent.UpdateResetPasswordForm(form.copy(newPassword = it))) },
                        label = { Text("Password Baru (min. 6 karakter)") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = form.confirmPassword,
                        onValueChange = { viewModel.onEvent(AdminAnggotaEvent.UpdateResetPasswordForm(form.copy(confirmPassword = it))) },
                        label = { Text("Konfirmasi Password Baru") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                Button(onClick = { viewModel.onEvent(AdminAnggotaEvent.RequestConfirmReset) }, enabled = !state.isSubmitting) {
                    Text("Reset Password")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.onEvent(AdminAnggotaEvent.DismissResetPassword) }, enabled = !state.isSubmitting) {
                    Text("Batal")
                }
            },
        )
    }

    state.cairkanShuForm?.let { form ->
        AlertDialog(
            onDismissRequest = { if (!state.isSubmitting) viewModel.onEvent(AdminAnggotaEvent.DismissCairkanShu) },
            title = { Text("Pencairan SHU ke Saldo") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "${form.target.displayName} • SHU Tersedia: ${CurrencyFormatter.format(form.target.shu)}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    RupiahTextField(
                        value = form.nominalDigits,
                        onValueChange = { raw ->
                            val max = form.target.shu.toLong().coerceAtLeast(0L)
                            val clamped = raw.toLongOrNull()?.coerceAtMost(max)?.toString().orEmpty()
                            viewModel.onEvent(AdminAnggotaEvent.UpdateCairkanShuForm(form.copy(nominalDigits = clamped)))
                        },
                        label = "Nominal Pencairan",
                        supportingText = "Otomatis ditambahkan ke saldo belanja anggota",
                    )
                }
            },
            confirmButton = {
                Button(onClick = { viewModel.onEvent(AdminAnggotaEvent.SubmitCairkanShu) }, enabled = !state.isSubmitting) {
                    Text(if (state.isSubmitting) "Memproses..." else "Konfirmasi Pencairan")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.onEvent(AdminAnggotaEvent.DismissCairkanShu) }, enabled = !state.isSubmitting) {
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
                title = "Data Anggota & User",
                subtitle = "${state.totalAnggota} anggota terdaftar",
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.onEvent(AdminAnggotaEvent.OpenAddOrEditUser(null)) },
                containerColor = MaterialTheme.colorScheme.primary,
            ) {
                Icon(Icons.Rounded.PersonAdd, contentDescription = "Tambah User")
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && state.items.isEmpty() -> {
                LoadingState(
                    message = "Memuat data anggota koperasi...",
                    modifier = Modifier.padding(innerPadding),
                )
            }
            state.errorMessage != null && state.items.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(AdminAnggotaEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(AdminAnggotaEvent.Refresh) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item(key = "anggota_kpi_1") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard(
                                    title = "Total Anggota",
                                    value = "${state.totalAnggota} orang",
                                    icon = Icons.Rounded.Groups,
                                    accentColor = Color(0xFF1D4ED8),
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Memiliki Saldo",
                                    value = "${state.anggotaAktifSaldo} anggota",
                                    icon = Icons.Rounded.AccountBalanceWallet,
                                    accentColor = BrandEmeraldDark,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                        item(key = "anggota_kpi_2") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard(
                                    title = "Memiliki Hutang",
                                    value = "${state.anggotaBerhutang} anggota",
                                    icon = Icons.Rounded.CreditCard,
                                    accentColor = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Rata-rata Saldo",
                                    value = CurrencyFormatter.format(state.rataRataSaldo),
                                    icon = Icons.Rounded.Savings,
                                    accentColor = Color(0xFF4338CA),
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }

                        item(key = "search_anggota") {
                            AdminSearchField(
                                query = state.searchQuery,
                                onQueryChange = { viewModel.onEvent(AdminAnggotaEvent.SearchChanged(it)) },
                                placeholder = "Cari nama atau username...",
                            )
                        }

                        if (state.pagedItems.isEmpty()) {
                            item(key = "empty_anggota") {
                                EmptyState(
                                    title = "Tidak ada anggota ditemukan",
                                    description = "Coba sesuaikan kata kunci pencarian.",
                                    icon = Icons.Rounded.Groups,
                                    modifier = Modifier.height(240.dp),
                                )
                            }
                        } else {
                            items(
                                items = state.pagedItems,
                                key = { it.anggotaId },
                            ) { item ->
                                AdminSurfaceCard {
                                    Column(
                                        modifier = Modifier.padding(14.dp),
                                        verticalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = item.displayName,
                                                    style = MaterialTheme.typography.titleMedium,
                                                    fontWeight = FontWeight.Bold,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis,
                                                )
                                                Text(
                                                    text = "@${item.username} • User #${item.userId}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                            Row {
                                                IconButton(onClick = { viewModel.onEvent(AdminAnggotaEvent.OpenResetPassword(item)) }) {
                                                    Icon(Icons.Rounded.Key, contentDescription = "Reset Password")
                                                }
                                                IconButton(onClick = { viewModel.onEvent(AdminAnggotaEvent.OpenAddOrEditUser(item)) }) {
                                                    Icon(Icons.Rounded.Edit, contentDescription = "Edit User")
                                                }
                                                IconButton(onClick = { viewModel.onEvent(AdminAnggotaEvent.RequestDeleteUser(item)) }) {
                                                    Icon(Icons.Rounded.DeleteOutline, contentDescription = "Hapus User", tint = MaterialTheme.colorScheme.error)
                                                }
                                            }
                                        }

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            MiniAmountTile(label = "Saldo", amount = item.saldo, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                                            MiniAmountTile(
                                                label = "Hutang",
                                                amount = item.hutang,
                                                color = if (item.hutang > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                                                modifier = Modifier.weight(1f),
                                            )
                                            MiniAmountTile(
                                                label = "SHU",
                                                amount = item.shu,
                                                color = if (item.shu > 0) BrandEmeraldDark else MaterialTheme.colorScheme.onSurfaceVariant,
                                                modifier = Modifier.weight(1f),
                                            )
                                        }

                                        if (item.shu > 0.0) {
                                            OutlinedButton(
                                                onClick = { viewModel.onEvent(AdminAnggotaEvent.OpenCairkanShu(item)) },
                                                shape = RoundedCornerShape(10.dp),
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Text("Cairkan SHU ke Saldo")
                                            }
                                        }
                                    }
                                }
                            }

                            if (state.totalPages > 1) {
                                item(key = "pagination_anggota") {
                                    AdminPaginationFooter(
                                        currentPage = state.currentPage,
                                        totalPages = state.totalPages,
                                        totalItems = state.filteredItems.size,
                                        onPrevPage = { viewModel.onEvent(AdminAnggotaEvent.PageChanged(state.currentPage - 1)) },
                                        onNextPage = { viewModel.onEvent(AdminAnggotaEvent.PageChanged(state.currentPage + 1)) },
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

@Composable
private fun MiniAmountTile(
    label: String,
    amount: Double,
    color: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                text = CurrencyFormatter.format(amount),
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = color,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun UserCrudDialog(
    form: UserCrudFormState,
    isSubmitting: Boolean,
    onUpdate: (UserCrudFormState) -> Unit,
    onDismiss: () -> Unit,
    onSubmit: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!isSubmitting) onDismiss() },
        title = { Text(if (form.isEditing) "Edit User & Anggota" else "Tambah User Baru") },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 420.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedTextField(
                    value = form.username,
                    onValueChange = { onUpdate(form.copy(username = it)) },
                    label = { Text("Username") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = form.namaLengkap,
                    onValueChange = { onUpdate(form.copy(namaLengkap = it)) },
                    label = { Text("Nama Lengkap Anggota") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("Peran Utama (Role)", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    listOf("anggota", "kasir", "pengurus", "admin").forEach { role ->
                        FilterChip(
                            selected = form.role == role,
                            onClick = { onUpdate(form.copy(role = role)) },
                            label = { Text(role.replaceFirstChar { it.uppercase() }) },
                        )
                    }
                }
                OutlinedTextField(
                    value = form.password,
                    onValueChange = { onUpdate(form.copy(password = it)) },
                    label = { Text(if (form.isEditing) "Password Baru (opsional)" else "Password (min. 6 karakter)") },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            Button(onClick = onSubmit, enabled = !isSubmitting) {
                Text(if (isSubmitting) "Menyimpan..." else "Simpan")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) { Text("Batal") }
        },
    )
}
