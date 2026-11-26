package id.koperasipk.app.feature.admin.data

import id.koperasipk.app.core.common.FlexibleBooleanSerializer
import id.koperasipk.app.core.common.FlexibleDoubleSerializer
import id.koperasipk.app.core.common.FlexibleIntSerializer
import id.koperasipk.app.core.common.FlexibleNullableDoubleSerializer
import id.koperasipk.app.core.common.FlexibleNullableIntSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AdminMessageResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
) {
    val resolvedMessage: String
        get() = message.ifBlank { error.orEmpty() }
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

@Serializable
data class AdminDashboardResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    @SerialName("total_anggota")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalAnggota: Int = 0,
    @SerialName("total_transaksi_hari_ini")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalTransaksiHariIni: Int = 0,
    @SerialName("total_pendapatan_hari_ini")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalPendapatanHariIni: Double = 0.0,
    @SerialName("total_keuntungan_hari_ini")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalKeuntunganHariIni: Double = 0.0,
    @SerialName("total_hutang_beredar")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalHutangBeredar: Double = 0.0,
    @SerialName("total_saldo_anggota")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalSaldoAnggota: Double = 0.0,
    @SerialName("total_shu_tersedia")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalShuTersedia: Double = 0.0,
    @SerialName("total_shu_pengurus")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalShuPengurus: Double = 0.0,
    @SerialName("total_shu_koperasi")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalShuKoperasi: Double = 0.0,
    @SerialName("total_aset_barang")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalAsetBarang: Double = 0.0,
    @SerialName("stok_kritis_count")
    @Serializable(with = FlexibleIntSerializer::class)
    val stokKritisCount: Int = 0,
    @SerialName("stok_kritis_items")
    val stokKritisItems: List<StokKritisItemDto> = emptyList(),
    @SerialName("setoran_pending_count")
    @Serializable(with = FlexibleIntSerializer::class)
    val setoranPendingCount: Int = 0,
    @SerialName("setoran_pending_nominal")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val setoranPendingNominal: Double = 0.0,
    @SerialName("anggota_limit_kritis_count")
    @Serializable(with = FlexibleIntSerializer::class)
    val anggotaLimitKritisCount: Int = 0,
    @SerialName("total_restock_bulan_ini")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalRestockBulanIni: Double = 0.0,
    @SerialName("expired_count")
    @Serializable(with = FlexibleIntSerializer::class)
    val expiredCount: Int = 0,
    @SerialName("near_expiry_count")
    @Serializable(with = FlexibleIntSerializer::class)
    val nearExpiryCount: Int = 0,
)

@Serializable
data class StokKritisItemDto(
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    val stok: Int = 0,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    val pkm: Int? = null,
    @SerialName("harga_modal")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hargaModal: Double = 0.0,
)

// ─── Barang, Restock, Mutasi, Write-off, Opname ──────────────────────────────

@Serializable
data class AdminBarangListResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val data: List<AdminBarangDto> = emptyList(),
)

@Serializable
data class AdminBarangDto(
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    val stok: Int = 0,
    @SerialName("stok_toko")
    @Serializable(with = FlexibleNullableIntSerializer::class)
    val stokToko: Int? = null,
    @SerialName("stok_gudang")
    @Serializable(with = FlexibleNullableIntSerializer::class)
    val stokGudang: Int? = null,
    @SerialName("tgl_kadaluarsa_toko") val tglKadaluarsaToko: String? = null,
    @SerialName("tgl_kadaluarsa_gudang") val tglKadaluarsaGudang: String? = null,
    @SerialName("hari_kadaluarsa_toko")
    @Serializable(with = FlexibleNullableIntSerializer::class)
    val hariKadaluarsaToko: Int? = null,
    @SerialName("status_kadaluarsa_toko") val statusKadaluarsaToko: String? = null,
    @SerialName("hari_kadaluarsa_gudang")
    @Serializable(with = FlexibleNullableIntSerializer::class)
    val hariKadaluarsaGudang: Int? = null,
    @SerialName("status_kadaluarsa_gudang") val statusKadaluarsaGudang: String? = null,
    @Serializable(with = FlexibleNullableIntSerializer::class)
    val pkm: Int? = null,
    @SerialName("harga_modal")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hargaModal: Double = 0.0,
    @SerialName("harga_jual")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hargaJual: Double = 0.0,
    @Serializable(with = FlexibleNullableDoubleSerializer::class)
    val keuntungan: Double? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
) {
    val effectivePkm: Int get() = (pkm ?: 1).coerceAtLeast(1)
    val effectiveStokToko: Int get() = stokToko ?: minOf(stok, effectivePkm)
    val effectiveStokGudang: Int get() = stokGudang ?: maxOf(0, stok - effectiveStokToko)
    val isTokoExpired: Boolean get() = statusKadaluarsaToko == "expired" && effectiveStokToko > 0
    val isGudangExpired: Boolean get() = statusKadaluarsaGudang == "expired" && effectiveStokGudang > 0
    val isAnyExpired: Boolean get() = isTokoExpired || isGudangExpired
    val isTokoNearExpiry: Boolean get() = statusKadaluarsaToko == "near_expiry" && effectiveStokToko > 0
    val isGudangNearExpiry: Boolean get() = statusKadaluarsaGudang == "near_expiry" && effectiveStokGudang > 0
    val isAnyNearExpiry: Boolean get() = isTokoNearExpiry || isGudangNearExpiry
    val isTokoUnderPkm: Boolean get() = effectiveStokToko < effectivePkm
}

