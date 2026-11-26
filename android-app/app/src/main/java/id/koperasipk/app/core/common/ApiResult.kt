package id.koperasipk.app.core.common

import kotlinx.coroutines.CancellationException
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import retrofit2.HttpException
import java.io.IOException

sealed interface ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>
    data class Error(
        val message: String,
        val code: Int? = null,
        val cause: Throwable? = null,
    ) : ApiResult<Nothing>
}

inline fun <T, R> ApiResult<T>.map(transform: (T) -> R): ApiResult<R> = when (this) {
    is ApiResult.Success -> ApiResult.Success(transform(data))
    is ApiResult.Error -> this
}

inline fun <T> ApiResult<T>.onSuccess(action: (T) -> Unit): ApiResult<T> {
    if (this is ApiResult.Success) action(data)
    return this
}

inline fun <T> ApiResult<T>.onError(action: (ApiResult.Error) -> Unit): ApiResult<T> {
    if (this is ApiResult.Error) action(this)
    return this
}

fun <T> ApiResult<T>.getOrNull(): T? = (this as? ApiResult.Success)?.data

private val ErrorParserJson = Json {
    ignoreUnknownKeys = true
    isLenient = true
}

/**
 * Menjalankan pemanggilan API Retrofit secara aman:
 * - Selalu melempar ulang CancellationException agar pembatalan coroutine tidak tertelan.
 * - IOException dipetakan ke "Tidak dapat terhubung ke server".
 * - HttpException dipetakan ke JSON `message` (atau entri pertama `errors` pada HTTP 422).
 */
suspend fun <T> safeApiCall(
    json: Json = ErrorParserJson,
    block: suspend () -> T,
): ApiResult<T> {
    return try {
        ApiResult.Success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: IOException) {
        ApiResult.Error(
            message = "Tidak dapat terhubung ke server",
            cause = e,
        )
    } catch (e: HttpException) {
        val code = e.code()
        val rawBody = try {
            e.response()?.errorBody()?.string()
        } catch (_: Exception) {
            null
        }
        val parsedMessage = extractLaravelErrorMessage(rawBody = rawBody, statusCode = code, json = json)
        ApiResult.Error(
            message = parsedMessage,
            code = code,
            cause = e,
        )
    } catch (e: SerializationException) {
        ApiResult.Error(
            message = "Format respons server tidak sesuai",
            cause = e,
        )
    } catch (e: Exception) {
        ApiResult.Error(
            message = e.message?.takeIf { it.isNotBlank() } ?: "Terjadi kesalahan yang tidak terduga",
            cause = e,
        )
    }
}

internal fun extractLaravelErrorMessage(
    rawBody: String?,
    statusCode: Int,
    json: Json = ErrorParserJson,
): String {
    if (!rawBody.isNullOrBlank()) {
        try {
            val obj = json.parseToJsonElement(rawBody) as? JsonObject
            if (obj != null) {
                val errorsMessage = extractFirstValidationError(obj["errors"] as? JsonObject)
                val messageField = (obj["message"] as? JsonPrimitive)?.contentOrNull?.trim()?.takeIf { it.isNotEmpty() }
                val errorField = (obj["error"] as? JsonPrimitive)?.contentOrNull?.trim()?.takeIf { it.isNotEmpty() }

                if (statusCode == 422 && errorsMessage != null) {
                    return errorsMessage
                }
                if (messageField != null) {
                    return messageField
                }
                if (errorField != null) {
                    return errorField
                }
                if (errorsMessage != null) {
                    return errorsMessage
                }
            }
        } catch (_: Exception) {
            // Abaikan error parsing dan gunakan fallback kode HTTP
        }
    }

    return when (statusCode) {
        401 -> "Sesi berakhir atau kredensial tidak valid"
        403 -> "Anda tidak memiliki izin akses"
        404 -> "Data atau layanan tidak ditemukan"
        422 -> "Data yang dikirim tidak valid"
        429 -> "Terlalu banyak percobaan, silakan tunggu sebentar"
        in 500..599 -> "Terjadi kesalahan pada server ($statusCode)"
        else -> "Permintaan gagal (HTTP $statusCode)"
    }
}

private fun extractFirstValidationError(errorsObj: JsonObject?): String? {
    if (errorsObj == null || errorsObj.isEmpty()) return null
    for ((_, value) in errorsObj) {
        when (value) {
            is JsonArray -> {
                val first = value.firstOrNull() as? JsonPrimitive
                val text = first?.contentOrNull?.trim()?.takeIf { it.isNotEmpty() }
                if (text != null) return text
            }
            is JsonPrimitive -> {
                val text = value.contentOrNull?.trim()?.takeIf { it.isNotEmpty() }
                if (text != null) return text
            }
            else -> Unit
        }
    }
    return null
}
