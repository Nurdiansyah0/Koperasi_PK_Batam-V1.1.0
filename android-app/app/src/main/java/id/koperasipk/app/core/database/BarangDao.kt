package id.koperasipk.app.core.database

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface BarangDao {

    @Upsert
    suspend fun upsertAll(items: List<CachedBarangEntity>)

    @Query(
        """
        SELECT * FROM cached_barang
        WHERE (:query = '' OR nama_barang LIKE '%' || :query || '%' OR COALESCE(kategori, '') LIKE '%' || :query || '%')
        ORDER BY nama_barang ASC
        LIMIT :limit
        """
    )
    fun observeBarang(query: String = "", limit: Int = 100): Flow<List<CachedBarangEntity>>

    @Query(
        """
        SELECT * FROM cached_barang
        WHERE stok > 0
          AND (:query = '' OR nama_barang LIKE '%' || :query || '%' OR COALESCE(kategori, '') LIKE '%' || :query || '%')
        ORDER BY nama_barang ASC
        LIMIT :limit
        """
    )
    fun observeAvailableBarang(query: String = "", limit: Int = 100): Flow<List<CachedBarangEntity>>

    @Query("SELECT COUNT(*) FROM cached_barang")
    suspend fun count(): Int

    @Query("DELETE FROM cached_barang")
    suspend fun clear()

    @Transaction
    suspend fun replaceAll(items: List<CachedBarangEntity>) {
        clear()
        upsertAll(items)
    }
}
