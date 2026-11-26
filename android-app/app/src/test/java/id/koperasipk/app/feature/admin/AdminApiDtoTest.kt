package id.koperasipk.app.feature.admin

import id.koperasipk.app.feature.admin.data.AdminApi
import id.koperasipk.app.feature.admin.data.AdminBarangListResponse
import id.koperasipk.app.feature.admin.data.AdminDashboardResponse
import id.koperasipk.app.feature.admin.data.AdminMessageResponse
import id.koperasipk.app.feature.admin.data.BulkRestockItemRequest
import id.koperasipk.app.feature.admin.data.BulkRestockRequest
import id.koperasipk.app.feature.admin.data.CashAdjustmentRequest
import id.koperasipk.app.feature.admin.data.LaporanTransaksiRequest
import id.koperasipk.app.feature.admin.data.LaporanTransaksiResponse
import id.koperasipk.app.feature.admin.data.NetworkAdminRepository
import id.koperasipk.app.feature.admin.data.OpnameAdjustmentRequest
import id.koperasipk.app.feature.admin.data.OpnameMassalRequest
import id.koperasipk.app.feature.admin.data.ProsesKonversiShuRequest
import id.koperasipk.app.feature.admin.data.RestockBarangRequest
import id.koperasipk.app.feature.admin.data.TambahBarangRequest
import id.koperasipk.app.feature.admin.data.TambahPengeluaranRequest
import id.koperasipk.app.feature.admin.data.TambahUserRequest
import id.koperasipk.app.feature.admin.data.TopupShuRequest
import id.koperasipk.app.testing.ApiTestFactory
import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertTrue
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test

class AdminApiDtoTest {

    private lateinit var server: MockWebServer
    private lateinit var api: AdminApi
    private lateinit var repository: NetworkAdminRepository

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        api = ApiTestFactory.createService(server)
        repository = NetworkAdminRepository(api, ApiTestFactory.json)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    // ─── Dashboard ──────────────────────────────────────────────────────────

