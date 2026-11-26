package id.koperasipk.app.feature.kasir.data

import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.common.safeApiCall
import id.koperasipk.app.core.network.BasicResponse
import id.koperasipk.app.core.network.NetworkModule
import kotlinx.serialization.json.Json

interface KasirRepository {
    suspend fun getDashboard(): ApiResult<DashboardKasirDto>
    suspend fun getTransaksiTerbaru(): ApiResult<List<TransaksiTerbaruDto>>
    suspend fun getDataBarang(): ApiResult<List<BarangKasirDto>>
    suspend fun getPaketBelanja(): ApiResult<PaketBelanjaResponse>
    suspend fun getAllAnggota(): ApiResult<List<AnggotaKasirDto>>
    suspend fun cariProfilAnggota(search: String? = null, anggotaId: Int? = null): ApiResult<AnggotaKasirDto>
    suspend fun buatTransaksiKasir(request: BuatTransaksiRequest): ApiResult<BuatTransaksiResponse>
    suspend fun getPesananAnggota(): ApiResult<List<PesananAnggotaDto>>
    suspend fun simpanTransaksiKasir(transaksiIds: List<Int>): ApiResult<String>
    suspend fun tolakPesananAnggota(transaksiIds: List<Int>, alasan: String? = null): ApiResult<String>
    suspend fun getLatestPendingOrders(): ApiResult<LatestPendingOrdersResponse>
    suspend fun triggerTestOrderNotification(): ApiResult<LatestOrderDto>
    suspend fun getAllPembayaranHutang(): ApiResult<List<PembayaranHutangDto>>
    suspend fun approvePembayaranHutang(pembayaranId: Int, action: String, metodePembayaran: String = "cash"): ApiResult<String>
    suspend fun getHistoryTransaksi(request: HistoryTransaksiRequest): ApiResult<LaravelPaginatorDto<RiwayatTransaksiDto>>
    suspend fun setorAdmin(nominal: Double): ApiResult<String>
    suspend fun getRiwayatSetoran(): ApiResult<List<SetoranKasirDto>>
    suspend fun cekKelayakanTarikTunai(anggotaId: Int): ApiResult<KelayakanTarikTunaiDto>
    suspend fun getAntreanTarikTunai(): ApiResult<List<AntreanTarikTunaiDto>>
    suspend fun prosesTarikTunai(tarikId: Int, action: String, alasanTolak: String? = null): ApiResult<ProsesTarikTunaiOutcome>
    suspend fun tarikTunai(request: TarikTunaiRequest): ApiResult<TarikTunaiOutcome>
    suspend fun getRiwayatTarikTunaiKasir(): ApiResult<List<RiwayatTarikTunaiDto>>
    suspend fun getDaftarKasir(): ApiResult<List<DaftarKasirDto>>
    suspend fun getSerahTerimaForMe(type: String, page: Int): ApiResult<LaravelPaginatorDto<SerahTerimaDto>>
    suspend fun getSerahTerimaDraft(): ApiResult<SerahTerimaDraftDto>
    suspend fun getActiveShiftInfo(): ApiResult<ActiveShiftInfoDto>
    suspend fun createSerahTerima(kasirTo: Int, hasilOpname: HasilOpnameDto): ApiResult<String>
    suspend fun approveSerahTerima(serahId: Int): ApiResult<String>
    suspend fun rejectSerahTerima(serahId: Int, alasan: String): ApiResult<String>
}

data class ProsesTarikTunaiOutcome(
    val message: String,
    val receipt: TarikTunaiReceiptDto? = null,
)

data class TarikTunaiOutcome(
    val message: String,
    val receipt: TarikTunaiReceiptDto? = null,
)

