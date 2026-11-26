package id.koperasipk.app.feature.kasir.data

import id.koperasipk.app.core.common.FlexibleBooleanSerializer
import id.koperasipk.app.core.common.FlexibleDoubleSerializer
import id.koperasipk.app.core.common.FlexibleIntSerializer
import id.koperasipk.app.core.common.FlexibleNullableDoubleSerializer
import id.koperasipk.app.core.common.FlexibleNullableIntSerializer
import id.koperasipk.app.core.network.NetworkModule
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

@Serializable
data class KasirDataResponse<T>(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: T? = null,
)

@Serializable
data class LaravelPaginatorDto<T>(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("current_page") val currentPage: Int = 1,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("last_page") val lastPage: Int = 1,
    @Serializable(with = FlexibleIntSerializer::class)
    val total: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("per_page") val perPage: Int = 20,
    val data: List<T> = emptyList(),
)

// ─── Dashboard & Transaksi Terbaru ──────────────────────────────────────────

@Serializable
data class DashboardKasirDto(
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("total_pendapatan_hari_ini") val totalPendapatanHariIni: Double = 0.0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("total_transaksi_hari_ini") val totalTransaksiHariIni: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("total_item_terjual_hari_ini") val totalItemTerjualHariIni: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("total_transaksi_dilayani") val totalTransaksiDilayani: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("saldo_kas") val saldoKas: Double = 0.0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("pending_serah_terima") val pendingSerahTerima: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("pending_pesanan") val pendingPesanan: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("pending_hutang") val pendingHutang: Int = 0,
    @SerialName("transaksi_terbaru") val transaksiTerbaru: List<TransaksiTerbaruDto> = emptyList(),
    @SerialName("active_shift") val activeShift: ActiveShiftDetailDto? = null,
)

@Serializable
data class TransaksiTerbaruDto(
    @Serializable(with = FlexibleIntSerializer::class)
    val id: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int = 0,
    @SerialName("created_at") val createdAt: String? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("total_harga") val totalHarga: Double = 0.0,
    @SerialName("metode_pembayaran") val metodePembayaran: String = "",
    val status: String = "",
    @SerialName("nama_anggota") val namaAnggota: String? = null,
) {
    val resolvedId: Int
        get() = if (transaksiId != 0) transaksiId else id
}

// ─── Katalog POS, Paket Belanja, Anggota, Checkout ──────────────────────────

@Serializable
data class BarangKasirDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("harga_jual") val hargaJual: Double = 0.0,
    @Serializable(with = FlexibleNullableDoubleSerializer::class)
    val harga: Double? = null,
    @Serializable(with = FlexibleIntSerializer::class)
    val stok: Int = 0,
    val satuan: String? = null,
) {
    val effectivePrice: Double
        get() = harga ?: hargaJual
}

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
    val effectiveQty: Int
        get() = if (qty > 0) qty else jumlah
}

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
    @SerialName("is_available") val isAvailable: Boolean = true,
)

@Serializable
data class PaketBelanjaResponse(
    val success: Boolean = false,
    val data: List<PaketBelanjaDto> = emptyList(),
    @SerialName("sering_dibeli") val seringDibeli: PaketBelanjaDto? = null,
)

@Serializable
data class AnggotaKasirDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("anggota_id") val anggotaId: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("user_id") val userId: Int = 0,
    @SerialName("nama_lengkap") val namaLengkap: String = "",
    val nama: String? = null,
    val username: String = "",
    val email: String? = null,
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
) {
    val displayName: String
        get() = namaLengkap.ifBlank { nama.orEmpty() }.ifBlank { "Anggota #$anggotaId" }
}

@Serializable
data class CariProfilAnggotaResponse(
    val success: Boolean = false,
    val message: String = "",
    val profil: AnggotaKasirDto? = null,
)

@Serializable
data class CheckoutItemRequest(
    @SerialName("barang_id") val barangId: Int,
    val jumlah: Int,
    @SerialName("harga_satuan") val hargaSatuan: Double? = null,
)

