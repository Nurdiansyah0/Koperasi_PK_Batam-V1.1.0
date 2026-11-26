package id.koperasipk.app.feature.admin

import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.admin.data.AdminAnggotaDto
import id.koperasipk.app.feature.admin.data.AdminApi
import id.koperasipk.app.feature.admin.data.AdminBarangDto
import id.koperasipk.app.feature.admin.data.AdminDashboardResponse
import id.koperasipk.app.feature.admin.data.AdminMessageResponse
import id.koperasipk.app.feature.admin.data.ApiKeyItemDto
import id.koperasipk.app.feature.admin.data.ApiKeyListResponse
import id.koperasipk.app.feature.admin.data.AssignJabatanRequest
import id.koperasipk.app.feature.admin.data.AutoCalculatePkmRequest
import id.koperasipk.app.feature.admin.data.AutoRefillRequest
import id.koperasipk.app.feature.admin.data.AutoRefillResponse
import id.koperasipk.app.feature.admin.data.BulkRestockRequest
import id.koperasipk.app.feature.admin.data.BulkRestockResponse
import id.koperasipk.app.feature.admin.data.CashAdjustmentDto
import id.koperasipk.app.feature.admin.data.CashAdjustmentRequest
import id.koperasipk.app.feature.admin.data.CashAdjustmentResponse
import id.koperasipk.app.feature.admin.data.CreateApiKeyRequest
import id.koperasipk.app.feature.admin.data.CreateApiKeyResponse
import id.koperasipk.app.feature.admin.data.HapusBarangRequest
import id.koperasipk.app.feature.admin.data.HapusUserRequest
import id.koperasipk.app.feature.admin.data.JabatanItemDto
import id.koperasipk.app.feature.admin.data.JabatanListResponse
import id.koperasipk.app.feature.admin.data.KasirDropdownDto
import id.koperasipk.app.feature.admin.data.LaporanSelisihDataDto
import id.koperasipk.app.feature.admin.data.LaporanSelisihKasirResponse
import id.koperasipk.app.feature.admin.data.LaporanTarikTunaiResponse
import id.koperasipk.app.feature.admin.data.LaporanTransaksiRequest
import id.koperasipk.app.feature.admin.data.LaporanTransaksiResponse
import id.koperasipk.app.feature.admin.data.MutasiStokRequest
import id.koperasipk.app.feature.admin.data.OpnameAdjustmentRequest
import id.koperasipk.app.feature.admin.data.OpnameMassalRequest
import id.koperasipk.app.feature.admin.data.PengeluaranDto
import id.koperasipk.app.feature.admin.data.PengeluaranListResponse
import id.koperasipk.app.feature.admin.data.PkmAnalysisResponse
import id.koperasipk.app.feature.admin.data.ProsesKonversiShuRequest
import id.koperasipk.app.feature.admin.data.ResetPasswordUserRequest
import id.koperasipk.app.feature.admin.data.AdminRepository
import id.koperasipk.app.feature.admin.data.RestockBarangRequest
import id.koperasipk.app.feature.admin.data.RevokeJabatanRequest
import id.koperasipk.app.feature.admin.data.RiwayatRestockResponse
import id.koperasipk.app.feature.admin.data.SetoranKasirItemDto
import id.koperasipk.app.feature.admin.data.ShuDistribusiResponse
import id.koperasipk.app.feature.admin.data.ShuManagementDataDto
import id.koperasipk.app.feature.admin.data.ShuManagementResponse
import id.koperasipk.app.feature.admin.data.StokMutationResponse
import id.koperasipk.app.feature.admin.data.TambahBarangRequest
import id.koperasipk.app.feature.admin.data.TambahPengeluaranRequest
import id.koperasipk.app.feature.admin.data.TambahPengeluaranResponse
import id.koperasipk.app.feature.admin.data.TambahUserRequest
import id.koperasipk.app.feature.admin.data.ToggleApiKeyResponse
import id.koperasipk.app.feature.admin.data.UpdateBarangRequest
import id.koperasipk.app.feature.admin.data.UpdatePkmRequest
import id.koperasipk.app.feature.admin.data.UpdateUserRequest
import id.koperasipk.app.feature.admin.data.WriteOffExpiredRequest

/**
 * Fake in-memory implementation of [AdminRepository] for ViewModel unit tests.
 */
class FakeAdminRepository : AdminRepository {

