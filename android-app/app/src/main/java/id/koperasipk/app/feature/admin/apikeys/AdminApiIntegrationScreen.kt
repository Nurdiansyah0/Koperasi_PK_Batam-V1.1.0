package id.koperasipk.app.feature.admin.apikeys

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Key
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Security
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.koperasipk.app.core.common.DateFormatter
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
import id.koperasipk.app.feature.admin.ui.AdminSurfaceCard
import kotlinx.coroutines.launch

private val gatewayEndpoints = listOf(
    "/laravel/api/v1/ping" to "Ping & Gateway Health",
    "/laravel/api/v1/summary" to "Ringkasan Finansial",
    "/laravel/api/v1/katalog" to "Katalog Produk & Stok",
    "/laravel/api/v1/anggota" to "Daftar Anggota",
    "/laravel/api/v1/laporan" to "Laporan SHU Real-Time",
    "/laravel/api/v1/transaksi" to "Histori Transaksi Kasir",
    "/laravel/api/v1/assets" to "Asset, Logo & Media URL",
    "/laravel/api/v1/ui/widget-data" to "Widget Data Siap Pakai",
)

private val availablePermissions = listOf(
    "*" to "Semua Akses Penuh (*)",
    "read:summary" to "Ringkasan Koperasi",
    "read:katalog" to "Katalog Produk",
    "read:anggota" to "Data Anggota",
    "read:laporan" to "Laporan Keuangan",
    "read:transaksi" to "Log Transaksi",
    "assets:all" to "Asset & Media",
)