class NetworkKasirRepository(
    private val api: KasirApi,
    private val json: Json = NetworkModule.json,
) : KasirRepository {

    override suspend fun getDashboard(): ApiResult<DashboardKasirDto> =
        unwrapData("Gagal memuat dashboard kasir") { api.getDashboard() }

    override suspend fun getTransaksiTerbaru(): ApiResult<List<TransaksiTerbaruDto>> =
        unwrapList("Gagal memuat transaksi terbaru") { api.getTransaksiTerbaru() }

    override suspend fun getDataBarang(): ApiResult<List<BarangKasirDto>> =
        unwrapList("Gagal memuat katalog barang") { api.getDataBarang() }

    override suspend fun getPaketBelanja(): ApiResult<PaketBelanjaResponse> {
        return when (val res = safeApiCall(json) { api.getPaketBelanja() }) {
            is ApiResult.Error -> res
            is ApiResult.Success -> {
                if (!res.data.success) {
                    ApiResult.Error("Gagal memuat paket belanja")
                } else {
                    ApiResult.Success(res.data)
                }
            }
        }
    }

    override suspend fun getAllAnggota(): ApiResult<List<AnggotaKasirDto>> =
        unwrapList("Gagal memuat daftar anggota") { api.getAllAnggota() }

    override suspend fun cariProfilAnggota(search: String?, anggotaId: Int?): ApiResult<AnggotaKasirDto> {
        return when (val res = safeApiCall(json) { api.cariProfilAnggota(search = search, anggotaId = anggotaId) }) {
            is ApiResult.Error -> res
            is ApiResult.Success -> {
                val profil = res.data.profil
                if (!res.data.success || profil == null) {
                    ApiResult.Error(res.data.message.ifBlank { "Anggota tidak ditemukan" })
                } else {
                    ApiResult.Success(profil)
                }
            }
        }
    }

    override suspend fun buatTransaksiKasir(request: BuatTransaksiRequest): ApiResult<BuatTransaksiResponse> {
        return when (val res = safeApiCall(json) { api.buatTransaksiKasir(request) }) {
            is ApiResult.Error -> res
            is ApiResult.Success -> {
                val body = res.data
                if (!body.success) {
                    ApiResult.Error(
                        body.error?.takeIf { it.isNotBlank() }
                            ?: body.message.ifBlank { "Gagal memproses transaksi POS" },
                    )
                } else {
                    ApiResult.Success(body)
                }
            }
        }
    }

    override suspend fun getPesananAnggota(): ApiResult<List<PesananAnggotaDto>> =
        unwrapList("Gagal memuat pesanan anggota") { api.getPesananAnggota() }

    override suspend fun simpanTransaksiKasir(transaksiIds: List<Int>): ApiResult<String> =
        unwrapMessage("Gagal menyelesaikan pesanan") {
            api.simpanTransaksiKasir(
                SimpanTransaksiKasirRequest(
                    transaksi = transaksiIds.map { SimpanTransaksiIdDto(transaksiId = it) },
                )
            )
        }

    override suspend fun tolakPesananAnggota(transaksiIds: List<Int>, alasan: String?): ApiResult<String> =
        unwrapMessage("Gagal membatalkan pesanan") {
            api.tolakPesananAnggota(
                TolakPesananRequest(
                    transaksiIds = transaksiIds,
                    alasan = alasan?.takeIf { it.isNotBlank() },
                )
            )
        }

    override suspend fun getLatestPendingOrders(): ApiResult<LatestPendingOrdersResponse> {
        return when (val res = safeApiCall(json) { api.getLatestPendingOrders() }) {
            is ApiResult.Error -> res
            is ApiResult.Success -> {
                if (!res.data.success) {
                    ApiResult.Error("Gagal mengecek pesanan masuk")
                } else {
                    ApiResult.Success(res.data)
                }
            }
        }
    }

    override suspend fun triggerTestOrderNotification(): ApiResult<LatestOrderDto> {
        return when (val res = safeApiCall(json) { api.triggerTestOrderNotification() }) {
            is ApiResult.Error -> res
            is ApiResult.Success -> {
                val order = res.data.data
                if (!res.data.success || order == null) {
                    ApiResult.Error(res.data.message.ifBlank { "Gagal memicu simulasi pesanan" })
                } else {
                    ApiResult.Success(order)
                }
            }
        }
    }

    override suspend fun getAllPembayaranHutang(): ApiResult<List<PembayaranHutangDto>> =
        unwrapList("Gagal memuat pembayaran hutang") { api.getAllPembayaranHutang() }

    override suspend fun approvePembayaranHutang(
        pembayaranId: Int,
        action: String,
        metodePembayaran: String,
    ): ApiResult<String> = unwrapMessage("Gagal memproses pembayaran hutang") {
        api.approvePembayaranHutang(
            ApprovePembayaranHutangRequest(
                pembayaranId = pembayaranId,
                action = action,
                metodePembayaran = metodePembayaran,
            )
        )
    }

    override suspend fun getHistoryTransaksi(
        request: HistoryTransaksiRequest,
    ): ApiResult<LaravelPaginatorDto<RiwayatTransaksiDto>> =
        unwrapData("Gagal memuat riwayat transaksi") { api.getHistoryTransaksi(request) }

    override suspend fun setorAdmin(nominal: Double): ApiResult<String> =
        unwrapMessage("Gagal mengajukan setoran") { api.setorAdmin(SetorAdminRequest(nominal = nominal)) }

    override suspend fun getRiwayatSetoran(): ApiResult<List<SetoranKasirDto>> =
        unwrapList("Gagal memuat riwayat setoran") { api.getRiwayatSetoran() }

    override suspend fun cekKelayakanTarikTunai(anggotaId: Int): ApiResult<KelayakanTarikTunaiDto> =
        unwrapData("Gagal mengecek kelayakan tarik tunai") { api.cekKelayakanTarikTunai(anggotaId) }

    override suspend fun getAntreanTarikTunai(): ApiResult<List<AntreanTarikTunaiDto>> =
        unwrapList("Gagal memuat antrean tarik tunai") { api.getAntreanTarikTunai() }

    override suspend fun prosesTarikTunai(
        tarikId: Int,
        action: String,
        alasanTolak: String?,
    ): ApiResult<ProsesTarikTunaiOutcome> {
        return when (
            val res = safeApiCall(json) {
                api.prosesTarikTunai(
                    ProsesTarikTunaiRequest(
                        tarikId = tarikId,
                        action = action,
                        alasanTolak = alasanTolak?.takeIf { it.isNotBlank() },
                    )
                )
            }
        ) {
            is ApiResult.Error -> res
            is ApiResult.Success -> {
                val body = res.data
                if (!body.success) {
                    ApiResult.Error(
                        body.error?.takeIf { it.isNotBlank() }
                            ?: body.message.ifBlank { "Gagal memproses tiket tarik tunai" },
                    )
                } else {
                    ApiResult.Success(
                        ProsesTarikTunaiOutcome(
                            message = body.message.ifBlank { "Tiket tarik tunai berhasil diproses" },
                            receipt = body.data,
                        )
                    )
                }
            }
        }
    }

    override suspend fun tarikTunai(request: TarikTunaiRequest): ApiResult<TarikTunaiOutcome> {
        return when (val res = safeApiCall(json) { api.tarikTunai(request) }) {
            is ApiResult.Error -> res
            is ApiResult.Success -> {
                val body = res.data
                if (!body.success) {
                    ApiResult.Error(
                        body.error?.takeIf { it.isNotBlank() }
                            ?: body.message.ifBlank { "Gagal memproses tarik tunai" },
                    )
                } else {
                    ApiResult.Success(
                        TarikTunaiOutcome(
                            message = body.message.ifBlank { "Tarik tunai berhasil diproses" },
                            receipt = body.data,
                        )
                    )
                }
            }
        }
    }

    override suspend fun getRiwayatTarikTunaiKasir(): ApiResult<List<RiwayatTarikTunaiDto>> =
        unwrapList("Gagal memuat riwayat tarik tunai") { api.getRiwayatTarikTunaiKasir() }

    override suspend fun getDaftarKasir(): ApiResult<List<DaftarKasirDto>> =
        unwrapList("Gagal memuat daftar kasir") { api.getDaftarKasir() }

    override suspend fun getSerahTerimaForMe(
        type: String,
        page: Int,
    ): ApiResult<LaravelPaginatorDto<SerahTerimaDto>> =
        unwrapData("Gagal memuat data serah terima") { api.getSerahTerimaForMe(type = type, page = page) }

    override suspend fun getSerahTerimaDraft(): ApiResult<SerahTerimaDraftDto> =
        unwrapData("Gagal memuat draft serah terima") { api.getSerahTerimaDraft() }

    override suspend fun getActiveShiftInfo(): ApiResult<ActiveShiftInfoDto> =
        unwrapData("Gagal memuat informasi shift aktif") { api.getActiveShiftInfo() }

    override suspend fun createSerahTerima(
        kasirTo: Int,
        hasilOpname: HasilOpnameDto,
    ): ApiResult<String> {
        return when (
            val res = safeApiCall(json) {
                api.createSerahTerima(
                    CreateSerahTerimaRequest(
                        kasirTo = kasirTo,
                        hasilOpname = hasilOpname,
                    )
                )
            }
        ) {
            is ApiResult.Error -> res
            is ApiResult.Success -> {
                val body = res.data
                if (!body.success) {
                    ApiResult.Error(
                        body.error?.takeIf { it.isNotBlank() }
                            ?: body.message.ifBlank { "Gagal membuat serah terima shift" },
                    )
                } else {
                    ApiResult.Success(body.message.ifBlank { "Serah terima shift berhasil dikirim" })
                }
            }
        }
    }

    override suspend fun approveSerahTerima(serahId: Int): ApiResult<String> =
        unwrapMessage("Gagal menyetujui serah terima shift") {
            api.approveSerahTerima(ApproveSerahTerimaRequest(serahId = serahId))
        }

    override suspend fun rejectSerahTerima(serahId: Int, alasan: String): ApiResult<String> =
        unwrapMessage("Gagal menolak serah terima shift") {
            api.rejectSerahTerima(
                RejectSerahTerimaRequest(
                    serahId = serahId,
                    alasan = alasan,
                    alasanPenolakan = alasan,
                )
            )
        }

    private suspend fun <T> unwrapData(
        fallbackError: String,
        block: suspend () -> KasirDataResponse<T>,
    ): ApiResult<T> {
        return when (val res = safeApiCall(json) { block() }) {
            is ApiResult.Error -> res
            is ApiResult.Success -> {
                val body = res.data
                val payload = body.data
                if (!body.success || payload == null) {
                    ApiResult.Error(
                        body.error?.takeIf { it.isNotBlank() }
                            ?: body.message.ifBlank { fallbackError },
                    )
                } else {
                    ApiResult.Success(payload)
                }
            }
        }
    }

    private suspend fun <T> unwrapList(
        fallbackError: String,
        block: suspend () -> KasirDataResponse<List<T>>,
    ): ApiResult<List<T>> {
        return when (val res = safeApiCall(json) { block() }) {
            is ApiResult.Error -> res
            is ApiResult.Success -> {
                val body = res.data
                if (!body.success) {
                    ApiResult.Error(
                        body.error?.takeIf { it.isNotBlank() }
                            ?: body.message.ifBlank { fallbackError },
                    )
                } else {
                    ApiResult.Success(body.data.orEmpty())
                }
            }
        }
    }

    private suspend fun unwrapMessage(
        fallbackError: String,
        block: suspend () -> BasicResponse,
    ): ApiResult<String> {
        return when (val res = safeApiCall(json) { block() }) {
            is ApiResult.Error -> res
            is ApiResult.Success -> {
                val body = res.data
                if (!body.success) {
                    ApiResult.Error(
                        body.error?.takeIf { it.isNotBlank() }
                            ?: body.message.ifBlank { fallbackError },
                    )
                } else {
                    ApiResult.Success(body.message.ifBlank { "Berhasil" })
                }
            }
        }
    }
}
