package id.koperasipk.app.feature.admin

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Apps
import androidx.compose.material.icons.rounded.Assessment
import androidx.compose.material.icons.rounded.Dashboard
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.People
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import id.koperasipk.app.AppContainer
import id.koperasipk.app.core.datastore.UserSession
import id.koperasipk.app.core.designsystem.BottomNavItem
import id.koperasipk.app.core.designsystem.KoperasiBottomBar
import id.koperasipk.app.feature.admin.anggota.AdminAnggotaScreen
import id.koperasipk.app.feature.admin.anggota.AdminAnggotaViewModel
import id.koperasipk.app.feature.admin.apikeys.AdminApiIntegrationScreen
import id.koperasipk.app.feature.admin.apikeys.AdminApiIntegrationViewModel
import id.koperasipk.app.feature.admin.barang.AdminBarangScreen
import id.koperasipk.app.feature.admin.barang.AdminBarangViewModel
import id.koperasipk.app.feature.admin.dashboard.AdminDashboardScreen
import id.koperasipk.app.feature.admin.dashboard.AdminDashboardViewModel
import id.koperasipk.app.feature.admin.data.AdminApi
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.NetworkAdminRepository
import id.koperasipk.app.feature.admin.jabatan.AdminJabatanScreen
import id.koperasipk.app.feature.admin.jabatan.AdminJabatanViewModel
import id.koperasipk.app.feature.admin.laporan.AdminLaporanScreen
import id.koperasipk.app.feature.admin.laporan.AdminLaporanViewModel
import id.koperasipk.app.feature.admin.opname.AdminOpnameScreen
import id.koperasipk.app.feature.admin.opname.AdminOpnameViewModel
import id.koperasipk.app.feature.admin.pkm.AdminPkmScreen
import id.koperasipk.app.feature.admin.pkm.AdminPkmViewModel
import id.koperasipk.app.feature.admin.selisih.AdminSelisihScreen
import id.koperasipk.app.feature.admin.selisih.AdminSelisihViewModel
import id.koperasipk.app.feature.admin.setoran.AdminSetoranScreen
import id.koperasipk.app.feature.admin.setoran.AdminSetoranViewModel
import id.koperasipk.app.feature.admin.shu.AdminShuScreen
import id.koperasipk.app.feature.admin.shu.AdminShuViewModel
import id.koperasipk.app.feature.admin.tariktunai.AdminTarikTunaiScreen
import id.koperasipk.app.feature.admin.tariktunai.AdminTarikTunaiViewModel
import id.koperasipk.app.feature.akun.AkunSayaScreen

private object AdminRoutes {
    const val DASHBOARD = "admin/dashboard"
    const val BARANG = "admin/barang"
    const val ANGGOTA = "admin/anggota"
    const val LAPORAN = "admin/laporan"
    const val LAINNYA = "admin/lainnya"

    const val SHU = "admin/shu"
    const val PKM = "admin/pkm"
    const val OPNAME = "admin/opname"
    const val JABATAN = "admin/jabatan"
    const val SETORAN = "admin/setoran"
    const val TARIK_TUNAI = "admin/tariktunai"
    const val SELISIH = "admin/selisih"
    const val API_KEYS = "admin/apikeys"
    const val AKUN = "admin/akun"
}