@Composable
fun AdminApiIntegrationScreen(
    viewModel: AdminApiIntegrationViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()

    LaunchedEffect(viewModel) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is AdminApiIntegrationEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    val deleteTarget = state.deleteTarget
    ConfirmDialog(
        visible = deleteTarget != null,
        title = "Hapus API Key?",
        message = "Hapus API Key \"${deleteTarget?.name.orEmpty()}\" secara permanen? Aplikasi eksternal yang memakai key ini akan langsung terputus.",
        confirmLabel = "Hapus Key",
        isDestructive = true,
        isLoading = state.isSubmitting,
        onConfirm = { viewModel.onEvent(AdminApiIntegrationEvent.ConfirmDeleteKey) },
        onDismiss = { viewModel.onEvent(AdminApiIntegrationEvent.DismissDeleteKey) },
    )

    state.createForm?.let { form ->
        AlertDialog(
            onDismissRequest = { if (!state.isSubmitting) viewModel.onEvent(AdminApiIntegrationEvent.DismissCreateDialog) },
            title = { Text(if (form.createdResult != null) "API Key Berhasil Dibuat" else "Buat API Key Baru") },
            text = {
                val created = form.createdResult
                if (created != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "Simpan kredensial ini sekarang. Secret hanya ditampilkan sekali ini.",
                            style = MaterialTheme.typography.bodySmall,
                            color = BrandEmeraldDark,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(created.key, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.labelSmall, modifier = Modifier.weight(1f))
                                IconButton(onClick = {
                                    clipboard.setText(AnnotatedString(created.key))
                                    scope.launch { snackbarHostState.showSnackbar("API Key disalin") }
                                }) { Icon(Icons.Rounded.ContentCopy, contentDescription = "Salin Key") }
                            }
                        }
                        created.secret?.let { sec ->
                            Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(sec, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.labelSmall, modifier = Modifier.weight(1f))
                                    IconButton(onClick = {
                                        clipboard.setText(AnnotatedString(sec))
                                        scope.launch { snackbarHostState.showSnackbar("API Secret disalin") }
                                    }) { Icon(Icons.Rounded.ContentCopy, contentDescription = "Salin Secret") }
                                }
                            }
                        }
                    }
                } else {
                    Column(
                        modifier = Modifier.heightIn(max = 400.dp).verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        OutlinedTextField(
                            value = form.name,
                            onValueChange = { viewModel.onEvent(AdminApiIntegrationEvent.UpdateCreateForm(form.copy(name = it))) },
                            label = { Text("Nama Aplikasi / Deskripsi") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        OutlinedTextField(
                            value = form.allowedOrigins,
                            onValueChange = { viewModel.onEvent(AdminApiIntegrationEvent.UpdateCreateForm(form.copy(allowedOrigins = it))) },
                            label = { Text("CORS Allowed Origins") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Text("Masa Berlaku", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                        Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("0" to "Selamanya", "30" to "30 Hari", "90" to "90 Hari", "365" to "1 Tahun").forEach { (d, label) ->
                                FilterChip(
                                    selected = form.expiresInDays == d,
                                    onClick = { viewModel.onEvent(AdminApiIntegrationEvent.UpdateCreateForm(form.copy(expiresInDays = d))) },
                                    label = { Text(label) },
                                )
                            }
                        }
                        Text("Izin Endpoint", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                        availablePermissions.forEach { (id, label) ->
                            Row(
                                modifier = Modifier.fillMaxWidth().clickable { viewModel.onEvent(AdminApiIntegrationEvent.TogglePermission(id)) },
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Checkbox(
                                    checked = form.selectedPermissions.contains(id),
                                    onCheckedChange = { viewModel.onEvent(AdminApiIntegrationEvent.TogglePermission(id)) },
                                )
                                Text(label, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                if (form.createdResult != null) {
                    Button(onClick = { viewModel.onEvent(AdminApiIntegrationEvent.DismissCreateDialog) }) { Text("Selesai") }
                } else {
                    Button(onClick = { viewModel.onEvent(AdminApiIntegrationEvent.SubmitCreateKey) }, enabled = !state.isSubmitting) {
                        Text(if (state.isSubmitting) "Membuat..." else "Buat API Key")
                    }
                }
            },
            dismissButton = {
                if (form.createdResult == null) {
                    TextButton(onClick = { viewModel.onEvent(AdminApiIntegrationEvent.DismissCreateDialog) }, enabled = !state.isSubmitting) {
                        Text("Batal")
                    }
                }
            },
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            KoperasiTopBar(
                title = "Integrasi API & Gateway",
                subtitle = "Kelola API Key v1 & Live Endpoint Tester",
                onBack = onBack,
            )
        },
        floatingActionButton = {
            if (state.activeTab == ApiIntegrationTab.KEYS) {
                FloatingActionButton(
                    onClick = { viewModel.onEvent(AdminApiIntegrationEvent.OpenCreateDialog) },
                    containerColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(Icons.Rounded.Add, contentDescription = "Buat API Key")
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        when {
            state.isLoading && state.keys.isEmpty() -> {
                LoadingState(message = "Memuat daftar API Key...", modifier = Modifier.padding(innerPadding))
            }
            state.errorMessage != null && state.keys.isEmpty() -> {
                ErrorState(
                    message = state.errorMessage.orEmpty(),
                    onRetry = { viewModel.onEvent(AdminApiIntegrationEvent.Load) },
                    modifier = Modifier.padding(innerPadding),
                )
            }
            else -> {
                KoperasiPullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onEvent(AdminApiIntegrationEvent.Refresh) },
                    modifier = Modifier.fillMaxSize().padding(innerPadding),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item(key = "api_kpi") {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard(
                                    title = "API Key Aktif",
                                    value = "${state.activeKeyCount} / ${state.keys.size}",
                                    subtitle = "Header X-API-KEY",
                                    icon = Icons.Rounded.Key,
                                    accentColor = BrandEmeraldDark,
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Gateway v1",
                                    value = "8 Endpoints",
                                    subtitle = "SHA-256 + CORS",
                                    icon = Icons.Rounded.Security,
                                    accentColor = Color(0xFF1D4ED8),
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }

                        item(key = "api_tabs") {
                            Row(
                                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                listOf(
                                    ApiIntegrationTab.KEYS to "API Key (${state.keys.size})",
                                    ApiIntegrationTab.DOCS to "Docs & Kode",
                                    ApiIntegrationTab.TESTER to "Live Tester",
                                    ApiIntegrationTab.WIDGETS to "Widget & Asset",
                                ).forEach { (tab, label) ->
                                    FilterChip(
                                        selected = state.activeTab == tab,
                                        onClick = { viewModel.onEvent(AdminApiIntegrationEvent.TabChanged(tab)) },
                                        label = { Text(label) },
                                    )
                                }
                            }
                        }

                        when (state.activeTab) {
                            ApiIntegrationTab.KEYS -> {
                                if (state.keys.isEmpty()) {
                                    item(key = "empty_keys") {
                                        EmptyState(
                                            title = "Belum ada API Key",
                                            description = "Tekan + untuk membuat kredensial gateway v1.",
                                            icon = Icons.Rounded.Key,
                                            modifier = Modifier.height(220.dp),
                                        )
                                    }
                                } else {
                                    items(state.keys, key = { it.id }) { k ->
                                        AdminSurfaceCard {
                                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically,
                                                ) {
                                                    Text(k.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                        StatusBadge(
                                                            text = if (k.isActive) "Aktif" else "Nonaktif",
                                                            variant = if (k.isActive) BadgeVariant.SUCCESS else BadgeVariant.DANGER,
                                                        )
                                                        if (k.isExpired) {
                                                            StatusBadge(text = "Kedaluwarsa", variant = BadgeVariant.WARNING)
                                                        }
                                                    }
                                                }
                                                Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 6.dp),
                                                        verticalAlignment = Alignment.CenterVertically,
                                                    ) {
                                                        Text(
                                                            text = k.key,
                                                            fontFamily = FontFamily.Monospace,
                                                            style = MaterialTheme.typography.labelSmall,
                                                            modifier = Modifier.weight(1f),
                                                        )
                                                        IconButton(onClick = {
                                                            clipboard.setText(AnnotatedString(k.key))
                                                            scope.launch { snackbarHostState.showSnackbar("API Key disalin") }
                                                        }) {
                                                            Icon(Icons.Rounded.ContentCopy, contentDescription = "Salin Key", modifier = Modifier.size(18.dp))
                                                        }
                                                    }
                                                }
                                                Text(
                                                    text = "CORS: ${k.allowedOrigins} • Izin: ${k.permissions.joinToString(", ")}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                                Text(
                                                    text = "Dipakai: ${k.lastUsedAt?.let { DateFormatter.formatDateTime(it) } ?: "Belum pernah"}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                    OutlinedButton(
                                                        onClick = { viewModel.onEvent(AdminApiIntegrationEvent.ToggleKeyActive(k.id)) },
                                                        enabled = !state.isSubmitting,
                                                        modifier = Modifier.weight(1f),
                                                    ) {
                                                        Text(if (k.isActive) "Nonaktifkan" else "Aktifkan")
                                                    }
                                                    IconButton(onClick = { viewModel.onEvent(AdminApiIntegrationEvent.RequestDeleteKey(k)) }) {
                                                        Icon(Icons.Rounded.DeleteOutline, contentDescription = "Hapus API Key", tint = MaterialTheme.colorScheme.error)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            ApiIntegrationTab.DOCS -> {
                                item(key = "docs_panel") {
                                    val baseOrigin = state.gatewayUrl.substringBefore("/laravel/api").ifBlank { "https://koperasi.local" }
                                    val snippet = remember(state.codeLang, state.selectedEndpoint, state.selectedKeyForTest, baseOrigin) {
                                        generateSnippet(state.codeLang, "$baseOrigin${state.selectedEndpoint}", state.selectedKeyForTest)
                                    }
                                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        gatewayEndpoints.forEach { (path, label) ->
                                            AdminSurfaceCard(
                                                borderColor = if (state.selectedEndpoint == path) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f),
                                            ) {
                                                Row(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .clickable { viewModel.onEvent(AdminApiIntegrationEvent.SelectedEndpointChanged(path)) }
                                                        .padding(12.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically,
                                                ) {
                                                    Column(modifier = Modifier.weight(1f)) {
                                                        Text(label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                                                        Text(path, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                    }
                                                    StatusBadge(text = "GET", variant = BadgeVariant.INFO)
                                                }
                                            }
                                        }
                                        Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            listOf("curl" to "cURL", "fetch" to "Fetch JS", "php" to "PHP", "python" to "Python").forEach { (id, label) ->
                                                FilterChip(
                                                    selected = state.codeLang == id,
                                                    onClick = { viewModel.onEvent(AdminApiIntegrationEvent.CodeLangChanged(id)) },
                                                    label = { Text(label) },
                                                )
                                            }
                                        }
                                        Surface(shape = RoundedCornerShape(14.dp), color = Color(0xFF0F172A)) {
                                            Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                                                Text(snippet, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.labelSmall, color = Color(0xFF93C5FD))
                                                Spacer(modifier = Modifier.height(8.dp))
                                                OutlinedButton(
                                                    onClick = {
                                                        clipboard.setText(AnnotatedString(snippet))
                                                        scope.launch { snackbarHostState.showSnackbar("Contoh kode disalin") }
                                                    },
                                                ) {
                                                    Icon(Icons.Rounded.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                                                    Spacer(modifier = Modifier.width(6.dp))
                                                    Text("Salin Kode", color = Color.White)
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            ApiIntegrationTab.TESTER -> {
                                item(key = "tester_panel") {
                                    AdminSurfaceCard {
                                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                            Text("Live API Endpoint Explorer", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                            Text("Pilih API Key:", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                            if (state.keys.isEmpty()) {
                                                Text("Buat API Key terlebih dahulu.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                                            } else {
                                                state.keys.forEach { k ->
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth().clickable { viewModel.onEvent(AdminApiIntegrationEvent.SelectedTestKeyChanged(k.key)) },
                                                        verticalAlignment = Alignment.CenterVertically,
                                                    ) {
                                                        RadioButton(
                                                            selected = state.selectedKeyForTest == k.key,
                                                            onClick = { viewModel.onEvent(AdminApiIntegrationEvent.SelectedTestKeyChanged(k.key)) },
                                                        )
                                                        Text("${k.name} (${k.key.take(14)}...)", style = MaterialTheme.typography.bodySmall)
                                                    }
                                                }
                                            }
                                            Text("Pilih Endpoint:", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                gatewayEndpoints.forEach { (path, label) ->
                                                    FilterChip(
                                                        selected = state.selectedEndpoint == path,
                                                        onClick = { viewModel.onEvent(AdminApiIntegrationEvent.SelectedEndpointChanged(path)) },
                                                        label = { Text(path.substringAfterLast('/')) },
                                                    )
                                                }
                                            }
                                            Button(
                                                onClick = { viewModel.onEvent(AdminApiIntegrationEvent.RunLiveTest) },
                                                enabled = !state.isTesting && state.selectedKeyForTest.isNotBlank(),
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Icon(Icons.Rounded.PlayArrow, contentDescription = null)
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(if (state.isTesting) "Memproses..." else "Kirim Request")
                                            }
                                            state.testResponseJson?.let { resp ->
                                                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF0F172A)) {
                                                    Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                                                        Text(
                                                            text = resp,
                                                            fontFamily = FontFamily.Monospace,
                                                            style = MaterialTheme.typography.labelSmall,
                                                            color = Color(0xFF6EE7B7),
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            ApiIntegrationTab.WIDGETS -> {
                                item(key = "widgets_panel") {
                                    val baseOrigin = state.gatewayUrl.substringBefore("/laravel/api").ifBlank { "https://koperasi.local" }
                                    val assets = listOf(
                                        "Logo Utama (SVG)" to "$baseOrigin/Logo.svg",
                                        "Icon PNG (512x512)" to "$baseOrigin/icon-512x512.png",
                                        "PWA Manifest" to "$baseOrigin/manifest.webmanifest",
                                        "Gateway v1 Base" to state.gatewayUrl.ifBlank { "$baseOrigin/laravel/api/v1" },
                                    )
                                    AdminSurfaceCard {
                                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Text("Direct Asset & Gateway URLs", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                            assets.forEach { (title, url) ->
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically,
                                                ) {
                                                    Column(modifier = Modifier.weight(1f)) {
                                                        Text(title, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                                                        Text(url, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                    }
                                                    IconButton(onClick = {
                                                        clipboard.setText(AnnotatedString(url))
                                                        scope.launch { snackbarHostState.showSnackbar("URL $title disalin") }
                                                    }) {
                                                        Icon(Icons.Rounded.ContentCopy, contentDescription = "Salin URL")
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
        }
    }
}

private fun generateSnippet(lang: String, fullUrl: String, key: String): String {
    val authKey = key.ifBlank { "kop_live_YOUR_API_KEY" }
    return when (lang) {
        "fetch" -> """
            fetch('$fullUrl', {
              headers: {
                'X-API-KEY': '$authKey',
                'Accept': 'application/json'
              }
            }).then(r => r.json()).then(console.log);
        """.trimIndent()
        "php" -> """
            ${'$'}ch = curl_init('$fullUrl');
            curl_setopt(${'$'}ch, CURLOPT_HTTPHEADER, ['X-API-KEY: $authKey', 'Accept: application/json']);
            curl_setopt(${'$'}ch, CURLOPT_RETURNTRANSFER, true);
            ${'$'}res = json_decode(curl_exec(${'$'}ch), true);
        """.trimIndent()
        "python" -> """
            import requests
            r = requests.get('$fullUrl', headers={'X-API-KEY': '$authKey', 'Accept': 'application/json'})
            print(r.json())
        """.trimIndent()
        else -> """
            curl -X GET "$fullUrl" \
              -H "X-API-KEY: $authKey" \
              -H "Accept: application/json"
        """.trimIndent()
    }
}
