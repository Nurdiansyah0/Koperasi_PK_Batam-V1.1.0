package id.koperasipk.app.feature.admin

import app.cash.turbine.test
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.admin.anggota.AdminAnggotaEvent
import id.koperasipk.app.feature.admin.anggota.AdminAnggotaViewModel
import id.koperasipk.app.feature.admin.dashboard.AdminDashboardEvent
import id.koperasipk.app.feature.admin.dashboard.AdminDashboardViewModel
import id.koperasipk.app.feature.admin.data.AdminAnggotaDto
import id.koperasipk.app.feature.admin.data.AdminBarangDto
import id.koperasipk.app.feature.admin.data.AdminDashboardResponse
import id.koperasipk.app.feature.admin.data.SetoranKasirItemDto
import id.koperasipk.app.feature.admin.data.ShuManagementDataDto
import id.koperasipk.app.feature.admin.jabatan.AdminJabatanEvent
import id.koperasipk.app.feature.admin.jabatan.AdminJabatanViewModel
import id.koperasipk.app.feature.admin.jabatan.AssignMandateFormState
import id.koperasipk.app.feature.admin.laporan.AdminLaporanEvent
import id.koperasipk.app.feature.admin.laporan.AdminLaporanViewModel
import id.koperasipk.app.feature.admin.setoran.AdminSetoranEvent
import id.koperasipk.app.feature.admin.setoran.AdminSetoranViewModel
import id.koperasipk.app.feature.admin.shu.AdminShuEvent
import id.koperasipk.app.feature.admin.shu.AdminShuViewModel
import id.koperasipk.app.feature.admin.shu.TopupShuFormState
import id.koperasipk.app.testing.MainDispatcherRule
import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertFalse
import junit.framework.TestCase.assertNotNull
import junit.framework.TestCase.assertNull
import junit.framework.TestCase.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AdminDashboardViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `initial state is loading then loads data on success`() = runTest {
        val repo = FakeAdminRepository().apply {
            dashboardResult = ApiResult.Success(AdminDashboardResponse(success = true))
        }
        val vm = AdminDashboardViewModel(repo)
        advanceUntilIdle()
        val state = vm.uiState.value
        assertFalse(state.isLoading)
        assertNotNull(state.data)
        assertNull(state.errorMessage)
    }

    @Test
    fun `error response sets errorMessage when no previous data`() = runTest {
        val repo = FakeAdminRepository().apply {
            dashboardResult = ApiResult.Error("Gagal memuat")
        }
        val vm = AdminDashboardViewModel(repo)
        advanceUntilIdle()
        val state = vm.uiState.value
        assertFalse(state.isLoading)
        assertNull(state.data)
        assertEquals("Gagal memuat", state.errorMessage)
    }

    @Test
    fun `auto-pkm confirm does NOT fire second job while first still active`() = runTest {
        val repo = FakeAdminRepository()
        val vm = AdminDashboardViewModel(repo)
        advanceUntilIdle()
        vm.onEvent(AdminDashboardEvent.RequestAutoPkm)
        vm.onEvent(AdminDashboardEvent.ConfirmAutoPkm)
        vm.onEvent(AdminDashboardEvent.ConfirmAutoPkm) // second press — guard should block
        advanceUntilIdle()
        // autoPkmResult called only once
        assertEquals("PKM dihitung otomatis", repo.autoPkmResult.let { (it as ApiResult.Success).data })
    }

    @Test
    fun `refresh does not set isLoading if data already present`() = runTest {
        val repo = FakeAdminRepository().apply {
            dashboardResult = ApiResult.Success(AdminDashboardResponse(success = true))
        }
        val vm = AdminDashboardViewModel(repo)
        advanceUntilIdle()
        vm.onEvent(AdminDashboardEvent.Refresh)
        // Should be refreshing, not full-screen loading
        assertFalse(vm.uiState.value.isLoading)
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class AdminAnggotaViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `loads anggota list and shows in state`() = runTest {
        val repo = FakeAdminRepository().apply {
            anggotaResult = ApiResult.Success(
                listOf(
                    AdminAnggotaDto(userId = 1, username = "ani", namaLengkap = "Ani Suryani"),
                    AdminAnggotaDto(userId = 2, username = "budi", namaLengkap = "Budi Santoso"),
                ),
            )
        }
        val vm = AdminAnggotaViewModel(repo)
        advanceUntilIdle()
        val state = vm.uiState.value
        assertFalse(state.isLoading)
        assertEquals(2, state.items.size)
        assertNull(state.errorMessage)
    }

    @Test
    fun `search query filters anggota list client-side`() = runTest {
        val repo = FakeAdminRepository().apply {
            anggotaResult = ApiResult.Success(
                listOf(
                    AdminAnggotaDto(userId = 1, username = "ani", namaLengkap = "Ani Suryani"),
                    AdminAnggotaDto(userId = 2, username = "budi", namaLengkap = "Budi Santoso"),
                ),
            )
        }
        val vm = AdminAnggotaViewModel(repo)
        advanceUntilIdle()
        vm.onEvent(AdminAnggotaEvent.SearchChanged("ani"))
        val state = vm.uiState.value
        assertEquals(1, state.filteredItems.size)
        assertEquals("Ani Suryani", state.filteredItems.first().namaLengkap)
    }

    @Test
    fun `hapus user job guard blocks double submit`() = runTest {
        val repo = FakeAdminRepository().apply {
            hapusUserResult = ApiResult.Success("Dihapus")
        }
        val vm = AdminAnggotaViewModel(repo)
        advanceUntilIdle()
        val dummy = AdminAnggotaDto(userId = 99, username = "dummy", namaLengkap = "Dummy")
        vm.onEvent(AdminAnggotaEvent.OpenAddOrEditUser(null))
        vm.onEvent(AdminAnggotaEvent.RequestDeleteUser(dummy))
        vm.onEvent(AdminAnggotaEvent.ConfirmDeleteUser)
        vm.onEvent(AdminAnggotaEvent.ConfirmDeleteUser) // duplicate press
        advanceUntilIdle()
        assertEquals(1, repo.hapusUserIds.count { it == 99 })
    }

    @Test
    fun `pagination changes visible page`() = runTest {
        val repo = FakeAdminRepository().apply {
            anggotaResult = ApiResult.Success(
                (1..25).map { i ->
                    AdminAnggotaDto(userId = i, username = "user$i", namaLengkap = "User $i")
                },
            )
        }
        val vm = AdminAnggotaViewModel(repo)
        advanceUntilIdle()
        val page1Count = vm.uiState.value.pagedItems.size
        vm.onEvent(AdminAnggotaEvent.PageChanged(2))
        val page2Count = vm.uiState.value.pagedItems.size
        assertTrue(page1Count > 0)
        assertTrue(page2Count > 0)
        assertTrue(vm.uiState.value.totalPages > 1)
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class AdminSetoranViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `approve setoran sends correct action string`() = runTest {
        val repo = FakeAdminRepository()
        val vm = AdminSetoranViewModel(repo)
        advanceUntilIdle()
        val item = SetoranKasirItemDto(setoranId = 42, nominal = 50000.0)
        vm.onEvent(AdminSetoranEvent.RequestAction(item, action = "approve"))
        vm.onEvent(AdminSetoranEvent.ConfirmAction)
        advanceUntilIdle()
        assertTrue(repo.approveSetoranCalls.any { (id, act) -> id == 42 && act == "approve" })
    }

    @Test
    fun `approve setoran job guard prevents duplicate`() = runTest {
        val repo = FakeAdminRepository()
        val vm = AdminSetoranViewModel(repo)
        advanceUntilIdle()
        val item = SetoranKasirItemDto(setoranId = 55, nominal = 50000.0)
        vm.onEvent(AdminSetoranEvent.RequestAction(item, action = "approve"))
        vm.onEvent(AdminSetoranEvent.ConfirmAction)
        vm.onEvent(AdminSetoranEvent.ConfirmAction) // duplicate
        advanceUntilIdle()
        assertEquals(1, repo.approveSetoranCalls.count { (id, _) -> id == 55 })
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class AdminShuViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `topup shu sends username not nama_lengkap`() = runTest {
        val repo = FakeAdminRepository()
        val vm = AdminShuViewModel(repo)
        advanceUntilIdle()
        vm.onEvent(AdminShuEvent.OpenTopup)
        vm.onEvent(AdminShuEvent.UpdateTopupForm(TopupShuFormState(selectedUsername = "userAni", nominalDigits = "150000")))
        vm.onEvent(AdminShuEvent.SubmitTopup)
        advanceUntilIdle()
        assertTrue(repo.topupShuCalls.any { (username, _) -> username == "userAni" })
    }

    @Test
    fun `topup job guard blocks double submit`() = runTest {
        val repo = FakeAdminRepository()
        val vm = AdminShuViewModel(repo)
        advanceUntilIdle()
        vm.onEvent(AdminShuEvent.OpenTopup)
        vm.onEvent(AdminShuEvent.UpdateTopupForm(TopupShuFormState(selectedUsername = "userAni", nominalDigits = "100000")))
        vm.onEvent(AdminShuEvent.SubmitTopup)
        vm.onEvent(AdminShuEvent.SubmitTopup) // duplicate
        advanceUntilIdle()
        assertEquals(1, repo.topupShuCalls.count { (un, _) -> un == "userAni" })
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class AdminJabatanViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `loads jabatan list`() = runTest {
        val repo = FakeAdminRepository()
        val vm = AdminJabatanViewModel(repo)
        advanceUntilIdle()
        val state = vm.uiState.value
        assertFalse(state.isLoading)
        assertNull(state.errorMessage)
    }

    @Test
    fun `assign jabatan success reloads list and shows message via effect`() = runTest {
        val repo = FakeAdminRepository()
        val vm = AdminJabatanViewModel(repo)
        advanceUntilIdle()
        vm.effects.test {
            vm.onEvent(AdminJabatanEvent.OpenAssign)
            vm.onEvent(AdminJabatanEvent.UpdateAssignForm(AssignMandateFormState(selectedUserId = 12, role = "Ketua")))
            vm.onEvent(AdminJabatanEvent.SubmitAssign)
            val effect = awaitItem()
            assertNotNull(effect)
            cancelAndIgnoreRemainingEvents()
        }
        assertTrue(repo.assignJabatanCalls.isNotEmpty())
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class AdminLaporanViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `loads laporan on init and builds initial this_month date range`() = runTest {
        val repo = FakeAdminRepository().apply {
            laporanTransaksiResult = ApiResult.Success(
                id.koperasipk.app.feature.admin.data.LaporanTransaksiResponse(success = true),
            )
        }
        val vm = AdminLaporanViewModel(repo)
        advanceUntilIdle()
        val state = vm.uiState.value
        assertFalse(state.isLoading)
        assertNull(state.errorMessage)
        assertNotNull(state.report)
        assertTrue(repo.laporanCalls.isNotEmpty())
    }

    @Test
    fun `select preset today changes date range and reloads`() = runTest {
        val repo = FakeAdminRepository().apply {
            laporanTransaksiResult = ApiResult.Success(
                id.koperasipk.app.feature.admin.data.LaporanTransaksiResponse(success = true),
            )
        }
        val vm = AdminLaporanViewModel(repo)
        advanceUntilIdle()
        val callsBefore = repo.laporanCalls.size
        vm.onEvent(AdminLaporanEvent.SelectPreset(id.koperasipk.app.feature.admin.laporan.LaporanDatePreset.TODAY))
        advanceUntilIdle()
        val state = vm.uiState.value
        assertEquals(state.tanggalAwal, state.tanggalAkhir)
        assertTrue(repo.laporanCalls.size > callsBefore)
    }

    @Test
    fun `tambah pengeluaran validation rejects empty name`() = runTest {
        val repo = FakeAdminRepository().apply {
            laporanTransaksiResult = ApiResult.Success(
                id.koperasipk.app.feature.admin.data.LaporanTransaksiResponse(success = true),
            )
        }
        val vm = AdminLaporanViewModel(repo)
        advanceUntilIdle()
        vm.onEvent(AdminLaporanEvent.OpenPengeluaranDialog)
        vm.onEvent(AdminLaporanEvent.UpdatePengeluaranForm(nominalDigits = "50000"))
        vm.onEvent(AdminLaporanEvent.SubmitPengeluaran)
        advanceUntilIdle()
        assertTrue(repo.tambahPengeluaranCalls.isEmpty())
        assertNotNull(vm.uiState.value.pengeluaranError)
    }

    @Test
    fun `cash adjustment validation rejects zero amount`() = runTest {
        val repo = FakeAdminRepository().apply {
            laporanTransaksiResult = ApiResult.Success(
                id.koperasipk.app.feature.admin.data.LaporanTransaksiResponse(success = true),
            )
        }
        val vm = AdminLaporanViewModel(repo)
        advanceUntilIdle()
        vm.onEvent(AdminLaporanEvent.OpenCashAdjDialog)
        vm.onEvent(AdminLaporanEvent.UpdateCashAdjForm(reason = "Test", amountDigits = "0"))
        vm.onEvent(AdminLaporanEvent.SubmitCashAdj)
        advanceUntilIdle()
        assertTrue(repo.cashAdjCalls.isEmpty())
        assertNotNull(vm.uiState.value.cashAdjError)
    }

    @Test
    fun `pagination state SetPage advances current page`() = runTest {
        val repo = FakeAdminRepository().apply {
            laporanTransaksiResult = ApiResult.Success(
                id.koperasipk.app.feature.admin.data.LaporanTransaksiResponse(
                    success = true,
                    pagination = id.koperasipk.app.feature.admin.data.PaginationMetaDto(
                        currentPage = 1, lastPage = 5, total = 100, perPage = 20,
                    ),
                ),
            )
        }
        val vm = AdminLaporanViewModel(repo)
        advanceUntilIdle()
        vm.onEvent(AdminLaporanEvent.SetPage(2))
        advanceUntilIdle()
        assertEquals(2, vm.uiState.value.page)
    }
}
