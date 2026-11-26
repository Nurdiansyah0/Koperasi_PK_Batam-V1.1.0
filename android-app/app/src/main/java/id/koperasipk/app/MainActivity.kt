package id.koperasipk.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import id.koperasipk.app.core.designsystem.KoperasiTheme
import id.koperasipk.app.core.designsystem.LoadingState
import id.koperasipk.app.feature.admin.AdminRoot
import id.koperasipk.app.feature.anggota.AnggotaRoot
import id.koperasipk.app.feature.auth.AuthViewModel
import id.koperasipk.app.feature.auth.LoginScreen
import id.koperasipk.app.feature.auth.ResetPasswordScreen
import id.koperasipk.app.feature.auth.ResetPasswordViewModel
import id.koperasipk.app.feature.kasir.KasirRoot
import kotlinx.coroutines.launch

private object AuthRoutes {
    const val LOGIN = "login"
    const val RESET_PASSWORD = "reset-password"
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val container = (application as KoperasiApp).container

        setContent {
            KoperasiTheme {
                val isInitialized by container.sessionManager.isInitialized.collectAsStateWithLifecycle()
                val session by container.sessionManager.sessionFlow.collectAsStateWithLifecycle()
                val scope = rememberCoroutineScope()

                val currentSession = session
                when {
                    !isInitialized -> {
                        LoadingState(message = "Menyiapkan sesi...")
                    }
                    currentSession == null -> {
                        val authNavController = rememberNavController()
                        NavHost(
                            navController = authNavController,
                            startDestination = AuthRoutes.LOGIN,
                        ) {
                            composable(AuthRoutes.LOGIN) {
                                val authViewModel: AuthViewModel = viewModel(
                                    factory = AuthViewModel.factory(container.authRepository),
                                )
                                LoginScreen(
                                    viewModel = authViewModel,
                                    onForgotPassword = {
                                        authNavController.navigate(AuthRoutes.RESET_PASSWORD) {
                                            launchSingleTop = true
                                        }
                                    },
                                )
                            }
                            composable(AuthRoutes.RESET_PASSWORD) {
                                val resetViewModel: ResetPasswordViewModel = viewModel(
                                    factory = ResetPasswordViewModel.factory(container.authRepository),
                                )
                                ResetPasswordScreen(
                                    viewModel = resetViewModel,
                                    onBackToLogin = {
                                        authNavController.popBackStack()
                                    },
                                )
                            }
                        }
                    }
                    else -> {
                        val onLogout: () -> Unit = {
                            scope.launch { container.authRepository.logout() }
                        }
                        when (currentSession.role.lowercase()) {
                            "admin" -> AdminRoot(
                                container = container,
                                session = currentSession,
                                onLogout = onLogout,
                            )
                            "kasir" -> KasirRoot(
                                container = container,
                                session = currentSession,
                                onLogout = onLogout,
                            )
                            else -> AnggotaRoot(
                                container = container,
                                session = currentSession,
                                onLogout = onLogout,
                            )
                        }
                    }
                }
            }
        }
    }
}
