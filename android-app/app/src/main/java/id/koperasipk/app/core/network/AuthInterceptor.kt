package id.koperasipk.app.core.network

import id.koperasipk.app.core.datastore.SessionManager
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Menyisipkan header Accept: application/json dan Authorization: Bearer <token>
 * secara sinkron dari cache in-memory [SessionManager] tanpa `runBlocking`.
 * Jika panggilan terautentikasi menerima HTTP 401, sesi langsung dibersihkan.
 */
class AuthInterceptor(
    private val sessionManager: SessionManager,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val path = original.url.encodedPath
        val isPublicAuthRoute = path.endsWith("/login") ||
            path.endsWith("/reset-password") ||
            path.endsWith("/ping")

        val token = if (isPublicAuthRoute) null else sessionManager.currentToken()
        val hasAuthHeader = !token.isNullOrBlank()

        val requestBuilder = original.newBuilder()
            .header("Accept", "application/json")

        if (hasAuthHeader) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        val response = chain.proceed(requestBuilder.build())
        if (response.code == 401 && hasAuthHeader) {
            sessionManager.onUnauthorized(token)
        }
        return response
    }
}
