package id.koperasipk.app.feature.anggota

import androidx.compose.runtime.Immutable
import id.koperasipk.app.core.common.FlexibleBooleanSerializer
import id.koperasipk.app.core.common.FlexibleDoubleSerializer
import id.koperasipk.app.core.common.FlexibleIntSerializer
import id.koperasipk.app.core.common.FlexibleNullableDoubleSerializer
import id.koperasipk.app.core.common.FlexibleNullableIntSerializer
import id.koperasipk.app.core.database.CachedBarangEntity
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ─── Profil Anggota ───────────────────────────────────────────────────────────

@Serializable
data class AnggotaProfilResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val user: ProfilAnggotaDto? = null,
)

@Immutable
@Serializable
data class ProfilAnggotaDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("anggota_id") val anggotaId: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("user_id") val userId: Int = 0,
    @SerialName("nama_lengkap") val namaLengkap: String? = null,
    val username: String? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val saldo: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hutang: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val shu: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("simpanan_pokok") val simpananPokok: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("allowance_hutang") val allowanceHutang: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("limit_hutang") val limitHutang: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("sisa_limit_hutang") val sisaLimitHutang: Double = 0.0,
)

@Serializable
data class UpdateProfileRequest(
    val username: String,
)

// ─── Katalog Barang & Paket Belanja ───────────────────────────────────────────

@Serializable
data class AnggotaBarangResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: List<BarangAnggotaDto> = emptyList(),
)

@Immutable
@Serializable
data class BarangAnggotaDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    val stok: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("harga_jual") val hargaJual: Double = 0.0,
    @Serializable(with = FlexibleNullableDoubleSerializer::class)
    val harga: Double? = null,
    val satuan: String? = null,
    val kategori: String? = null,
    @SerialName("hari_kadaluarsa_toko") val hariKadaluarsaToko: Int? = null,
    @SerialName("status_kadaluarsa_toko") val statusKadaluarsaToko: String? = null,
    @SerialName("hari_kadaluarsa_gudang") val hariKadaluarsaGudang: Int? = null,
    @SerialName("status_kadaluarsa_gudang") val statusKadaluarsaGudang: String? = null,
) {
    val resolvedPrice: Double
        get() = harga ?: hargaJual

    fun toCachedEntity(updatedAt: Long = System.currentTimeMillis()): CachedBarangEntity =
        CachedBarangEntity(
            barangId = barangId,
            namaBarang = namaBarang,
            kategori = kategori,
            stok = stok,
            stokToko = stok,
            hargaJual = resolvedPrice,
            satuan = satuan,
            statusKadaluarsaToko = statusKadaluarsaToko,
            statusKadaluarsaGudang = statusKadaluarsaGudang,
            updatedAt = updatedAt,
        )
}

@Serializable
data class PaketBelanjaResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: List<PaketBelanjaDto> = emptyList(),
    @SerialName("sering_dibeli") val seringDibeli: PaketBelanjaDto? = null,
    @SerialName("ai_recommendation") val aiRecommendation: PaketBelanjaDto? = null,
) {
    val resolvedSeringDibeli: PaketBelanjaDto?
        get() = seringDibeli ?: aiRecommendation
}

@Immutable
@Serializable
data class PaketBelanjaDto(
    val id: String = "",
    @SerialName("nama_paket") val namaPaket: String = "",
    val deskripsi: String = "",
    val tag: String = "",
    val icon: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("total_harga") val totalHarga: Double = 0.0,
    val items: List<PaketBelanjaItemDto> = emptyList(),
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("is_available") val isAvailable: Boolean = false,
)

@Immutable
@Serializable
data class PaketBelanjaItemDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    val jumlah: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    val qty: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("harga_satuan") val hargaSatuan: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val subtotal: Double = 0.0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("stok_tersedia") val stokTersedia: Int = 0,
) {
    val resolvedQty: Int
        get() = if (jumlah > 0) jumlah else qty
}

