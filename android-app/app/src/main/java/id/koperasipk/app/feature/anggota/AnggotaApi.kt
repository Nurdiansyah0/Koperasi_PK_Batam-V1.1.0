package id.koperasipk.app.feature.anggota

import id.koperasipk.app.core.network.BasicResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface AnggotaApi {

    @GET("anggota/profil")
    suspend fun getProfil(): AnggotaProfilResponse

    @POST("anggota/update-profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): BasicResponse

    @GET("anggota/barang")
    suspend fun getBarang(): AnggotaBarangResponse

    @GET("anggota/paket-belanja")
    suspend fun getPaketBelanja(): PaketBelanjaResponse

    @POST("anggota/transaksi")
    suspend fun simpanTransaksi(@Body request: SimpanTransaksiRequest): SimpanTransaksiResponse

    @GET("anggota/transaksi")
    suspend fun getHistoriTransaksi(@Query("page") page: Int = 1): HistoriTransaksiResponse

    @POST("anggota/bayar-hutang")
    suspend fun bayarHutang(@Body request: BayarHutangRequest): BayarHutangResponse

    @GET("anggota/bayar-hutang")
    suspend fun getHistoriBayarHutang(): HistoriBayarHutangResponse

    @GET("anggota/cek-kelayakan-tarik-tunai")
    suspend fun cekKelayakanTarikTunai(): KelayakanTarikTunaiResponse

    @POST("anggota/setujui-master-consent-shu")
    suspend fun setujuiMasterConsentShu(): MasterConsentResponse

    @POST("anggota/ajukan-tarik-tunai")
    suspend fun ajukanTarikTunai(@Body request: AjukanTarikTunaiRequest): AjukanTarikTunaiResponse

    @GET("anggota/riwayat-tarik-tunai")
    suspend fun getRiwayatTarikTunai(): RiwayatTarikTunaiResponse
}
