package id.koperasipk.app.feature.anggota

import id.koperasipk.app.AppContainer
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.common.safeApiCall
import id.koperasipk.app.core.database.BarangDao
import id.koperasipk.app.core.database.CachedBarangEntity
import id.koperasipk.app.core.datastore.SessionManager
import id.koperasipk.app.core.network.BasicResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json

data class PaketBelanjaBundleResult(
    val packages: List<PaketBelanjaDto>,
    val seringDibeli: PaketBelanjaDto?,
)

interface AnggotaRepository {
    suspend fun getProfil(): ApiResult<ProfilAnggotaDto>
    suspend fun updateProfile(username: String): ApiResult<BasicResponse>

    fun observeAvailableBarang(query: String = "", limit: Int = 200): Flow<List<CachedBarangEntity>>
    suspend fun refreshBarangCatalog(): ApiResult<List<BarangAnggotaDto>>
    suspend fun getPaketBelanja(): ApiResult<PaketBelanjaBundleResult>

    suspend fun simpanTransaksi(request: SimpanTransaksiRequest): ApiResult<SimpanTransaksiResponse>
    suspend fun getHistoriTransaksi(page: Int = 1): ApiResult<TransaksiPaginatorDto>

    suspend fun bayarHutang(jumlah: Double): ApiResult<BayarHutangResponse>
    suspend fun getHistoriBayarHutang(): ApiResult<List<HistoriBayarHutangDto>>

    suspend fun cekKelayakanTarikTunai(): ApiResult<KelayakanTarikTunaiDto>
    suspend fun setujuiMasterConsentShu(): ApiResult<MasterConsentResponse>
    suspend fun ajukanTarikTunai(request: AjukanTarikTunaiRequest): ApiResult<AjukanTarikTunaiResponse>
    suspend fun getRiwayatTarikTunai(): ApiResult<List<TarikTunaiItemDto>>
}

