package id.koperasipk.app.feature.auth

import app.cash.turbine.test
import id.koperasipk.app.core.datastore.SessionManager
import id.koperasipk.app.core.datastore.SessionStorage
import id.koperasipk.app.core.datastore.UserSession
import id.koperasipk.app.core.network.BasicResponse
import id.koperasipk.app.core.network.ChangePasswordRequest
import id.koperasipk.app.core.network.KoperasiApi
import id.koperasipk.app.core.network.LoginRequest
import id.koperasipk.app.core.network.LoginResponse
import id.koperasipk.app.core.network.MeResponse
import id.koperasipk.app.core.network.ResetPasswordRequest
import id.koperasipk.app.core.network.UserDto
import id.koperasipk.app.testing.ApiTestFactory
import id.koperasipk.app.testing.MainDispatcherRule
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException

@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `empty username or password sets validation error without calling API`() = runTest {
        val fakeApi = FakeKoperasiApi()
        val viewModel = createViewModel(this, fakeApi)

        viewModel.onEvent(AuthEvent.SubmitLogin)

        assertEquals("Username dan password wajib diisi", viewModel.uiState.value.errorMessage)
        assertEquals(0, fakeApi.loginCalls)
    }

    @Test
    fun `successful login saves session clears password and emits welcome effect`() = runTest {
        val fakeApi = FakeKoperasiApi().apply {
            loginHandler = {
                LoginResponse(
                    success = true,
                    message = "Login berhasil",
                    token = "1|sanctum-token-abc",
                    user = UserDto(
                        userId = 7,
                        username = "nurdiansyah",
                        role = "anggota",
                        anggotaId = 15,
                        namaLengkap = "Nurdiansyah",
                        saldo = 50000.0,
                        hutang = 10000.0,
                        shu = 25000.0,
                        activeRoles = listOf("anggota"),
                    ),
                )
            }
        }
        val storage = InMemorySessionStorage()
        val sessionManager = SessionManager(storage, backgroundScope)
        val viewModel = AuthViewModel(AuthRepository(fakeApi, sessionManager, ApiTestFactory.json))

        viewModel.effects.test {
            viewModel.onEvent(AuthEvent.UsernameChanged("nurdiansyah"))
            viewModel.onEvent(AuthEvent.PasswordChanged("rahasia"))
            viewModel.onEvent(AuthEvent.SubmitLogin)
            advanceUntilIdle()

            assertEquals(AuthEffect.ShowMessage("Selamat datang, Nurdiansyah"), awaitItem())
        }

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertEquals("", state.password)
        assertNull(state.errorMessage)
        assertEquals("1|sanctum-token-abc", sessionManager.currentToken())
        assertEquals(15, sessionManager.currentSession?.anggotaId)
        assertEquals("anggota", sessionManager.currentSession?.role)
    }

    @Test
    fun `invalid credentials surfaces Laravel 401 message`() = runTest {
        val fakeApi = FakeKoperasiApi().apply {
            loginHandler = {
                throw httpException(401, """{"success":false,"message":"Username atau password salah"}""")
            }
        }
        val viewModel = createViewModel(this, fakeApi)

        viewModel.onEvent(AuthEvent.UsernameChanged("budi"))
        viewModel.onEvent(AuthEvent.PasswordChanged("salah"))
        viewModel.onEvent(AuthEvent.SubmitLogin)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertEquals("Username atau password salah", state.errorMessage)
    }

    @Test
    fun `network disconnection maps to Indonesian offline message`() = runTest {
        val fakeApi = FakeKoperasiApi().apply {
            loginHandler = { throw IOException("Failed to connect") }
        }
        val viewModel = createViewModel(this, fakeApi)

        viewModel.onEvent(AuthEvent.UsernameChanged("budi"))
        viewModel.onEvent(AuthEvent.PasswordChanged("password"))
        viewModel.onEvent(AuthEvent.SubmitLogin)
        advanceUntilIdle()

        assertEquals("Tidak dapat terhubung ke server", viewModel.uiState.value.errorMessage)
    }

    @Test
    fun `double submit guard ignores second login tap while request is in flight`() = runTest {
        val gate = CompletableDeferred<LoginResponse>()
        val fakeApi = FakeKoperasiApi().apply {
            loginHandler = { gate.await() }
        }
        val viewModel = createViewModel(this, fakeApi)

        viewModel.onEvent(AuthEvent.UsernameChanged("kasir"))
        viewModel.onEvent(AuthEvent.PasswordChanged("password"))
        viewModel.onEvent(AuthEvent.SubmitLogin)
        assertTrue(viewModel.uiState.value.isLoading)

        viewModel.onEvent(AuthEvent.SubmitLogin)
        assertEquals(1, fakeApi.loginCalls)

        gate.complete(
            LoginResponse(
                success = true,
                token = "tok-1",
                user = UserDto(userId = 1, username = "kasir", role = "kasir"),
            )
        )
        advanceUntilIdle()
        assertFalse(viewModel.uiState.value.isLoading)
        assertEquals(1, fakeApi.loginCalls)
    }

    @Test
    fun `reset password validates input formats and handles 429 rate limit`() = runTest {
        val fakeApi = FakeKoperasiApi().apply {
            resetHandler = {
                throw httpException(429, """{"message":"Too Many Attempts."}""")
            }
        }
        val storage = InMemorySessionStorage()
        val sessionManager = SessionManager(storage, backgroundScope)
        val resetVm = ResetPasswordViewModel(AuthRepository(fakeApi, sessionManager, ApiTestFactory.json))

        resetVm.onEvent(ResetPasswordEvent.UsernameChanged("budi"))
        resetVm.onEvent(ResetPasswordEvent.DigitHutangChanged("3"))
        resetVm.onEvent(ResetPasswordEvent.SubmitReset)
        assertTrue(resetVm.uiState.value.errorMessage?.contains("2 angka") == true)
        assertEquals(0, fakeApi.resetCalls)

        resetVm.onEvent(ResetPasswordEvent.DigitHutangChanged("35"))
        resetVm.onEvent(ResetPasswordEvent.DigitShuChanged("750"))
        resetVm.onEvent(ResetPasswordEvent.PasswordBaruChanged("123456"))
        resetVm.onEvent(ResetPasswordEvent.ConfirmPasswordChanged("123456"))
        resetVm.onEvent(ResetPasswordEvent.SubmitReset)
        advanceUntilIdle()

        assertEquals(1, fakeApi.resetCalls)
        assertTrue(resetVm.uiState.value.errorMessage?.contains("tunggu 1 menit") == true)
    }

    private fun createViewModel(scope: TestScope, api: KoperasiApi): AuthViewModel {
        val sessionManager = SessionManager(InMemorySessionStorage(), scope.backgroundScope)
        return AuthViewModel(AuthRepository(api, sessionManager, ApiTestFactory.json))
    }

    private fun httpException(code: Int, jsonBody: String): HttpException {
        return HttpException(
            Response.error<Any>(
                code,
                jsonBody.toResponseBody("application/json".toMediaType()),
            )
        )
    }

    private class InMemorySessionStorage : SessionStorage {
        private val flow = MutableStateFlow<UserSession?>(null)
        override val sessionFlow: Flow<UserSession?> = flow
        override suspend fun saveSession(session: UserSession) {
            flow.value = session
        }

        override suspend fun clearSession() {
            flow.value = null
        }
    }

    private class FakeKoperasiApi : KoperasiApi {
        var loginCalls = 0
        var resetCalls = 0
        var loginHandler: suspend (LoginRequest) -> LoginResponse = {
            LoginResponse(success = false, message = "Not stubbed")
        }
        var resetHandler: suspend (ResetPasswordRequest) -> BasicResponse = {
            BasicResponse(success = true, message = "OK")
        }

        override suspend fun login(request: LoginRequest): LoginResponse {
            loginCalls++
            return loginHandler(request)
        }

        override suspend fun me(): MeResponse = MeResponse(success = true)
        override suspend fun logout(): BasicResponse = BasicResponse(success = true)
        override suspend fun changePassword(request: ChangePasswordRequest): BasicResponse =
            BasicResponse(success = true)

        override suspend fun resetPassword(request: ResetPasswordRequest): BasicResponse {
            resetCalls++
            return resetHandler(request)
        }
    }
}
