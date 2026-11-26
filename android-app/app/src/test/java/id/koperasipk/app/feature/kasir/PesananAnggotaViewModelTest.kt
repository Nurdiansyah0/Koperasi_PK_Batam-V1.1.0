package id.koperasipk.app.feature.kasir

import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.kasir.data.PesananAnggotaDto
import id.koperasipk.app.feature.kasir.ui.pesanan.PesananAnggotaEvent
import id.koperasipk.app.feature.kasir.ui.pesanan.PesananAnggotaViewModel
import id.koperasipk.app.testing.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PesananAnggotaViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule(StandardTestDispatcher())

    @Test
    fun `groups orders and guards double submit on approve and reject`() = runTest {
        val repo = FakeKasirRepository().apply {
            writeDelayMs = 400L
            pesananResult = ApiResult.Success(
                listOf(
                    PesananAnggotaDto(transaksiId = 10, anggotaId = 2, namaAnggota = "Andi", metodePembayaran = "cash", totalHarga = 10000.0),
                    PesananAnggotaDto(transaksiId = 11, anggotaId = 2, namaAnggota = "Andi", metodePembayaran = "hutang", totalHarga = 15000.0),
                )
            )
        }
        val vm = PesananAnggotaViewModel(repo)
        advanceUntilIdle()

        assertEquals(1, vm.uiState.value.groups.size)
        assertEquals(25000.0, vm.uiState.value.groups.first().totalHarga, 0.01)

        vm.onEvent(PesananAnggotaEvent.SelectGroup(2))
        vm.onEvent(PesananAnggotaEvent.ApproveOrders(listOf(10, 11)))
        vm.onEvent(PesananAnggotaEvent.ApproveOrders(listOf(10, 11)))
        runCurrent()
        advanceUntilIdle()
        assertEquals(1, repo.simpanTransaksiCallCount)

        vm.onEvent(PesananAnggotaEvent.OpenRejectDialog(listOf(10)))
        vm.onEvent(PesananAnggotaEvent.RejectReasonChanged("Stok kosong"))
        vm.onEvent(PesananAnggotaEvent.ConfirmRejectOrders)
        vm.onEvent(PesananAnggotaEvent.ConfirmRejectOrders)
        runCurrent()
        advanceUntilIdle()
        assertEquals(1, repo.tolakPesananCallCount)
    }
}