// ─── Checkout & Histori Transaksi ─────────────────────────────────────────────

@Serializable
data class CheckoutItemRequest(
    @SerialName("barang_id") val barangId: Int,
    val jumlah: Int,
)

@Serializable
data class SimpanTransaksiRequest(
    @SerialName("metode_pembayaran") val metodePembayaran: String,
    val items: List<CheckoutItemRequest>,
    @SerialName("sertakan_tarik_tunai") val sertakanTarikTunai: Boolean? = null,
    @SerialName("tarik_tunai_nominal") val tarikTunaiNominal: Double? = null,
    @SerialName("tarik_tunai_sumber") val tarikTunaiSumber: String? = null,
    @SerialName("persetujuan_shu") val persetujuanShu: Boolean? = null,
)

@Serializable
data class SimpanTransaksiResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int? = null,
    @SerialName("tarik_tunai") val tarikTunai: CheckoutTarikTunaiDto? = null,
)

@Immutable
@Serializable
data class CheckoutTarikTunaiDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("tarik_id") val tarikId: Int = 0,
    @SerialName("kode_penarikan") val kodePenarikan: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("nominal_tarik") val nominalTarik: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("potong_belanja") val potongBelanja: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("uang_bersih_diserahkan") val uangBersihDiserahkan: Double = 0.0,
    @SerialName("sumber_dana") val sumberDana: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("sisa_shu") val sisaShu: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("sisa_saldo") val sisaSaldo: Double = 0.0,
)

@Serializable
data class HistoriTransaksiResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: TransaksiPaginatorDto? = null,
)

@Immutable
@Serializable
data class TransaksiPaginatorDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("current_page") val currentPage: Int = 1,
    val data: List<TransaksiAnggotaDto> = emptyList(),
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("last_page") val lastPage: Int = 1,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("per_page") val perPage: Int = 15,
    @Serializable(with = FlexibleIntSerializer::class)
    val total: Int = 0,
)

@Immutable
@Serializable
data class TransaksiAnggotaDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int = 0,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("anggota_id") val anggotaId: Int? = null,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("kasir_id") val kasirId: Int? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("total_harga") val totalHarga: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("total_keuntungan") val totalKeuntungan: Double = 0.0,
    @SerialName("metode_pembayaran") val metodePembayaran: String = "",
    val status: String = "",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("nama_kasir") val namaKasir: String? = null,
    val items: List<TransaksiDetailItemDto> = emptyList(),
)

@Immutable
@Serializable
data class TransaksiDetailItemDto(
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("transaksi_detail_id") val transaksiDetailId: Int? = null,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    val jumlah: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("harga_satuan") val hargaSatuan: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val subtotal: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val keuntungan: Double = 0.0,
)

// ─── Bayar Hutang ─────────────────────────────────────────────────────────────

@Serializable
data class BayarHutangRequest(
    val jumlah: Double,
)

@Serializable
data class BayarHutangResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("pembayaran_id") val pembayaranId: Int? = null,
)

@Serializable
data class HistoriBayarHutangResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: List<HistoriBayarHutangDto> = emptyList(),
)

@Immutable
@Serializable
data class HistoriBayarHutangDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("pembayaran_id") val pembayaranId: Int = 0,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("anggota_id") val anggotaId: Int? = null,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("kasir_id") val kasirId: Int? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    @Serializable(with = FlexibleNullableDoubleSerializer::class)
    val jumlah: Double? = null,
    val status: String = "pending",
    @SerialName("metode_pembayaran") val metodePembayaran: String? = null,
    @SerialName("approved_at") val approvedAt: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
) {
    val resolvedNominal: Double
        get() = if (nominal > 0.0) nominal else (jumlah ?: 0.0)
}

// ─── Tarik Tunai & SHU ────────────────────────────────────────────────────────

@Serializable
data class KelayakanTarikTunaiResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: KelayakanTarikTunaiDto? = null,
)