@Serializable
data class TambahBarangRequest(
    @SerialName("nama_barang") val namaBarang: String,
    val stok: Int? = null,
    @SerialName("stok_toko") val stokToko: Int? = null,
    @SerialName("stok_gudang") val stokGudang: Int? = null,
    val pkm: Int? = null,
    @SerialName("harga_modal") val hargaModal: Double,
    @SerialName("harga_jual") val hargaJual: Double,
    @SerialName("tgl_kadaluarsa_toko") val tglKadaluarsaToko: String? = null,
    @SerialName("tgl_kadaluarsa_gudang") val tglKadaluarsaGudang: String? = null,
)

@Serializable
data class UpdateBarangRequest(
    @SerialName("barang_id") val barangId: Int,
    @SerialName("nama_barang") val namaBarang: String,
    val pkm: Int? = null,
    @SerialName("harga_modal") val hargaModal: Double? = null,
    @SerialName("harga_jual") val hargaJual: Double? = null,
    @SerialName("tgl_kadaluarsa_toko") val tglKadaluarsaToko: String? = null,
    @SerialName("tgl_kadaluarsa_gudang") val tglKadaluarsaGudang: String? = null,
)

@Serializable
data class HapusBarangRequest(
    @SerialName("barang_id") val barangId: Int,
)

@Serializable
data class RestockBarangRequest(
    @SerialName("barang_id") val barangId: Int,
    @SerialName("jumlah_tambah") val jumlahTambah: Int,
    @SerialName("harga_beli_satuan") val hargaBeliSatuan: Double,
    @SerialName("sumber_dana") val sumberDana: String,
    val alokasi: String? = "gudang",
    @SerialName("tanggal_kadaluarsa") val tanggalKadaluarsa: String? = null,
    val catatan: String? = null,
)

@Serializable
data class StokMutationResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: StokMutationDataDto? = null,
)

@Serializable
data class StokMutationDataDto(
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("stok_toko")
    @Serializable(with = FlexibleIntSerializer::class)
    val stokToko: Int = 0,
    @SerialName("stok_gudang")
    @Serializable(with = FlexibleIntSerializer::class)
    val stokGudang: Int = 0,
    @SerialName("total_stok")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalStok: Int = 0,
)

@Serializable
data class MutasiStokRequest(
    @SerialName("barang_id") val barangId: Int,
    val tipe: String,
    val jumlah: Int,
    val catatan: String? = null,
)

@Serializable
data class WriteOffExpiredRequest(
    @SerialName("barang_id") val barangId: Int,
    val lokasi: String,
    val jumlah: Int,
    val alasan: String? = null,
)

@Serializable
data class AutoRefillItemRequest(
    @SerialName("barang_id") val barangId: Int,
    val jumlah: Int,
)

@Serializable
data class AutoRefillRequest(
    val items: List<AutoRefillItemRequest>? = null,
)

@Serializable
data class AutoRefillResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    @SerialName("total_refilled")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalRefilled: Int = 0,
    @SerialName("items_refilled")
    @Serializable(with = FlexibleIntSerializer::class)
    val itemsRefilled: Int = 0,
)

@Serializable
data class BulkRestockItemRequest(
    @SerialName("barang_id") val barangId: Int,
    @SerialName("jumlah_tambah") val jumlahTambah: Int,
    @SerialName("harga_beli_satuan") val hargaBeliSatuan: Double,
    val alokasi: String? = "gudang",
    @SerialName("tanggal_kadaluarsa") val tanggalKadaluarsa: String? = null,
)

@Serializable
data class BulkRestockRequest(
    val items: List<BulkRestockItemRequest>,
    @SerialName("sumber_dana") val sumberDana: String,
    @SerialName("nomor_faktur") val nomorFaktur: String? = null,
    @SerialName("nama_supplier") val namaSupplier: String? = null,
    val catatan: String? = null,
)

@Serializable
data class BulkRestockResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: BulkRestockDataDto? = null,
)

@Serializable
data class BulkRestockDataDto(
    @SerialName("total_biaya")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalBiaya: Double = 0.0,
    @SerialName("total_items")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalItems: Int = 0,
    @SerialName("nomor_faktur") val nomorFaktur: String? = null,
    @SerialName("nama_supplier") val namaSupplier: String? = null,
)

@Serializable
data class RiwayatRestockResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val data: List<RiwayatRestockDto> = emptyList(),
    @SerialName("total_pengeluaran")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalPengeluaran: Double = 0.0,
)