class NetworkAnggotaRepository(
    private val api: AnggotaApi,
    private val barangDao: BarangDao,
    private val json: Json,
    private val sessionManager: SessionManager? = null,
) : AnggotaRepository {

    override suspend fun getProfil(): ApiResult<ProfilAnggotaDto> {
        return when (val result = safeApiCall(json) { api.getProfil() }) {
            is ApiResult.Success -> {
                val user = result.data.user
                if (result.data.success && user != null) {
                    ApiResult.Success(user)
                } else {
                    ApiResult.Error(
                        result.data.message.ifBlank { result.data.error ?: "Gagal memuat profil anggota" }
                    )
                }
            }
            is ApiResult.Error -> result
        }
    }

    override suspend fun updateProfile(username: String): ApiResult<BasicResponse> {
        val trimmed = username.trim()
        val result = safeApiCall(json) { api.updateProfile(UpdateProfileRequest(username = trimmed)) }
        return when (result) {
            is ApiResult.Success -> {
                if (result.data.success) {
                    sessionManager?.currentSession?.let { current ->
                        sessionManager.saveSession(current.copy(username = trimmed))
                    }
                    ApiResult.Success(result.data)
                } else {
                    ApiResult.Error(
                        result.data.message.ifBlank { result.data.error ?: "Gagal memperbarui profil" }
                    )
                }
            }
            is ApiResult.Error -> result
        }
    }

    override fun observeAvailableBarang(query: String, limit: Int): Flow<List<CachedBarangEntity>> =
        barangDao.observeAvailableBarang(query = query.trim(), limit = limit)

    override suspend fun refreshBarangCatalog(): ApiResult<List<BarangAnggotaDto>> {
        return when (val result = safeApiCall(json) { api.getBarang() }) {
            is ApiResult.Success -> {
                if (!result.data.success) {
                    ApiResult.Error(
                        result.data.message.ifBlank { result.data.error ?: "Gagal memuat katalog barang" }
                    )
                } else {
                    val now = System.currentTimeMillis()
                    val entities = result.data.data.map { it.toCachedEntity(updatedAt = now) }
                    withContext(Dispatchers.IO) {
                        barangDao.replaceAll(entities)
                    }
                    ApiResult.Success(result.data.data)
                }
            }
            is ApiResult.Error -> result
        }
    }

    override suspend fun getPaketBelanja(): ApiResult<PaketBelanjaBundleResult> {
        return when (val result = safeApiCall(json) { api.getPaketBelanja() }) {
            is ApiResult.Success -> {
                if (result.data.success) {
                    ApiResult.Success(
                        PaketBelanjaBundleResult(
                            packages = result.data.data,
                            seringDibeli = result.data.resolvedSeringDibeli,
                        )
                    )
                } else {
                    ApiResult.Error(
                        result.data.message.ifBlank { result.data.error ?: "Gagal memuat paket belanja" }
                    )
                }
            }
            is ApiResult.Error -> result
        }
    }

    override suspend fun simpanTransaksi(request: SimpanTransaksiRequest): ApiResult<SimpanTransaksiResponse> {
        return when (val result = safeApiCall(json) { api.simpanTransaksi(request) }) {
            is ApiResult.Success -> {
                if (result.data.success) {
                    ApiResult.Success(result.data)
                } else {
                    ApiResult.Error(
                        result.data.message.ifBlank { result.data.error ?: "Gagal membuat pesanan" }
                    )
                }
            }
            is ApiResult.Error -> result
        }
    }

    override suspend fun getHistoriTransaksi(page: Int): ApiResult<TransaksiPaginatorDto> {
        return when (val result = safeApiCall(json) { api.getHistoriTransaksi(page) }) {
            is ApiResult.Success -> {
                val paginator = result.data.data
                if (result.data.success && paginator != null) {
                    ApiResult.Success(paginator)
                } else {
                    ApiResult.Error(
                        result.data.message.ifBlank { result.data.error ?: "Gagal memuat riwayat transaksi" }
                    )
                }
            }
            is ApiResult.Error -> result
        }
    }

    override suspend fun bayarHutang(jumlah: Double): ApiResult<BayarHutangResponse> {
        return when (val result = safeApiCall(json) { api.bayarHutang(BayarHutangRequest(jumlah = jumlah)) }) {
            is ApiResult.Success -> {
                if (result.data.success) {
                    ApiResult.Success(result.data)
                } else {
                    ApiResult.Error(
                        result.data.message.ifBlank { result.data.error ?: "Gagal mengirim pengajuan pembayaran hutang" }
                    )
                }
            }
            is ApiResult.Error -> result
        }
    }

    override suspend fun getHistoriBayarHutang(): ApiResult<List<HistoriBayarHutangDto>> {
        return when (val result = safeApiCall(json) { api.getHistoriBayarHutang() }) {
            is ApiResult.Success -> {
                if (result.data.success) {
                    ApiResult.Success(result.data.data)
                } else {
                    ApiResult.Error(
                        result.data.message.ifBlank { result.data.error ?: "Gagal memuat riwayat bayar hutang" }
                    )
                }
            }
            is ApiResult.Error -> result
        }
    }

    override suspend fun cekKelayakanTarikTunai(): ApiResult<KelayakanTarikTunaiDto> {
        return when (val result = safeApiCall(json) { api.cekKelayakanTarikTunai() }) {
            is ApiResult.Success -> {
                val dto = result.data.data
                if (result.data.success && dto != null) {
                    ApiResult.Success(dto)
                } else {
                    ApiResult.Error(
                        result.data.message.ifBlank { result.data.error ?: "Gagal memeriksa kelayakan tarik tunai" }
                    )
                }
            }
            is ApiResult.Error -> result
        }
    }

    override suspend fun setujuiMasterConsentShu(): ApiResult<MasterConsentResponse> {
        return when (val result = safeApiCall(json) { api.setujuiMasterConsentShu() }) {
            is ApiResult.Success -> {
                if (result.data.success) {
                    ApiResult.Success(result.data)
                } else {
                    ApiResult.Error(
                        result.data.message.ifBlank { result.data.error ?: "Gagal menyimpan Master Consent SHU" }
                    )
                }
            }
            is ApiResult.Error -> result
        }
    }

    override suspend fun ajukanTarikTunai(request: AjukanTarikTunaiRequest): ApiResult<AjukanTarikTunaiResponse> {
        return when (val result = safeApiCall(json) { api.ajukanTarikTunai(request) }) {
            is ApiResult.Success -> {
                if (result.data.success) {
                    ApiResult.Success(result.data)
                } else {
                    ApiResult.Error(
                        result.data.message.ifBlank { result.data.error ?: "Gagal mengajukan tarik tunai" }
                    )
                }
            }
            is ApiResult.Error -> result
        }
    }

    override suspend fun getRiwayatTarikTunai(): ApiResult<List<TarikTunaiItemDto>> {
        return when (val result = safeApiCall(json) { api.getRiwayatTarikTunai() }) {
            is ApiResult.Success -> {
                if (result.data.success) {
                    ApiResult.Success(result.data.data)
                } else {
                    ApiResult.Error(
                        result.data.message.ifBlank { result.data.error ?: "Gagal memuat riwayat tarik tunai" }
                    )
                }
            }
            is ApiResult.Error -> result
        }
    }
}

fun createAnggotaRepository(container: AppContainer): AnggotaRepository {
    return NetworkAnggotaRepository(
        api = container.createService<AnggotaApi>(),
        barangDao = container.database.barangDao(),
        json = container.json,
        sessionManager = container.sessionManager,
    )
}