    // ─── Stubbed responses ────────────────────────────────────────────────────
    var dashboardResult: ApiResult<AdminDashboardResponse> = ApiResult.Success(AdminDashboardResponse())
    var barangResult: ApiResult<List<AdminBarangDto>> = ApiResult.Success(emptyList())
    var tambahBarangResult: ApiResult<String> = ApiResult.Success("Barang berhasil ditambahkan")
    var updateBarangResult: ApiResult<String> = ApiResult.Success("Barang diperbarui")
    var hapusBarangResult: ApiResult<String> = ApiResult.Success("Barang dihapus")
    var restockResult: ApiResult<StokMutationResponse> = ApiResult.Success(StokMutationResponse())
    var bulkRestockResult: ApiResult<BulkRestockResponse> = ApiResult.Success(BulkRestockResponse())
    var riwayatRestockResult: ApiResult<RiwayatRestockResponse> = ApiResult.Success(RiwayatRestockResponse())
    var mutasiStokResult: ApiResult<StokMutationResponse> = ApiResult.Success(StokMutationResponse())
    var autoRefillResult: ApiResult<AutoRefillResponse> = ApiResult.Success(AutoRefillResponse())
    var writeOffResult: ApiResult<StokMutationResponse> = ApiResult.Success(StokMutationResponse())
    var opnameResult: ApiResult<String> = ApiResult.Success("Opname massal berhasil")
    var anggotaResult: ApiResult<List<AdminAnggotaDto>> = ApiResult.Success(emptyList())
    var tambahUserResult: ApiResult<String> = ApiResult.Success("User dibuat")
    var updateUserResult: ApiResult<String> = ApiResult.Success("User diperbarui")
    var resetPasswordResult: ApiResult<String> = ApiResult.Success("Password direset")
    var hapusUserResult: ApiResult<String> = ApiResult.Success("User dihapus")
    var setoranResult: ApiResult<List<SetoranKasirItemDto>> = ApiResult.Success(emptyList())
    var approveSetoranResult: ApiResult<String> = ApiResult.Success("Setoran diproses")
    var shuManagementResult: ApiResult<ShuManagementDataDto> = ApiResult.Success(ShuManagementDataDto())
    var konversiShuResult: ApiResult<String> = ApiResult.Success("SHU dikonversi")
    var topupShuResult: ApiResult<String> = ApiResult.Success("SHU di-top-up")
    var shuDistribusiResult: ApiResult<ShuDistribusiResponse> = ApiResult.Success(ShuDistribusiResponse())
    var pkmAnalysisResult: ApiResult<PkmAnalysisResponse> = ApiResult.Success(PkmAnalysisResponse())
    var updatePkmResult: ApiResult<String> = ApiResult.Success("PKM diperbarui")
    var autoPkmResult: ApiResult<String> = ApiResult.Success("PKM dihitung otomatis")
    var laporanTransaksiResult: ApiResult<LaporanTransaksiResponse> = ApiResult.Success(LaporanTransaksiResponse(success = true))
    var pengeluaranResult: ApiResult<PengeluaranListResponse> = ApiResult.Success(PengeluaranListResponse())
    var tambahPengeluaranResult: ApiResult<TambahPengeluaranResponse> = ApiResult.Success(TambahPengeluaranResponse(success = true, message = "Pengeluaran dicatat"))
    var hapusPengeluaranResult: ApiResult<String> = ApiResult.Success("Pengeluaran dihapus")
    var cashAdjResult: ApiResult<CashAdjustmentResponse> = ApiResult.Success(CashAdjustmentResponse(success = true, message = "Penyesuaian disimpan"))
    var kasirListResult: ApiResult<List<KasirDropdownDto>> = ApiResult.Success(emptyList())
    var selisihResult: ApiResult<LaporanSelisihDataDto> = ApiResult.Success(LaporanSelisihDataDto())
    var tarikTunaiResult: ApiResult<LaporanTarikTunaiResponse> = ApiResult.Success(LaporanTarikTunaiResponse())
    var jabatanResult: ApiResult<JabatanListResponse> = ApiResult.Success(JabatanListResponse())
    var assignJabatanResult: ApiResult<String> = ApiResult.Success("Jabatan ditetapkan")
    var revokeJabatanResult: ApiResult<String> = ApiResult.Success("Jabatan dicabut")
    var apiKeyListResult: ApiResult<ApiKeyListResponse> = ApiResult.Success(ApiKeyListResponse())
    var createApiKeyResult: ApiResult<CreateApiKeyResponse> = ApiResult.Success(CreateApiKeyResponse(success = true))
    var toggleApiKeyResult: ApiResult<ToggleApiKeyResponse> = ApiResult.Success(ToggleApiKeyResponse(success = true))
    var deleteApiKeyResult: ApiResult<String> = ApiResult.Success("API Key dihapus")
    var testGatewayResult: ApiResult<String> = ApiResult.Success("{\"status\":\"ok\"}")

    // ─── Call trackers ────────────────────────────────────────────────────────
    val tambahBarangCalls = mutableListOf<TambahBarangRequest>()
    val updateBarangCalls = mutableListOf<UpdateBarangRequest>()
    val hapusBarangIds = mutableListOf<Int>()
    val restockCalls = mutableListOf<RestockBarangRequest>()
    val tambahUserCalls = mutableListOf<TambahUserRequest>()
    val updateUserCalls = mutableListOf<UpdateUserRequest>()
    val hapusUserIds = mutableListOf<Int>()
    val approveSetoranCalls = mutableListOf<Pair<Int, String>>()
    val konversiShuCalls = mutableListOf<ProsesKonversiShuRequest>()
    val topupShuCalls = mutableListOf<Pair<String, Double>>()
    val tambahPengeluaranCalls = mutableListOf<TambahPengeluaranRequest>()
    val hapusPengeluaranIds = mutableListOf<Int>()
    val cashAdjCalls = mutableListOf<CashAdjustmentRequest>()
    val laporanCalls = mutableListOf<LaporanTransaksiRequest>()
    val assignJabatanCalls = mutableListOf<AssignJabatanRequest>()