@Serializable
data class RiwayatRestockDto(
    @SerialName("restock_id") val restockId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @SerialName("nama_admin") val namaAdmin: String = "",
    @SerialName("jumlah_tambah")
    @Serializable(with = FlexibleIntSerializer::class)
    val jumlahTambah: Int = 0,
    @SerialName("harga_beli_satuan")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hargaBeliSatuan: Double = 0.0,
    @SerialName("total_biaya")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalBiaya: Double = 0.0,
    @SerialName("sumber_dana") val sumberDana: String = "",
    val catatan: String? = null,
    val tanggal: String = "",
)

@Serializable
data class OpnameAdjustmentRequest(
    @SerialName("barang_id") val barangId: Int,
    @SerialName("stok_awal") val stokAwal: Int,
    @SerialName("stok_akhir") val stokAkhir: Int,
    val selisih: Int,
    val lokasi: String = "toko",
    val keterangan: String? = "Penyesuaian Opname Massal",
)

@Serializable
data class OpnameMassalRequest(
    val adjustments: List<OpnameAdjustmentRequest>,
)

// ─── PKM Analysis ────────────────────────────────────────────────────────────

@Serializable
data class PkmAnalysisResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val data: List<PkmItemDto> = emptyList(),
    val summary: PkmSummaryDto? = null,
)

@Serializable
data class PkmItemDto(
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    val stok: Int = 0,
    @SerialName("stok_toko")
    @Serializable(with = FlexibleNullableIntSerializer::class)
    val stokToko: Int? = null,
    @SerialName("stok_gudang")
    @Serializable(with = FlexibleNullableIntSerializer::class)
    val stokGudang: Int? = null,
    @SerialName("harga_modal")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hargaModal: Double = 0.0,
    @SerialName("harga_jual")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hargaJual: Double = 0.0,
    @SerialName("sales_period_days")
    @Serializable(with = FlexibleIntSerializer::class)
    val salesPeriodDays: Int = 7,
    @SerialName("total_sold")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalSold: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val ads: Double = 0.0,
    @SerialName("lead_time_days")
    @Serializable(with = FlexibleIntSerializer::class)
    val leadTimeDays: Int = 4,
    @SerialName("recommended_pkm")
    @Serializable(with = FlexibleIntSerializer::class)
    val recommendedPkm: Int = 1,
    @SerialName("recommended_buy")
    @Serializable(with = FlexibleIntSerializer::class)
    val recommendedBuy: Int = 0,
    @SerialName("estimasi_biaya_kulakan")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val estimasiBiayaKulakan: Double = 0.0,
    @Serializable(with = FlexibleIntSerializer::class)
    val pkm: Int = 1,
    @SerialName("status_pkm") val statusPkm: String = "",
)

@Serializable
data class PkmSummaryDto(
    @SerialName("total_barang")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalBarang: Int = 0,
    @Serializable(with = FlexibleIntSerializer::class)
    val days: Int = 7,
    @SerialName("lead_time_days")
    @Serializable(with = FlexibleIntSerializer::class)
    val leadTimeDays: Int = 4,
    @SerialName("total_pkm_units")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalPkmUnits: Int = 0,
    @SerialName("avg_pkm")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val avgPkm: Double = 0.0,
    @SerialName("total_estimated_budget")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalEstimatedBudget: Double = 0.0,
    @SerialName("total_items_to_buy")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalItemsToBuy: Int = 0,
)

@Serializable
data class UpdatePkmRequest(
    @SerialName("barang_id") val barangId: Int,
    val pkm: Int,
)

@Serializable
data class AutoCalculatePkmRequest(
    val days: Int = 30,
    @SerialName("lead_time_days") val leadTimeDays: Int = 4,
)

// ─── Anggota & Users ─────────────────────────────────────────────────────────

@Serializable
data class AdminAnggotaListResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val data: List<AdminAnggotaDto> = emptyList(),
)

@Serializable
data class AdminAnggotaDto(
    @SerialName("anggota_id") val anggotaId: Int = 0,
    @SerialName("user_id") val userId: Int = 0,
    @SerialName("nama_lengkap") val namaLengkap: String? = null,
    val username: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val saldo: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hutang: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val shu: Double = 0.0,
) {
    val displayName: String
        get() = namaLengkap?.takeIf { it.isNotBlank() } ?: username
}

@Serializable
data class TambahUserRequest(
    val username: String,
    val password: String,
    val role: String,
    @SerialName("nama_lengkap") val namaLengkap: String? = null,
)

@Serializable
data class UpdateUserRequest(
    @SerialName("user_id") val userId: Int,
    val username: String,
    val role: String? = null,
    val password: String? = null,
    @SerialName("nama_lengkap") val namaLengkap: String? = null,
)

@Serializable
data class ResetPasswordUserRequest(
    @SerialName("user_id") val userId: Int,
    @SerialName("password_baru") val passwordBaru: String,
)

@Serializable
data class HapusUserRequest(
    @SerialName("user_id") val userId: Int,
)

