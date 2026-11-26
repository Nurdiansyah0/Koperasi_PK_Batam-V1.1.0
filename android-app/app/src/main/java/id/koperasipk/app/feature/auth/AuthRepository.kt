package id.koperasipk.app.feature.auth

import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.common.safeApiCall
import id.koperasipk.app.core.datastore.SessionManager
import id.koperasipk.app.core.datastore.UserSession
import id.koperasipk.app.core.network.ChangePasswordRequest
import id.koperasipk.app.core.network.KoperasiApi
import id.koperasipk.app.core.network.LoginRequest
import id.koperasipk.app.core.network.NetworkModule
import id.koperasipk.app.core.network.ResetPasswordRequest
import id.koperasipk.app.core.network.UserDto
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.json.Json

class AuthRepository(
    private val api: KoperasiApi,
    private val sessionManager: SessionManager,
    private val json: Json = NetworkModule.json,
) {
    val sessionFlow: StateFlow<UserSession?> = sessionManager.sessionFlow

    suspend fun login(username: String, password: String): ApiResult<UserSession> {
        val result = safeApiCall(json) {
            api.login(LoginRequest(username = username.trim(), password = password))
        }
        return when (result) {
            is ApiResult.Error -> result
            is ApiResult.Success -> {
                val response = result.data
                val token = response.token
                val user = response.user
                if (!response.success || token.isNullOrBlank() || user == null) {
                    ApiResult.Error(
                        message = response.error?.takeIf { it.isNotBlank() }
                            ?: response.message.ifBlank { "Username atau password salah" },
                    )
                } else {
                    val session = UserSession(
                        token = token,
                        role = user.role.lowercase().ifBlank { "anggota" },
                        name = user.displayName,
                        userId = user.resolvedUserId,
                        username = user.username,
                        anggotaId = user.anggotaId,
                        activeRoles = user.activeRoles,
                    )
                    sessionManager.saveSession(session)
                    ApiResult.Success(session)
                }
            }
        }
    }

    suspend fun fetchMe(): ApiResult<UserDto> {
        return when (val result = safeApiCall(json) { api.me() }) {
            is ApiResult.Error -> result
            is ApiResult.Success -> {
                val user = result.data.user
                if (!result.data.success || user == null) {
                    ApiResult.Error(result.data.message.ifBlank { "Gagal memuat profil akun" })
                } else {
                    ApiResult.Success(user)
                }
            }
        }
    }

    suspend fun changePassword(currentPassword: String, newPassword: String): ApiResult<String> {
        return when (
            val result = safeApiCall(json) {
                api.changePassword(
                    ChangePasswordRequest(
                        currentPassword = currentPassword,
                        newPassword = newPassword,
                    )
                )
            }
        ) {
            is ApiResult.Error -> result
            is ApiResult.Success -> {
                val body = result.data
                if (!body.success) {
                    ApiResult.Error(
                        body.error?.takeIf { it.isNotBlank() }
                            ?: body.message.ifBlank { "Gagal mengubah password" },
                    )
                } else {
                    ApiResult.Success(body.message.ifBlank { "Password berhasil diperbarui!" })
                }
            }
        }
    }

    suspend fun resetPassword(
        username: String,
        digitHutang: String,
        digitShu: String,
        passwordBaru: String,
    ): ApiResult<String> {
        return when (
            val result = safeApiCall(json) {
                api.resetPassword(
                    ResetPasswordRequest(
                        username = username.trim(),
                        digitHutang = digitHutang.trim(),
                        digitShu = digitShu.trim(),
                        passwordBaru = passwordBaru,
                    )
                )
            }
        ) {
            is ApiResult.Error -> result
            is ApiResult.Success -> {
                val body = result.data
                if (!body.success) {
                    ApiResult.Error(
                        body.error?.takeIf { it.isNotBlank() }
                            ?: body.message.ifBlank { "Verifikasi gagal. Periksa data kembali." },
                    )
                } else {
                    ApiResult.Success(body.message.ifBlank { "Password berhasil diperbarui!" })
                }
            }
        }
    }

    suspend fun logout() {
        try {
            api.logout()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // Tetap hapus session lokal walau server sedang offline atau token kadaluarsa
        } finally {
            sessionManager.clearSession()
        }
    }
}
