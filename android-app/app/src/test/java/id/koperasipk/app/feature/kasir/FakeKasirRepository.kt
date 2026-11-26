package id.koperasipk.app.feature.kasir

import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.kasir.data.ActiveShiftInfoDto
import id.koperasipk.app.feature.kasir.data.AnggotaKasirDto
import id.koperasipk.app.feature.kasir.data.AntreanTarikTunaiDto
import id.koperasipk.app.feature.kasir.data.BarangKasirDto
import id.koperasipk.app.feature.kasir.data.BuatTransaksiRequest
import id.koperasipk.app.feature.kasir.data.BuatTransaksiResponse
import id.koperasipk.app.feature.kasir.data.DaftarKasirDto
import id.koperasipk.app.feature.kasir.data.DashboardKasirDto
import id.koperasipk.app.feature.kasir.data.HasilOpnameDto
import id.koperasipk.app.feature.kasir.data.HistoryTransaksiRequest
import id.koperasipk.app.feature.kasir.data.KasirRepository
import id.koperasipk.app.feature.kasir.data.KelayakanTarikTunaiDto
import id.koperasipk.app.feature.kasir.data.LaravelPaginatorDto
import id.koperasipk.app.feature.kasir.data.LatestOrderDto
import id.koperasipk.app.feature.kasir.data.LatestPendingOrdersResponse
import id.koperasipk.app.feature.kasir.data.PaketBelanjaResponse
import id.koperasipk.app.feature.kasir.data.PembayaranHutangDto
import id.koperasipk.app.feature.kasir.data.PesananAnggotaDto
import id.koperasipk.app.feature.kasir.data.ProsesTarikTunaiOutcome
import id.koperasipk.app.feature.kasir.data.RiwayatTarikTunaiDto
import id.koperasipk.app.feature.kasir.data.RiwayatTransaksiDto
import id.koperasipk.app.feature.kasir.data.SerahTerimaDraftDto
import id.koperasipk.app.feature.kasir.data.SerahTerimaDto
import id.koperasipk.app.feature.kasir.data.SetoranKasirDto
import id.koperasipk.app.feature.kasir.data.TarikTunaiOutcome
import id.koperasipk.app.feature.kasir.data.TarikTunaiRequest
import id.koperasipk.app.feature.kasir.data.TransaksiTerbaruDto
import kotlinx.coroutines.delay

class FakeKasirRepository : KasirRepository {

    var writeDelayMs: Long = 0L

    var dashboardResult: ApiResult<DashboardKasirDto> = ApiResult.Success(DashboardKasirDto())
    var transaksiTerbaruResult: ApiResult<List<TransaksiTerbaruDto>> = ApiResult.Success(emptyList())
    var barangResult: ApiResult<List<BarangKasirDto>> = ApiResult.Success(emptyList())
    var paketResult: ApiResult<PaketBelanjaResponse> = ApiResult.Success(PaketBelanjaResponse(success = true))
    var anggotaResult: ApiResult<List<AnggotaKasirDto>> = ApiResult.Success(emptyList())
    var cariProfilResult: ApiResult<AnggotaKasirDto> = ApiResult.Success(AnggotaKasirDto(anggotaId = 1, namaLengkap = "Anggota"))
    var buatTransaksiResult: ApiResult<BuatTransaksiResponse> = ApiResult.Success(BuatTransaksiResponse(success = true, transaksiId = 100, total = 10000.0))

    var pesananResult: ApiResult<List<PesananAnggotaDto>> = ApiResult.Success(emptyList())
    var simpanTransaksiResult: ApiResult<String> = ApiResult.Success("Pesanan selesai")
    var tolakPesananResult: ApiResult<String> = ApiResult.Success("Pesanan ditolak")

    val latestOrdersQueue = ArrayDeque<ApiResult<LatestPendingOrdersResponse>>()
    var defaultLatestOrdersResult: ApiResult<LatestPendingOrdersResponse> = ApiResult.Success(LatestPendingOrdersResponse(success = true))
    var testNotificationResult: ApiResult<LatestOrderDto> = ApiResult.Success(LatestOrderDto(transaksiId = 9999, namaAnggota = "Simulasi", isTest = true))