// ─── Jabatan & Mandat ────────────────────────────────────────────────────────

@Serializable
data class JabatanListResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val data: List<JabatanItemDto> = emptyList(),
    val summary: JabatanSummaryDto? = null,
)

@Serializable
data class JabatanItemDto(
    @SerialName("jabatan_id") val jabatanId: Int = 0,
    @SerialName("user_id") val userId: Int = 0,
    val username: String = "",
    @SerialName("nama_lengkap") val namaLengkap: String = "",
    val role: String = "",
    val status: String = "",
    val catatan: String? = null,
    @SerialName("assigned_at") val assignedAt: String? = null,
    @SerialName("revoked_at") val revokedAt: String? = null,
    @SerialName("ditugaskan_oleh") val ditugaskanOleh: String = "",
)

@Serializable
data class JabatanSummaryDto(
    @SerialName("admin_aktif")
    @Serializable(with = FlexibleIntSerializer::class)
    val adminAktif: Int = 0,
    @SerialName("kasir_aktif")
    @Serializable(with = FlexibleIntSerializer::class)
    val kasirAktif: Int = 0,
    @SerialName("pengurus_aktif")
    @Serializable(with = FlexibleIntSerializer::class)
    val pengurusAktif: Int = 0,
    @SerialName("total_riwayat")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalRiwayat: Int = 0,
    @SerialName("total_nonaktif")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalNonaktif: Int = 0,
)

@Serializable
data class AssignJabatanRequest(
    @SerialName("user_id") val userId: Int,
    val role: String,
    val catatan: String? = null,
)

@Serializable
data class RevokeJabatanRequest(
    @SerialName("jabatan_id") val jabatanId: Int,
    val alasan: String? = null,
)

// ─── Setoran Kasir ───────────────────────────────────────────────────────────

@Serializable
data class SetoranKasirListResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val data: List<SetoranKasirItemDto> = emptyList(),
)

@Serializable
data class SetoranKasirItemDto(
    val id: Int = 0,
    @SerialName("setoran_id") val setoranId: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    @SerialName("nama_kasir") val namaKasir: String? = null,
    val kasir: SetoranKasirUserDto? = null,
    val tanggal: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    val status: String = "pending",
) {
    val resolvedId: Int get() = if (setoranId != 0) setoranId else id
    val resolvedKasirName: String
        get() = namaKasir?.takeIf { it.isNotBlank() }
            ?: kasir?.namaLengkap?.takeIf { it.isNotBlank() }
            ?: kasir?.username?.takeIf { it.isNotBlank() }
            ?: "Kasir"
    val resolvedTanggal: String? get() = createdAt ?: tanggal
}

@Serializable
data class SetoranKasirUserDto(
    @SerialName("nama_lengkap") val namaLengkap: String? = null,
    val username: String = "",
)

@Serializable
data class ApproveSetoranRequest(
    @SerialName("setoran_id") val setoranId: Int,
    val action: String,
)

// ─── Manajemen SHU, Topup, Konversi, Distribusi ──────────────────────────────

@Serializable
data class ShuManagementResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val data: ShuManagementDataDto? = null,
)

@Serializable
data class ShuManagementDataDto(
    val summary: ShuManagementSummaryDto = ShuManagementSummaryDto(),
    val anggota: List<ShuAnggotaDto> = emptyList(),
    @SerialName("riwayat_konversi") val riwayatKonversi: List<KonversiShuDto> = emptyList(),
)

@Serializable
data class ShuManagementSummaryDto(
    @SerialName("total_shu")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalShu: Double = 0.0,
    @SerialName("total_saldo")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalSaldo: Double = 0.0,
    @SerialName("total_hutang")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalHutang: Double = 0.0,
    @SerialName("total_anggota")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalAnggota: Int = 0,
    @SerialName("anggota_consent_count")
    @Serializable(with = FlexibleIntSerializer::class)
    val anggotaConsentCount: Int = 0,
    @SerialName("consent_percentage")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val consentPercentage: Double = 0.0,
)

@Serializable
data class ShuAnggotaDto(
    @SerialName("anggota_id") val anggotaId: Int = 0,
    @SerialName("nama_lengkap") val namaLengkap: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val saldo: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val shu: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hutang: Double = 0.0,
    @SerialName("has_master_consent")
    @Serializable(with = FlexibleBooleanSerializer::class)
    val hasMasterConsent: Boolean = false,
    @SerialName("master_consent_at") val masterConsentAt: String? = null,
)

@Serializable
data class KonversiShuDto(
    @SerialName("konversi_id") val konversiId: Int = 0,
    @SerialName("anggota_id") val anggotaId: Int? = null,
    @SerialName("nama_anggota") val namaAnggota: String = "",
    @SerialName("admin_name") val adminName: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    @SerialName("tipe_konversi") val tipeKonversi: String = "",
    val keterangan: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class ProsesKonversiShuRequest(
    val mode: String,
    @SerialName("anggota_id") val anggotaId: Int? = null,
    val nominal: Double? = null,
    val persentase: Double? = null,
    val keterangan: String? = null,
)

@Serializable
data class TopupShuRequest(
    @SerialName("nama_anggota") val namaAnggota: String,
    val nominal: Double,
)

@Serializable
data class ShuDistribusiResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val data: List<ShuDistribusiItemDto> = emptyList(),
    val summary: ShuDistribusiSummaryDto? = null,
)