    // ─── Implementation ───────────────────────────────────────────────────────
    override suspend fun getDashboardStats() = dashboardResult
    override suspend fun getBarang() = barangResult
    override suspend fun tambahBarang(request: TambahBarangRequest) = tambahBarangCalls.add(request).let { tambahBarangResult }
    override suspend fun updateBarang(request: UpdateBarangRequest) = updateBarangCalls.add(request).let { updateBarangResult }
    override suspend fun hapusBarang(barangId: Int) = hapusBarangIds.add(barangId).let { hapusBarangResult }
    override suspend fun restockBarang(request: RestockBarangRequest) = restockCalls.add(request).let { restockResult }
    override suspend fun bulkRestock(request: BulkRestockRequest) = bulkRestockResult
    override suspend fun getRiwayatRestock() = riwayatRestockResult
    override suspend fun mutasiStok(request: MutasiStokRequest) = mutasiStokResult
    override suspend fun autoRefillDisplay(request: AutoRefillRequest) = autoRefillResult
    override suspend fun writeOffExpired(request: WriteOffExpiredRequest) = writeOffResult
    override suspend fun submitOpnameMassal(adjustments: List<OpnameAdjustmentRequest>) = opnameResult
    override suspend fun getAnggota() = anggotaResult
    override suspend fun tambahUser(request: TambahUserRequest) = tambahUserCalls.add(request).let { tambahUserResult }
    override suspend fun updateUser(request: UpdateUserRequest) = updateUserCalls.add(request).let { updateUserResult }
    override suspend fun resetPasswordUser(userId: Int, passwordBaru: String) = resetPasswordResult
    override suspend fun hapusUser(userId: Int) = hapusUserIds.add(userId).let { hapusUserResult }
    override suspend fun getSetoranKasir() = setoranResult
    override suspend fun approveSetoranKasir(setoranId: Int, action: String) =
        approveSetoranCalls.add(setoranId to action).let { approveSetoranResult }
    override suspend fun getShuManagement() = shuManagementResult
    override suspend fun prosesKonversiShu(request: ProsesKonversiShuRequest) =
        konversiShuCalls.add(request).let { konversiShuResult }
    override suspend fun topupShu(namaAnggotaUsername: String, nominal: Double) =
        topupShuCalls.add(namaAnggotaUsername to nominal).let { topupShuResult }
    override suspend fun getShuDistribusi(tahun: String?, limit: Int?) = shuDistribusiResult
    override suspend fun getPkmAnalysis(days: Int, leadTimeDays: Int, search: String?) = pkmAnalysisResult
    override suspend fun updatePkm(barangId: Int, pkm: Int) = updatePkmResult
    override suspend fun autoCalculatePkm(days: Int, leadTimeDays: Int) = autoPkmResult
    override suspend fun getLaporanTransaksi(request: LaporanTransaksiRequest) =
        laporanCalls.add(request).let { laporanTransaksiResult }
    override suspend fun getPengeluaran(tanggalAwal: String?, tanggalAkhir: String?, search: String?) = pengeluaranResult
    override suspend fun tambahPengeluaran(request: TambahPengeluaranRequest) =
        tambahPengeluaranCalls.add(request).let { tambahPengeluaranResult }
    override suspend fun hapusPengeluaran(id: Int) = hapusPengeluaranIds.add(id).let { hapusPengeluaranResult }
    override suspend fun storeCashAdjustment(request: CashAdjustmentRequest) =
        cashAdjCalls.add(request).let { cashAdjResult }
    override suspend fun getDataKasir() = kasirListResult
    override suspend fun getLaporanSelisihKasir() = selisihResult
    override suspend fun getLaporanTarikTunai() = tarikTunaiResult
    override suspend fun getDaftarJabatan() = jabatanResult
    override suspend fun assignJabatan(request: AssignJabatanRequest) = assignJabatanCalls.add(request).let { assignJabatanResult }
    override suspend fun revokeJabatan(request: RevokeJabatanRequest) = revokeJabatanResult
    override suspend fun listApiKeys() = apiKeyListResult
    override suspend fun createApiKey(request: CreateApiKeyRequest) = createApiKeyResult
    override suspend fun toggleApiKey(id: Int) = toggleApiKeyResult
    override suspend fun deleteApiKey(id: Int) = deleteApiKeyResult
    override suspend fun testExternalGateway(endpointPath: String, apiKey: String) = testGatewayResult
}