@Immutable
@Serializable
data class KelayakanTarikTunaiDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("anggota_id") val anggotaId: Int = 0,
    @SerialName("nama_lengkap") val namaLengkap: String? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("saldo_shu") val saldoShu: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("saldo_ewallet") val saldoEwallet: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hutang: Double = 0.0,
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("has_debt") val hasDebt: Boolean = false,
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("has_master_consent") val hasMasterConsent: Boolean = false,
    @SerialName("master_consent_at") val masterConsentAt: String? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("total_belanja_hari_ini") val totalBelanjaHariIni: Double = 0.0,
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("has_qualifying_purchase") val hasQualifyingPurchase: Boolean = false,
    @SerialName("transaksi_valid_hari_ini") val transaksiValidHariIni: List<TransaksiValidHariIniDto> = emptyList(),
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("eligible_shu") val eligibleShu: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("raw_withdrawal_limit") val rawWithdrawalLimit: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("pre_round_limit") val preRoundLimit: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("final_withdrawal_limit") val finalWithdrawalLimit: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("max_kuota_tarik_tunai") val maxKuotaTarikTunai: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("max_shu_withdrawal") val maxShuWithdrawal: Double = 0.0,
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("is_eligible") val isEligible: Boolean = false,
    @SerialName("ineligible_reasons") val ineligibleReasons: List<String> = emptyList(),
    @SerialName("pending_ticket") val pendingTicket: PendingTarikTicketDto? = null,
) {
    val resolvedMaxQuota: Double
        get() = when {
            maxKuotaTarikTunai > 0.0 -> maxKuotaTarikTunai
            finalWithdrawalLimit > 0.0 -> finalWithdrawalLimit
            else -> maxShuWithdrawal
        }
}

@Immutable
@Serializable
data class TransaksiValidHariIniDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("total_harga") val totalHarga: Double = 0.0,
    @SerialName("metode_pembayaran") val metodePembayaran: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Immutable
@Serializable
data class PendingTarikTicketDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("tarik_id") val tarikId: Int = 0,
    @SerialName("kode_penarikan") val kodePenarikan: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    @SerialName("sumber_dana") val sumberDana: String = "shu",
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class MasterConsentResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: MasterConsentDataDto? = null,
)

@Immutable
@Serializable
data class MasterConsentDataDto(
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("has_master_consent") val hasMasterConsent: Boolean = false,
    @SerialName("persetujuan_shu_master_at") val persetujuanShuMasterAt: String? = null,
)

@Serializable
data class AjukanTarikTunaiRequest(
    val nominal: Double,
    @SerialName("sumber_dana") val sumberDana: String,
    @SerialName("persetujuan_shu") val persetujuanShu: Boolean? = null,
    @SerialName("transaksi_id") val transaksiId: Int? = null,
    val keterangan: String? = null,
)

@Serializable
data class AjukanTarikTunaiResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: AjukanTarikTunaiDataDto? = null,
)

@Immutable
@Serializable
data class AjukanTarikTunaiDataDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("tarik_id") val tarikId: Int = 0,
    @SerialName("kode_penarikan") val kodePenarikan: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    @SerialName("sumber_dana") val sumberDana: String = "shu",
    val status: String = "pending",
    @SerialName("nama_anggota") val namaAnggota: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class RiwayatTarikTunaiResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: List<TarikTunaiItemDto> = emptyList(),
)

@Immutable
@Serializable
data class TarikTunaiItemDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("tarik_id") val tarikId: Int = 0,
    @SerialName("kode_penarikan") val kodePenarikan: String? = null,
    val status: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    @SerialName("sumber_dana") val sumberDana: String = "shu",
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("belanja_nominal") val belanjaNominal: Double = 0.0,
    @SerialName("alasan_tolak") val alasanTolak: String? = null,
    @SerialName("approved_at") val approvedAt: String? = null,
    val keterangan: String? = null,
    @SerialName("kasir_name") val kasirName: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)
