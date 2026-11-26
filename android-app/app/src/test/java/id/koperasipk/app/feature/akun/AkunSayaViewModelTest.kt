package id.koperasipk.app.feature.akun

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
import id.koperasipk.app.feature.auth.AuthRepository
import id.koperasipk.app.testing.ApiTestFactory
import id.koperasipk.app.testing.MainDispatcherRule
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AkunSayaViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `loads me profile on init validates password and prevents double submit`() = runTest {
        val gate = CompletableDeferred<BasicResponse>()
        val fakeApi = FakeAkunApi(gate)
        val session = UserSession(token = "tok", role = "kasir", name = "Kasir", userId = 2, username = "kasir1")
        val sessionManager = SessionManager(InMemorySessionStorage(session), backgroundScope)
        val repo = AuthRepository(fakeApi, sessionManager, ApiTestFactory.json)

        val vm = AkunSayaViewModel(repo, session)
        advanceUntilIdle()

        assertEquals("Kasir Toko", vm.uiState.value.displayName)
        assertEquals(120000.0, vm.uiState.value.user?.saldo ?: 0.0, 0.01)

        // Validasi panjang password
        vm.onEvent(AkunSayaEvent.CurrentPasswordChanged("lama123"))
        vm.onEvent(AkunSayaEvent.NewPasswordChanged("123"))
        vm.onEvent(AkunSayaEvent.ConfirmPasswordChanged("123"))
        vm.onEvent(AkunSayaEvent.SubmitChangePassword)
        assertEquals("Password baru minimal 6 karakter", vm.uiState.value.passwordError)
        assertEquals(0, fakeApi.changePasswordCalls)

        // Validasi submit + double-submit guard
        vm.effects.test {
            vm.onEvent(AkunSayaEvent.NewPasswordChanged("baru123"))
            vm.onEvent(AkunSayaEvent.ConfirmPasswordChanged("baru123"))
            vm.onEvent(AkunSayaEvent.SubmitChangePassword)
            assertTrue(vm.uiState.value.isSavingPassword)

            vm.onEvent(AkunSayaEvent.SubmitChangePassword)
            assertEquals(1, fakeApi.changePasswordCalls)

            gate.complete(BasicResponse(success = true, message = "Password berhasil diubah"))
            advanceUntilIdle()

            assertEquals(AkunSayaEffect.ShowMessage("Password berhasil diubah"), awaitItem())
        }
        assertFalse(vm.uiState.value.isSavingPassword)
        assertEquals("", vm.uiState.value.currentPassword)
        assertNull(vm.uiState.value.passwordError)
    }

    private class InMemorySessionStorage(initial: UserSession?) : SessionStorage {
        private val flow = MutableStateFlow(initial)
        override val sessionFlow: Flow<UserSession?> = flow
        override suspend fun saveSession(session: UserSession) {
            flow.value = session
        }

        override suspend fun clearSession() {
            flow.value = null
        }
    }

    private class FakeAkunApi(
        private val changePasswordGate: CompletableDeferred<BasicResponse>,
    ) : KoperasiApi {
        var changePasswordCalls = 0

        override suspend fun login(request: LoginRequest): LoginResponse =
            LoginResponse(success = true)

        override suspend fun me(): MeResponse = MeResponse(
            success = true,
            user = UserDto(
                userId = 2,
                username = "kasir1",
                role = "kasir",
                anggotaId = 9,
                namaLengkap = "Kasir Toko",
                saldo = 120000.0,
                hutang = 0.0,
                shu = 45000.0,
                activeRoles = listOf("kasir", "anggota"),
            ),
        )

        override suspend fun logout(): BasicResponse = BasicResponse(success = true)

        override suspend fun changePassword(request: ChangePasswordRequest): BasicResponse {
            changePasswordCalls++
            return changePasswordGate.await()
        }

        override suspend fun resetPassword(request: ResetPasswordRequest): BasicResponse =
            BasicResponse(success = true)
    }
}