@Serializable
data class BuatTransaksiRequest(
    val items: List<CheckoutItemRequest>,
    @SerialName("anggota_id") val anggotaId: Int?,
    @SerialName("metode_pembayaran") val metodePembayaran: String,
    val total: Double? = null,
    @SerialName("sertakan_tarik_tunai") val sertakanTarikTunai: Boolean? = null,
    @SerialName("tarik_tunai_nominal") val tarikTunaiNominal: Double? = null,
    @SerialName("tarik_tunai_sumber") val tarikTunaiSumber: String? = null,
    @SerialName("persetujuan_shu") val persetujuanShu: Boolean? = null,
)

@Serializable
data class PosTarikTunaiResultDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("tarik_id") val tarikId: Int = 0,
    @SerialName("kode_penarikan") val kodePenarikan: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("nominal_tarik") val nominalTarik: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("potong_belanja") val potongBelanja: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("uang_bersih_diserahkan") val uangBersihDiserahkan: Double = 0.0,
    @SerialName("sumber_dana") val sumberDana: String = "shu",
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("sisa_shu") val sisaShu: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("sisa_saldo") val sisaSaldo: Double = 0.0,
)

@Serializable
data class BuatTransaksiResponse(
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int? = null,
    @Serializable(with = FlexibleNullableDoubleSerializer::class)
    val total: Double? = null,
    @Serializable(with = FlexibleNullableDoubleSerializer::class)
    @SerialName("total_keuntungan") val totalKeuntungan: Double? = null,
    @SerialName("tarik_tunai") val tarikTunai: PosTarikTunaiResultDto? = null,
)

// ─── Pesanan Anggota & Realtime Polling ─────────────────────────────────────

@Serializable
data class PesananTarikTunaiDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("tarik_id") val tarikId: Int = 0,
    @SerialName("kode_penarikan") val kodePenarikan: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    @SerialName("sumber_dana") val sumberDana: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("uang_bersih_diserahkan") val uangBersihDiserahkan: Double = 0.0,
)

@Serializable
data class PesananItemDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    val jumlah: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("harga_satuan") val hargaSatuan: Double = 0.0,
)

@Serializable
data class PesananAnggotaDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int = 0,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("anggota_id") val anggotaId: Int? = null,
    @SerialName("nama_anggota") val namaAnggota: String = "",
    @SerialName("metode_pembayaran") val metodePembayaran: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("total_harga") val totalHarga: Double = 0.0,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("tarik_tunai") val tarikTunai: PesananTarikTunaiDto? = null,
    val items: List<PesananItemDto> = emptyList(),
)

@Serializable
data class SimpanTransaksiIdDto(
    @SerialName("transaksi_id") val transaksiId: Int,
)

@Serializable
data class SimpanTransaksiKasirRequest(
    val transaksi: List<SimpanTransaksiIdDto>,
)

@Serializable
data class TolakPesananRequest(
    @SerialName("transaksi_ids") val transaksiIds: List<Int>,
    val alasan: String? = null,
)

@Serializable
data class LatestOrderDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int = 0,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("anggota_id") val anggotaId: Int? = null,
    @SerialName("nama_anggota") val namaAnggota: String = "",
    val username: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("total_harga") val totalHarga: Double = 0.0,
    @SerialName("metode_pembayaran") val metodePembayaran: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("items_count") val itemsCount: Int = 0,
    @SerialName("items_summary") val itemsSummary: String = "",
    @SerialName("created_at") val createdAt: String? = null,
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("is_test") val isTest: Boolean = false,
)

@Serializable
data class LatestPendingOrdersResponse(
    val success: Boolean = false,
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("is_active_shift") val isActiveShift: Boolean = false,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("pending_count") val pendingCount: Int = 0,
    @SerialName("latest_order") val latestOrder: LatestOrderDto? = null,
    val orders: List<LatestOrderDto> = emptyList(),
    @Serializable(with = FlexibleNullableDoubleSerializer::class)
    @SerialName("server_timestamp") val serverTimestamp: Double? = null,
)

@Serializable
data class TestOrderNotificationResponse(
    val success: Boolean = false,
    val message: String = "",
    val data: LatestOrderDto? = null,
)

// ─── Pembayaran Hutang ──────────────────────────────────────────────────────

