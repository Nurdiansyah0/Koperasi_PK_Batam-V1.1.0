package id.koperasipk.app

import android.app.Application
import android.content.Context
import android.os.StrictMode
import id.koperasipk.app.core.database.KoperasiDatabase
import id.koperasipk.app.core.datastore.SessionManager
import id.koperasipk.app.core.datastore.TokenStore
import id.koperasipk.app.core.network.KoperasiApi
import id.koperasipk.app.core.network.NetworkModule
import id.koperasipk.app.feature.auth.AuthRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import retrofit2.Retrofit

class AppContainer(context: Context) {
    private val appContext: Context = context.applicationContext
    private val appScope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    val json: Json = NetworkModule.json
    val tokenStore: TokenStore = TokenStore(appContext)
    val sessionManager: SessionManager = SessionManager(tokenStore, appScope)
    val okHttpClient: OkHttpClient = NetworkModule.createOkHttpClient(sessionManager)
    val retrofit: Retrofit = NetworkModule.createRetrofit(
        okHttpClient = okHttpClient,
        baseUrl = BuildConfig.API_BASE_URL,
        json = json,
    )
    val database: KoperasiDatabase = KoperasiDatabase.getInstance(appContext)
    val koperasiApi: KoperasiApi = retrofit.create(KoperasiApi::class.java)
    val authRepository: AuthRepository = AuthRepository(
        api = koperasiApi,
        sessionManager = sessionManager,
        json = json,
    )

    inline fun <reified T> createService(): T = retrofit.create(T::class.java)
}

class KoperasiApp : Application() {

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)

        if (BuildConfig.DEBUG) {
            StrictMode.setThreadPolicy(
                StrictMode.ThreadPolicy.Builder()
                    .detectAll()
                    .penaltyLog()
                    .build()
            )
            StrictMode.setVmPolicy(
                StrictMode.VmPolicy.Builder()
                    .detectActivityLeaks()
                    .detectLeakedClosableObjects()
                    .detectLeakedSqlLiteObjects()
                    .penaltyLog()
                    .build()
            )
        }
    }
}
