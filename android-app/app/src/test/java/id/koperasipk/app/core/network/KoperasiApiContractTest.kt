package id.koperasipk.app.core.network

import id.koperasipk.app.testing.ApiTestFactory
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class KoperasiApiContractTest {

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
    fun `parses Laravel login response including string decimals and appended flags`() = runBlocking {
        val laravelLoginJson = """
            {
              "success": true,
              "message": "Login berhasil",
              "token": "12|laravelSanctumTokenXYZ",
              "user": {
                "user_id": 5,
                "username": "admin",
                "role": "admin",
                "active_roles": ["admin", "anggota"],
                "is_admin": true,
                "is_kasir": 0,
                "anggota_id": 3,
                "nama_lengkap": "Pengurus Koperasi",
                "saldo": "250000.00",
                "hutang": "0.00",
                "shu": 125000,
                "persetujuan_shu_master_at": null
              }
            }
        """.trimIndent()
        server.enqueue(ApiTestFactory.jsonResponse(laravelLoginJson, 200))

        val api = ApiTestFactory.createService<KoperasiApi>(server)
        val response = api.login(LoginRequest(username = "admin", password = "password"))

        assertTrue(response.success)
        assertEquals("12|laravelSanctumTokenXYZ", response.token)
        val user = requireNotNull(response.user)
        assertEquals(5, user.resolvedUserId)
        assertEquals("Pengurus Koperasi", user.displayName)
        assertEquals(250000.0, user.saldo, 0.001)
        assertEquals(125000.0, user.shu, 0.001)
        assertTrue(user.isAdmin)
        assertEquals(false, user.isKasir)
        assertEquals(listOf("admin", "anggota"), user.activeRoles)
    }

    @Test
    fun `changePassword and resetPassword send expected snake_case fields`() = runBlocking {
        server.enqueue(ApiTestFactory.jsonResponse("""{"success":true,"message":"Password berhasil diubah"}""", 200))
        server.enqueue(ApiTestFactory.jsonResponse("""{"success":true,"message":"Password berhasil diperbarui!"}""", 200))

        val api = ApiTestFactory.createService<KoperasiApi>(server)

        val cp = api.changePassword(ChangePasswordRequest(currentPassword = "old", newPassword = "new123"))
        assertTrue(cp.success)
        val cpBody = server.takeRequest().body.readUtf8()
        assertTrue(cpBody.contains("\"current_password\":\"old\""))
        assertTrue(cpBody.contains("\"new_password\":\"new123\""))

        val rp = api.resetPassword(
            ResetPasswordRequest(
                username = "budi",
                digitHutang = "35",
                digitShu = "750",
                passwordBaru = "new123",
            )
        )
        assertTrue(rp.success)
        val rpBody = server.takeRequest().body.readUtf8()
        assertTrue(rpBody.contains("\"digit_hutang\":\"35\""))
        assertTrue(rpBody.contains("\"digit_shu\":\"750\""))
        assertTrue(rpBody.contains("\"password_baru\":\"new123\""))
    }
}