@Serializable
data class PembayaranHutangDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("pembayaran_id") val pembayaranId: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("anggota_id") val anggotaId: Int = 0,
    @SerialName("nama_anggota") val namaAnggota: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    val status: String = "pending",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("nama_kasir") val namaKasir: String? = null,
)

@Serializable
data class ApprovePembayaranHutangRequest(
    @SerialName("pembayaran_id") val pembayaranId: Int,
    val action: String,
    @SerialName("metode_pembayaran") val metodePembayaran: String = "cash",
)

// ─── Riwayat Transaksi Kasir ────────────────────────────────────────────────

@Serializable
data class HistoryTransaksiRequest(
    @SerialName("tanggal_awal") val tanggalAwal: String? = null,
    @SerialName("tanggal_akhir") val tanggalAkhir: String? = null,
    @SerialName("jenis_transaksi") val jenisTransaksi: String? = null,
    val status: String? = null,
    val page: Int = 1,
)

@Serializable
data class RiwayatTransaksiDetailDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("detail_id") val detailId: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    val jumlah: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("harga_satuan") val hargaSatuan: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val subtotal: Double = 0.0,
)

@Serializable
data class RiwayatTransaksiDto(
    @Serializable(with = FlexibleIntSerializer::class)
    val id: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int = 0,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("anggota_id") val anggotaId: Int? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val total: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("total_harga") val totalHarga: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("total_keuntungan") val totalKeuntungan: Double = 0.0,
    @SerialName("jenis_transaksi") val jenisTransaksi: String = "",
    @SerialName("metode_pembayaran") val metodePembayaran: String = "",
    val status: String = "",
    val tanggal: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("nama_anggota") val namaAnggota: String? = null,
    @SerialName("nama_kasir") val namaKasir: String? = null,
    val details: List<RiwayatTransaksiDetailDto> = emptyList(),
) {
    val resolvedId: Int
        get() = if (transaksiId != 0) transaksiId else id
    val resolvedTotal: Double
        get() = if (totalHarga > 0.0) totalHarga else total
}

// ─── Setoran Kasir ke Admin ─────────────────────────────────────────────────

@Serializable
data class SetorAdminRequest(
    val nominal: Double,
)

@Serializable
data class SetoranKasirDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("setoran_id") val setoranId: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    val id: Int = 0,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("kasir_id") val kasirId: Int? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    val status: String = "pending",
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("approved_by") val approvedBy: Int? = null,
    @SerialName("created_at") val createdAt: String? = null,
) {
    val resolvedId: Int
        get() = if (setoranId != 0) setoranId else id
}

// ─── Tarik Tunai Kasir ──────────────────────────────────────────────────────

@Serializable
data class QualifyingTransactionDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("total_harga") val totalHarga: Double = 0.0,
    @SerialName("metode_pembayaran") val metodePembayaran: String = "",
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class KelayakanTarikTunaiDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("anggota_id") val anggotaId: Int = 0,
    @SerialName("nama_lengkap") val namaLengkap: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("saldo_ewallet") val saldoEwallet: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("saldo_shu") val saldoShu: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hutang: Double = 0.0,
    @SerialName("transaksi_valid_hari_ini") val transaksiValidHariIni: List<QualifyingTransactionDto> = emptyList(),
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("has_qualifying_purchase") val hasQualifyingPurchase: Boolean = false,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("min_belanja_required") val minBelanjaRequired: Double = 25000.0,
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
)

@Serializable
data class AntreanTarikTunaiDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("tarik_id") val tarikId: Int = 0,
    @SerialName("kode_penarikan") val kodePenarikan: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("anggota_id") val anggotaId: Int = 0,
    @SerialName("nama_anggota") val namaAnggota: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    @SerialName("sumber_dana") val sumberDana: String = "shu",
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("belanja_nominal") val belanjaNominal: Double = 0.0,
    val keterangan: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class ProsesTarikTunaiRequest(
    @SerialName("tarik_id") val tarikId: Int,
    val action: String,
    @SerialName("alasan_tolak") val alasanTolak: String? = null,
)

