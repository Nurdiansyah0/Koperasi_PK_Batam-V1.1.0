package id.koperasipk.app.feature.anggota

import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.core.database.BarangDao
import id.koperasipk.app.core.database.CachedBarangEntity
import id.koperasipk.app.testing.ApiTestFactory
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class AnggotaApiContractTest {

    private lateinit var server: MockWebServer
    private lateinit var api: AnggotaApi
    private lateinit var fakeDao: InMemoryBarangDao
    private lateinit var repository: NetworkAnggotaRepository

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        api = ApiTestFactory.createService(server)
        fakeDao = InMemoryBarangDao()
        repository = NetworkAnggotaRepository(
            api = api,
            barangDao = fakeDao,
            json = ApiTestFactory.json,
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `getProfil parses controller JSON with numeric and string decimals`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "user": {
                    "anggota_id": 12,
                    "user_id": 45,
                    "nama_lengkap": null,
                    "saldo": "85000.00",
                    "hutang": 15000.0,
                    "shu": "120000.50",
                    "simpanan_pokok": 300000,
                    "allowance_hutang": 100000,
                    "limit_hutang": 400000,
                    "sisa_limit_hutang": 385000
                  }
                }
                """.trimIndent()
            )
        )

        val result = repository.getProfil()
        assertTrue(result is ApiResult.Success)
        val profil = (result as ApiResult.Success).data
        assertEquals(12, profil.anggotaId)
        assertEquals(45, profil.userId)
        assertNull(profil.namaLengkap)
        assertEquals(85_000.0, profil.saldo, 0.001)
        assertEquals(15_000.0, profil.hutang, 0.001)
        assertEquals(120_000.5, profil.shu, 0.001)
        assertEquals(300_000.0, profil.simpananPokok, 0.001)
        assertEquals(100_000.0, profil.allowanceHutang, 0.001)
        assertEquals(400_000.0, profil.limitHutang, 0.001)
        assertEquals(385_000.0, profil.sisaLimitHutang, 0.001)
        assertEquals("/anggota/profil", server.takeRequest().path)
    }

    @Test
    fun `refreshBarangCatalog parses controller JSON and caches in BarangDao`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "data": [
                    {
                      "barang_id": 53,
                      "nama_barang": "Kopi",
                      "stok": 12,
                      "harga_jual": "3500.00",
                      "hari_kadaluarsa_toko": null,
                      "status_kadaluarsa_toko": "tidak_ada",
                      "hari_kadaluarsa_gudang": null,
                      "status_kadaluarsa_gudang": "tidak_ada"
                    },
                    {
                      "barang_id": 40,
                      "nama_barang": "Indomie Goreng",
                      "stok": 2,
                      "harga_jual": 4000,
                      "hari_kadaluarsa_toko": 15,
                      "status_kadaluarsa_toko": "near_expiry",
                      "hari_kadaluarsa_gudang": null,
                      "status_kadaluarsa_gudang": "tidak_ada"
                    }
                  ]
                }
                """.trimIndent()
            )
        )

        val result = repository.refreshBarangCatalog()
        assertTrue(result is ApiResult.Success)
        val items = (result as ApiResult.Success).data
        assertEquals(2, items.size)
        assertEquals(3500.0, items[0].resolvedPrice, 0.001)
        assertEquals(2, fakeDao.stored.size)
        assertEquals("Kopi", fakeDao.stored[0].namaBarang)
        assertEquals("/anggota/barang", server.takeRequest().path)
    }

    @Test
    fun `getPaketBelanja parses curated bundles and optional sering_dibeli`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "data": [
                    {
                      "id": "ngopi_manis",
                      "nama_paket": "Paket Ngopi Manis Pas",
                      "deskripsi": "Kopi seduh hitam + gula sachet",
                      "tag": "Genap Pas Rp 4.000",
                      "icon": "☕",
                      "total_harga": 4000,
                      "items": [
                        {
                          "barang_id": 53,
                          "nama_barang": "Kopi",
                          "jumlah": 1,
                          "qty": 1,
                          "harga_satuan": 3500,
                          "subtotal": 3500,
                          "stok_tersedia": 10
                        }
                      ],
                      "is_available": true
                    }
                  ],
                  "sering_dibeli": {
                    "id": "sering_dibeli",
                    "nama_paket": "Yang Sering Anda Beli",
                    "deskripsi": "Favorit Anda",
                    "tag": "Sering Anda Beli",
                    "icon": "⭐",
                    "total_harga": 7000,
                    "items": [],
                    "is_available": false
                  }
                }
                """.trimIndent()
            )
        )

        val result = repository.getPaketBelanja()
        assertTrue(result is ApiResult.Success)
        val bundle = (result as ApiResult.Success).data
        assertEquals(1, bundle.packages.size)
        assertEquals("ngopi_manis", bundle.packages[0].id)
        assertTrue(bundle.packages[0].isAvailable)
        assertNotNull(bundle.seringDibeli)
        assertEquals("sering_dibeli", bundle.seringDibeli?.id)
        assertFalse(bundle.seringDibeli?.isAvailable == true)
    }

    @Test
    fun `simpanTransaksi posts expected payload and parses ticket response`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "message": "Pesanan belanja & tiket tarik tunai #TRK-261123-1234 berhasil dibuat!",
                  "transaksi_id": 77,
                  "tarik_tunai": {
                    "tarik_id": 8,
                    "kode_penarikan": "TRK-261123-1234",
                    "nominal_tarik": 50000.0,
                    "potong_belanja": 30000.0,
                    "uang_bersih_diserahkan": 20000.0,
                    "sumber_dana": "shu",
                    "sisa_shu": 100000.0,
                    "sisa_saldo": 75000.0
                  }
                }
                """.trimIndent()
            )
        )

        val result = repository.simpanTransaksi(
            SimpanTransaksiRequest(
                metodePembayaran = "cash",
                items = listOf(CheckoutItemRequest(barangId = 40, jumlah = 2)),
            )
        )
        assertTrue(result is ApiResult.Success)
        val response = (result as ApiResult.Success).data
        assertEquals(77, response.transaksiId)
        assertEquals("TRK-261123-1234", response.tarikTunai?.kodePenarikan)
        assertEquals(20_000.0, response.tarikTunai?.uangBersihDiserahkan ?: 0.0, 0.001)

        val recorded = server.takeRequest()
        assertEquals("/anggota/transaksi", recorded.path)
        assertEquals("POST", recorded.method)
        val body = recorded.body.readUtf8()
        assertTrue(body.contains("\"metode_pembayaran\":\"cash\""))
        assertTrue(body.contains("\"barang_id\":40"))
        assertTrue(body.contains("\"jumlah\":2"))
        assertFalse(body.contains("sertakan_tarik_tunai"))
    }

    @Test
    fun `getHistoriTransaksi parses Laravel paginator with nullable detail id`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "data": {
                    "current_page": 2,
                    "data": [
                      {
                        "transaksi_id": 99,
                        "anggota_id": 12,
                        "kasir_id": null,
                        "total_harga": 12000.0,
                        "total_keuntungan": 2000.0,
                        "metode_pembayaran": "hutang",
                        "status": "pending",
                        "created_at": "2026-11-23T15:00:00+07:00",
                        "nama_kasir": null,
                        "items": [
                          {
                            "transaksi_detail_id": null,
                            "barang_id": 40,
                            "nama_barang": "Indomie Goreng",
                            "jumlah": 3,
                            "harga_satuan": 4000.0,
                            "subtotal": 12000.0,
                            "keuntungan": 2000.0
                          }
                        ]
                      }
                    ],
                    "last_page": 3,
                    "per_page": 15,
                    "total": 31
                  }
                }
                """.trimIndent()
            )
        )

        val result = repository.getHistoriTransaksi(page = 2)
        assertTrue(result is ApiResult.Success)
        val paginator = (result as ApiResult.Success).data
        assertEquals(2, paginator.currentPage)
        assertEquals(3, paginator.lastPage)
        assertEquals(31, paginator.total)
        assertEquals(1, paginator.data.size)
        assertNull(paginator.data[0].items[0].transaksiDetailId)
        assertEquals("Indomie Goreng", paginator.data[0].items[0].namaBarang)
        assertEquals("/anggota/transaksi?page=2", server.takeRequest().path)
    }

    @Test
    fun `bayarHutang and getHistoriBayarHutang parse string decimals`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "message": "Pengajuan pembayaran hutang berhasil dibuat, silakan bayar ke kasir.",
                  "pembayaran_id": 88
                }
                """.trimIndent()
            )
        )
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "data": [
                    {
                      "pembayaran_id": 88,
                      "anggota_id": 12,
                      "kasir_id": null,
                      "nominal": "25000.00",
                      "status": "pending",
                      "approved_at": null,
                      "created_at": "2026-11-23 15:10:00",
                      "metode_pembayaran": "cash"
                    }
                  ]
                }
                """.trimIndent()
            )
        )

        val postResult = repository.bayarHutang(25_000.0)
        assertTrue(postResult is ApiResult.Success)
        assertEquals(88, (postResult as ApiResult.Success).data.pembayaranId)

        val getResult = repository.getHistoriBayarHutang()
        assertTrue(getResult is ApiResult.Success)
        val items = (getResult as ApiResult.Success).data
        assertEquals(1, items.size)
        assertEquals(25_000.0, items[0].resolvedNominal, 0.001)
        assertEquals("pending", items[0].status)
    }

    @Test
    fun `cekKelayakanTarikTunai parses eligibility, reasons, valid trx, and pending ticket`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "data": {
                    "anggota_id": 12,
                    "nama_lengkap": "Budi Santoso",
                    "saldo_shu": 150000,
                    "saldo_ewallet": 50000,
                    "hutang": 20000,
                    "has_debt": true,
                    "has_master_consent": false,
                    "master_consent_at": null,
                    "total_belanja_hari_ini": 30000,
                    "has_qualifying_purchase": true,
                    "transaksi_valid_hari_ini": [
                      {
                        "transaksi_id": 501,
                        "total_harga": "30000.00",
                        "metode_pembayaran": "cash",
                        "created_at": "2026-11-23T09:00:00.000000Z"
                      }
                    ],
                    "eligible_shu": 130000,
                    "raw_withdrawal_limit": 65000,
                    "pre_round_limit": 65000,
                    "final_withdrawal_limit": 65000,
                    "max_kuota_tarik_tunai": 65000,
                    "max_shu_withdrawal": 65000,
                    "is_eligible": false,
                    "ineligible_reasons": [
                      "Anda memiliki tiket penarikan aktif #TRK-261123-0001 yang belum diproses kasir."
                    ],
                    "pending_ticket": {
                      "tarik_id": 19,
                      "kode_penarikan": "TRK-261123-0001",
                      "nominal": "50000.00",
                      "sumber_dana": "shu",
                      "created_at": "2026-11-23T09:15:00.000000Z"
                    }
                  }
                }
                """.trimIndent()
            )
        )

        val result = repository.cekKelayakanTarikTunai()
        assertTrue(result is ApiResult.Success)
        val dto = (result as ApiResult.Success).data
        assertFalse(dto.isEligible)
        assertTrue(dto.hasDebt)
        assertFalse(dto.hasMasterConsent)
        assertEquals(1, dto.transaksiValidHariIni.size)
        assertEquals(30_000.0, dto.transaksiValidHariIni[0].totalHarga, 0.001)
        assertEquals(65_000.0, dto.resolvedMaxQuota, 0.001)
        assertEquals("TRK-261123-0001", dto.pendingTicket?.kodePenarikan)
        assertEquals(50_000.0, dto.pendingTicket?.nominal ?: 0.0, 0.001)
        assertEquals(1, dto.ineligibleReasons.size)
    }

    @Test
    fun `consent, ajukanTarikTunai, riwayatTarikTunai, and updateProfile 422 parse cleanly`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "message": "Persetujuan Sadar Penarikan SHU (Master Consent) berhasil disimpan.",
                  "data": {
                    "has_master_consent": true,
                    "persetujuan_shu_master_at": "2026-11-23T10:00:00.000000Z"
                  }
                }
                """.trimIndent()
            )
        )
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "message": "Tiket penarikan tunai berhasil dibuat!",
                  "data": {
                    "tarik_id": 22,
                    "kode_penarikan": "TRK-261123-2222",
                    "nominal": 50000,
                    "sumber_dana": "shu",
                    "status": "pending",
                    "nama_anggota": "Budi Santoso",
                    "created_at": "2026-11-23T10:05:00.000000Z"
                  }
                }
                """.trimIndent()
            )
        )
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "data": [
                    {
                      "tarik_id": 22,
                      "kode_penarikan": "TRK-261123-2222",
                      "status": "rejected",
                      "nominal": 50000,
                      "sumber_dana": "shu",
                      "transaksi_id": 501,
                      "belanja_nominal": 30000,
                      "alasan_tolak": "Ditolak Otomatis Sistem: Saldo tidak cukup",
                      "approved_at": null,
                      "keterangan": "Pengajuan mandiri",
                      "kasir_name": "Verifikasi Sistem",
                      "created_at": "2026-11-23T10:05:00.000000Z"
                    }
                  ]
                }
                """.trimIndent()
            )
        )
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "message": "The username has already been taken.",
                  "errors": {
                    "username": ["Username sudah digunakan oleh akun lain."]
                  }
                }
                """.trimIndent(),
                code = 422,
            )
        )

        val consentRes = repository.setujuiMasterConsentShu()
        assertTrue(consentRes is ApiResult.Success)
        assertTrue((consentRes as ApiResult.Success).data.data?.hasMasterConsent == true)

        val submitRes = repository.ajukanTarikTunai(
            AjukanTarikTunaiRequest(
                nominal = 50_000.0,
                sumberDana = "shu",
                persetujuanShu = true,
            )
        )
        assertTrue(submitRes is ApiResult.Success)
        assertEquals("TRK-261123-2222", (submitRes as ApiResult.Success).data.data?.kodePenarikan)

        val historyRes = repository.getRiwayatTarikTunai()
        assertTrue(historyRes is ApiResult.Success)
        assertEquals("rejected", (historyRes as ApiResult.Success).data[0].status)

        val updateErr = repository.updateProfile("admin")
        assertTrue(updateErr is ApiResult.Error)
        assertEquals("Username sudah digunakan oleh akun lain.", (updateErr as ApiResult.Error).message)
    }

    private class InMemoryBarangDao : BarangDao {
        private val flow = MutableStateFlow<List<CachedBarangEntity>>(emptyList())
        var stored: List<CachedBarangEntity> = emptyList()

        override suspend fun upsertAll(items: List<CachedBarangEntity>) {
            stored = items
            flow.value = items
        }

        override fun observeBarang(query: String, limit: Int): Flow<List<CachedBarangEntity>> = flow

        override fun observeAvailableBarang(query: String, limit: Int): Flow<List<CachedBarangEntity>> = flow

        override suspend fun count(): Int = stored.size

        override suspend fun clear() {
            stored = emptyList()
            flow.value = emptyList()
        }
    }
}
