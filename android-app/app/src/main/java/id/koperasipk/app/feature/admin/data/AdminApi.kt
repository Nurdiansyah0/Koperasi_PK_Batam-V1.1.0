package id.koperasipk.app.feature.admin.data

import okhttp3.ResponseBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Url

interface AdminApi {

    @GET("admin/dashboard-stats")
    suspend fun getDashboardStats(): AdminDashboardResponse

    @GET("admin/barang")
    suspend fun getBarang(): AdminBarangListResponse

    @POST("admin/tambah-barang")
    suspend fun tambahBarang(@Body request: TambahBarangRequest): AdminMessageResponse

    @POST("admin/update-barang")
    suspend fun updateBarang(@Body request: UpdateBarangRequest): AdminMessageResponse

    @POST("admin/hapus-barang")
    suspend fun hapusBarang(@Body request: HapusBarangRequest): AdminMessageResponse

    @POST("admin/restock-barang")
    suspend fun restockBarang(@Body request: RestockBarangRequest): StokMutationResponse

    @POST("admin/bulk-restock")
    suspend fun bulkRestock(@Body request: BulkRestockRequest): BulkRestockResponse

    @GET("admin/riwayat-restock")
    suspend fun getRiwayatRestock(): RiwayatRestockResponse

    @POST("admin/mutasi-stok")
    suspend fun mutasiStok(@Body request: MutasiStokRequest): StokMutationResponse

    @POST("admin/auto-refill-display")
    suspend fun autoRefillDisplay(@Body request: AutoRefillRequest = AutoRefillRequest()): AutoRefillResponse

    @POST("admin/write-off-expired")
    suspend fun writeOffExpired(@Body request: WriteOffExpiredRequest): StokMutationResponse

    @POST("admin/opname")
    suspend fun submitOpnameMassal(@Body request: OpnameMassalRequest): AdminMessageResponse

    @GET("admin/anggota")
    suspend fun getAnggota(): AdminAnggotaListResponse

    @POST("admin/tambah-user")
    suspend fun tambahUser(@Body request: TambahUserRequest): AdminMessageResponse

    @POST("admin/update-user")
    suspend fun updateUser(@Body request: UpdateUserRequest): AdminMessageResponse

    @POST("admin/reset-password-user")
    suspend fun resetPasswordUser(@Body request: ResetPasswordUserRequest): AdminMessageResponse

    @POST("admin/hapus-user")
    suspend fun hapusUser(@Body request: HapusUserRequest): AdminMessageResponse

    @GET("admin/setoran-kasir")
    suspend fun getSetoranKasir(): SetoranKasirListResponse

    @POST("admin/approve-setoran-kasir")
    suspend fun approveSetoranKasir(@Body request: ApproveSetoranRequest): AdminMessageResponse

    @POST("admin/topup-shu")
    suspend fun topupShu(@Body request: TopupShuRequest): AdminMessageResponse

    @GET("admin/shu-management")
    suspend fun getShuManagement(): ShuManagementResponse

    @POST("admin/konversi-shu")
    suspend fun prosesKonversiShu(@Body request: ProsesKonversiShuRequest): AdminMessageResponse

    @GET("admin/shu-distribusi")
    suspend fun getShuDistribusi(
        @Query("tahun") tahun: String? = null,
        @Query("limit") limit: Int? = 100,
    ): ShuDistribusiResponse

    @GET("admin/pkm-analysis")
    suspend fun getPkmAnalysis(
        @Query("days") days: Int = 7,
        @Query("lead_time_days") leadTimeDays: Int = 4,
        @Query("search") search: String? = null,
    ): PkmAnalysisResponse

    @POST("admin/update-pkm")
    suspend fun updatePkm(@Body request: UpdatePkmRequest): AdminMessageResponse

    @POST("admin/auto-calculate-pkm")
    suspend fun autoCalculatePkm(@Body request: AutoCalculatePkmRequest): AdminMessageResponse

    @POST("admin/laporan-transaksi")
    suspend fun getLaporanTransaksi(@Body request: LaporanTransaksiRequest): LaporanTransaksiResponse

    @GET("admin/pengeluaran")
    suspend fun getPengeluaran(
        @Query("tanggal_awal") tanggalAwal: String? = null,
        @Query("tanggal_akhir") tanggalAkhir: String? = null,
        @Query("search") search: String? = null,
    ): PengeluaranListResponse

    @POST("admin/pengeluaran")
    suspend fun tambahPengeluaran(@Body request: TambahPengeluaranRequest): TambahPengeluaranResponse

    @DELETE("admin/pengeluaran/{id}")
    suspend fun hapusPengeluaran(@Path("id") id: Int): AdminMessageResponse

    @POST("admin/cash-adjustments")
    suspend fun storeCashAdjustment(@Body request: CashAdjustmentRequest): CashAdjustmentResponse

    @GET("admin/data-kasir")
    suspend fun getDataKasir(): DataKasirResponse

    @GET("admin/laporan-selisih-kasir")
    suspend fun getLaporanSelisihKasir(): LaporanSelisihKasirResponse

    @GET("admin/laporan-tarik-tunai")
    suspend fun getLaporanTarikTunai(): LaporanTarikTunaiResponse

    @GET("admin/jabatan")
    suspend fun getDaftarJabatan(): JabatanListResponse

    @POST("admin/jabatan/assign")
    suspend fun assignJabatan(@Body request: AssignJabatanRequest): AdminMessageResponse

    @POST("admin/jabatan/revoke")
    suspend fun revokeJabatan(@Body request: RevokeJabatanRequest): AdminMessageResponse

    @GET("admin/api-keys")
    suspend fun listApiKeys(): ApiKeyListResponse

    @POST("admin/api-keys")
    suspend fun createApiKey(@Body request: CreateApiKeyRequest): CreateApiKeyResponse

    @PUT("admin/api-keys/{id}/toggle")
    suspend fun toggleApiKey(@Path("id") id: Int): ToggleApiKeyResponse

    @DELETE("admin/api-keys/{id}")
    suspend fun deleteApiKey(@Path("id") id: Int): AdminMessageResponse

    @GET
    suspend fun testExternalGateway(
        @Url endpointPath: String,
        @Header("X-API-KEY") apiKey: String,
    ): ResponseBody
}