@Serializable
data class TarikTunaiRequest(
    @SerialName("anggota_id") val anggotaId: Int,
    val nominal: Double,
    @SerialName("sumber_dana") val sumberDana: String,
    @SerialName("persetujuan_shu") val persetujuanShu: Boolean,
    @SerialName("transaksi_id") val transaksiId: Int? = null,
    val keterangan: String? = null,
)

@Serializable
data class TarikTunaiReceiptDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("tarik_id") val tarikId: Int = 0,
    @SerialName("kode_penarikan") val kodePenarikan: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("sisa_shu") val sisaShu: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("sisa_saldo") val sisaSaldo: Double = 0.0,
    @SerialName("nama_anggota") val namaAnggota: String = "",
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class RiwayatTarikTunaiDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("tarik_id") val tarikId: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("anggota_id") val anggotaId: Int = 0,
    @SerialName("nama_anggota") val namaAnggota: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    @SerialName("sumber_dana") val sumberDana: String = "",
    @Serializable(with = FlexibleNullableIntSerializer::class)
    @SerialName("transaksi_id") val transaksiId: Int? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("belanja_nominal") val belanjaNominal: Double = 0.0,
    val keterangan: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

// ─── Serah Terima Shift ─────────────────────────────────────────────────────

@Serializable
data class DaftarKasirDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("user_id") val userId: Int = 0,
    val username: String = "",
    @SerialName("nama_lengkap") val namaLengkap: String = "",
)

@Serializable
data class PendingCashOrdersDto(
    @Serializable(with = FlexibleIntSerializer::class)
    val count: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("total_pending_count") val totalPendingCount: Int = 0,
)

@Serializable
data class OpnameSummaryDto(
    @Serializable(with = FlexibleIntSerializer::class)
    val totalBarang: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    val barangSesuai: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    val barangSelisih: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    val totalSelisihQty: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalSelisihNominal: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalMinusNominal: Double = 0.0,
    @Serializable(with = FlexibleIntSerializer::class)
    val pendingCashOrdersCount: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val pendingCashOrdersNominal: Double = 0.0,
)

@Serializable
data class OpnameItemDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("harga_jual") val hargaJual: Double = 0.0,
    @Serializable(with = FlexibleNullableDoubleSerializer::class)
    val harga: Double? = null,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("stok_aktual") val stokAktual: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("stok_input") val stokInput: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    val selisih: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("selisih_nominal") val selisihNominal: Double = 0.0,
    val status: String = "sesuai",
    @SerialName("audit_reason") val auditReason: String? = null,
    @SerialName("risk_badge") val riskBadge: String? = null,
)

@Serializable
data class HasilOpnameDto(
    val summary: OpnameSummaryDto? = null,
    @SerialName("pending_cash_orders") val pendingCashOrders: PendingCashOrdersDto? = null,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("saldo_kas_sistem") val saldoKasSistem: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("uang_fisik") val uangFisik: Double = 0.0,
    @Serializable(with = FlexibleNullableDoubleSerializer::class)
    @SerialName("selisih_kas") val selisihKas: Double? = null,
    val catatan: String? = null,
    val items: List<OpnameItemDto> = emptyList(),
    val type: String? = null,
    val timestamp: String? = null,
)

/**
 * Serializer toleran untuk field `hasil_opname` dari Laravel:
 * bisa berupa null, JsonObject langsung, atau JSON string yang ter-escape.
 */
object HasilOpnameNullableSerializer : KSerializer<HasilOpnameDto?> {
    override val descriptor: SerialDescriptor = buildClassSerialDescriptor("HasilOpnameNullable")

    override fun deserialize(decoder: Decoder): HasilOpnameDto? {
        if (decoder !is JsonDecoder) {
            return decoder.decodeSerializableValue(HasilOpnameDto.serializer())
        }
        val element = decoder.decodeJsonElement()
        val json = NetworkModule.json
        return when (element) {
            is JsonNull -> null
            is JsonObject -> json.decodeFromJsonElement(HasilOpnameDto.serializer(), element)
            is JsonPrimitive -> {
                val raw = element.contentOrNull?.trim()?.takeIf { it.isNotEmpty() } ?: return null
                try {
                    val inner = json.parseToJsonElement(raw)
                    when (inner) {
                        is JsonObject -> json.decodeFromJsonElement(HasilOpnameDto.serializer(), inner)
                        is JsonPrimitive -> {
                            val nested = inner.contentOrNull?.trim()?.takeIf { it.isNotEmpty() } ?: return null
                            json.decodeFromString(HasilOpnameDto.serializer(), nested)
                        }
                        else -> null
                    }
                } catch (_: Exception) {
                    null
                }
            }
            else -> null
        }
    }