@Serializable
data class ShuDistribusiItemDto(
    @SerialName("shu_id") val shuId: Int = 0,
    @SerialName("anggota_id") val anggotaId: Int = 0,
    val tahun: String = "",
    @SerialName("nama_anggota") val namaAnggota: String = "",
    @SerialName("shu_60_percent")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val shu60Percent: Double = 0.0,
    @SerialName("shu_10_percent")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val shu10Percent: Double = 0.0,
    @SerialName("shu_30_percent")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val shu30Percent: Double = 0.0,
    @SerialName("total_shu")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalShu: Double = 0.0,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class ShuDistribusiSummaryDto(
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalShu60: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalShu10: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalShu30: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalAllShu: Double = 0.0,
    @Serializable(with = FlexibleIntSerializer::class)
    val totalDistribusi: Int = 0,
    val tahunAktif: String = "All",
)

// ─── Laporan Transaksi, Pengeluaran & Cash Adjustment ────────────────────────

@Serializable
data class LaporanTransaksiRequest(
    @SerialName("tanggal_awal") val tanggalAwal: String? = null,
    @SerialName("tanggal_akhir") val tanggalAkhir: String? = null,
    @SerialName("metode_pembayaran") val metodePembayaran: String? = null,
    @SerialName("kasir_id") val kasirId: String? = null,
    @SerialName("pembeli_type") val pembeliType: String? = null,
    val search: String? = null,
    val page: Int = 1,
    @SerialName("per_page") val perPage: Int = 20,
)

@Serializable
data class LaporanTransaksiResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val summary: LaporanSummaryDto? = null,
    val data: List<LaporanTransaksiItemDto> = emptyList(),
    @SerialName("rekap_anggota") val rekapAnggota: List<RekapAnggotaShuDto> = emptyList(),
    @SerialName("rekap_bulanan") val rekapBulanan: List<RekapBulananDto> = emptyList(),
    @SerialName("rekap_barang") val rekapBarang: List<RekapBarangDto> = emptyList(),
    @SerialName("analisis_kesehatan") val analisisKesehatan: AnalisisKesehatanDto? = null,
    @SerialName("pengeluaran_operasional") val pengeluaranOperasional: List<PengeluaranDto> = emptyList(),
    @SerialName("cash_adjustments") val cashAdjustments: List<CashAdjustmentDto> = emptyList(),
    val pagination: PaginationMetaDto? = null,
    @SerialName("breakdown_pembayaran") val breakdownPembayaran: BreakdownPembayaranDto? = null,
    @SerialName("breakdown_kasir") val breakdownKasir: List<BreakdownKasirDto> = emptyList(),
    @SerialName("transaksi_harian") val transaksiHarian: List<TransaksiHarianDto> = emptyList(),
    @SerialName("daftar_kasir") val daftarKasir: List<KasirDropdownDto> = emptyList(),
    val periode: PeriodeDto? = null,
)

@Serializable
data class LaporanSummaryDto(
    @SerialName("total_transaksi")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalTransaksi: Int = 0,
    @SerialName("total_pendapatan")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalPendapatan: Double = 0.0,
    @SerialName("total_keuntungan")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalKeuntungan: Double = 0.0,
    @SerialName("total_laba_kotor")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalLabaKotor: Double = 0.0,
    @SerialName("total_hpp")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalHpp: Double = 0.0,
    @SerialName("total_beban_operasional")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalBebanOperasional: Double = 0.0,
    @SerialName("total_laba_bersih")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalLabaBersih: Double = 0.0,
    @SerialName("total_pembelian_inventory")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalPembelianInventory: Double = 0.0,
    @SerialName("historical_cash_adjustment")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val historicalCashAdjustment: Double = 0.0,
    @SerialName("estimated_inventory_value")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val estimatedInventoryValue: Double = 0.0,
    @SerialName("net_cash_flow")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val netCashFlow: Double = 0.0,
    @SerialName("shu_anggota_60")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val shuAnggota60: Double = 0.0,
    @SerialName("shu_cadangan_30")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val shuCadangan30: Double = 0.0,
    @SerialName("shu_pengurus_10")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val shuPengurus10: Double = 0.0,
    @SerialName("total_hutang")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalHutang: Double = 0.0,
    @SerialName("total_cash")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalCash: Double = 0.0,
    @SerialName("total_ewallet")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalEwallet: Double = 0.0,
    @SerialName("total_qr")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalQr: Double = 0.0,
    @SerialName("total_transfer")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalTransfer: Double = 0.0,
    @SerialName("omset_anggota")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val omsetAnggota: Double = 0.0,
    @SerialName("omset_umum")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val omsetUmum: Double = 0.0,
    @SerialName("avg_transaksi")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val avgTransaksi: Double = 0.0,
    @SerialName("analisis_kesehatan") val analisisKesehatan: AnalisisKesehatanDto? = null,
)