    var pembayaranHutangResult: ApiResult<List<PembayaranHutangDto>> = ApiResult.Success(emptyList())
    var approveHutangResult: ApiResult<String> = ApiResult.Success("Berhasil")

    var historyTransaksiResult: ApiResult<LaravelPaginatorDto<RiwayatTransaksiDto>> = ApiResult.Success(LaravelPaginatorDto())
    var setorAdminResult: ApiResult<String> = ApiResult.Success("Setoran diajukan")
    var riwayatSetoranResult: ApiResult<List<SetoranKasirDto>> = ApiResult.Success(emptyList())

    var kelayakanResult: ApiResult<KelayakanTarikTunaiDto> = ApiResult.Success(KelayakanTarikTunaiDto(anggotaId = 1, namaLengkap = "Budi"))
    var antreanTarikResult: ApiResult<List<AntreanTarikTunaiDto>> = ApiResult.Success(emptyList())
    var prosesTarikResult: ApiResult<ProsesTarikTunaiOutcome> = ApiResult.Success(ProsesTarikTunaiOutcome("Sukses"))
    var tarikTunaiResult: ApiResult<TarikTunaiOutcome> = ApiResult.Success(TarikTunaiOutcome("Sukses"))
    var riwayatTarikResult: ApiResult<List<RiwayatTarikTunaiDto>> = ApiResult.Success(emptyList())

    var daftarKasirResult: ApiResult<List<DaftarKasirDto>> = ApiResult.Success(emptyList())
    var serahTerimaForMeResult: ApiResult<LaravelPaginatorDto<SerahTerimaDto>> = ApiResult.Success(LaravelPaginatorDto())
    var serahTerimaDraftResult: ApiResult<SerahTerimaDraftDto> = ApiResult.Success(SerahTerimaDraftDto())
    var activeShiftResult: ApiResult<ActiveShiftInfoDto> = ApiResult.Success(ActiveShiftInfoDto())
    var createSerahTerimaResult: ApiResult<String> = ApiResult.Success("Serah terima dibuat")
    var approveSerahTerimaResult: ApiResult<String> = ApiResult.Success("Shift disetujui")
    var rejectSerahTerimaResult: ApiResult<String> = ApiResult.Success("Shift ditolak")

    var buatTransaksiCallCount = 0
    var simpanTransaksiCallCount = 0
    var tolakPesananCallCount = 0
    var latestPendingPollCount = 0
    var testNotificationCallCount = 0
    var approveHutangCallCount = 0
    var setorAdminCallCount = 0
    var prosesTarikCallCount = 0
    var tarikTunaiCallCount = 0
    var createSerahTerimaCallCount = 0
    var approveSerahTerimaCallCount = 0
    var rejectSerahTerimaCallCount = 0
    var lastHistoryRequest: HistoryTransaksiRequest? = null

    private suspend fun maybeDelayWrite() {
        if (writeDelayMs > 0L) delay(writeDelayMs)
    }

    override suspend fun getDashboard(): ApiResult<DashboardKasirDto> = dashboardResult
    override suspend fun getTransaksiTerbaru(): ApiResult<List<TransaksiTerbaruDto>> = transaksiTerbaruResult
    override suspend fun getDataBarang(): ApiResult<List<BarangKasirDto>> = barangResult
    override suspend fun getPaketBelanja(): ApiResult<PaketBelanjaResponse> = paketResult
    override suspend fun getAllAnggota(): ApiResult<List<AnggotaKasirDto>> = anggotaResult
    override suspend fun cariProfilAnggota(search: String?, anggotaId: Int?): ApiResult<AnggotaKasirDto> = cariProfilResult

    override suspend fun buatTransaksiKasir(request: BuatTransaksiRequest): ApiResult<BuatTransaksiResponse> {
        buatTransaksiCallCount++
        maybeDelayWrite()
        return buatTransaksiResult
    }

