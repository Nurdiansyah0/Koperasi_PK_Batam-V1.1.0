package id.koperasipk.app.core.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface KoperasiApi {

    @POST("login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @GET("me")
    suspend fun me(): MeResponse

    @POST("logout")
    suspend fun logout(): BasicResponse

    @POST("change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): BasicResponse

    @POST("reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): BasicResponse
}