    @OptIn(ExperimentalSerializationApi::class)
    override fun serialize(encoder: Encoder, value: HasilOpnameDto?) {
        if (value == null) {
            encoder.encodeNull()
        } else {
            encoder.encodeSerializableValue(HasilOpnameDto.serializer(), value)
        }
    }
}

@Serializable
data class ActiveShiftDetailDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("serah_id") val serahId: Int = 0,
    @SerialName("kasir_from_name") val kasirFromName: String = "",
    @SerialName("kasir_from_username") val kasirFromUsername: String = "",
    @SerialName("kasir_to_name") val kasirToName: String = "",
    @SerialName("kasir_to_username") val kasirToUsername: String = "",
    @Serializable(with = HasilOpnameNullableSerializer::class)
    @SerialName("hasil_opname") val hasilOpname: HasilOpnameDto? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class ActiveShiftInfoDto(
    @SerialName("latest_incoming") val latestIncoming: ActiveShiftDetailDto? = null,
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("has_pending_outgoing") val hasPendingOutgoing: Boolean = false,
)

@Serializable
data class SerahTerimaDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("serah_id") val serahId: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("serah_terima_id") val serahTerimaId: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("kasir_from") val kasirFrom: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("kasir_to") val kasirTo: Int = 0,
    @SerialName("kasir_from_name") val kasirFromName: String = "",
    @SerialName("kasir_from_username") val kasirFromUsername: String = "",
    @SerialName("kasir_to_name") val kasirToName: String = "",
    @SerialName("kasir_to_username") val kasirToUsername: String = "",
    @Serializable(with = HasilOpnameNullableSerializer::class)
    @SerialName("hasil_opname") val hasilOpname: HasilOpnameDto? = null,
    val status: String = "pending",
    @SerialName("alasan_penolakan") val alasanPenolakan: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
) {
    val resolvedId: Int
        get() = if (serahId != 0) serahId else serahTerimaId
}

@Serializable
data class CycleCountBarangDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("stok_toko") val stokToko: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("stok_gudang") val stokGudang: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    val pkm: Int = 1,
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("harga_jual") val hargaJual: Double = 0.0,
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("risk_badge") val riskBadge: String? = null,
    @SerialName("audit_reason") val auditReason: String? = null,
    @Serializable(with = FlexibleBooleanSerializer::class)
    @SerialName("is_hidden_default") val isHiddenDefault: Boolean = false,
)

@Serializable
data class SerahTerimaDraftDto(
    @SerialName("kasir_list") val kasirList: List<DaftarKasirDto> = emptyList(),
    @Serializable(with = FlexibleDoubleSerializer::class)
    @SerialName("saldo_kas_sistem") val saldoKasSistem: Double = 0.0,
    @SerialName("cycle_count_items") val cycleCountItems: List<CycleCountBarangDto> = emptyList(),
    @SerialName("all_items") val allItems: List<CycleCountBarangDto> = emptyList(),
    @SerialName("pending_cash_orders") val pendingCashOrders: PendingCashOrdersDto? = null,
)

@Serializable
data class CreateSerahTerimaRequest(
    @SerialName("kasir_to") val kasirTo: Int,
    @SerialName("hasil_opname") val hasilOpname: HasilOpnameDto,
)

@Serializable
data class CreateSerahTerimaDataDto(
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("serah_id") val serahId: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    @SerialName("serah_terima_id") val serahTerimaId: Int = 0,
)

@Serializable
data class ApproveSerahTerimaRequest(
    @SerialName("serah_id") val serahId: Int,
)

@Serializable
data class RejectSerahTerimaRequest(
    @SerialName("serah_id") val serahId: Int,
    val alasan: String,
    @SerialName("alasan_penolakan") val alasanPenolakan: String = alasan,
)
