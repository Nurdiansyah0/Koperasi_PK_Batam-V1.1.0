package id.koperasipk.app.feature.anggota

import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.database.CachedBarangEntity
import id.koperasipk.app.core.network.BasicResponse
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map

class FakeAnggotaRepository : AnggotaRepository {

    val barangCatalogFlow = MutableStateFlow<List<CachedBarangEntity>>(emptyList())

    var profilHandler: suspend () -> ApiResult<ProfilAnggotaDto> = {
        ApiResult.Success(
            ProfilAnggotaDto(
                anggotaId = 10,
                userId = 20,
                namaLengkap = "Budi Santoso",
                username = "budi",
                saldo = 75_000.0,
                hutang = 25_000.0,
                shu = 150_000.0,
                simpananPokok = 300_000.0,
                allowanceHutang = 100_000.0,
                limitHutang = 400_000.0,
                sisaLimitHutang = 375_000.0,
            )
        )
    }
    var updateProfileHandler: suspend (String) -> ApiResult<BasicResponse> = {
        ApiResult.Success(BasicResponse(success = true, message = "Profil berhasil diupdate"))
    }
    var refreshBarangHandler: suspend () -> ApiResult<List<BarangAnggotaDto>> = {
        ApiResult.Success(emptyList())
    }
    var paketBelanjaHandler: suspend () -> ApiResult<PaketBelanjaBundleResult> = {
        ApiResult.Success(PaketBelanjaBundleResult(packages = emptyList(), seringDibeli = null))
    }
    var simpanTransaksiHandler: suspend (SimpanTransaksiRequest) -> ApiResult<SimpanTransaksiResponse> = {
        ApiResult.Success(
            SimpanTransaksiResponse(
                success = true,
                message = "Pesanan berhasil dibuat, silakan ke kasir.",
                transaksiId = 101,
            )
        )
    }
    var historiTransaksiHandler: suspend (Int) -> ApiResult<TransaksiPaginatorDto> = { page ->
        ApiResult.Success(
            TransaksiPaginatorDto(
                currentPage = page,
                data = emptyList(),
                lastPage = 1,
                perPage = 15,
                total = 0,
            )
        )
    }
    var bayarHutangHandler: suspend (Double) -> ApiResult<BayarHutangResponse> = {
        ApiResult.Success(
            BayarHutangResponse(
                success = true,
                message = "Pengajuan pembayaran hutang berhasil dibuat, silakan bayar ke kasir.",
                pembayaranId = 55,
            )
        )
    }
    var historiBayarHutangHandler: suspend () -> ApiResult<List<HistoriBayarHutangDto>> = {
        ApiResult.Success(emptyList())
    }
    var kelayakanHandler: suspend () -> ApiResult<KelayakanTarikTunaiDto> = {
        ApiResult.Success(
            KelayakanTarikTunaiDto(
                anggotaId = 10,
                namaLengkap = "Budi Santoso",
                saldoShu = 150_000.0,
                saldoEwallet = 75_000.0,
                hutang = 0.0,
                hasDebt = false,
                hasMasterConsent = true,
                totalBelanjaHariIni = 35_000.0,
                hasQualifyingPurchase = true,
                maxKuotaTarikTunai = 75_000.0,
                finalWithdrawalLimit = 75_000.0,
                isEligible = true,
                ineligibleReasons = emptyList(),
            )
        )
    }
    var masterConsentHandler: suspend () -> ApiResult<MasterConsentResponse> = {
        ApiResult.Success(
            MasterConsentResponse(
                success = true,
                message = "Persetujuan Sadar Penarikan SHU (Master Consent) berhasil disimpan.",
                data = MasterConsentDataDto(hasMasterConsent = true),
            )
        )
    }
    var ajukanTarikTunaiHandler: suspend (AjukanTarikTunaiRequest) -> ApiResult<AjukanTarikTunaiResponse> = { req ->
        ApiResult.Success(
            AjukanTarikTunaiResponse(
                success = true,
                message = "Tiket penarikan tunai berhasil dibuat!",
                data = AjukanTarikTunaiDataDto(
                    tarikId = 9,
                    kodePenarikan = "TRK-261123-9999",
                    nominal = req.nominal,
                    sumberDana = req.sumberDana,
                    status = "pending",
                ),
            )
        )
    }
    var riwayatTarikTunaiHandler: suspend () -> ApiResult<List<TarikTunaiItemDto>> = {
        ApiResult.Success(emptyList())
    }

    var simpanTransaksiCalls = 0
    var bayarHutangCalls = 0
    var ajukanTarikTunaiCalls = 0
    var masterConsentCalls = 0
    var updateProfileCalls = 0

    override suspend fun getProfil(): ApiResult<ProfilAnggotaDto> = profilHandler()

    override suspend fun updateProfile(username: String): ApiResult<BasicResponse> {
        updateProfileCalls++
        return updateProfileHandler(username)
    }

    override fun observeAvailableBarang(query: String, limit: Int): Flow<List<CachedBarangEntity>> {
        val trimmed = query.trim().lowercase()
        return barangCatalogFlow.map { items ->
            items
                .filter { it.stok > 0 }
                .filter { trimmed.isEmpty() || it.namaBarang.lowercase().contains(trimmed) }
                .take(limit)
        }
    }

    override suspend fun refreshBarangCatalog(): ApiResult<List<BarangAnggotaDto>> = refreshBarangHandler()

    override suspend fun getPaketBelanja(): ApiResult<PaketBelanjaBundleResult> = paketBelanjaHandler()

    override suspend fun simpanTransaksi(request: SimpanTransaksiRequest): ApiResult<SimpanTransaksiResponse> {
        simpanTransaksiCalls++
        return simpanTransaksiHandler(request)
    }

    override suspend fun getHistoriTransaksi(page: Int): ApiResult<TransaksiPaginatorDto> =
        historiTransaksiHandler(page)

    override suspend fun bayarHutang(jumlah: Double): ApiResult<BayarHutangResponse> {
        bayarHutangCalls++
        return bayarHutangHandler(jumlah)
    }

    override suspend fun getHistoriBayarHutang(): ApiResult<List<HistoriBayarHutangDto>> =
        historiBayarHutangHandler()

    override suspend fun cekKelayakanTarikTunai(): ApiResult<KelayakanTarikTunaiDto> =
        kelayakanHandler()

    override suspend fun setujuiMasterConsentShu(): ApiResult<MasterConsentResponse> {
        masterConsentCalls++
        return masterConsentHandler()
    }

    override suspend fun ajukanTarikTunai(request: AjukanTarikTunaiRequest): ApiResult<AjukanTarikTunaiResponse> {
        ajukanTarikTunaiCalls++
        return ajukanTarikTunaiHandler(request)
    }

    override suspend fun getRiwayatTarikTunai(): ApiResult<List<TarikTunaiItemDto>> =
        riwayatTarikTunaiHandler()
}
