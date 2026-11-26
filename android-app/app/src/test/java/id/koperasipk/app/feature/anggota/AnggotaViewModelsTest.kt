package id.koperasipk.app.feature.anggota

import app.cash.turbine.test
import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.database.CachedBarangEntity
import id.koperasipk.app.testing.MainDispatcherRule
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class AnggotaViewModelsTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    // ─── Dashboard ───────────────────────────────────────────────────────────

    @Test
    fun `dashboard loads profile and slices 5 recent transactions`() = runTest {
        val repo = FakeAnggotaRepository().apply {
            historiTransaksiHandler = {
                val txs = (1..7).map { idx ->
                    TransaksiAnggotaDto(transaksiId = idx, totalHarga = idx * 5000.0, status = "selesai")
                }
                ApiResult.Success(TransaksiPaginatorDto(currentPage = 1, data = txs, lastPage = 1, total = 7))
            }
        }

        val vm = AnggotaDashboardViewModel(repo)
        val state = vm.uiState.value
        assertFalse(state.isLoading)
        assertNull(state.errorMessage)
        assertEquals(10, state.profil?.anggotaId)
        assertEquals(5, state.recentTransactions.size)

        vm.onEvent(AnggotaDashboardEvent.ShowQrDialog)
        assertTrue(vm.uiState.value.showQrDialog)
        vm.onEvent(AnggotaDashboardEvent.DismissQrDialog)
        assertFalse(vm.uiState.value.showQrDialog)
    }

    @Test
    fun `dashboard shows error state when initial profile fails and recovers on refresh`() = runTest {
        val repo = FakeAnggotaRepository().apply {
            profilHandler = { ApiResult.Error("Tidak dapat terhubung ke server") }
        }
        val vm = AnggotaDashboardViewModel(repo)
        assertEquals("Tidak dapat terhubung ke server", vm.uiState.value.errorMessage)

        repo.profilHandler = { ApiResult.Success(ProfilAnggotaDto(anggotaId = 99, saldo = 50_000.0)) }
        vm.onEvent(AnggotaDashboardEvent.Refresh)
        assertNull(vm.uiState.value.errorMessage)
        assertEquals(99, vm.uiState.value.profil?.anggotaId)
    }

    @Test
    fun `dashboard toggles balance visibility`() = runTest {
        val repo = FakeAnggotaRepository()
        val vm = AnggotaDashboardViewModel(repo)
        assertFalse(vm.uiState.value.isBalanceHidden)

        vm.onEvent(AnggotaDashboardEvent.ToggleBalanceVisibility)
        assertTrue(vm.uiState.value.isBalanceHidden)

        vm.onEvent(AnggotaDashboardEvent.ToggleBalanceVisibility)
        assertFalse(vm.uiState.value.isBalanceHidden)
    }

    // ─── Belanja ─────────────────────────────────────────────────────────────

    @Test
    fun `belanja observes search query, adds bundle, and guards checkout double submit`() = runTest {
        val item1 = CachedBarangEntity(barangId = 53, namaBarang = "Kopi", stok = 10, stokToko = 10, hargaJual = 3500.0)
        val item2 = CachedBarangEntity(barangId = 57, namaBarang = "Gula", stok = 2, stokToko = 2, hargaJual = 500.0)
        val gate = CompletableDeferred<ApiResult<SimpanTransaksiResponse>>()

        val repo = FakeAnggotaRepository().apply {
            barangCatalogFlow.value = listOf(item1, item2)
            paketBelanjaHandler = {
                ApiResult.Success(
                    PaketBelanjaBundleResult(
                        packages = listOf(
                            PaketBelanjaDto(
                                id = "ngopi",
                                namaPaket = "Ngopi Pas",
                                totalHarga = 4000.0,
                                isAvailable = true,
                                items = listOf(
                                    PaketBelanjaItemDto(barangId = 53, namaBarang = "Kopi", jumlah = 1, hargaSatuan = 3500.0, stokTersedia = 10),
                                    PaketBelanjaItemDto(barangId = 57, namaBarang = "Gula", jumlah = 1, hargaSatuan = 500.0, stokTersedia = 2),
                                ),
                            )
                        ),
                        seringDibeli = null,
                    )
                )
            }
            simpanTransaksiHandler = { gate.await() }
        }

        val vm = BelanjaViewModel(repo)
        assertEquals(2, vm.uiState.value.catalogItems.size)
        // Low-stock item (stok <= 2) sorted first
        assertEquals(57, vm.uiState.value.catalogItems.first().barangId)

        vm.onEvent(AnggotaBelanjaSearch("kopi").toEvent())
        assertEquals(1, vm.uiState.value.catalogItems.size)

        vm.onEvent(BelanjaEvent.SearchChanged(""))
        assertEquals(2, vm.uiState.value.catalogItems.size)

        vm.onEvent(BelanjaEvent.AddPaket(vm.uiState.value.paketList.first()))
        assertEquals(2, vm.uiState.value.cartItems.size)
        assertEquals(4000.0, vm.uiState.value.cartEstimatedTotal, 0.001)

        vm.onEvent(BelanjaEvent.SubmitCheckout)
        vm.onEvent(BelanjaEvent.SubmitCheckout) // duplicate tap while in-flight
        assertEquals(1, repo.simpanTransaksiCalls)
        assertTrue(vm.uiState.value.isSubmitting)

        gate.complete(
            ApiResult.Success(
                SimpanTransaksiResponse(
                    success = true,
                    message = "Pesanan dibuat",
                    transaksiId = 80,
                    tarikTunai = CheckoutTarikTunaiDto(tarikId = 1, kodePenarikan = "TRK-1"),
                )
            )
        )
        assertFalse(vm.uiState.value.isSubmitting)
        assertTrue(vm.uiState.value.cartItems.isEmpty())
        assertEquals("TRK-1", vm.uiState.value.createdTicket?.kodePenarikan)
    }

    @Test
    fun `belanja preserves cart and emits message when checkout fails`() = runTest {
        val item = CachedBarangEntity(barangId = 40, namaBarang = "Indomie", stok = 5, stokToko = 5, hargaJual = 4000.0)
        val repo = FakeAnggotaRepository().apply {
            barangCatalogFlow.value = listOf(item)
            simpanTransaksiHandler = { ApiResult.Error("Saldo tidak mencukupi") }
        }

        val vm = BelanjaViewModel(repo)
        vm.onEvent(BelanjaEvent.AddBarang(item))

        vm.effects.test {
            vm.onEvent(BelanjaEvent.SubmitCheckout)
            assertEquals(BelanjaEffect.ShowMessage("Saldo tidak mencukupi"), awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
        assertEquals(1, vm.uiState.value.cartItems.size)
        assertFalse(vm.uiState.value.isSubmitting)
    }

    @Test
    fun `belanja filter updates selected filter and filtered items`() = runTest {
        val item1 = CachedBarangEntity(barangId = 1, namaBarang = "Normal", stok = 10, stokToko = 10, hargaJual = 5000.0)
        val item2 = CachedBarangEntity(barangId = 2, namaBarang = "Menipis", stok = 1, stokToko = 1, hargaJual = 2000.0)
        val repo = FakeAnggotaRepository().apply {
            barangCatalogFlow.value = listOf(item1, item2)
        }
        val vm = BelanjaViewModel(repo)
        assertEquals(BelanjaUiState.FILTER_ALL, vm.uiState.value.selectedFilter)
        assertEquals(2, vm.uiState.value.filteredCatalogItems.size)

        vm.onEvent(BelanjaEvent.FilterSelected(BelanjaUiState.FILTER_LOW_STOCK))
        assertEquals(BelanjaUiState.FILTER_LOW_STOCK, vm.uiState.value.selectedFilter)
        assertEquals(1, vm.uiState.value.filteredCatalogItems.size)
        assertEquals(2, vm.uiState.value.filteredCatalogItems.first().barangId)
    }

    // ─── Riwayat ─────────────────────────────────────────────────────────────

    @Test
    fun `riwayat loads pages and opens receipt sheet`() = runTest {
        val repo = FakeAnggotaRepository().apply {
            historiTransaksiHandler = { page ->
                ApiResult.Success(
                    TransaksiPaginatorDto(
                        currentPage = page,
                        lastPage = 2,
                        total = 2,
                        data = listOf(TransaksiAnggotaDto(transaksiId = page * 10, totalHarga = 15_000.0, status = "selesai")),
                    )
                )
            }
        }

        val vm = RiwayatViewModel(repo)
        assertEquals(1, vm.uiState.value.currentPage)
        assertEquals(10, vm.uiState.value.transactions.first().transaksiId)

        vm.onEvent(RiwayatEvent.LoadPage(2))
        assertEquals(2, vm.uiState.value.currentPage)
        assertEquals(20, vm.uiState.value.transactions.first().transaksiId)

        vm.onEvent(RiwayatEvent.SelectTransaction(vm.uiState.value.transactions.first()))
        assertNotNull(vm.uiState.value.selectedTransaction)
        vm.onEvent(RiwayatEvent.DismissReceipt)
        assertNull(vm.uiState.value.selectedTransaction)
    }

    @Test
    fun `riwayat filter filters transactions correctly`() = runTest {
        val tx1 = TransaksiAnggotaDto(transaksiId = 1, status = "selesai", metodePembayaran = "cash")
        val tx2 = TransaksiAnggotaDto(transaksiId = 2, status = "pending", metodePembayaran = "transfer")
        val tx3 = TransaksiAnggotaDto(transaksiId = 3, status = "selesai", metodePembayaran = "hutang")
        val repo = FakeAnggotaRepository().apply {
            historiTransaksiHandler = {
                ApiResult.Success(TransaksiPaginatorDto(currentPage = 1, lastPage = 1, total = 3, data = listOf(tx1, tx2, tx3)))
            }
        }
        val vm = RiwayatViewModel(repo)
        assertEquals(3, vm.uiState.value.filteredTransactions.size)

        vm.onEvent(RiwayatEvent.FilterSelected(RiwayatUiState.FILTER_PENDING))
        assertEquals(1, vm.uiState.value.filteredTransactions.size)
        assertEquals(2, vm.uiState.value.filteredTransactions.first().transaksiId)

        vm.onEvent(RiwayatEvent.FilterSelected(RiwayatUiState.FILTER_HUTANG))
        assertEquals(1, vm.uiState.value.filteredTransactions.size)
        assertEquals(3, vm.uiState.value.filteredTransactions.first().transaksiId)
    }

    // ─── Bayar Hutang ────────────────────────────────────────────────────────

    @Test
    fun `bayarHutang validates input, handles error, and guards double submit`() = runTest {
        val gate = CompletableDeferred<ApiResult<BayarHutangResponse>>()
        val repo = FakeAnggotaRepository().apply {
            bayarHutangHandler = { gate.await() }
        }

        val vm = BayarHutangViewModel(repo)
        vm.onEvent(BayarHutangEvent.SubmitPayment)
        assertNotNull(vm.uiState.value.submitError)
        assertEquals(0, repo.bayarHutangCalls)

        vm.onEvent(BayarHutangEvent.PresetSelected(25_000L))
        vm.onEvent(BayarHutangEvent.SubmitPayment)
        vm.onEvent(BayarHutangEvent.SubmitPayment) // duplicate tap while in-flight
        assertEquals(1, repo.bayarHutangCalls)
        assertTrue(vm.uiState.value.isSubmitting)

        gate.complete(ApiResult.Error("Gagal mengirim pembayaran"))
        assertFalse(vm.uiState.value.isSubmitting)
        assertEquals("Gagal mengirim pembayaran", vm.uiState.value.submitError)

        repo.bayarHutangHandler = {
            ApiResult.Success(BayarHutangResponse(success = true, message = "Berhasil dikirim", pembayaranId = 7))
        }
        vm.onEvent(BayarHutangEvent.SubmitPayment)
        assertEquals("", vm.uiState.value.nominalInput)
        assertEquals("Berhasil dikirim", vm.uiState.value.submitSuccess)
    }

    // ─── Tarik Tunai ─────────────────────────────────────────────────────────

    @Test
    fun `tarikTunai shows server reasons, submits consent, and guards double submit`() = runTest {
        val submitGate = CompletableDeferred<ApiResult<AjukanTarikTunaiResponse>>()
        var consented = false
        val repo = FakeAnggotaRepository().apply {
            kelayakanHandler = {
                ApiResult.Success(
                    KelayakanTarikTunaiDto(
                        anggotaId = 10,
                        saldoShu = 150_000.0,
                        saldoEwallet = 50_000.0,
                        hasMasterConsent = consented,
                        isEligible = true,
                        maxKuotaTarikTunai = 75_000.0,
                        ineligibleReasons = if (consented) emptyList() else listOf("Belum menyetujui Master Consent"),
                    )
                )
            }
            masterConsentHandler = {
                consented = true
                ApiResult.Success(MasterConsentResponse(success = true, message = "Disetujui"))
            }
            ajukanTarikTunaiHandler = { submitGate.await() }
        }

        val vm = TarikTunaiViewModel(repo)
        assertFalse(vm.uiState.value.eligibility?.hasMasterConsent == true)
        assertEquals(listOf("Belum menyetujui Master Consent"), vm.uiState.value.eligibility?.ineligibleReasons)

        // Blocks submit if consent unchecked & < 1000
        vm.onEvent(TarikTunaiEvent.NominalChanged("500"))
        vm.onEvent(TarikTunaiEvent.SubmitTarikTunai)
        assertNotNull(vm.uiState.value.formError)
        assertEquals(0, repo.ajukanTarikTunaiCalls)

        vm.onEvent(TarikTunaiEvent.AgreeMasterConsent)
        assertEquals(1, repo.masterConsentCalls)
        assertTrue(vm.uiState.value.eligibility?.hasMasterConsent == true)

        vm.onEvent(TarikTunaiEvent.QuickAmountSelected(50_000L))
        vm.onEvent(TarikTunaiEvent.SubmitTarikTunai)
        vm.onEvent(TarikTunaiEvent.SubmitTarikTunai)
        assertEquals(1, repo.ajukanTarikTunaiCalls)
        assertTrue(vm.uiState.value.isSubmitting)

        submitGate.complete(ApiResult.Success(AjukanTarikTunaiResponse(success = true, message = "Tiket dibuat")))
        assertFalse(vm.uiState.value.isSubmitting)
        assertEquals("", vm.uiState.value.nominalInput)
    }

    // ─── Profil Anggota ──────────────────────────────────────────────────────

    @Test
    fun `profil updates username and prevents double submit`() = runTest {
        val gate = CompletableDeferred<ApiResult<id.koperasipk.app.core.network.BasicResponse>>()
        val repo = FakeAnggotaRepository().apply {
            updateProfileHandler = { gate.await() }
        }

        val vm = ProfilAnggotaViewModel(repo, initialUsername = "budi")
        vm.onEvent(ProfilAnggotaEvent.UsernameChanged("   "))
        vm.onEvent(ProfilAnggotaEvent.SubmitUpdateProfile)
        assertEquals("Username tidak boleh kosong", vm.uiState.value.updateError)
        assertEquals(0, repo.updateProfileCalls)

        vm.onEvent(ProfilAnggotaEvent.UsernameChanged("budi_baru"))
        vm.onEvent(ProfilAnggotaEvent.SubmitUpdateProfile)
        vm.onEvent(ProfilAnggotaEvent.SubmitUpdateProfile)
        assertEquals(1, repo.updateProfileCalls)
        assertTrue(vm.uiState.value.isUpdatingUsername)

        gate.complete(ApiResult.Success(id.koperasipk.app.core.network.BasicResponse(success = true, message = "Profil diupdate")))
        assertFalse(vm.uiState.value.isUpdatingUsername)
        assertEquals("budi_baru", vm.uiState.value.initialUsername)
        assertEquals("Profil diupdate", vm.uiState.value.updateSuccess)
    }

    private data class AnggotaBelanjaSearch(val query: String) {
        fun toEvent() = BelanjaEvent.SearchChanged(query)
    }
}
