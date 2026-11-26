package id.koperasipk.app.feature.admin.data

import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.common.safeApiCall
import kotlinx.serialization.json.Json

interface AdminRepository {
    suspend fun getDashboardStats(): ApiResult<AdminDashboardResponse>
    suspend fun getBarang(): ApiResult<List<AdminBarangDto>>
    suspend fun tambahBarang(request: TambahBarangRequest): ApiResult<String>
    suspend fun updateBarang(request: UpdateBarangRequest): ApiResult<String>
    suspend fun hapusBarang(barangId: Int): ApiResult<String>
    suspend fun restockBarang(request: RestockBarangRequest): ApiResult<StokMutationResponse>
    suspend fun bulkRestock(request: BulkRestockRequest): ApiResult<BulkRestockResponse>
    suspend fun getRiwayatRestock(): ApiResult<RiwayatRestockResponse>
    suspend fun mutasiStok(request: MutasiStokRequest): ApiResult<StokMutationResponse>
    suspend fun autoRefillDisplay(request: AutoRefillRequest): ApiResult<AutoRefillResponse>
    suspend fun writeOffExpired(request: WriteOffExpiredRequest): ApiResult<StokMutationResponse>
    suspend fun submitOpnameMassal(adjustments: List<OpnameAdjustmentRequest>): ApiResult<String>

    suspend fun getAnggota(): ApiResult<List<AdminAnggotaDto>>
    suspend fun tambahUser(request: TambahUserRequest): ApiResult<String>
    suspend fun updateUser(request: UpdateUserRequest): ApiResult<String>
    suspend fun resetPasswordUser(userId: Int, passwordBaru: String): ApiResult<String>
    suspend fun hapusUser(userId: Int): ApiResult<String>

    suspend fun getSetoranKasir(): ApiResult<List<SetoranKasirItemDto>>
    suspend fun approveSetoranKasir(setoranId: Int, action: String): ApiResult<String>

    suspend fun getShuManagement(): ApiResult<ShuManagementDataDto>
    suspend fun prosesKonversiShu(request: ProsesKonversiShuRequest): ApiResult<String>
    suspend fun topupShu(namaAnggotaUsername: String, nominal: Double): ApiResult<String>
    suspend fun getShuDistribusi(tahun: String? = null, limit: Int? = 100): ApiResult<ShuDistribusiResponse>

    suspend fun getPkmAnalysis(days: Int, leadTimeDays: Int, search: String? = null): ApiResult<PkmAnalysisResponse>
    suspend fun updatePkm(barangId: Int, pkm: Int): ApiResult<String>
    suspend fun autoCalculatePkm(days: Int, leadTimeDays: Int): ApiResult<String>

    suspend fun getLaporanTransaksi(request: LaporanTransaksiRequest): ApiResult<LaporanTransaksiResponse>
    suspend fun getPengeluaran(tanggalAwal: String? = null, tanggalAkhir: String? = null, search: String? = null): ApiResult<PengeluaranListResponse>
    suspend fun tambahPengeluaran(request: TambahPengeluaranRequest): ApiResult<TambahPengeluaranResponse>
    suspend fun hapusPengeluaran(id: Int): ApiResult<String>
    suspend fun storeCashAdjustment(request: CashAdjustmentRequest): ApiResult<CashAdjustmentResponse>
    suspend fun getDataKasir(): ApiResult<List<KasirDropdownDto>>

    suspend fun getLaporanSelisihKasir(): ApiResult<LaporanSelisihDataDto>
    suspend fun getLaporanTarikTunai(): ApiResult<LaporanTarikTunaiResponse>

    suspend fun getDaftarJabatan(): ApiResult<JabatanListResponse>
    suspend fun assignJabatan(request: AssignJabatanRequest): ApiResult<String>
    suspend fun revokeJabatan(request: RevokeJabatanRequest): ApiResult<String>

    suspend fun listApiKeys(): ApiResult<ApiKeyListResponse>
    suspend fun createApiKey(request: CreateApiKeyRequest): ApiResult<CreateApiKeyResponse>
    suspend fun toggleApiKey(id: Int): ApiResult<ToggleApiKeyResponse>
    suspend fun deleteApiKey(id: Int): ApiResult<String>
    suspend fun testExternalGateway(endpointPath: String, apiKey: String): ApiResult<String>
}