@Serializable
data class AnalisisKesehatanDto(
    @SerialName("total_anggota_terdaftar")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalAnggotaTerdaftar: Int = 0,
    @SerialName("jumlah_anggota_aktif")
    @Serializable(with = FlexibleIntSerializer::class)
    val jumlahAnggotaAktif: Int = 0,
    @SerialName("rasio_partisipasi_persen")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val rasioPartisipasiPersen: Double = 0.0,
    @SerialName("kas_likuid_masuk")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val kasLikuidMasuk: Double = 0.0,
    @SerialName("total_piutang_berjalan")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalPiutangBerjalan: Double = 0.0,
    @SerialName("rasio_piutang_omset_persen")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val rasioPiutangOmsetPersen: Double = 0.0,
    @SerialName("cash_coverage_ratio_persen")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val cashCoverageRatioPersen: Double = 0.0,
    @SerialName("gross_profit_margin_persen")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val grossProfitMarginPersen: Double = 0.0,
    @SerialName("net_profit_margin_persen")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val netProfitMarginPersen: Double = 0.0,
    @SerialName("operating_expense_ratio_persen")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val operatingExpenseRatioPersen: Double = 0.0,
    @SerialName("skor_kesehatan")
    @Serializable(with = FlexibleIntSerializer::class)
    val skorKesehatan: Int = 0,
    @SerialName("status_kesehatan") val statusKesehatan: String = "",
    @SerialName("badge_color") val badgeColor: String = "green",
    @SerialName("kesimpulan_evaluasi") val kesimpulanEvaluasi: String = "",
)

@Serializable
data class LaporanTransaksiItemDto(
    @SerialName("transaksi_id") val transaksiId: Int = 0,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("anggota_id") val anggotaId: Int? = null,
    @SerialName("nama_anggota") val namaAnggota: String = "Pelanggan Umum",
    @SerialName("kasir_id") val kasirId: Int? = null,
    @SerialName("kasir_username") val kasirUsername: String? = null,
    @SerialName("metode_pembayaran") val metodePembayaran: String = "",
    @SerialName("total_harga")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalHarga: Double = 0.0,
    @SerialName("total_keuntungan")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalKeuntungan: Double = 0.0,
    @SerialName("modal_hpp")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val modalHpp: Double = 0.0,
    val status: String = "selesai",
    @SerialName("items_count")
    @Serializable(with = FlexibleIntSerializer::class)
    val itemsCount: Int = 0,
    val details: List<LaporanTransaksiDetailDto> = emptyList(),
)

@Serializable
data class LaporanTransaksiDetailDto(
    @SerialName("detail_id") val detailId: Int = 0,
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    val jumlah: Int = 0,
    @SerialName("harga_satuan")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hargaSatuan: Double = 0.0,
    @SerialName("harga_beli_saat_ini")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hargaBeliSaatIni: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val subtotal: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val keuntungan: Double = 0.0,
)

@Serializable
data class RekapAnggotaShuDto(
    @SerialName("anggota_id") val anggotaId: Int = 0,
    @SerialName("nama_lengkap") val namaLengkap: String = "",
    @SerialName("frekuensi_belanja")
    @Serializable(with = FlexibleIntSerializer::class)
    val frekuensiBelanja: Int = 0,
    @SerialName("total_belanja")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalBelanja: Double = 0.0,
    @SerialName("total_lunas")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalLunas: Double = 0.0,
    @SerialName("total_hutang")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalHutang: Double = 0.0,
    @SerialName("saldo_hutang_koperasi")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val saldoHutangKoperasi: Double = 0.0,
    @SerialName("porsi_persen")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val porsiPersen: Double = 0.0,
    @SerialName("hak_shu")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hakShu: Double = 0.0,
)

@Serializable
data class RekapBulananDto(
    @SerialName("periode_bulan") val periodeBulan: String = "",
    @SerialName("total_transaksi")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalTransaksi: Int = 0,
    @SerialName("omset_bulan")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val omsetBulan: Double = 0.0,
    @SerialName("margin_bulan")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val marginBulan: Double = 0.0,
    @SerialName("piutang_bulan")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val piutangBulan: Double = 0.0,
)

@Serializable
data class RekapBarangDto(
    @SerialName("barang_id") val barangId: Int = 0,
    @SerialName("nama_barang") val namaBarang: String = "",
    @SerialName("qty_terjual")
    @Serializable(with = FlexibleIntSerializer::class)
    val qtyTerjual: Int = 0,
    @Serializable(with = FlexibleDoubleSerializer::class)
    val revenue: Double = 0.0,
    @SerialName("historical_hpp")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val historicalHpp: Double = 0.0,
    @SerialName("gross_profit")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val grossProfit: Double = 0.0,
)