    override suspend fun getPesananAnggota(): ApiResult<List<PesananAnggotaDto>> = pesananResult

    override suspend fun simpanTransaksiKasir(transaksiIds: List<Int>): ApiResult<String> {
        simpanTransaksiCallCount++
        maybeDelayWrite()
        return simpanTransaksiResult
    }

    override suspend fun tolakPesananAnggota(transaksiIds: List<Int>, alasan: String?): ApiResult<String> {
        tolakPesananCallCount++
        maybeDelayWrite()
        return tolakPesananResult
    }

    override suspend fun getLatestPendingOrders(): ApiResult<LatestPendingOrdersResponse> {
        latestPendingPollCount++
        return if (latestOrdersQueue.isNotEmpty()) {
            latestOrdersQueue.removeFirst()
        } else {
            defaultLatestOrdersResult
        }
    }

    override suspend fun triggerTestOrderNotification(): ApiResult<LatestOrderDto> {
        testNotificationCallCount++
        maybeDelayWrite()
        return testNotificationResult
    }

    override suspend fun getAllPembayaranHutang(): ApiResult<List<PembayaranHutangDto>> = pembayaranHutangResult

    override suspend fun approvePembayaranHutang(
        pembayaranId: Int,
        action: String,
        metodePembayaran: String,
    ): ApiResult<String> {
        approveHutangCallCount++
        maybeDelayWrite()
        return approveHutangResult
    }

    override suspend fun getHistoryTransaksi(
        request: HistoryTransaksiRequest,
    ): ApiResult<LaravelPaginatorDto<RiwayatTransaksiDto>> {
        lastHistoryRequest = request
        return historyTransaksiResult
    }

    override suspend fun setorAdmin(nominal: Double): ApiResult<String> {
        setorAdminCallCount++
        maybeDelayWrite()
        return setorAdminResult
    }

    override suspend fun getRiwayatSetoran(): ApiResult<List<SetoranKasirDto>> = riwayatSetoranResult
    override suspend fun cekKelayakanTarikTunai(anggotaId: Int): ApiResult<KelayakanTarikTunaiDto> = kelayakanResult
    override suspend fun getAntreanTarikTunai(): ApiResult<List<AntreanTarikTunaiDto>> = antreanTarikResult

    override suspend fun prosesTarikTunai(
        tarikId: Int,
        action: String,
        alasanTolak: String?,
    ): ApiResult<ProsesTarikTunaiOutcome> {
        prosesTarikCallCount++
        maybeDelayWrite()
        return prosesTarikResult
    }

    override suspend fun tarikTunai(request: TarikTunaiRequest): ApiResult<TarikTunaiOutcome> {
        tarikTunaiCallCount++
        maybeDelayWrite()
        return tarikTunaiResult
    }

    override suspend fun getRiwayatTarikTunaiKasir(): ApiResult<List<RiwayatTarikTunaiDto>> = riwayatTarikResult
    override suspend fun getDaftarKasir(): ApiResult<List<DaftarKasirDto>> = daftarKasirResult
    override suspend fun getSerahTerimaForMe(type: String, page: Int): ApiResult<LaravelPaginatorDto<SerahTerimaDto>> = serahTerimaForMeResult
    override suspend fun getSerahTerimaDraft(): ApiResult<SerahTerimaDraftDto> = serahTerimaDraftResult
    override suspend fun getActiveShiftInfo(): ApiResult<ActiveShiftInfoDto> = activeShiftResult

    override suspend fun createSerahTerima(kasirTo: Int, hasilOpname: HasilOpnameDto): ApiResult<String> {
        createSerahTerimaCallCount++
        maybeDelayWrite()
        return createSerahTerimaResult
    }

    override suspend fun approveSerahTerima(serahId: Int): ApiResult<String> {
        approveSerahTerimaCallCount++
        maybeDelayWrite()
        return approveSerahTerimaResult
    }

    override suspend fun rejectSerahTerima(serahId: Int, alasan: String): ApiResult<String> {
        rejectSerahTerimaCallCount++
        maybeDelayWrite()
        return rejectSerahTerimaResult
    }
}
