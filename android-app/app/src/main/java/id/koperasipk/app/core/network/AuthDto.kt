package id.koperasipk.app.core.network

import id.koperasipk.app.core.common.FlexibleBooleanSerializer
import id.koperasipk.app.core.common.FlexibleDoubleSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val username: String,
    val password: String,
)

@Serializable
data class ChangePasswordRequest(
    @SerialName("current_password") val currentPassword: String,
    @SerialName("new_password") val newPassword: String,
)

@Serializable
data class ResetPasswordRequest(
    val username: String,
    @SerialName("digit_hutang") val digitHutang: String,
    @SerialName("digit_shu") val digitShu: String,
    @SerialName("password_baru") val passwordBaru: String,
)

@Serializable
data class LoginResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val token: String? = null,
    val user: UserDto? = null,
)

@Serializable
data class MeResponse(
    val success: Boolean = false,
    val message: String = "",
    val user: UserDto? = null,
)

@Serializable
data class BasicResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
)

@Serializable
data class UserDto(
    @SerialName("user_id") val userId: Int = 0,
    val id: Int = 0,
    val username: String = "",
    val role: String = "",
    @SerialName("anggota_id") val anggotaId: Int? = null,
    @SerialName("nama_lengkap") val namaLengkap: String? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val saldo: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hutang: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val shu: Double = 0.0,
    @SerialName("persetujuan_shu_master_at") val persetujuanShuMasterAt: String? = null,
    @SerialName("active_roles") val activeRoles: List<String> = emptyList(),
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("is_admin") val isAdmin: Boolean = false,
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("is_kasir") val isKasir: Boolean = false,
) {
    val resolvedUserId: Int
        get() = if (userId != 0) userId else id

    val displayName: String
        get() = namaLengkap?.takeIf { it.isNotBlank() } ?: username
}
