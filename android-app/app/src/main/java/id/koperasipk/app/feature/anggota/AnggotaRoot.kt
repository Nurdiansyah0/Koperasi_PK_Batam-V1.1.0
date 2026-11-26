package id.koperasipk.app.feature.anggota

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
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
import id.koperasipk.app.feature.akun.AkunSayaScreen

private object AnggotaRoutes {
    const val BERANDA = "anggota/beranda"
    const val BELANJA = "anggota/belanja"
    const val RIWAYAT = "anggota/riwayat"
    const val AKUN = "anggota/akun"
    const val BAYAR_HUTANG = "anggota/bayar-hutang"
    const val TARIK_TUNAI = "anggota/tarik-tunai"
    const val PROFIL = "anggota/profil"
}

@Composable
fun AnggotaRoot(
    container: AppContainer,
    session: UserSession,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val navController = rememberNavController()
    val repository = remember(container) { createAnggotaRepository(container) }
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val bottomItems = remember {
        listOf(
            BottomNavItem(
                route = AnggotaRoutes.BERANDA,
                label = "Beranda",
                icon = Icons.Outlined.Home,
                selectedIcon = Icons.Rounded.Home,
            ),
            BottomNavItem(
                route = AnggotaRoutes.BELANJA,
                label = "Belanja",
                icon = Icons.Outlined.ShoppingCart,
                selectedIcon = Icons.Rounded.ShoppingCart,
            ),
            BottomNavItem(
                route = AnggotaRoutes.RIWAYAT,
                label = "Riwayat",
                icon = Icons.Outlined.History,
                selectedIcon = Icons.Rounded.History,
            ),
            BottomNavItem(
                route = AnggotaRoutes.AKUN,
                label = "Akun",
                icon = Icons.Outlined.Person,
                selectedIcon = Icons.Rounded.Person,
            ),
        )
    }

    val topLevelRoutes = remember {
        setOf(
            AnggotaRoutes.BERANDA,
            AnggotaRoutes.BELANJA,
            AnggotaRoutes.RIWAYAT,
            AnggotaRoutes.AKUN,
        )
    }

    val navigateTab: (String) -> Unit = { route ->
        navController.navigate(route) {
            popUpTo(navController.graph.findStartDestination().id) {
                saveState = true
            }
            launchSingleTop = true
            restoreState = true
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        bottomBar = {
            if (currentRoute == null || currentRoute in topLevelRoutes) {
                KoperasiBottomBar(
                    items = bottomItems,
                    currentRoute = currentRoute,
                    onItemClick = { item -> navigateTab(item.route) },
                )
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = AnggotaRoutes.BERANDA,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding),
        ) {
            composable(AnggotaRoutes.BERANDA) {
                val vm: AnggotaDashboardViewModel = viewModel(
                    factory = AnggotaDashboardViewModel.factory(repository),
                )
                AnggotaDashboardScreen(
                    viewModel = vm,
                    session = session,
                    onNavigateBelanja = { navigateTab(AnggotaRoutes.BELANJA) },
                    onNavigateBayarHutang = {
                        navController.navigate(AnggotaRoutes.BAYAR_HUTANG) { launchSingleTop = true }
                    },
                    onNavigateTarikTunai = {
                        navController.navigate(AnggotaRoutes.TARIK_TUNAI) { launchSingleTop = true }
                    },
                    onNavigateProfil = {
                        navController.navigate(AnggotaRoutes.PROFIL) { launchSingleTop = true }
                    },
                    onNavigateRiwayat = { navigateTab(AnggotaRoutes.RIWAYAT) },
                )
            }

            composable(AnggotaRoutes.BELANJA) {
                val vm: BelanjaViewModel = viewModel(
                    factory = BelanjaViewModel.factory(repository),
                )
                BelanjaScreen(
                    viewModel = vm,
                    session = session,
                )
            }

            composable(AnggotaRoutes.RIWAYAT) {
                val vm: RiwayatViewModel = viewModel(
                    factory = RiwayatViewModel.factory(repository),
                )
                RiwayatScreen(viewModel = vm)
            }

            composable(AnggotaRoutes.AKUN) {
                AkunSayaScreen(
                    container = container,
                    session = session,
                    onLogout = onLogout,
                    onBack = null,
                )
            }

            composable(AnggotaRoutes.BAYAR_HUTANG) {
                val vm: BayarHutangViewModel = viewModel(
                    factory = BayarHutangViewModel.factory(repository),
                )
                BayarHutangScreen(
                    viewModel = vm,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(AnggotaRoutes.TARIK_TUNAI) {
                val vm: TarikTunaiViewModel = viewModel(
                    factory = TarikTunaiViewModel.factory(repository),
                )
                TarikTunaiScreen(
                    viewModel = vm,
                    onBack = { navController.popBackStack() },
                    onNavigateBelanja = {
                        navController.popBackStack()
                        navigateTab(AnggotaRoutes.BELANJA)
                    },
                )
            }

            composable(AnggotaRoutes.PROFIL) {
                val vm: ProfilAnggotaViewModel = viewModel(
                    factory = ProfilAnggotaViewModel.factory(
                        repository = repository,
                        initialUsername = session.username,
                    ),
                )
                ProfilAnggotaScreen(
                    viewModel = vm,
                    session = session,
                    onBack = { navController.popBackStack() },
                    onNavigateAkun = {
                        navController.popBackStack()
                        navigateTab(AnggotaRoutes.AKUN)
                    },
                )
            }
        }
    }
}
