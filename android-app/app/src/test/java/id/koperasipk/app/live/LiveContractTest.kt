package id.koperasipk.app.live

import id.koperasipk.app.core.network.KoperasiApi
import id.koperasipk.app.core.network.LoginRequest
import id.koperasipk.app.core.network.NetworkModule
import id.koperasipk.app.feature.admin.data.AdminApi
import id.koperasipk.app.feature.anggota.AnggotaApi
import id.koperasipk.app.feature.kasir.data.KasirApi
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assume
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Live contract test (Level 3 Verification) hitting real Laravel SQLite backend.
 * Opt-in via KOPERASI_LIVE_API=true environment variable.
 */
class LiveContractTest {

    private val baseUrl = "http://127.0.0.1:8000/laravel/api/"

    private class TestAuthInterceptor : Interceptor {
        var token: String? = null
        override fun intercept(chain: Interceptor.Chain): Response {
            val req = chain.request().newBuilder()
                .header("Accept", "application/json")
            token?.let {
                req.header("Authorization", "Bearer $it")
            }
            return chain.proceed(req.build())
        }
    }

    private val authInterceptor = TestAuthInterceptor()

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(okHttpClient)
        .addConverterFactory(NetworkModule.json.asConverterFactory("application/json".toMediaType()))
        .build()

    private val authApi: KoperasiApi = retrofit.create(KoperasiApi::class.java)
    private val adminApi: AdminApi = retrofit.create(AdminApi::class.java)
    private val kasirApi: KasirApi = retrofit.create(KasirApi::class.java)
    private val anggotaApi: AnggotaApi = retrofit.create(AnggotaApi::class.java)

    @Before
    fun checkLiveApiEnabled() {
        Assume.assumeTrue(
            "Live contract tests skipped because KOPERASI_LIVE_API is not set to 'true'",
            "true".equals(System.getenv("KOPERASI_LIVE_API"), ignoreCase = true)
        )
    }

    @Test
    fun testAdminContract() = runBlocking {
        // 1. Login as Admin
        authInterceptor.token = null
        val loginRes = authApi.login(LoginRequest("Admin", "password123"))
        assertTrue("Admin login should succeed", loginRes.success)
        assertNotNull("Token should not be null", loginRes.token)
        authInterceptor.token = loginRes.token

        // 2. GET admin/dashboard-stats
        val statsRes = adminApi.getDashboardStats()
        assertTrue("Admin dashboard stats should succeed", statsRes.success)
        println("LiveContract [Admin] Stats: totalAnggota=${statsRes.totalAnggota}, totalPendapatan=${statsRes.totalPendapatanHariIni}")

        // 3. GET admin/barang
        val barangRes = adminApi.getBarang()
        assertTrue("Admin barang list should succeed", barangRes.success)
        println("LiveContract [Admin] Barang count=${barangRes.data.size}")

        // 4. GET admin/anggota
        val anggotaRes = adminApi.getAnggota()
        assertTrue("Admin anggota list should succeed", anggotaRes.success)
        println("LiveContract [Admin] Anggota count=${anggotaRes.data.size}")
    }

    @Test
    fun testKasirContract() = runBlocking {
        // 1. Login as Kasir (Tanggang)
        authInterceptor.token = null
        val loginRes = authApi.login(LoginRequest("Tanggang", "password123"))
        assertTrue("Kasir login should succeed", loginRes.success)
        assertNotNull("Token should not be null", loginRes.token)
        authInterceptor.token = loginRes.token

        // 2. GET kasir/dashboard
        val dashboardRes = kasirApi.getDashboard()
        assertTrue("Kasir dashboard should succeed", dashboardRes.success)
        assertNotNull("Kasir dashboard data should not be null", dashboardRes.data)
        println("LiveContract [Kasir] Dashboard: kas=${dashboardRes.data?.saldoKas}")

        // 3. GET kasir/barang-belanja
        val barangRes = kasirApi.getDataBarang()
        assertTrue("Kasir data barang should succeed", barangRes.success)
        println("LiveContract [Kasir] Barang count=${barangRes.data?.size}")

        // 4. GET kasir/all-anggota
        val anggotaRes = kasirApi.getAllAnggota()
        assertTrue("Kasir all anggota should succeed", anggotaRes.success)
        println("LiveContract [Kasir] Anggota count=${anggotaRes.data?.size}")
    }

    @Test
    fun testAnggotaContract() = runBlocking {
        // 1. Login as Anggota (Nurdiansyah)
        authInterceptor.token = null
        val loginRes = authApi.login(LoginRequest("Nurdiansyah", "password123"))
        assertTrue("Anggota login should succeed", loginRes.success)
        assertNotNull("Token should not be null", loginRes.token)
        authInterceptor.token = loginRes.token

        // 2. GET anggota/profil
        val profilRes = anggotaApi.getProfil()
        assertTrue("Anggota profil should succeed", profilRes.success)
        assertNotNull("Anggota user profil should not be null", profilRes.user)
        println("LiveContract [Anggota] Profil: nama=${profilRes.user?.namaLengkap}, saldo=${profilRes.user?.saldo}")

        // 3. GET anggota/barang
        val barangRes = anggotaApi.getBarang()
        assertTrue("Anggota barang should succeed", barangRes.success)
        println("LiveContract [Anggota] Barang count=${barangRes.data.size}")

        // 4. GET anggota/transaksi
        val txRes = anggotaApi.getHistoriTransaksi()
        assertTrue("Anggota transaksi should succeed", txRes.success)
        println("LiveContract [Anggota] Transaksi count=${txRes.data?.data?.size ?: 0}")
    }
}