    @Test
    fun `getDashboardStats parses success response`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"total_anggota":5,"stok_kritis_count":12,"total_shu_tersedia":5000000.50,"piutang_berjalan":250000}""",
            ),
        )
        val result = api.getDashboardStats()
        assertEquals(true, result.success)
        assertEquals(5, result.totalAnggota)
        assertEquals(12, result.stokKritisCount)
    }

    @Test
    fun `getDashboardStats handles flexible number types (double vs int)`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":1,"total_anggota":"3","total_shu_tersedia":"1234567.89","stok_kritis_count":0}""",
            ),
        )
        val result = api.getDashboardStats()
        assertTrue(result.success)
        assertEquals(3, result.totalAnggota)
    }

    // ─── Barang ──────────────────────────────────────────────────────────────

    @Test
    fun `getBarang parses list of barang with nullable fields`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"data":[{"barang_id":1,"nama_barang":"Mie Goreng","stok":50,"stok_toko":30,"stok_gudang":20,"harga_jual":3500.0,"harga_beli":2500.0}]}""",
            ),
        )
        val result = api.getBarang()
        assertEquals(1, result.data.size)
        assertEquals("Mie Goreng", result.data.first().namaBarang)
        assertEquals(50, result.data.first().stok)
    }

    @Test
    fun `tambahBarang sends correct request and parses message`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"message":"Barang berhasil ditambahkan"}""",
            ),
        )
        val request = TambahBarangRequest(
            namaBarang = "Roti Bakar",
            hargaModal = 5000.0,
            hargaJual = 7000.0,
        )
        val result = api.tambahBarang(request)
        assertEquals(true, result.success)
        val sent = server.takeRequest()
        assertTrue(sent.body.readUtf8().contains("nama_barang"))
    }

    @Test
    fun `restockBarang parses StokMutationResponse`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"message":"Restock berhasil","data":{"barang_id":1,"stok_toko":25,"stok_gudang":5,"total_stok":30}}""",
            ),
        )
        val result = api.restockBarang(
            RestockBarangRequest(
                barangId = 1,
                jumlahTambah = 15,
                hargaBeliSatuan = 2500.0,
                sumberDana = "CASH",
                alokasi = "toko",
            ),
        )
        assertTrue(result.success)
        assertEquals(30, result.data?.totalStok)
    }

    // ─── Opname ──────────────────────────────────────────────────────────────

    @Test
    fun `submitOpnameMassal sends lokasi and jumlah_fisik per item`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"message":"Opname massal sukses"}""",
            ),
        )
        val request = OpnameMassalRequest(
            adjustments = listOf(
                OpnameAdjustmentRequest(barangId = 1, stokAwal = 10, stokAkhir = 20, selisih = 10, lokasi = "toko"),
                OpnameAdjustmentRequest(barangId = 2, stokAwal = 10, stokAkhir = 5, selisih = -5, lokasi = "gudang"),
            ),
        )
        val result = api.submitOpnameMassal(request)
        assertTrue(result.success)
        val body = server.takeRequest().body.readUtf8()
        assertTrue(body.contains("stok_akhir"))
        assertTrue(body.contains("lokasi"))
    }

    // ─── Anggota / User ──────────────────────────────────────────────────────

    @Test
    fun `tambahUser sends username, nama_lengkap, role, password`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"message":"User dibuat"}""",
            ),
        )
        val request = TambahUserRequest(
            username = "newuser",
            namaLengkap = "New User",
            password = "secret123",
            role = "kasir",
        )
        val result = api.tambahUser(request)
        assertTrue(result.success)
        val body = server.takeRequest().body.readUtf8()
        assertTrue(body.contains("\"username\""))
        assertTrue(body.contains("\"nama_lengkap\""))
        assertTrue(body.contains("\"role\""))
    }

    // ─── SHU ─────────────────────────────────────────────────────────────────

    @Test
    fun `topupShu request sends nama_anggota field (which must be username)`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"message":"Top-up SHU berhasil"}""",
            ),
        )
        val request = TopupShuRequest(namaAnggota = "userAni", nominal = 100000.0)
        val result = api.topupShu(request)
        assertTrue(result.success)
        val body = server.takeRequest().body.readUtf8()
        // Field name in JSON must be "nama_anggota" with the USERNAME value (not full name)
        assertTrue(body.contains("\"nama_anggota\""))
        assertTrue(body.contains("userAni"))
    }

    @Test
    fun `prosesKonversiShu parses success response`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"message":"Konversi SHU selesai diproses"}""",
            ),
        )
        val result = api.prosesKonversiShu(
            ProsesKonversiShuRequest(mode = "massal", persentase = 60.0),
        )
        assertTrue(result.success)
    }

    // ─── Laporan Transaksi ────────────────────────────────────────────────────

    @Test
    fun `getLaporanTransaksi response parses details array (not items)`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "data": [
                    {
                      "transaksi_id": 101,
                      "nama_anggota": "Ani",
                      "kasir_id": 3,
                      "kasir_username": null,
                      "metode_pembayaran": "cash",
                      "total_harga": 15000,
                      "total_keuntungan": 3000,
                      "modal_hpp": 12000,
                      "items_count": 2,
                      "details": [
                        {"detail_id":1,"barang_id":10,"nama_barang":"Roti","jumlah":2,"harga_satuan":5000,"harga_beli_saat_ini":4000,"subtotal":10000,"keuntungan":2000},
                        {"detail_id":2,"barang_id":11,"nama_barang":"Susu","jumlah":1,"harga_satuan":5000,"harga_beli_saat_ini":4000,"subtotal":5000,"keuntungan":1000}
                      ]
                    }
                  ],
                  "pagination": {"current_page":1,"last_page":1,"total":1,"per_page":20}
                }
                """.trimIndent(),
            ),
        )
        val result = api.getLaporanTransaksi(LaporanTransaksiRequest())
        assertTrue(result.success)
        assertEquals(1, result.data.size)
        val trx = result.data.first()
        assertEquals(101, trx.transaksiId)
        assertEquals(2, trx.details.size)
        assertEquals("Roti", trx.details.first().namaBarang)
        // kasir_id should map, kasir_username null
        assertEquals(3, trx.kasirId)
        assertEquals(null, trx.kasirUsername)
    }

    @Test
    fun `getLaporanTransaksi request sends metode_pembayaran null for all`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"data":[]}""",
            ),
        )
        // metode_pembayaran null means "all"
        val request = LaporanTransaksiRequest(
            metodePembayaran = null,
            page = 1,
            perPage = 20,
        )
        api.getLaporanTransaksi(request)
        val body = server.takeRequest().body.readUtf8()
        // null should serialize as JSON null
        assertTrue(body.contains("\"metode_pembayaran\":null") || !body.contains("metode_pembayaran"))
    }

    // ─── Pengeluaran ─────────────────────────────────────────────────────────

    @Test
    fun `tambahPengeluaran sends nama_pengeluaran and nominal`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"message":"Pengeluaran dicatat","data":{"pengeluaran_id":1,"nama_pengeluaran":"Listrik","nominal":200000,"tanggal":"2026-11-01"}}""",
            ),
        )
        val result = api.tambahPengeluaran(
            TambahPengeluaranRequest(namaPengeluaran = "Listrik", nominal = 200000.0, tanggal = "2026-11-01"),
        )
        assertTrue(result.success)
        assertEquals("Listrik", result.data?.namaPengeluaran)
        val body = server.takeRequest().body.readUtf8()
        assertTrue(body.contains("\"nama_pengeluaran\""))
        assertTrue(body.contains("\"nominal\""))
    }

    // ─── Cash Adjustments ────────────────────────────────────────────────────

    @Test
    fun `storeCashAdjustment parses amount as double decimal_2 column`() = runBlocking {
        // amount comes back as a string "12345.67" from the SQLite decimal:2 cast
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """
                {
                  "success": true,
                  "message": "Penyesuaian disimpan",
                  "data": {
                    "adjustment_id": 7,
                    "adjustment_date": "2026-11-01",
                    "type": "CASH_RECONCILIATION",
                    "amount": "12345.67",
                    "direction": "OUT",
                    "source": "CASH",
                    "reason": "Selisih kas fisik",
                    "status": "APPROVED"
                  }
                }
                """.trimIndent(),
            ),
        )
        val result = api.storeCashAdjustment(
            CashAdjustmentRequest(
                adjustmentDate = "2026-11-01",
                type = "CASH_RECONCILIATION",
                amount = 12345.67,
                direction = "OUT",
                source = "CASH",
                reason = "Selisih kas fisik",
            ),
        )
        assertTrue(result.success)
        // amount "12345.67" (string) must deserialize to Double via FlexibleDoubleSerializer
        assertEquals(12345.67, result.data?.amount ?: 0.0, 0.01)
    }

    // ─── Bulk Restock ────────────────────────────────────────────────────────

    @Test
    fun `bulkRestock sends items array with barang_id and jumlah`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":true,"message":"Bulk restock selesai","data":{"total_items_restocked":3,"total_units_added":60,"details":[]}}""",
            ),
        )
        val result = api.bulkRestock(
            BulkRestockRequest(
                items = listOf(
                    BulkRestockItemRequest(barangId = 1, jumlahTambah = 20, hargaBeliSatuan = 2500.0),
                    BulkRestockItemRequest(barangId = 2, jumlahTambah = 40, hargaBeliSatuan = 3000.0),
                ),
                sumberDana = "CASH",
            ),
        )
        assertTrue(result.success)
        val body = server.takeRequest().body.readUtf8()
        assertTrue(body.contains("\"barang_id\""))
        assertTrue(body.contains("\"jumlah_tambah\""))
    }

    // ─── Error paths ─────────────────────────────────────────────────────────

    @Test
    fun `401 response triggers ApiResult Error with parsed message`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"message":"Unauthenticated."}""",
                code = 401,
            ),
        )
        val result = repository.getDashboardStats()
        assertTrue(result is id.koperasipk.app.core.common.ApiResult.Error)
        val error = result as id.koperasipk.app.core.common.ApiResult.Error
        assertEquals(401, error.code)
    }

    @Test
    fun `422 response provides validation error message`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"message":"The given data was invalid.","errors":{"nominal":["The nominal field is required."]}}""",
                code = 422,
            ),
        )
        val result = repository.tambahPengeluaran(
            TambahPengeluaranRequest(namaPengeluaran = "X", nominal = 0.0),
        )
        assertTrue(result is id.koperasipk.app.core.common.ApiResult.Error)
    }

    @Test
    fun `server success false returns ApiResult Error via safeCheckedMessage`() = runBlocking {
        server.enqueue(
            ApiTestFactory.jsonResponse(
                """{"success":false,"message":"Barang tidak ditemukan","error":null}""",
            ),
        )
        val result = repository.hapusBarang(999)
        assertTrue(result is id.koperasipk.app.core.common.ApiResult.Error)
        val err = result as id.koperasipk.app.core.common.ApiResult.Error
        assertEquals("Barang tidak ditemukan", err.message)
    }
}
