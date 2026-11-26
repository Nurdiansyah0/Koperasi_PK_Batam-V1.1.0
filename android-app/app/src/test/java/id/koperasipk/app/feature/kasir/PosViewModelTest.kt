package id.koperasipk.app.feature.kasir

import app.cash.turbine.test
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.kasir.data.AnggotaKasirDto
import id.koperasipk.app.feature.kasir.data.BarangKasirDto
import id.koperasipk.app.feature.kasir.data.BuatTransaksiResponse
import id.koperasipk.app.feature.kasir.data.PaketBelanjaDto
import id.koperasipk.app.feature.kasir.data.PaketBelanjaItemDto
import id.koperasipk.app.feature.kasir.data.PaketBelanjaResponse
import id.koperasipk.app.feature.kasir.ui.pos.PosEffect
import id.koperasipk.app.feature.kasir.ui.pos.PosEvent
import id.koperasipk.app.feature.kasir.ui.pos.PosPaymentMethod
import id.koperasipk.app.feature.kasir.ui.pos.PosViewModel
import id.koperasipk.app.testing.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PosViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule(StandardTestDispatcher())

    @Test
    fun `pos adds barang and paket to cart and guards double checkout submit`() = runTest {
        val repo = FakeKasirRepository().apply {
            writeDelayMs = 400L
            barangResult = ApiResult.Success(
                listOf(
                    BarangKasirDto(barangId = 1, namaBarang = "Kopi", hargaJual = 3500.0, stok = 5),
                    BarangKasirDto(barangId = 2, namaBarang = "Gula", hargaJual = 500.0, stok = 5),
                )
            )
            paketResult = ApiResult.Success(
                PaketBelanjaResponse(
                    success = true,
                    data = listOf(
                        PaketBelanjaDto(
                            id = "ngopi",
                            namaPaket = "Paket Ngopi",
                            totalHarga = 4000.0,
                            isAvailable = true,
                            items = listOf(
                                PaketBelanjaItemDto(barangId = 1, namaBarang = "Kopi", qty = 1, hargaSatuan = 3500.0, subtotal = 3500.0, stokTersedia = 5),
                                PaketBelanjaItemDto(barangId = 2, namaBarang = "Gula", qty = 1, hargaSatuan = 500.0, subtotal = 500.0, stokTersedia = 5),
                            ),
                        )
                    ),
                )
            )
            anggotaResult = ApiResult.Success(
                listOf(AnggotaKasirDto(anggotaId = 7, namaLengkap = "Citra", username = "citra", saldo = 50000.0, sisaLimitHutang = 400000.0))
            )
            cariProfilResult = ApiResult.Success(
                AnggotaKasirDto(anggotaId = 7, namaLengkap = "Citra", username = "citra", saldo = 60000.0, sisaLimitHutang = 400000.0)
            )
            buatTransaksiResult = ApiResult.Success(
                BuatTransaksiResponse(success = true, message = "Transaksi berhasil", transaksiId = 321, total = 7500.0)
            )
        }

        val vm = PosViewModel(repo)
        advanceUntilIdle()

        vm.onEvent(PosEvent.AddPaket(repo.paketResult.let { (it as ApiResult.Success).data.data.first() }))
        vm.onEvent(PosEvent.AddBarang(BarangKasirDto(barangId = 1, namaBarang = "Kopi", hargaJual = 3500.0, stok = 5)))
        assertEquals(3, vm.uiState.value.totalItemCount)

        vm.onEvent(PosEvent.SelectAnggota(AnggotaKasirDto(anggotaId = 7, namaLengkap = "Citra")))
        advanceUntilIdle()
        assertEquals(60000.0, vm.uiState.value.selectedAnggota?.saldo ?: 0.0, 0.01)

        vm.onEvent(PosEvent.PaymentMethodSelected(PosPaymentMethod.CASH))
        vm.onEvent(PosEvent.SubmitCheckout)
        vm.onEvent(PosEvent.SubmitCheckout)
        runCurrent()
        advanceUntilIdle()

        assertEquals(1, repo.buatTransaksiCallCount)
        assertEquals(321, vm.uiState.value.lastReceipt?.transaksiId)
        assertTrue(vm.uiState.value.cart.isEmpty())
    }

    @Test
    fun `server checkout rejection emits authoritative error without clearing cart`() = runTest {
        val repo = FakeKasirRepository().apply {
            barangResult = ApiResult.Success(listOf(BarangKasirDto(barangId = 1, namaBarang = "Kopi", hargaJual = 3500.0, stok = 5)))
            buatTransaksiResult = ApiResult.Error("Gagal: Saldo tidak mencukupi")
        }
        val vm = PosViewModel(repo)
        advanceUntilIdle()

        vm.onEvent(PosEvent.AddBarang(BarangKasirDto(barangId = 1, namaBarang = "Kopi", hargaJual = 3500.0, stok = 5)))
        vm.onEvent(PosEvent.SelectAnggota(AnggotaKasirDto(anggotaId = 7, namaLengkap = "Citra")))
        advanceUntilIdle()

        vm.effects.test {
            vm.onEvent(PosEvent.SubmitCheckout)
            advanceUntilIdle()
            assertEquals(PosEffect.ShowMessage("Gagal: Saldo tidak mencukupi"), awaitItem())
        }
        assertEquals(1, vm.uiState.value.cart.size)
    }
}
