package id.koperasipk.app.core.datastore

import android.content.Context
import androidx.compose.runtime.Immutable
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map

// 1 instance DataStore di level aplikasi (nama file: "koperasi_session")
private val Context.dataStore by preferencesDataStore(name = "koperasi_session")

@Immutable
data class UserSession(
    val token: String,
    val role: String,
    val name: String,
    val userId: Int = 0,
    val username: String = "",
    val anggotaId: Int? = null,
    val activeRoles: List<String> = emptyList(),
)

interface SessionStorage {
    val sessionFlow: Flow<UserSession?>
    suspend fun saveSession(session: UserSession)
    suspend fun clearSession()
}

class TokenStore(context: Context) : SessionStorage {

    // Selalu simpan applicationContext agar tidak pernah bocor memori (memory leak)
    private val appContext = context.applicationContext

    companion object {
        private val KEY_TOKEN = stringPreferencesKey("auth_token")
        private val KEY_ROLE = stringPreferencesKey("user_role")
        private val KEY_NAME = stringPreferencesKey("user_name")
        private val KEY_USER_ID = intPreferencesKey("user_id")
        private val KEY_USERNAME = stringPreferencesKey("username")
        private val KEY_ANGGOTA_ID = intPreferencesKey("anggota_id")
        private val KEY_ACTIVE_ROLES = stringPreferencesKey("active_roles")
    }

    // Flow reaktif; UI otomatis tahu jika session berubah
    override val sessionFlow: Flow<UserSession?> = appContext.dataStore.data.map { prefs ->
        val token = prefs[KEY_TOKEN]?.takeIf { it.isNotBlank() } ?: return@map null
        val activeRolesRaw = prefs[KEY_ACTIVE_ROLES].orEmpty()
        UserSession(
            token = token,
            role = prefs[KEY_ROLE].orEmpty(),
            name = prefs[KEY_NAME].orEmpty(),
            userId = prefs[KEY_USER_ID] ?: 0,
            username = prefs[KEY_USERNAME].orEmpty(),
            anggotaId = prefs[KEY_ANGGOTA_ID],
            activeRoles = if (activeRolesRaw.isBlank()) {
                emptyList()
            } else {
                activeRolesRaw.split(",").filter { it.isNotBlank() }
            },
        )
    }

    suspend fun getToken(): String? {
        return appContext.dataStore.data.map { it[KEY_TOKEN] }.firstOrNull()
    }

    override suspend fun saveSession(session: UserSession) {
        appContext.dataStore.edit { prefs ->
            prefs[KEY_TOKEN] = session.token
            prefs[KEY_ROLE] = session.role
            prefs[KEY_NAME] = session.name
            prefs[KEY_USER_ID] = session.userId
            prefs[KEY_USERNAME] = session.username
            if (session.anggotaId != null) {
                prefs[KEY_ANGGOTA_ID] = session.anggotaId
            } else {
                prefs.remove(KEY_ANGGOTA_ID)
            }
            prefs[KEY_ACTIVE_ROLES] = session.activeRoles.joinToString(",")
        }
    }

    suspend fun saveSession(token: String, role: String, name: String) {
        saveSession(UserSession(token = token, role = role, name = name))
    }

    override suspend fun clearSession() {
        appContext.dataStore.edit { prefs ->
            prefs.clear()
        }
    }
}
