package id.koperasipk.app.feature.kasir

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountCircle
import androidx.compose.material.icons.rounded.Dashboard
import androidx.compose.material.icons.rounded.GridView
import androidx.compose.material.icons.rounded.PointOfSale
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import id.koperasipk.app.AppContainer
import id.koperasipk.app.core.datastore.UserSession
import id.koperasipk.app.core.designsystem.BottomNavItem
import id.koperasipk.app.core.designsystem.KoperasiBottomBar
import id.koperasipk.app.core.notification.OrderNotificationHelper
import id.koperasipk.app.feature.akun.AkunSayaScreen
import id.koperasipk.app.feature.kasir.components.OrderAlertDialog
import id.koperasipk.app.feature.kasir.data.KasirApi
import id.koperasipk.app.feature.kasir.data.NetworkKasirRepository
import id.koperasipk.app.feature.kasir.notification.KasirOrderMonitorService
import id.koperasipk.app.feature.kasir.ui.dashboard.KasirDashboardScreen
import id.koperasipk.app.feature.kasir.ui.dashboard.KasirDashboardViewModel
import id.koperasipk.app.feature.kasir.ui.hutang.PembayaranHutangScreen
import id.koperasipk.app.feature.kasir.ui.hutang.PembayaranHutangViewModel
import id.koperasipk.app.feature.kasir.ui.lainnya.KasirLainnyaScreen
import id.koperasipk.app.feature.kasir.ui.pesanan.PesananAnggotaScreen
import id.koperasipk.app.feature.kasir.ui.pesanan.PesananAnggotaViewModel
import id.koperasipk.app.feature.kasir.ui.pos.PosScreen
import id.koperasipk.app.feature.kasir.ui.pos.PosViewModel
import id.koperasipk.app.feature.kasir.ui.riwayat.RiwayatTransaksiScreen
import id.koperasipk.app.feature.kasir.ui.riwayat.RiwayatTransaksiViewModel
import id.koperasipk.app.feature.kasir.ui.serahterima.BuatSerahTerimaScreen
import id.koperasipk.app.feature.kasir.ui.serahterima.BuatSerahTerimaViewModel
import id.koperasipk.app.feature.kasir.ui.serahterima.SerahTerimaScreen
import id.koperasipk.app.feature.kasir.ui.serahterima.SerahTerimaViewModel
import id.koperasipk.app.feature.kasir.ui.setoran.SetoranKasirScreen
import id.koperasipk.app.feature.kasir.ui.setoran.SetoranKasirViewModel
import id.koperasipk.app.feature.kasir.ui.tariktunai.TarikTunaiScreen
import id.koperasipk.app.feature.kasir.ui.tariktunai.TarikTunaiViewModel

private object KasirRoutes {
    const val DASHBOARD = "kasir/dashboard"
    const val POS = "kasir/pos"
    const val PESANAN = "kasir/pesanan"
    const val LAINNYA = "kasir/lainnya"
    const val AKUN = "kasir/akun"

    const val HUTANG = "kasir/hutang"
    const val RIWAYAT = "kasir/riwayat"
    const val SETORAN = "kasir/setoran"
    const val TARIK_TUNAI = "kasir/tarik-tunai"
    const val SERAH_TERIMA = "kasir/serah-terima"
    const val BUAT_SERAH_TERIMA = "kasir/serah-terima/buat"
}