class NetworkAdminRepository(
    private val api: AdminApi,
    private val json: Json,
) : AdminRepository {

    override suspend fun getDashboardStats(): ApiResult<AdminDashboardResponse> =
        safeApiCall(json) { api.getDashboardStats() }

    override suspend fun getBarang(): ApiResult<List<AdminBarangDto>> =
        safeApiCall(json) { api.getBarang().data }

    override suspend fun tambahBarang(request: TambahBarangRequest): ApiResult<String> =
        safeCheckedMessage { api.tambahBarang(request) }

    override suspend fun updateBarang(request: UpdateBarangRequest): ApiResult<String> =
        safeCheckedMessage { api.updateBarang(request) }

    override suspend fun hapusBarang(barangId: Int): ApiResult<String> =
        safeCheckedMessage { api.hapusBarang(HapusBarangRequest(barangId)) }

    override suspend fun restockBarang(request: RestockBarangRequest): ApiResult<StokMutationResponse> =
        safeChecked {
            val res = api.restockBarang(request)
            if (!res.success) throw AdminFailureException(res.message.ifBlank { res.error ?: "Gagal restock" })
            res
        }

    override suspend fun bulkRestock(request: BulkRestockRequest): ApiResult<BulkRestockResponse> =
        safeChecked {
            val res = api.bulkRestock(request)
            if (!res.success) throw AdminFailureException(res.message.ifBlank { res.error ?: "Gagal bulk restock" })
            res
        }

    override suspend fun getRiwayatRestock(): ApiResult<RiwayatRestockResponse> =
        safeApiCall(json) { api.getRiwayatRestock() }

    override suspend fun mutasiStok(request: MutasiStokRequest): ApiResult<StokMutationResponse> =
        safeChecked {
            val res = api.mutasiStok(request)
            if (!res.success) throw AdminFailureException(res.message.ifBlank { res.error ?: "Gagal mutasi stok" })
            res
        }

    override suspend fun autoRefillDisplay(request: AutoRefillRequest): ApiResult<AutoRefillResponse> =
        safeChecked {
            val res = api.autoRefillDisplay(request)
            if (!res.success) throw AdminFailureException(res.message.ifBlank { res.error ?: "Gagal refill rak" })
            res
        }

    override suspend fun writeOffExpired(request: WriteOffExpiredRequest): ApiResult<StokMutationResponse> =
        safeChecked {
            val res = api.writeOffExpired(request)
            if (!res.success) throw AdminFailureException(res.message.ifBlank { res.error ?: "Gagal write-off" })
            res
        }

    override suspend fun submitOpnameMassal(adjustments: List<OpnameAdjustmentRequest>): ApiResult<String> =
        safeCheckedMessage { api.submitOpnameMassal(OpnameMassalRequest(adjustments)) }

    override suspend fun getAnggota(): ApiResult<List<AdminAnggotaDto>> =
        safeApiCall(json) { api.getAnggota().data }

    override suspend fun tambahUser(request: TambahUserRequest): ApiResult<String> =
        safeCheckedMessage { api.tambahUser(request) }

    override suspend fun updateUser(request: UpdateUserRequest): ApiResult<String> =
        safeCheckedMessage { api.updateUser(request) }

    override suspend fun resetPasswordUser(userId: Int, passwordBaru: String): ApiResult<String> =
        safeCheckedMessage { api.resetPasswordUser(ResetPasswordUserRequest(userId, passwordBaru)) }

    override suspend fun hapusUser(userId: Int): ApiResult<String> =
        safeCheckedMessage { api.hapusUser(HapusUserRequest(userId)) }

    override suspend fun getSetoranKasir(): ApiResult<List<SetoranKasirItemDto>> =
        safeApiCall(json) { api.getSetoranKasir().data }

    override suspend fun approveSetoranKasir(setoranId: Int, action: String): ApiResult<String> =
        safeCheckedMessage { api.approveSetoranKasir(ApproveSetoranRequest(setoranId, action)) }

    override suspend fun getShuManagement(): ApiResult<ShuManagementDataDto> =
        safeApiCall(json) { api.getShuManagement().data ?: ShuManagementDataDto() }

    override suspend fun prosesKonversiShu(request: ProsesKonversiShuRequest): ApiResult<String> =
        safeCheckedMessage { api.prosesKonversiShu(request) }

    override suspend fun topupShu(namaAnggotaUsername: String, nominal: Double): ApiResult<String> =
        safeCheckedMessage { api.topupShu(TopupShuRequest(namaAnggotaUsername, nominal)) }

    override suspend fun getShuDistribusi(tahun: String?, limit: Int?): ApiResult<ShuDistribusiResponse> =
        safeApiCall(json) { api.getShuDistribusi(tahun = tahun, limit = limit) }

    override suspend fun getPkmAnalysis(days: Int, leadTimeDays: Int, search: String?): ApiResult<PkmAnalysisResponse> =
        safeApiCall(json) { api.getPkmAnalysis(days = days, leadTimeDays = leadTimeDays, search = search) }

    override suspend fun updatePkm(barangId: Int, pkm: Int): ApiResult<String> =
        safeCheckedMessage { api.updatePkm(UpdatePkmRequest(barangId, pkm)) }

    override suspend fun autoCalculatePkm(days: Int, leadTimeDays: Int): ApiResult<String> =
        safeCheckedMessage { api.autoCalculatePkm(AutoCalculatePkmRequest(days, leadTimeDays)) }

    override suspend fun getLaporanTransaksi(request: LaporanTransaksiRequest): ApiResult<LaporanTransaksiResponse> =
        safeApiCall(json) { api.getLaporanTransaksi(request) }

    override suspend fun getPengeluaran(tanggalAwal: String?, tanggalAkhir: String?, search: String?): ApiResult<PengeluaranListResponse> =
        safeApiCall(json) { api.getPengeluaran(tanggalAwal = tanggalAwal, tanggalAkhir = tanggalAkhir, search = search) }

    override suspend fun tambahPengeluaran(request: TambahPengeluaranRequest): ApiResult<TambahPengeluaranResponse> =
        safeChecked {
            val res = api.tambahPengeluaran(request)
            if (!res.success) throw AdminFailureException(res.message.ifBlank { res.error ?: "Gagal menyimpan pengeluaran" })
            res
        }

    override suspend fun hapusPengeluaran(id: Int): ApiResult<String> =
        safeCheckedMessage { api.hapusPengeluaran(id) }

    override suspend fun storeCashAdjustment(request: CashAdjustmentRequest): ApiResult<CashAdjustmentResponse> =
        safeChecked {
            val res = api.storeCashAdjustment(request)
            if (!res.success) throw AdminFailureException(res.message.ifBlank { res.error ?: "Gagal menyimpan penyesuaian kas" })
            res
        }

    override suspend fun getDataKasir(): ApiResult<List<KasirDropdownDto>> =
        safeApiCall(json) { api.getDataKasir().data }

    override suspend fun getLaporanSelisihKasir(): ApiResult<LaporanSelisihDataDto> =
        safeApiCall(json) { api.getLaporanSelisihKasir().data ?: LaporanSelisihDataDto() }

    override suspend fun getLaporanTarikTunai(): ApiResult<LaporanTarikTunaiResponse> =
        safeApiCall(json) { api.getLaporanTarikTunai() }

    override suspend fun getDaftarJabatan(): ApiResult<JabatanListResponse> =
        safeApiCall(json) { api.getDaftarJabatan() }

    override suspend fun assignJabatan(request: AssignJabatanRequest): ApiResult<String> =
        safeCheckedMessage { api.assignJabatan(request) }

    override suspend fun revokeJabatan(request: RevokeJabatanRequest): ApiResult<String> =
        safeCheckedMessage { api.revokeJabatan(request) }

    override suspend fun listApiKeys(): ApiResult<ApiKeyListResponse> =
        safeApiCall(json) { api.listApiKeys() }

    override suspend fun createApiKey(request: CreateApiKeyRequest): ApiResult<CreateApiKeyResponse> =
        safeChecked {
            val res = api.createApiKey(request)
            if (!res.success) throw AdminFailureException(res.message.ifBlank { "Gagal membuat API Key" })
            res
        }

    override suspend fun toggleApiKey(id: Int): ApiResult<ToggleApiKeyResponse> =
        safeChecked {
            val res = api.toggleApiKey(id)
            if (!res.success) throw AdminFailureException(res.message.ifBlank { "Gagal mengubah status API Key" })
            res
        }

    override suspend fun deleteApiKey(id: Int): ApiResult<String> =
        safeCheckedMessage { api.deleteApiKey(id) }

    override suspend fun testExternalGateway(endpointPath: String, apiKey: String): ApiResult<String> =
        safeApiCall(json) {
            val relativePath = endpointPath.removePrefix("/laravel/api/").removePrefix("/")
            val raw = api.testExternalGateway(relativePath, apiKey).string()
            try {
                val parsed = json.parseToJsonElement(raw)
                prettyJson.encodeToString(kotlinx.serialization.json.JsonElement.serializer(), parsed)
            } catch (_: Exception) {
                raw
            }
        }

    private suspend fun safeCheckedMessage(block: suspend () -> AdminMessageResponse): ApiResult<String> {
        return when (val result = safeApiCall(json, block)) {
            is ApiResult.Success -> {
                val res = result.data
                if (res.success) {
                    ApiResult.Success(res.resolvedMessage.ifBlank { "Berhasil" })
                } else {
                    ApiResult.Error(res.resolvedMessage.ifBlank { "Operasi gagal diproses server" })
                }
            }
            is ApiResult.Error -> result
        }
    }

    private suspend fun <T> safeChecked(block: suspend () -> T): ApiResult<T> =
        safeApiCall(json, block)

    private class AdminFailureException(message: String) : Exception(message)

    companion object {
        private val prettyJson = Json { prettyPrint = true }
    }
}