@Serializable
data class PaginationMetaDto(
    @SerialName("current_page")
    @Serializable(with = FlexibleIntSerializer::class)
    val currentPage: Int = 1,
    @SerialName("last_page")
    @Serializable(with = FlexibleIntSerializer::class)
    val lastPage: Int = 1,
    @Serializable(with = FlexibleIntSerializer::class)
    val total: Int = 0,
    @SerialName("per_page")
    @Serializable(with = FlexibleIntSerializer::class)
    val perPage: Int = 20,
)

@Serializable
data class BreakdownPembayaranDto(
    @Serializable(with = FlexibleDoubleSerializer::class) val cash: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class) val ewallet: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class) val hutang: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class) val qr: Double = 0.0,
    @Serializable(with = FlexibleDoubleSerializer::class) val transfer: Double = 0.0,
)

@Serializable
data class BreakdownKasirDto(
    @SerialName("kasir_id") val kasirId: Int? = null,
    @SerialName("kasir_username") val kasirUsername: String = "System",
    @SerialName("total_transaksi")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalTransaksi: Int = 0,
    @SerialName("total_omset")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalOmset: Double = 0.0,
    @SerialName("total_laba")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalLaba: Double = 0.0,
)

@Serializable
data class TransaksiHarianDto(
    val tanggal: String = "",
    @SerialName("jumlah_transaksi")
    @Serializable(with = FlexibleIntSerializer::class)
    val jumlahTransaksi: Int = 0,
    @SerialName("total_pendapatan")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalPendapatan: Double = 0.0,
    @SerialName("total_keuntungan")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalKeuntungan: Double = 0.0,
)

@Serializable
data class KasirDropdownDto(
    @SerialName("user_id") val userId: Int = 0,
    val username: String = "",
    @SerialName("nama_lengkap") val namaLengkap: String? = null,
)

@Serializable
data class DataKasirResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val data: List<KasirDropdownDto> = emptyList(),
)

@Serializable
data class PeriodeDto(
    @SerialName("tanggal_awal") val tanggalAwal: String? = null,
    @SerialName("tanggal_akhir") val tanggalAkhir: String? = null,
)

@Serializable
data class PengeluaranListResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    @SerialName("total_pengeluaran")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalPengeluaran: Double = 0.0,
    val data: List<PengeluaranDto> = emptyList(),
)

@Serializable
data class PengeluaranDto(
    @SerialName("pengeluaran_id") val pengeluaranId: Int = 0,
    @SerialName("nama_pengeluaran") val namaPengeluaran: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    val kategori: String? = null,
    val tanggal: String = "",
    val keterangan: String? = null,
    @SerialName("created_by") val createdBy: Int? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class TambahPengeluaranRequest(
    @SerialName("nama_pengeluaran") val namaPengeluaran: String,
    val nominal: Double,
    val tanggal: String? = null,
    val kategori: String? = null,
    val keterangan: String? = null,
)

@Serializable
data class TambahPengeluaranResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: PengeluaranDto? = null,
)

@Serializable
data class CashAdjustmentDto(
    @SerialName("adjustment_id") val adjustmentId: Int = 0,
    @SerialName("adjustment_date") val adjustmentDate: String = "",
    val type: String = "",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val amount: Double = 0.0,
    val direction: String = "OUT",
    val source: String = "CASH",
    val reason: String = "",
    val reference: String? = null,
    val status: String = "APPROVED",
    @SerialName("created_at") val createdAt: String? = null,
    val creator: SimpleUsernameDto? = null,
    val approver: SimpleUsernameDto? = null,
)

@Serializable
data class SimpleUsernameDto(
    @SerialName("user_id") val userId: Int = 0,
    val username: String = "",
)

@Serializable
data class CashAdjustmentRequest(
    @SerialName("adjustment_date") val adjustmentDate: String,
    val type: String,
    val amount: Double,
    val direction: String,
    val source: String,
    val reason: String,
    val reference: String? = null,
)

@Serializable
data class CashAdjustmentResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val message: String = "",
    val error: String? = null,
    val data: CashAdjustmentDto? = null,
)

// ─── Laporan Selisih Kasir & Tarik Tunai ─────────────────────────────────────

@Serializable
data class LaporanSelisihKasirResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val data: LaporanSelisihDataDto? = null,
)

@Serializable
data class LaporanSelisihDataDto(
    @SerialName("rekap_per_kasir") val rekapPerKasir: List<RekapSelisihKasirDto> = emptyList(),
    @SerialName("riwayat_selisih") val riwayatSelisih: List<RiwayatSelisihShiftDto> = emptyList(),
)

@Serializable
data class RekapSelisihKasirDto(
    @SerialName("kasir_id") val kasirId: Int = 0,
    @SerialName("kasir_name") val kasirName: String = "",
    @SerialName("total_shift_selesai")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalShiftSelesai: Int = 0,
    @SerialName("total_shift_ada_selisih")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalShiftAdaSelisih: Int = 0,
    @SerialName("total_minus_barang_nominal")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalMinusBarangNominal: Double = 0.0,
    @SerialName("total_minus_kas_nominal")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalMinusKasNominal: Double = 0.0,
    @SerialName("total_akumulasi_kerugian")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalAkumulasiKerugian: Double = 0.0,
)

