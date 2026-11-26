package id.koperasipk.app.feature.kasir.data

import id.koperasipk.app.core.network.BasicResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface KasirApi {

    @GET("kasir/dashboard")
    suspend fun getDashboard(): KasirDataResponse<DashboardKasirDto>

    @GET("kasir/transaksi-terbaru")
    suspend fun getTransaksiTerbaru(): KasirDataResponse<List<TransaksiTerbaruDto>>

    @GET("kasir/barang-belanja")
    suspend fun getDataBarang(): KasirDataResponse<List<BarangKasirDto>>

    @GET("kasir/paket-belanja")
    suspend fun getPaketBelanja(): PaketBelanjaResponse

    @GET("kasir/all-anggota")
    suspend fun getAllAnggota(): KasirDataResponse<List<AnggotaKasirDto>>

    @GET("kasir/cari-profil-anggota")
    suspend fun cariProfilAnggota(
        @Query("search") search: String? = null,
        @Query("anggota_id") anggotaId: Int? = null,
    ): CariProfilAnggotaResponse

    @POST("kasir/buat-transaksi")
    suspend fun buatTransaksiKasir(
        @Body request: BuatTransaksiRequest,
    ): BuatTransaksiResponse

    @GET("kasir/pesanan-anggota")
    suspend fun getPesananAnggota(): KasirDataResponse<List<PesananAnggotaDto>>

    @POST("kasir/simpan-transaksi-kasir")
    suspend fun simpanTransaksiKasir(
        @Body request: SimpanTransaksiKasirRequest,
    ): BasicResponse

    @POST("kasir/tolak-pesanan-anggota")
    suspend fun tolakPesananAnggota(
        @Body request: TolakPesananRequest,
    ): BasicResponse

    @GET("kasir/latest-pending-orders")
    suspend fun getLatestPendingOrders(): LatestPendingOrdersResponse

    @POST("kasir/test-order-notification")
    suspend fun triggerTestOrderNotification(): TestOrderNotificationResponse

    @GET("kasir/all-pembayaran-hutang")
    suspend fun getAllPembayaranHutang(): KasirDataResponse<List<PembayaranHutangDto>>

    @POST("kasir/approve-pembayaran-hutang")
    suspend fun approvePembayaranHutang(
        @Body request: ApprovePembayaranHutangRequest,
    ): BasicResponse

    @POST("kasir/history-transaksi")
    suspend fun getHistoryTransaksi(
        @Body request: HistoryTransaksiRequest,
    ): KasirDataResponse<LaravelPaginatorDto<RiwayatTransaksiDto>>

    @POST("kasir/setor-admin")
    suspend fun setorAdmin(
        @Body request: SetorAdminRequest,
    ): BasicResponse

    @GET("kasir/setoran-history")
    suspend fun getRiwayatSetoran(): KasirDataResponse<List<SetoranKasirDto>>

    @GET("kasir/cek-kelayakan-tarik-tunai/{anggota_id}")
    suspend fun cekKelayakanTarikTunai(
        @Path("anggota_id") anggotaId: Int,
    ): KasirDataResponse<KelayakanTarikTunaiDto>

    @GET("kasir/antrean-tarik-tunai")
    suspend fun getAntreanTarikTunai(): KasirDataResponse<List<AntreanTarikTunaiDto>>

    @POST("kasir/proses-tarik-tunai")
    suspend fun prosesTarikTunai(
        @Body request: ProsesTarikTunaiRequest,
    ): KasirDataResponse<TarikTunaiReceiptDto>

    @POST("kasir/tarik-tunai")
    suspend fun tarikTunai(
        @Body request: TarikTunaiRequest,
    ): KasirDataResponse<TarikTunaiReceiptDto>

    @GET("kasir/riwayat-tarik-tunai")
    suspend fun getRiwayatTarikTunaiKasir(): KasirDataResponse<List<RiwayatTarikTunaiDto>>

    @GET("kasir/daftar-kasir")
    suspend fun getDaftarKasir(): KasirDataResponse<List<DaftarKasirDto>>

    @GET("kasir/serah-terima-for-me")
    suspend fun getSerahTerimaForMe(
        @Query("type") type: String = "all",
        @Query("page") page: Int = 1,
    ): KasirDataResponse<LaravelPaginatorDto<SerahTerimaDto>>

    @GET("kasir/serah-terima-draft")
    suspend fun getSerahTerimaDraft(): KasirDataResponse<SerahTerimaDraftDto>

    @GET("kasir/active-shift-info")
    suspend fun getActiveShiftInfo(): KasirDataResponse<ActiveShiftInfoDto>

    @POST("kasir/create-serah-terima")
    suspend fun createSerahTerima(
        @Body request: CreateSerahTerimaRequest,
    ): KasirDataResponse<CreateSerahTerimaDataDto>

    @POST("kasir/approve-serah-terima")
    suspend fun approveSerahTerima(
        @Body request: ApproveSerahTerimaRequest,
    ): BasicResponse

    @POST("kasir/reject-serah-terima")
    suspend fun rejectSerahTerima(
        @Body request: RejectSerahTerimaRequest,
    ): BasicResponse
}
