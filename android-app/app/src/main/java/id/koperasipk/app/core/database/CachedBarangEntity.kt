package id.koperasipk.app.core.database

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "cached_barang",
    indices = [
        Index(value = ["nama_barang"]),
        Index(value = ["kategori"]),
    ],
)
data class CachedBarangEntity(
    @PrimaryKey
    @ColumnInfo(name = "barang_id")
    val barangId: Int,
    @ColumnInfo(name = "nama_barang")
    val namaBarang: String,
    @ColumnInfo(name = "kategori")
    val kategori: String? = null,
    @ColumnInfo(name = "stok")
    val stok: Int = 0,
    @ColumnInfo(name = "stok_toko")
    val stokToko: Int = 0,
    @ColumnInfo(name = "stok_gudang")
    val stokGudang: Int = 0,
    @ColumnInfo(name = "harga_jual")
    val hargaJual: Double = 0.0,
    @ColumnInfo(name = "harga_modal")
    val hargaModal: Double = 0.0,
    @ColumnInfo(name = "pkm")
    val pkm: Int = 1,
    @ColumnInfo(name = "satuan")
    val satuan: String? = null,
    @ColumnInfo(name = "tgl_kadaluarsa_toko")
    val tglKadaluarsaToko: String? = null,
    @ColumnInfo(name = "tgl_kadaluarsa_gudang")
    val tglKadaluarsaGudang: String? = null,
    @ColumnInfo(name = "status_kadaluarsa_toko")
    val statusKadaluarsaToko: String? = null,
    @ColumnInfo(name = "status_kadaluarsa_gudang")
    val statusKadaluarsaGudang: String? = null,
    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis(),
)
