package id.koperasipk.app.core.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import java.util.concurrent.Executors

@Database(
    entities = [CachedBarangEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class KoperasiDatabase : RoomDatabase() {

    abstract fun barangDao(): BarangDao

    companion object {
        private const val DB_NAME = "koperasi_pk_cache.db"

        @Volatile
        private var instance: KoperasiDatabase? = null

        fun getInstance(context: Context): KoperasiDatabase {
            return instance ?: synchronized(this) {
                instance ?: buildDatabase(context.applicationContext).also { instance = it }
            }
        }

        private fun buildDatabase(appContext: Context): KoperasiDatabase {
            return Room.databaseBuilder(
                appContext,
                KoperasiDatabase::class.java,
                DB_NAME,
            )
                .setJournalMode(JournalMode.WRITE_AHEAD_LOGGING)
                .setQueryExecutor(Executors.newFixedThreadPool(4))
                .setTransactionExecutor(Executors.newSingleThreadExecutor())
                .fallbackToDestructiveMigration()
                .build()
        }
    }
}