@Composable
fun AdminRoot(
    container: AppContainer,
    session: UserSession,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val navController = rememberNavController()
    val repository: AdminRepository = remember(container) {
        NetworkAdminRepository(
            api = container.createService<AdminApi>(),
            json = container.json,
        )
    }

    val bottomItems = remember {
        listOf(
            BottomNavItem(
                route = AdminRoutes.DASHBOARD,
                label = "Dashboard",
                icon = Icons.Rounded.Dashboard,
            ),
            BottomNavItem(
                route = AdminRoutes.BARANG,
                label = "Barang",
                icon = Icons.Rounded.Inventory2,
            ),
            BottomNavItem(
                route = AdminRoutes.ANGGOTA,
                label = "Anggota",
                icon = Icons.Rounded.People,
            ),
            BottomNavItem(
                route = AdminRoutes.LAPORAN,
                label = "Laporan",
                icon = Icons.Rounded.Assessment,
            ),
            BottomNavItem(
                route = AdminRoutes.LAINNYA,
                label = "Lainnya",
                icon = Icons.Rounded.Apps,
            ),
        )
    }

    val bottomRoutes = remember {
        setOf(
            AdminRoutes.DASHBOARD,
            AdminRoutes.BARANG,
            AdminRoutes.ANGGOTA,
            AdminRoutes.LAPORAN,
            AdminRoutes.LAINNYA,
        )
    }

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = currentRoute == null || currentRoute in bottomRoutes

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        bottomBar = {
            if (showBottomBar) {
                KoperasiBottomBar(
                    items = bottomItems,
                    currentRoute = currentRoute ?: AdminRoutes.DASHBOARD,
                    onItemClick = { item -> switchBottomTab(navController, item.route) },
                )
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = AdminRoutes.DASHBOARD,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            composable(AdminRoutes.DASHBOARD) {
                val vm: AdminDashboardViewModel = viewModel(
                    factory = AdminDashboardViewModel.factory(repository),
                )
                AdminDashboardScreen(
                    viewModel = vm,
                    onNavigateBarang = { switchBottomTab(navController, AdminRoutes.BARANG) },
                    onNavigateAnggota = { switchBottomTab(navController, AdminRoutes.ANGGOTA) },
                    onNavigateLaporan = { switchBottomTab(navController, AdminRoutes.LAPORAN) },
                    onNavigateSetoran = { navigateSingle(navController, AdminRoutes.SETORAN) },
                    onNavigatePkm = { navigateSingle(navController, AdminRoutes.PKM) },
                    onNavigateShu = { navigateSingle(navController, AdminRoutes.SHU) },
                    onNavigateSelisih = { navigateSingle(navController, AdminRoutes.SELISIH) },
                )
            }

            composable(AdminRoutes.BARANG) {
                val vm: AdminBarangViewModel = viewModel(
                    factory = AdminBarangViewModel.factory(repository),
                )
                AdminBarangScreen(
                    viewModel = vm,
                    onNavigatePkm = { navigateSingle(navController, AdminRoutes.PKM) },
                )
            }

            composable(AdminRoutes.ANGGOTA) {
                val vm: AdminAnggotaViewModel = viewModel(
                    factory = AdminAnggotaViewModel.factory(repository),
                )
                AdminAnggotaScreen(viewModel = vm)
            }

            composable(AdminRoutes.LAPORAN) {
                val vm: AdminLaporanViewModel = viewModel(
                    factory = AdminLaporanViewModel.factory(repository),
                )
                AdminLaporanScreen(viewModel = vm)
            }

            composable(AdminRoutes.LAINNYA) {
                AdminLainnyaScreen(
                    session = session,
                    onNavigateShu = { navigateSingle(navController, AdminRoutes.SHU) },
                    onNavigatePkm = { navigateSingle(navController, AdminRoutes.PKM) },
                    onNavigateOpname = { navigateSingle(navController, AdminRoutes.OPNAME) },
                    onNavigateJabatan = { navigateSingle(navController, AdminRoutes.JABATAN) },
                    onNavigateSetoran = { navigateSingle(navController, AdminRoutes.SETORAN) },
                    onNavigateTarikTunai = { navigateSingle(navController, AdminRoutes.TARIK_TUNAI) },
                    onNavigateSelisih = { navigateSingle(navController, AdminRoutes.SELISIH) },
                    onNavigateApiIntegration = { navigateSingle(navController, AdminRoutes.API_KEYS) },
                    onNavigateAkun = { navigateSingle(navController, AdminRoutes.AKUN) },
                    onLogout = onLogout,
                )
            }

            composable(AdminRoutes.SHU) {
                val vm: AdminShuViewModel = viewModel(
                    factory = AdminShuViewModel.factory(repository),
                )
                AdminShuScreen(
                    viewModel = vm,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(AdminRoutes.PKM) {
                val vm: AdminPkmViewModel = viewModel(
                    factory = AdminPkmViewModel.factory(repository),
                )
                AdminPkmScreen(
                    viewModel = vm,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(AdminRoutes.OPNAME) {
                val vm: AdminOpnameViewModel = viewModel(
                    factory = AdminOpnameViewModel.factory(repository),
                )
                AdminOpnameScreen(
                    viewModel = vm,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(AdminRoutes.JABATAN) {
                val vm: AdminJabatanViewModel = viewModel(
                    factory = AdminJabatanViewModel.factory(repository),
                )
                AdminJabatanScreen(
                    viewModel = vm,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(AdminRoutes.SETORAN) {
                val vm: AdminSetoranViewModel = viewModel(
                    factory = AdminSetoranViewModel.factory(repository),
                )
                AdminSetoranScreen(
                    viewModel = vm,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(AdminRoutes.TARIK_TUNAI) {
                val vm: AdminTarikTunaiViewModel = viewModel(
                    factory = AdminTarikTunaiViewModel.factory(repository),
                )
                AdminTarikTunaiScreen(
                    viewModel = vm,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(AdminRoutes.SELISIH) {
                val vm: AdminSelisihViewModel = viewModel(
                    factory = AdminSelisihViewModel.factory(repository),
                )
                AdminSelisihScreen(
                    viewModel = vm,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(AdminRoutes.API_KEYS) {
                val vm: AdminApiIntegrationViewModel = viewModel(
                    factory = AdminApiIntegrationViewModel.factory(repository),
                )
                AdminApiIntegrationScreen(
                    viewModel = vm,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(AdminRoutes.AKUN) {
                AkunSayaScreen(
                    container = container,
                    session = session,
                    onLogout = onLogout,
                    onBack = { navController.popBackStack() },
                )
            }
        }
    }
}

private fun switchBottomTab(navController: NavHostController, route: String) {
    navController.navigate(route) {
        popUpTo(navController.graph.findStartDestination().id) {
            saveState = true
        }
        launchSingleTop = true
        restoreState = true
    }
}

private fun navigateSingle(navController: NavHostController, route: String) {
    navController.navigate(route) {
        launchSingleTop = true
    }
}
