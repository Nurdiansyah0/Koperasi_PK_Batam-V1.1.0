package id.koperasipk.app.core.datastore

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Cache sesi in-memory yang diumpani oleh [SessionStorage] (DataStore).
 * Menyediakan akses token sinkron tanpa `runBlocking` untuk [AuthInterceptor]
 * sekaligus menangani pembatalan sesi otomatis saat menerima HTTP 401.
 */
class SessionManager(
    private val storage: SessionStorage,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
) {
    private val storageMutex = Mutex()
    private val _sessionFlow = MutableStateFlow<UserSession?>(null)
    val sessionFlow: StateFlow<UserSession?> = _sessionFlow.asStateFlow()

    private val _isInitialized = MutableStateFlow(false)
    val isInitialized: StateFlow<Boolean> = _isInitialized.asStateFlow()

    @Volatile
    private var localMutationVersion: Long = 0L

    init {
        scope.launch {
            storage.sessionFlow.collect { stored ->
                val versionAtRead = localMutationVersion
                // Jangan timpa state jika ada mutasi in-memory yang lebih baru
                if (versionAtRead == localMutationVersion) {
                    _sessionFlow.value = stored
                }
                _isInitialized.value = true
            }
        }
    }

    val currentSession: UserSession?
        get() = _sessionFlow.value

    fun currentToken(): String? = _sessionFlow.value?.token

    suspend fun saveSession(session: UserSession) {
        storageMutex.withLock {
            localMutationVersion++
            _sessionFlow.value = session
            _isInitialized.value = true
            storage.saveSession(session)
        }
    }

    suspend fun clearSession() {
        storageMutex.withLock {
            localMutationVersion++
            _sessionFlow.value = null
            _isInitialized.value = true
            storage.clearSession()
        }
    }

    /**
     * Dipanggil secara sinkron dari OkHttp interceptor saat panggilan terautentikasi mendapat HTTP 401.
     */
    fun onUnauthorized(failedToken: String?) {
        val current = _sessionFlow.value ?: return
        if (failedToken != null && current.token != failedToken) {
            return
        }
        localMutationVersion++
        _sessionFlow.value = null
        scope.launch {
            try {
                storageMutex.withLock {
                    if (_sessionFlow.value == null) {
                        storage.clearSession()
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                // State in-memory sudah dibersihkan agar UI langsung kembali ke Login
            }
        }
    }
}