@Serializable
data class RiwayatSelisihShiftDto(
    @SerialName("serah_id") val serahId: Int = 0,
    @SerialName("kasir_from_name") val kasirFromName: String = "",
    @SerialName("kasir_to_name") val kasirToName: String = "",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("uang_fisik")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val uangFisik: Double = 0.0,
    @SerialName("saldo_kas_sistem")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val saldoKasSistem: Double = 0.0,
    @SerialName("selisih_kas")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val selisihKas: Double = 0.0,
    @SerialName("total_minus_barang_nominal")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalMinusBarangNominal: Double = 0.0,
    @SerialName("total_kerugian_shift")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalKerugianShift: Double = 0.0,
    val catatan: String? = null,
    @SerialName("discrepant_items") val discrepantItems: List<DiscrepantItemDto> = emptyList(),
)

@Serializable
data class DiscrepantItemDto(
    @SerialName("nama_barang") val namaBarang: String = "",
    @Serializable(with = FlexibleIntSerializer::class)
    val selisih: Int = 0,
    @SerialName("harga_jual")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val hargaJual: Double = 0.0,
    @SerialName("selisih_nominal")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val selisihNominal: Double = 0.0,
)

@Serializable
data class LaporanTarikTunaiResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val data: List<TarikTunaiReportItemDto> = emptyList(),
    val summary: TarikTunaiReportSummaryDto? = null,
)

@Serializable
data class TarikTunaiReportItemDto(
    @SerialName("tarik_id") val tarikId: Int = 0,
    @SerialName("nama_anggota") val namaAnggota: String = "Anggota",
    @SerialName("kasir_name") val kasirName: String = "Kasir",
    @Serializable(with = FlexibleDoubleSerializer::class)
    val nominal: Double = 0.0,
    @SerialName("sumber_dana") val sumberDana: String = "shu",
    @SerialName("transaksi_id") val transaksiId: Int? = null,
    @SerialName("belanja_nominal")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val belanjaNominal: Double = 0.0,
    @SerialName("persetujuan_shu")
    @Serializable(with = FlexibleBooleanSerializer::class)
    val persetujuanShu: Boolean = false,
    val keterangan: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class TarikTunaiReportSummaryDto(
    @SerialName("total_penarikan_count")
    @Serializable(with = FlexibleIntSerializer::class)
    val totalPenarikanCount: Int = 0,
    @SerialName("total_nominal_keluar")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalNominalKeluar: Double = 0.0,
    @SerialName("total_sales_kontribusi")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val totalSalesKontribusi: Double = 0.0,
    @SerialName("rasio_sales_to_tarik")
    @Serializable(with = FlexibleDoubleSerializer::class)
    val rasioSalesToTarik: Double = 0.0,
)

// ─── API Keys & External Gateway ─────────────────────────────────────────────

@Serializable
data class ApiKeyListResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val status: String = "",
    val data: List<ApiKeyItemDto> = emptyList(),
    @Serializable(with = FlexibleIntSerializer::class)
    val total: Int = 0,
    @SerialName("gateway_url") val gatewayUrl: String = "",
)

@Serializable
data class ApiKeyItemDto(
    val id: Int = 0,
    val name: String = "",
    val key: String = "",
    @SerialName("masked_secret") val maskedSecret: String? = null,
    val secret: String? = null,
    val permissions: List<String> = emptyList(),
    @SerialName("allowed_origins") val allowedOrigins: String = "*",
    @SerialName("is_active")
    @Serializable(with = FlexibleBooleanSerializer::class)
    val isActive: Boolean = true,
    @SerialName("last_used_at") val lastUsedAt: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
    @SerialName("is_expired")
    @Serializable(with = FlexibleBooleanSerializer::class)
    val isExpired: Boolean = false,
    @SerialName("created_by") val createdBy: String = "",
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class CreateApiKeyRequest(
    val name: String,
    val permissions: List<String>? = null,
    @SerialName("allowed_origins") val allowedOrigins: String? = null,
    @SerialName("expires_in_days") val expiresInDays: Int? = null,
)

@Serializable
data class CreateApiKeyResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val status: String = "",
    val message: String = "",
    val data: ApiKeyItemDto? = null,
)

@Serializable
data class ToggleApiKeyResponse(
    @Serializable(with = FlexibleBooleanSerializer::class)
    val success: Boolean = false,
    val status: String = "",
    val message: String = "",
    val data: ToggleApiKeyDataDto? = null,
)

@Serializable
data class ToggleApiKeyDataDto(
    val id: Int = 0,
    val name: String = "",
    @SerialName("is_active")
    @Serializable(with = FlexibleBooleanSerializer::class)
    val isActive: Boolean = false,
)
