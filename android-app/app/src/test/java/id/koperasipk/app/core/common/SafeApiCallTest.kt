package id.koperasipk.app.core.common

import id.koperasipk.app.core.network.NetworkModule
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.Serializable
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException

class SafeApiCallTest {

    @Test
    fun `safeApiCall returns Success when block succeeds`() = runTest {
        val result = safeApiCall { "ok" }
        assertEquals(ApiResult.Success("ok"), result)
    }

    @Test
    fun `safeApiCall maps IOException to Indonesian offline message`() = runTest {
        val result = safeApiCall { throw IOException("timeout") }
        assertTrue(result is ApiResult.Error)
        assertEquals("Tidak dapat terhubung ke server", (result as ApiResult.Error).message)
    }

    @Test
    fun `safeApiCall extracts first validation error from 422 errors object`() = runTest {
        val body = """
            {
              "message": "The given data was invalid.",
              "errors": {
                "nominal": ["Nominal minimal harus Rp 1.000"],
                "username": ["Username wajib diisi"]
              }
            }
        """.trimIndent()
        val exception = httpException(code = 422, body = body)

        val result = safeApiCall { throw exception }
        assertTrue(result is ApiResult.Error)
        val err = result as ApiResult.Error
        assertEquals(422, err.code)
        assertEquals("Nominal minimal harus Rp 1.000", err.message)
    }

    @Test
    fun `safeApiCall falls back to message on 422 without errors object`() = runTest {
        val body = """{"success":false,"message":"2 digit depan hutang tidak sesuai"}"""
        val exception = httpException(code = 422, body = body)

        val result = safeApiCall { throw exception }
        assertEquals("2 digit depan hutang tidak sesuai", (result as ApiResult.Error).message)
    }

    @Test
    fun `safeApiCall extracts message or error field on non-422 HttpException`() = runTest {
        val msgBody = """{"success":false,"message":"Username atau password salah"}"""
        val errResult = safeApiCall { throw httpException(401, msgBody) }
        assertEquals("Username atau password salah", (errResult as ApiResult.Error).message)

        val errorOnlyBody = """{"success":false,"error":"Data pengeluaran tidak ditemukan"}"""
        val errorOnlyResult = safeApiCall { throw httpException(404, errorOnlyBody) }
        assertEquals("Data pengeluaran tidak ditemukan", (errorOnlyResult as ApiResult.Error).message)
    }

    @Test
    fun `safeApiCall uses HTTP fallback when body is not JSON`() = runTest {
        val result = safeApiCall { throw httpException(502, "<html>Bad Gateway</html>") }
        assertEquals("Terjadi kesalahan pada server (502)", (result as ApiResult.Error).message)
    }

    @Test(expected = CancellationException::class)
    fun `safeApiCall always rethrows CancellationException`() = runTest {
        safeApiCall { throw CancellationException("cancelled") }
    }

    @Test
    fun `flexible numeric serializers decode numbers, numeric strings, blanks, and sqlite booleans`() {
        val payload = """
            {
              "price": "25000.50",
              "qty": "12",
              "nullableAmount": null,
              "active": 1,
              "verified": "false"
            }
        """.trimIndent()
        val decoded = NetworkModule.json.decodeFromString(SamplePayload.serializer(), payload)
        assertEquals(25000.50, decoded.price, 0.001)
        assertEquals(12, decoded.qty)
        assertNull(decoded.nullableAmount)
        assertTrue(decoded.active)
        assertEquals(false, decoded.verified)
    }

    private fun httpException(code: Int, body: String): HttpException {
        val responseBody = body.toResponseBody("application/json".toMediaType())
        return HttpException(Response.error<Any>(code, responseBody))
    }

    @Serializable
    private data class SamplePayload(
        @Serializable(with = FlexibleDoubleSerializer::class)
        val price: Double = 0.0,
        @Serializable(with = FlexibleIntSerializer::class)
        val qty: Int = 0,
        @Serializable(with = FlexibleNullableDoubleSerializer::class)
        val nullableAmount: Double? = null,
        @Serializable(with = FlexibleBooleanSerializer::class)
        val active: Boolean = false,
        @Serializable(with = FlexibleBooleanSerializer::class)
        val verified: Boolean = false,
    )
}
