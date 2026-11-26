package id.koperasipk.app.testing

import id.koperasipk.app.core.network.NetworkModule
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

object ApiTestFactory {

    val json: Json = NetworkModule.json

    fun createRetrofit(
        server: MockWebServer,
        okHttpClient: OkHttpClient = OkHttpClient.Builder().build(),
        json: Json = this.json,
    ): Retrofit {
        return Retrofit.Builder()
            .baseUrl(server.url("/"))
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    inline fun <reified T> createService(
        server: MockWebServer,
        okHttpClient: OkHttpClient = OkHttpClient.Builder().build(),
        json: Json = this.json,
    ): T {
        return createRetrofit(server = server, okHttpClient = okHttpClient, json = json)
            .create(T::class.java)
    }

    fun jsonResponse(
        body: String,
        code: Int = 200,
    ): MockResponse {
        return MockResponse()
            .setResponseCode(code)
            .setHeader("Content-Type", "application/json")
            .setBody(body)
    }
}
