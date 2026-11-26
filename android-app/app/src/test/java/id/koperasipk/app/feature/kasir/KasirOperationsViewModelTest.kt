package id.koperasipk.app.feature.kasir

import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.kasir.data.AnggotaKasirDto
import id.koperasipk.app.feature.kasir.data.AntreanTarikTunaiDto
import id.koperasipk.app.feature.kasir.data.CycleCountBarangDto
import id.koperasipk.app.feature.kasir.data.DaftarKasirDto
import id.koperasipk.app.feature.kasir.data.KelayakanTarikTunaiDto
import id.koperasipk.app.feature.kasir.data.LaravelPaginatorDto
import id.koperasipk.app.feature.kasir.data.PembayaranHutangDto
import id.koperasipk.app.feature.kasir.data.RiwayatTransaksiDto
import id.koperasipk.app.feature.kasir.data.SerahTerimaDraftDto
import id.koperasipk.app.feature.kasir.data.SerahTerimaDto
import id.koperasipk.app.feature.kasir.ui.hutang.PembayaranHutangEvent
import id.koperasipk.app.feature.kasir.ui.hutang.PembayaranHutangViewModel
import id.koperasipk.app.feature.kasir.ui.riwayat.DateFilterPreset
import id.koperasipk.app.feature.kasir.ui.riwayat.RiwayatTransaksiEvent
import id.koperasipk.app.feature.kasir.ui.riwayat.RiwayatTransaksiViewModel
import id.koperasipk.app.feature.kasir.ui.serahterima.BuatSerahTerimaEvent
import id.koperasipk.app.feature.kasir.ui.serahterima.BuatSerahTerimaViewModel
import id.koperasipk.app.feature.kasir.ui.serahterima.SerahTerimaEvent
import id.koperasipk.app.feature.kasir.ui.serahterima.SerahTerimaViewModel
import id.koperasipk.app.feature.kasir.ui.setoran.SetoranKasirEvent
import id.koperasipk.app.feature.kasir.ui.setoran.SetoranKasirViewModel
import id.koperasipk.app.feature.kasir.ui.tariktunai.TarikTunaiEvent
import id.koperasipk.app.feature.kasir.ui.tariktunai.TarikTunaiViewModel
import id.koperasipk.app.testing.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class KasirOperationsViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule(StandardTestDispatcher())

    @Test
    fun `pembayaran hutang guards double submit on approve and reject`() = runTest {
        val repo = FakeKasirRepository().apply {
            writeDelayMs = 400L
            pembayaranHutangResult = ApiResult.Success(
                listOf(PembayaranHutangDto(pembayaranId = 5, anggotaId = 2, namaAnggota = "Budi", nominal = 20000.0, status = "pending"))
            )
        }
        val vm = PembayaranHutangViewModel(repo)
        advanceUntilIdle()

        vm.onEvent(PembayaranHutangEvent.Approve(5, "cash"))
        vm.onEvent(PembayaranHutangEvent.Approve(5, "cash"))
        runCurrent()
        advanceUntilIdle()
        assertEquals(1, repo.approveHutangCallCount)

        vm.onEvent(PembayaranHutangEvent.RequestReject(PembayaranHutangDto(pembayaranId = 5, anggotaId = 2, namaAnggota = "Budi", nominal = 20000.0)))
        vm.onEvent(PembayaranHutangEvent.ConfirmReject)
        vm.onEvent(PembayaranHutangEvent.ConfirmReject)
        runCurrent()
        advanceUntilIdle()
        assertEquals(2, repo.approveHutangCallCount)
    }

    @Test
    fun `setoran kasir validates positive nominal and guards double submit`() = runTest {
        val repo = FakeKasirRepository().apply { writeDelayMs = 400L }
        val vm = SetoranKasirViewModel(repo)
        advanceUntilIdle()

        vm.onEvent(SetoranKasirEvent.SubmitSetoran)
        assertNotNull(vm.uiState.value.nominalError)
        assertEquals(0, repo.setorAdminCallCount)

        vm.onEvent(SetoranKasirEvent.NominalChanged("150000"))
        vm.onEvent(SetoranKasirEvent.SubmitSetoran)
        vm.onEvent(SetoranKasirEvent.SubmitSetoran)
        runCurrent()
        advanceUntilIdle()
        assertEquals(1, repo.setorAdminCallCount)
    }

    @Test
    fun `riwayat transaksi sends date filter preset and page to repository`() = runTest {
        val repo = FakeKasirRepository().apply {
            historyTransaksiResult = ApiResult.Success(
                LaravelPaginatorDto(
                    currentPage = 1,
                    lastPage = 2,
                    total = 25,
                    data = listOf(RiwayatTransaksiDto(transaksiId = 99, totalHarga = 30000.0, metodePembayaran = "cash", status = "selesai")),
                )
            )
        }
        val vm = RiwayatTransaksiViewModel(repo)
        advanceUntilIdle()

        vm.onEvent(RiwayatTransaksiEvent.DatePresetSelected(DateFilterPreset.HARI_INI))
        advanceUntilIdle()
        assertTrue(!repo.lastHistoryRequest?.tanggalAwal.isNullOrBlank())

        vm.onEvent(RiwayatTransaksiEvent.ChangePage(2))
        advanceUntilIdle()
        assertEquals(2, repo.lastHistoryRequest?.page)
    }

    @Test
    fun `tarik tunai checks server eligibility and guards double submit on queue and manual`() = runTest {
        val repo = FakeKasirRepository().apply {
            writeDelayMs = 400L
            antreanTarikResult = ApiResult.Success(
                listOf(AntreanTarikTunaiDto(tarikId = 12, kodePenarikan = "TRK-1", anggotaId = 4, namaAnggota = "Dina", nominal = 50000.0))
            )
            kelayakanResult = ApiResult.Success(
                KelayakanTarikTunaiDto(anggotaId = 4, namaLengkap = "Dina", maxKuotaTarikTunai = 50000.0, isEligible = true)
            )
        }
        val vm = TarikTunaiViewModel(repo)
        advanceUntilIdle()

        vm.onEvent(TarikTunaiEvent.ApproveQueueItem(12))
        vm.onEvent(TarikTunaiEvent.ApproveQueueItem(12))
        runCurrent()
        advanceUntilIdle()
        assertEquals(1, repo.prosesTarikCallCount)

        vm.onEvent(TarikTunaiEvent.SelectAnggota(AnggotaKasirDto(anggotaId = 4, namaLengkap = "Dina")))
        advanceUntilIdle()
        assertEquals(50000.0, vm.uiState.value.eligibility?.maxKuotaTarikTunai ?: 0.0, 0.01)

        vm.onEvent(TarikTunaiEvent.NominalChanged("50000"))
        vm.onEvent(TarikTunaiEvent.PersetujuanShuChanged(true))
        vm.onEvent(TarikTunaiEvent.SubmitManualTarikTunai)
        vm.onEvent(TarikTunaiEvent.SubmitManualTarikTunai)
        runCurrent()
        advanceUntilIdle()
        assertEquals(1, repo.tarikTunaiCallCount)
    }

    @Test
    fun `serah terima and buat serah terima guard double submit and validate inputs`() = runTest {
        val repo = FakeKasirRepository().apply {
            writeDelayMs = 400L
            serahTerimaForMeResult = ApiResult.Success(
                LaravelPaginatorDto(
                    data = listOf(SerahTerimaDto(serahId = 7, kasirFrom = 2, kasirTo = 3, status = "pending"))
                )
            )
            serahTerimaDraftResult = ApiResult.Success(
                SerahTerimaDraftDto(
                    kasirList = listOf(DaftarKasirDto(userId = 3, username = "kasir2", namaLengkap = "Kasir Dua")),
                    saldoKasSistem = 300000.0,
                    cycleCountItems = listOf(CycleCountBarangDto(barangId = 1, namaBarang = "Kopi", stokToko = 5, hargaJual = 3500.0)),
                )
            )
        }

        val stVm = SerahTerimaViewModel(repo)
        advanceUntilIdle()

        stVm.onEvent(SerahTerimaEvent.Approve(7))
        stVm.onEvent(SerahTerimaEvent.Approve(7))
        runCurrent()
        advanceUntilIdle()
        assertEquals(1, repo.approveSerahTerimaCallCount)

        stVm.onEvent(SerahTerimaEvent.SelectItem(SerahTerimaDto(serahId = 7, status = "pending")))
        stVm.onEvent(SerahTerimaEvent.OpenRejectDialog)
        stVm.onEvent(SerahTerimaEvent.SubmitReject)
        assertNotNull(stVm.uiState.value.rejectError)
        assertEquals(0, repo.rejectSerahTerimaCallCount)

        stVm.onEvent(SerahTerimaEvent.AlasanPenolakanChanged("Kas kurang"))
        stVm.onEvent(SerahTerimaEvent.SubmitReject)
        stVm.onEvent(SerahTerimaEvent.SubmitReject)
        runCurrent()
        advanceUntilIdle()
        assertEquals(1, repo.rejectSerahTerimaCallCount)

        val buatVm = BuatSerahTerimaViewModel(repo)
        advanceUntilIdle()
        buatVm.onEvent(BuatSerahTerimaEvent.SelectKasir(DaftarKasirDto(userId = 3, username = "kasir2")))
        buatVm.onEvent(BuatSerahTerimaEvent.UangFisikChanged("300000"))
        // Missing stock input -> blocked locally without API call
        buatVm.onEvent(BuatSerahTerimaEvent.SubmitSerahTerima)
        assertEquals(0, repo.createSerahTerimaCallCount)

        buatVm.onEvent(BuatSerahTerimaEvent.StokFisikChanged(1, "5"))
        buatVm.onEvent(BuatSerahTerimaEvent.SubmitSerahTerima)
        buatVm.onEvent(BuatSerahTerimaEvent.SubmitSerahTerima)
        runCurrent()
        advanceUntilIdle()
        assertEquals(1, repo.createSerahTerimaCallCount)
    }
}
