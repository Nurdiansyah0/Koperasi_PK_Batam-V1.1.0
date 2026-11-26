package id.koperasipk.app.feature.kasir

import id.koperasipk.app.core.common.ApiResult
import id.koperasipk.app.feature.kasir.data.BuatTransaksiRequest
import id.koperasipk.app.feature.kasir.data.CheckoutItemRequest
import id.koperasipk.app.feature.kasir.data.HasilOpnameDto
import id.koperasipk.app.feature.kasir.data.HistoryTransaksiRequest
import id.koperasipk.app.feature.kasir.data.KasirApi
import id.koperasipk.app.feature.kasir.data.NetworkKasirRepository
import id.koperasipk.app.feature.kasir.data.TarikTunaiRequest
import id.koperasipk.app.testing.ApiTestFactory
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class KasirApiContractTest {

    private lateinit var server: MockWebServer
    private lateinit var api: KasirApi
    private lateinit var repository: NetworkKasirRepository

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        api = ApiTestFactory.createService(server)
        repository = NetworkKasirRepository(api, ApiTestFactory.json)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `dashboard and transaksi terbaru DTOs parse decimal strings and active shift`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "data": {
                    "total_pendapatan_hari_ini": "125000.00",
                    "total_transaksi_hari_ini": 4,
                    "total_item_terjual_hari_ini": "9",
                    "total_transaksi_dilayani": 42,
                    "saldo_kas": "350000.50",
                    "pending_serah_terima": 1,
                    "pending_pesanan": 2,
                    "pending_hutang": 1,
                    "transaksi_terbaru": [
                      {
                        "id": 88,
                        "transaksi_id": 88,
                        "created_at": "2026-11-23T10:15:00Z",
                        "total_harga": "25000.00",
                        "metode_pembayaran": "cash",
                        "status": "selesai",
                        "nama_anggota": "Budi Santoso"
                      }
                    ],
                    "active_shift": {
                      "serah_id": 12,
                      "kasir_from_name": "Andi",
                      "kasir_from_username": "andi",
                      "kasir_to_name": "Sari",
                      "kasir_to_username": "sari",
                      "hasil_opname": {
                        "uang_fisik": "500000.00",
                        "saldo_kas_sistem": 500000,
                        "selisih_kas": 0,
                        "summary": { "barangSelisih": 0, "totalMinusNominal": 0 }
                      },
                      "created_at": "2026-11-23T08:00:00Z"
                    }
                  }
                }
                """.trimIndent()
            )
        )

        val res = repository.getDashboard() as ApiResult.Success
        assertEquals(125000.0, res.data.totalPendapatanHariIni, 0.01)
        assertEquals(9, res.data.totalItemTerjualHariIni)
        assertEquals(350000.5, res.data.saldoKas, 0.01)
        assertEquals(88, res.data.transaksiTerbaru.first().resolvedId)
        assertEquals(500000.0, res.data.activeShift?.hasilOpname?.uangFisik ?: 0.0, 0.01)
        assertEquals("GET", server.takeRequest().method)
    }

    @Test
    fun `pos barang paket anggota and buat-transaksi DTOs roundtrip cleanly`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"data":[{"barang_id":5,"nama_barang":"Kopi","harga_jual":"3500.00","stok":12}]}"""
            )
        )
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "data": [
                    {
                      "id": "ngopi_manis",
                      "nama_paket": "Paket Ngopi Manis Pas",
                      "deskripsi": "Kopi + gula",
                      "tag": "Genap Pas",
                      "icon": "☕",
                      "total_harga": 4000,
                      "is_available": 1,
                      "items": [
                        {"barang_id":5,"nama_barang":"Kopi","jumlah":1,"qty":1,"harga_satuan":"3500.00","subtotal":3500,"stok_tersedia":12}
                      ]
                    }
                  ],
                  "sering_dibeli": null
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
                      "anggota_id": 7,
                      "nama_lengkap": "Citra",
                      "username": "citra",
                      "saldo": "75000.00",
                      "hutang": "10000.00",
                      "shu": "120000.00",
                      "limit_hutang": 400000,
                      "sisa_limit_hutang": 390000,
                      "allowance_hutang": 100000
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
                  "success": true,
                  "message": "Transaksi berhasil",
                  "transaksi_id": 205,
                  "total": 4000,
                  "total_keuntungan": 800,
                  "tarik_tunai": null
                }
                """.trimIndent()
            )
        )

        val barang = (repository.getDataBarang() as ApiResult.Success).data
        assertEquals(3500.0, barang.first().effectivePrice, 0.01)

        val paket = (repository.getPaketBelanja() as ApiResult.Success).data
        assertTrue(paket.data.first().isAvailable)

        val anggota = (repository.getAllAnggota() as ApiResult.Success).data
        assertEquals(390000.0, anggota.first().sisaLimitHutang, 0.01)

        val trx = (
            repository.buatTransaksiKasir(
                BuatTransaksiRequest(
                    items = listOf(CheckoutItemRequest(barangId = 5, jumlah = 1, hargaSatuan = 3500.0)),
                    anggotaId = 7,
                    metodePembayaran = "cash",
                    total = 3500.0,
                )
            ) as ApiResult.Success
        ).data
        assertEquals(205, trx.transaksiId)
        assertEquals(4000.0, trx.total ?: 0.0, 0.01)
    }

    @Test
    fun `pesanan, latest-pending-orders, hutang, riwayat, setoran, tarik tunai, and serah terima parse cleanly`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "data": [
                    {
                      "transaksi_id": 51,
                      "anggota_id": 3,
                      "nama_anggota": "Doni",
                      "metode_pembayaran": "hutang",
                      "total_harga": "35000.00",
                      "created_at": "2026-11-23T11:00:00Z",
                      "tarik_tunai": {
                        "tarik_id": 9,
                        "kode_penarikan": "TRK-261123-1234",
                        "nominal": "60000.00",
                        "sumber_dana": "shu",
                        "uang_bersih_diserahkan": 25000
                      },
                      "items": [{"barang_id":1,"nama_barang":"Beras","jumlah":1,"harga_satuan":"35000.00"}]
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
                  "success": true,
                  "is_active_shift": true,
                  "pending_count": 1,
                  "latest_order": {
                    "transaksi_id": 51,
                    "anggota_id": 3,
                    "nama_anggota": "Doni",
                    "username": "doni",
                    "total_harga": 35000,
                    "metode_pembayaran": "hutang",
                    "items_count": 1,
                    "items_summary": "1x Beras"
                  },
                  "orders": []
                }
                """.trimIndent()
            )
        )
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "data": {
                    "current_page": 1,
                    "last_page": 2,
                    "total": 25,
                    "per_page": 20,
                    "data": [
                      {
                        "id": 19,
                        "transaksi_id": 19,
                        "total": "18000.00",
                        "total_harga": "18000.00",
                        "metode_pembayaran": "cash",
                        "status": "selesai",
                        "nama_anggota": "Eko",
                        "nama_kasir": "kasir1",
                        "details": [{"detail_id":1,"barang_id":2,"nama_barang":"Teh","jumlah":2,"harga_satuan":"9000.00","subtotal":"18000.00"}]
                      }
                    ]
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
                  "data": {
                    "anggota_id": 3,
                    "nama_lengkap": "Doni",
                    "saldo_ewallet": "50000.00",
                    "saldo_shu": "120000.00",
                    "hutang": 0,
                    "has_qualifying_purchase": true,
                    "min_belanja_required": 25000,
                    "final_withdrawal_limit": 60000,
                    "max_kuota_tarik_tunai": 60000,
                    "is_eligible": true,
                    "ineligible_reasons": [],
                    "transaksi_valid_hari_ini": [
                      {"transaksi_id": 55, "total_harga": "32000.00", "metode_pembayaran": "cash"}
                    ]
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
                  "data": {
                    "current_page": 1,
                    "last_page": 1,
                    "total": 1,
                    "data": [
                      {
                        "serah_id": 4,
                        "kasir_from": 2,
                        "kasir_to": 3,
                        "kasir_from_name": "Kasir Satu",
                        "kasir_to_name": "Kasir Dua",
                        "status": "pending",
                        "hasil_opname": "{\"uang_fisik\":250000,\"saldo_kas_sistem\":250000,\"selisih_kas\":0,\"summary\":{\"barangSelisih\":0}}",
                        "created_at": "2026-11-23T09:00:00Z"
                      }
                    ]
                  }
                }
                """.trimIndent()
            )
        )

        val pesanan = (repository.getPesananAnggota() as ApiResult.Success).data
        assertEquals(25000.0, pesanan.first().tarikTunai?.uangBersihDiserahkan ?: 0.0, 0.01)

        val latest = (repository.getLatestPendingOrders() as ApiResult.Success).data
        assertEquals(1, latest.pendingCount)
        assertTrue(latest.isActiveShift)

        val history = (repository.getHistoryTransaksi(HistoryTransaksiRequest(page = 1)) as ApiResult.Success).data
        assertEquals(2, history.lastPage)
        assertEquals("Teh", history.data.first().details.first().namaBarang)

        val elig = (repository.cekKelayakanTarikTunai(3) as ApiResult.Success).data
        assertTrue(elig.isEligible)
        assertEquals(60000.0, elig.maxKuotaTarikTunai, 0.01)

        val serah = (repository.getSerahTerimaForMe("pending", 1) as ApiResult.Success).data
        assertNotNull(serah.data.first().hasilOpname)
        assertEquals(250000.0, serah.data.first().hasilOpname?.uangFisik ?: 0.0, 0.01)
    }

    @Test
    fun `server 400 and 422 errors map to Laravel message cleanly`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":false,"message":"Limit hutang tidak mencukupi"}""",
                400,
            )
        )
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"message":"Validation failed","errors":{"alasan":["Alasan penolakan wajib diisi secara jelas"]}}""",
                422,
            )
        )
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":false,"message":"Saldo SHU tidak mencukupi"}""",
                400,
            )
        )

        val checkoutErr = repository.buatTransaksiKasir(
            BuatTransaksiRequest(items = emptyList(), anggotaId = 1, metodePembayaran = "hutang")
        ) as ApiResult.Error
        assertEquals("Limit hutang tidak mencukupi", checkoutErr.message)

        val rejectErr = repository.rejectSerahTerima(1, "") as ApiResult.Error
        assertEquals("Alasan penolakan wajib diisi secara jelas", rejectErr.message)

        val tarikErr = repository.tarikTunai(
            TarikTunaiRequest(anggotaId = 1, nominal = 50000.0, sumberDana = "shu", persetujuanShu = true)
        ) as ApiResult.Error
        assertEquals("Saldo SHU tidak mencukupi", tarikErr.message)

        val req = server.takeRequest()
        assertFalse(req.path.isNullOrBlank())
    }

    @Test
    fun `serah terima draft and setoran endpoints parse correctly`() = runTest {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "data": {
                    "kasir_list": [{"user_id": 2, "username": "kasir2", "nama_lengkap": "Kasir Dua"}],
                    "saldo_kas_sistem": "420000.00",
                    "cycle_count_items": [{"barang_id": 10, "nama_barang": "Surya 16", "stok_toko": 5, "stok_gudang": 10, "pkm": 8, "harga_jual": "35000.00", "risk_badge": "Rokok"}],
                    "all_items": [],
                    "pending_cash_orders": {"count": 1, "nominal": 15000, "total_pending_count": 2}
                  }
                }
                """.trimIndent()
            )
        )
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"data":[{"setoran_id":3,"kasir_id":1,"nominal":"250000.00","status":"pending","created_at":"2026-11-23T12:00:00Z"}]}"""
            )
        )
        server.enqueue(
            ApiTestFactory.jsonResponse("""{"success":true,"message":"Serah terima berhasil dibuat","data":{"serah_id":99,"serah_terima_id":99}}""")
        )

        val draft = (repository.getSerahTerimaDraft() as ApiResult.Success).data
        assertEquals(420000.0, draft.saldoKasSistem, 0.01)
        assertEquals("Rokok", draft.cycleCountItems.first().riskBadge)

        val setoran = (repository.getRiwayatSetoran() as ApiResult.Success).data
        assertEquals(250000.0, setoran.first().nominal, 0.01)

        val createRes = repository.createSerahTerima(2, HasilOpnameDto(uangFisik = 420000.0)) as ApiResult.Success
        assertEquals("Serah terima berhasil dibuat", createRes.data)
    }
}