@Composable
fun KasirRoot(
    container: AppContainer,
    session: UserSession,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val repository = remember(container) {
        NetworkKasirRepository(
            api = container.createService<KasirApi>(),
            json = container.json,
        )
    }
    val shellViewModel: KasirShellViewModel = viewModel(
        key = "kasir_shell_${session.userId}_${session.username}",
        factory = KasirShellViewModel.factory(repository),
    )
    val shellState by shellViewModel.uiState.collectAsStateWithLifecycle()
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val lifecycleOwner = LocalLifecycleOwner.current
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current

    // 1. Request Runtime Permission POST_NOTIFICATIONS untuk Android 13+ (API 33+)
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            KasirOrderMonitorService.start(context)
        }
    }

    LaunchedEffect(Unit) {
        OrderNotificationHelper.createNotificationChannels(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val isGranted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!isGranted) {
                permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                KasirOrderMonitorService.start(context)
            }
        } else {
            KasirOrderMonitorService.start(context)
        }
    }

    // 2. Memicu Heads-Up System Notification dari status bar atas layar & bangunkan layar ponsel
    LaunchedEffect(shellState.activeOrderAlert) {
        shellState.activeOrderAlert?.let { order ->
            OrderNotificationHelper.notifyIncomingOrder(context, order)
        }
    }

    // Lifecycle-aware polling /kasir/latest-pending-orders setiap 15 detik hanya saat STARTED
    LaunchedEffect(lifecycleOwner, shellViewModel) {
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            shellViewModel.runPollingLoop()
        }
    }

    val navigateToTopLevel: (String) -> Unit = remember(navController) {
        { route ->
            navController.navigate(route) {
                popUpTo(navController.graph.findStartDestination().id) {
                    saveState = true
                }
                launchSingleTop = true
                restoreState = true
            }
        }
    }

    LaunchedEffect(shellViewModel) {
        shellViewModel.effects.collect { effect ->
            when (effect) {
                KasirShellEffect.NavigateToPesanan -> navigateToTopLevel(KasirRoutes.PESANAN)
                is KasirShellEffect.ShowMessage -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    OrderAlertDialog(
        order = shellState.activeOrderAlert,
        onDismiss = { shellViewModel.onEvent(KasirShellEvent.DismissOrderAlert) },
        onOpenOrders = { shellViewModel.onEvent(KasirShellEvent.OpenOrdersFromAlert) },
    )

    val bottomItems = remember(shellState.pendingOrdersCount) {
        listOf(
            BottomNavItem(
                route = KasirRoutes.DASHBOARD,
                label = "Dashboard",
                icon = Icons.Rounded.Dashboard,
            ),
            BottomNavItem(
                route = KasirRoutes.POS,
                label = "POS",
                icon = Icons.Rounded.PointOfSale,
            ),
            BottomNavItem(
                route = KasirRoutes.PESANAN,
                label = "Pesanan",
                icon = Icons.Rounded.ShoppingBag,
                badgeCount = shellState.pendingOrdersCount,
            ),
            BottomNavItem(
                route = KasirRoutes.LAINNYA,
                label = "Lainnya",
                icon = Icons.Rounded.GridView,
            ),
            BottomNavItem(
                route = KasirRoutes.AKUN,
                label = "Akun",
                icon = Icons.Rounded.AccountCircle,
            ),
        )
    }

    val showBottomBar = currentRoute in setOf(
        KasirRoutes.DASHBOARD,
        KasirRoutes.POS,
        KasirRoutes.PESANAN,
        KasirRoutes.LAINNYA,
        KasirRoutes.AKUN,
    )

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (showBottomBar) {
                KoperasiBottomBar(
                    items = bottomItems,
                    currentRoute = currentRoute,
                    onItemClick = { item -> navigateToTopLevel(item.route) },
                )
            }
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            NavHost(
                navController = navController,
                startDestination = KasirRoutes.DASHBOARD,
            ) {
                composable(KasirRoutes.DASHBOARD) {
                    val vm: KasirDashboardViewModel = viewModel(
                        factory = KasirDashboardViewModel.factory(repository),
                    )
                    KasirDashboardScreen(
                        viewModel = vm,
                        session = session,
                        onOpenPos = { navigateToTopLevel(KasirRoutes.POS) },
                        onOpenPesanan = { navigateToTopLevel(KasirRoutes.PESANAN) },
                        onOpenHutang = { navController.navigate(KasirRoutes.HUTANG) },
                        onOpenSetoran = { navController.navigate(KasirRoutes.SETORAN) },
                        onOpenTarikTunai = { navController.navigate(KasirRoutes.TARIK_TUNAI) },
                        onOpenSerahTerima = { navController.navigate(KasirRoutes.SERAH_TERIMA) },
                        onOpenBuatSerahTerima = { navController.navigate(KasirRoutes.BUAT_SERAH_TERIMA) },
                        onOpenRiwayat = { navController.navigate(KasirRoutes.RIWAYAT) },
                    )
                }

                composable(KasirRoutes.POS) {
                    val vm: PosViewModel = viewModel(
                        factory = PosViewModel.factory(repository),
                    )
                    PosScreen(viewModel = vm)
                }

                composable(KasirRoutes.PESANAN) {
                    val vm: PesananAnggotaViewModel = viewModel(
                        factory = PesananAnggotaViewModel.factory(repository),
                    )
                    PesananAnggotaScreen(
                        viewModel = vm,
                        orderRefreshTick = shellState.orderRefreshTick,
                        onTriggerTestNotification = {
                            shellViewModel.onEvent(KasirShellEvent.TriggerTestNotification)
                        },
                        onOrdersMutated = {
                            shellViewModel.onEvent(KasirShellEvent.PollNow)
                        },
                    )
                }

                composable(KasirRoutes.LAINNYA) {
                    KasirLainnyaScreen(
                        onOpenPembayaranHutang = { navController.navigate(KasirRoutes.HUTANG) },
                        onOpenTarikTunai = { navController.navigate(KasirRoutes.TARIK_TUNAI) },
                        onOpenSerahTerima = { navController.navigate(KasirRoutes.SERAH_TERIMA) },
                        onOpenSetoran = { navController.navigate(KasirRoutes.SETORAN) },
                        onOpenRiwayat = { navController.navigate(KasirRoutes.RIWAYAT) },
                    )
                }

                composable(KasirRoutes.AKUN) {
                    AkunSayaScreen(
                        container = container,
                        session = session,
                        onLogout = {
                            KasirOrderMonitorService.stop(context)
                            onLogout()
                        },
                    )
                }

                composable(KasirRoutes.HUTANG) {
                    val vm: PembayaranHutangViewModel = viewModel(
                        factory = PembayaranHutangViewModel.factory(repository),
                    )
                    PembayaranHutangScreen(
                        viewModel = vm,
                        onBack = { navController.popBackStack() },
                    )
                }

                composable(KasirRoutes.RIWAYAT) {
                    val vm: RiwayatTransaksiViewModel = viewModel(
                        factory = RiwayatTransaksiViewModel.factory(repository),
                    )
                    RiwayatTransaksiScreen(
                        viewModel = vm,
                        onBack = { navController.popBackStack() },
                    )
                }

                composable(KasirRoutes.SETORAN) {
                    val vm: SetoranKasirViewModel = viewModel(
                        factory = SetoranKasirViewModel.factory(repository),
                    )
                    SetoranKasirScreen(
                        viewModel = vm,
                        onBack = { navController.popBackStack() },
                    )
                }

                composable(KasirRoutes.TARIK_TUNAI) {
                    val vm: TarikTunaiViewModel = viewModel(
                        factory = TarikTunaiViewModel.factory(repository),
                    )
                    TarikTunaiScreen(
                        viewModel = vm,
                        onBack = { navController.popBackStack() },
                    )
                }

                composable(KasirRoutes.SERAH_TERIMA) {
                    val vm: SerahTerimaViewModel = viewModel(
                        factory = SerahTerimaViewModel.factory(repository),
                    )
                    SerahTerimaScreen(
                        viewModel = vm,
                        onBack = { navController.popBackStack() },
                        onOpenCreate = { navController.navigate(KasirRoutes.BUAT_SERAH_TERIMA) },
                        onOpenSetoran = { navController.navigate(KasirRoutes.SETORAN) },
                    )
                }

                composable(KasirRoutes.BUAT_SERAH_TERIMA) {
                    val vm: BuatSerahTerimaViewModel = viewModel(
                        factory = BuatSerahTerimaViewModel.factory(repository),
                    )
                    BuatSerahTerimaScreen(
                        viewModel = vm,
                        onBack = { navController.popBackStack() },
                        onSuccess = {
                            navController.popBackStack()
                        },
                    )
                }
            }
        }
    }
}
