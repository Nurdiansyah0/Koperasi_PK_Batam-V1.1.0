package id.koperasipk.app.core.datastore

import app.cash.turbine.test
import id.koperasipk.app.core.network.KoperasiApi
import id.koperasipk.app.core.network.LoginRequest
import id.koperasipk.app.core.network.NetworkModule
import id.koperasipk.app.testing.ApiTestFactory
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException

class SessionManagerTest {

    private lateinit var server: MockWebServer

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `initializes from storage and keeps synchronous token cache in sync`() = runTest {
        val initial = UserSession(token = "saved-token", role = "kasir", name = "Tanggang")
        val storage = FakeSessionStorage(initial)
        val manager = SessionManager(storage = storage, scope = backgroundScope)

        manager.sessionFlow.test {
            val emitted = awaitItem() ?: awaitItem()
            assertEquals(initial, emitted)
            assertEquals("saved-token", manager.currentToken())
            assertTrue(manager.isInitialized.value)
        }

        val updated = UserSession(token = "new-token", role = "admin", name = "Admin")
        manager.saveSession(updated)
        assertEquals("new-token", manager.currentToken())
        assertEquals(updated, storage.lastSaved)

        manager.clearSession()
        assertNull(manager.currentToken())
        assertNull(storage.lastSaved)
    }

    @Test
    fun `authenticated 401 clears session automatically through AuthInterceptor`() = runTest {
        val session = UserSession(token = "expired-sanctum-token", role = "anggota", name = "Budi")
        val storage = FakeSessionStorage(session)
        val manager = SessionManager(storage = storage, scope = backgroundScope)

        manager.sessionFlow.test {
            val loaded = requireNotNull(awaitItem() ?: awaitItem())
            assertEquals("expired-sanctum-token", loaded.token)

            val client = NetworkModule.createOkHttpClient(manager)
            val api = ApiTestFactory.createService<KoperasiApi>(server = server, okHttpClient = client)

            server.enqueue(ApiTestFactory.jsonResponse("""{"success":false,"message":"Unauthenticated."}""", 401))

            var caught401 = false
            try {
                api.me()
            } catch (e: HttpException) {
                caught401 = (e.code() == 401)
            }
            assertTrue(caught401)

            val recorded = server.takeRequest()
            assertEquals("Bearer expired-sanctum-token", recorded.getHeader("Authorization"))

            val cleared = awaitItem()
            assertNull(cleared)
            assertNull(manager.currentToken())
        }
    }

    @Test
    fun `401 on login endpoint does not attach bearer token or clear unrelated session`() = runTest {
        val storage = FakeSessionStorage(null)
        val manager = SessionManager(storage = storage, scope = backgroundScope)
        val client = NetworkModule.createOkHttpClient(manager)
        val api = ApiTestFactory.createService<KoperasiApi>(server = server, okHttpClient = client)

        server.enqueue(ApiTestFactory.jsonResponse("""{"success":false,"message":"Username atau password salah"}""", 401))

        var statusCode = 0
        try {
            api.login(LoginRequest("salah", "salah"))
        } catch (e: HttpException) {
            statusCode = e.code()
        }

        assertEquals(401, statusCode)
        val recorded = server.takeRequest()
        assertNull(recorded.getHeader("Authorization"))
    }

    private class FakeSessionStorage(initial: UserSession?) : SessionStorage {
        private val flow = MutableStateFlow(initial)
        var lastSaved: UserSession? = initial
            private set

        override val sessionFlow: Flow<UserSession?> = flow

        override suspend fun saveSession(session: UserSession) {
            lastSaved = session
            flow.value = session
        }

        override suspend fun clearSession() {
            lastSaved = null
            flow.value = null
        }
    }
}
