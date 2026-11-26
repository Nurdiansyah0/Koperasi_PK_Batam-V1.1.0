package id.koperasipk.app.feature.kasir

import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.kasir.data.LatestOrderDto
import id.koperasipk.app.feature.kasir.data.LatestPendingOrdersResponse
import id.koperasipk.app.testing.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class KasirShellViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule(StandardTestDispatcher())

    @Test
    fun `polling runs every 15s alerts only on newer order and stops when cancelled`() = runTest {
        val repo = FakeKasirRepository()
        // Baseline poll: order #10 already pending
        repo.latestOrdersQueue.addLast(
            ApiResult.Success(
                LatestPendingOrdersResponse(
                    success = true,
                    isActiveShift = true,
                    pendingCount = 1,
                    latestOrder = LatestOrderDto(transaksiId = 10, namaAnggota = "Andi", totalHarga = 15000.0),
                )
            )
        )
        // Second poll (+15s): same order #10 -> no alert
        repo.latestOrdersQueue.addLast(
            ApiResult.Success(
                LatestPendingOrdersResponse(
                    success = true,
                    isActiveShift = true,
                    pendingCount = 1,
                    latestOrder = LatestOrderDto(transaksiId = 10, namaAnggota = "Andi", totalHarga = 15000.0),
                )
            )
        )
        // Third poll (+30s): newer order #11 -> fires alert!
        repo.latestOrdersQueue.addLast(
            ApiResult.Success(
                LatestPendingOrdersResponse(
                    success = true,
                    isActiveShift = true,
                    pendingCount = 2,
                    latestOrder = LatestOrderDto(transaksiId = 11, namaAnggota = "Budi", totalHarga = 45000.0),
                )
            )
        )

        val vm = KasirShellViewModel(repo)
        val pollingJob = launch {
            vm.runPollingLoop(KasirShellViewModel.POLLING_INTERVAL_MS)
        }

        runCurrent()
        assertEquals(1, repo.latestPendingPollCount)
        assertEquals(1, vm.uiState.value.pendingOrdersCount)
        assertNull(vm.uiState.value.activeOrderAlert)

        advanceTimeBy(15_000L)
        runCurrent()
        assertEquals(2, repo.latestPendingPollCount)
        assertNull(vm.uiState.value.activeOrderAlert)

        advanceTimeBy(15_000L)
        runCurrent()
        assertEquals(3, repo.latestPendingPollCount)
        assertEquals(2, vm.uiState.value.pendingOrdersCount)
        assertEquals(11, vm.uiState.value.activeOrderAlert?.transaksiId)
        assertEquals(1, vm.uiState.value.orderRefreshTick)

        // Simulasi Lifecycle.State.STOPPED membatalkan coroutine repeatOnLifecycle
        pollingJob.cancel()
        advanceTimeBy(60_000L)
        runCurrent()
        assertEquals(3, repo.latestPendingPollCount)
    }

    @Test
    fun `double tap test notification is guarded while request is in flight`() = runTest {
        val repo = FakeKasirRepository().apply { writeDelayMs = 500L }
        val vm = KasirShellViewModel(repo)

        vm.onEvent(KasirShellEvent.TriggerTestNotification)
        vm.onEvent(KasirShellEvent.TriggerTestNotification)
        runCurrent()
        advanceUntilIdle()

        assertEquals(1, repo.testNotificationCallCount)
        assertEquals(9999, vm.uiState.value.activeOrderAlert?.transaksiId)
    }
}
