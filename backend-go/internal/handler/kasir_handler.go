package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/koperasipk/backend-go/internal/model"
	"github.com/koperasipk/backend-go/internal/service"
)

type KasirHandler struct {
	kasirSvc *service.KasirService
}

func NewKasirHandler(kasirSvc *service.KasirService) *KasirHandler {
	return &KasirHandler{kasirSvc: kasirSvc}
}

// GET /kasir/dashboard
func (h *KasirHandler) GetDashboard(c *gin.Context) {
	kasirID := c.GetInt("user_id")
	data, err := h.kasirSvc.GetDashboard(kasirID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.KasirDataResponse[*model.DashboardKasirDTO]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[*model.DashboardKasirDTO]{
		Success: true,
		Message: "Dashboard kasir berhasil dimuat",
		Data:    data,
	})
}

// GET /kasir/transaksi-terbaru
func (h *KasirHandler) GetTransaksiTerbaru(c *gin.Context) {
	kasirID := c.GetInt("user_id")
	data, err := h.kasirSvc.GetTransaksiTerbaru(kasirID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.KasirDataResponse[[]model.TransaksiTerbaruDTO]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[[]model.TransaksiTerbaruDTO]{
		Success: true,
		Message: "Transaksi terbaru berhasil dimuat",
		Data:    data,
	})
}

// GET /kasir/barang-belanja
func (h *KasirHandler) GetDataBarang(c *gin.Context) {
	data, err := h.kasirSvc.GetDataBarang()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.KasirDataResponse[[]model.BarangKasirDTO]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[[]model.BarangKasirDTO]{
		Success: true,
		Message: "Katalog barang kasir berhasil dimuat",
		Data:    data,
	})
}

// GET /kasir/all-anggota
func (h *KasirHandler) GetAllAnggota(c *gin.Context) {
	data, err := h.kasirSvc.GetAllAnggota()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.KasirDataResponse[[]model.AnggotaKasirDTO]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[[]model.AnggotaKasirDTO]{
		Success: true,
		Message: "Daftar anggota berhasil dimuat",
		Data:    data,
	})
}

// GET /kasir/cari-profil-anggota
func (h *KasirHandler) CariProfilAnggota(c *gin.Context) {
	search := c.Query("search")
	var pAnggotaID *int
	if idStr := c.Query("anggota_id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
			pAnggotaID = &id
		}
	}

	data, err := h.kasirSvc.CariProfilAnggota(search, pAnggotaID)
	if err != nil {
		c.JSON(http.StatusNotFound, model.CariProfilAnggotaResponse{
			Success: false,
			Message: "Data anggota tidak ditemukan",
		})
		return
	}

	c.JSON(http.StatusOK, model.CariProfilAnggotaResponse{
		Success: true,
		Message: "Profil anggota ditemukan",
		Profil:  data,
	})
}

// POST /kasir/buat-transaksi
func (h *KasirHandler) BuatTransaksi(c *gin.Context) {
	var req model.BuatTransaksiRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BuatTransaksiResponse{
			Success: false,
			Message: "Format data transaksi tidak valid: " + err.Error(),
		})
		return
	}

	kasirID := c.GetInt("user_id")
	res, err := h.kasirSvc.BuatTransaksi(kasirID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.BuatTransaksiResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, res)
}

// POST /kasir/history-transaksi
func (h *KasirHandler) GetHistoryTransaksi(c *gin.Context) {
	var req model.HistoryTransaksiRequest
	_ = c.ShouldBindJSON(&req)

	kasirID := c.GetInt("user_id")
	paginator, err := h.kasirSvc.GetHistoryTransaksi(kasirID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.KasirDataResponse[*model.LaravelPaginatorDTO[model.RiwayatTransaksiDTO]]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[*model.LaravelPaginatorDTO[model.RiwayatTransaksiDTO]]{
		Success: true,
		Message: "Histori transaksi kasir berhasil dimuat",
		Data:    paginator,
	})
}

// POST /kasir/setor-admin
func (h *KasirHandler) SetorAdmin(c *gin.Context) {
	var req model.SetorAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{
			Success: false,
			Message: "Nominal setoran tidak valid: " + err.Error(),
		})
		return
	}

	kasirID := c.GetInt("user_id")
	if err := h.kasirSvc.SetorAdmin(kasirID, req.Nominal); err != nil {
		c.JSON(http.StatusInternalServerError, model.BasicResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.BasicResponse{
		Success: true,
		Message: "Permintaan setoran kasir berhasil dikirim ke Admin",
	})
}

// GET /kasir/setoran-history
func (h *KasirHandler) GetRiwayatSetoran(c *gin.Context) {
	kasirID := c.GetInt("user_id")
	data, err := h.kasirSvc.GetRiwayatSetoran(kasirID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.KasirDataResponse[[]model.SetoranKasirDTO]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[[]model.SetoranKasirDTO]{
		Success: true,
		Message: "Histori setoran berhasil dimuat",
		Data:    data,
	})
}

// GET /kasir/daftar-kasir
func (h *KasirHandler) GetDaftarKasir(c *gin.Context) {
	data, err := h.kasirSvc.GetDaftarKasir()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.KasirDataResponse[[]model.DaftarKasirDTO]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[[]model.DaftarKasirDTO]{
		Success: true,
		Message: "Daftar kasir berhasil dimuat",
		Data:    data,
	})
}

// GET /kasir/serah-terima-for-me
func (h *KasirHandler) GetSerahTerimaForMe(c *gin.Context) {
	kasirID := c.GetInt("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))

	data, err := h.kasirSvc.GetSerahTerimaForMe(kasirID, page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.KasirDataResponse[*model.LaravelPaginatorDTO[model.SerahTerimaDTO]]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[*model.LaravelPaginatorDTO[model.SerahTerimaDTO]]{
		Success: true,
		Message: "Daftar serah terima berhasil dimuat",
		Data:    data,
	})
}

// POST /kasir/create-serah-terima
func (h *KasirHandler) CreateSerahTerima(c *gin.Context) {
	var req model.CreateSerahTerimaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.KasirDataResponse[*model.CreateSerahTerimaDataDTO]{
			Success: false,
			Message: "Data serah terima tidak valid: " + err.Error(),
		})
		return
	}

	kasirFrom := c.GetInt("user_id")
	data, err := h.kasirSvc.CreateSerahTerima(kasirFrom, req.KasirTo, req.UangFisik, req.Catatan)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.KasirDataResponse[*model.CreateSerahTerimaDataDTO]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[*model.CreateSerahTerimaDataDTO]{
		Success: true,
		Message: "Draft serah terima kasir berhasil dibuat",
		Data:    data,
	})
}

// POST /kasir/approve-serah-terima
func (h *KasirHandler) ApproveSerahTerima(c *gin.Context) {
	var req model.ApproveSerahTerimaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{
			Success: false,
			Message: "ID serah terima tidak valid",
		})
		return
	}

	kasirTo := c.GetInt("user_id")
	if err := h.kasirSvc.ApproveSerahTerima(req.SerahID, kasirTo); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.BasicResponse{
		Success: true,
		Message: "Serah terima kasir berhasil disetujui",
	})
}

// POST /kasir/reject-serah-terima
func (h *KasirHandler) RejectSerahTerima(c *gin.Context) {
	var req model.RejectSerahTerimaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{
			Success: false,
			Message: "Data penolakan tidak valid: " + err.Error(),
		})
		return
	}

	kasirTo := c.GetInt("user_id")
	if err := h.kasirSvc.RejectSerahTerima(req.SerahID, kasirTo, req.Alasan); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.BasicResponse{
		Success: true,
		Message: "Serah terima kasir telah ditolak",
	})
}

// GET /kasir/antrean-tarik-tunai
func (h *KasirHandler) GetAntreanTarikTunai(c *gin.Context) {
	data, err := h.kasirSvc.GetAntreanTarikTunai()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.KasirDataResponse[[]model.AntreanTarikTunaiDTO]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[[]model.AntreanTarikTunaiDTO]{
		Success: true,
		Message: "Antrean penarikan tunai berhasil dimuat",
		Data:    data,
	})
}

// POST /kasir/proses-tarik-tunai
func (h *KasirHandler) ProsesTarikTunai(c *gin.Context) {
	var req model.ProsesTarikTunaiRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.KasirDataResponse[*model.TarikTunaiReceiptDTO]{
			Success: false,
			Message: "ID penarikan tidak valid",
		})
		return
	}

	kasirID := c.GetInt("user_id")
	receipt, err := h.kasirSvc.ProsesTarikTunai(kasirID, req.TarikID)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.KasirDataResponse[*model.TarikTunaiReceiptDTO]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[*model.TarikTunaiReceiptDTO]{
		Success: true,
		Message: "Penarikan tunai berhasil disetujui & diserahkan",
		Data:    receipt,
	})
}

// GET /kasir/latest-pending-orders
func (h *KasirHandler) GetLatestPendingOrders(c *gin.Context) {
	kasirID := c.GetInt("user_id")
	res, err := h.kasirSvc.GetLatestPendingOrders(kasirID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.LatestPendingOrdersResponse{
			Success: false,
		})
		return
	}
	c.JSON(http.StatusOK, res)
}

// POST /kasir/test-order-notification
func (h *KasirHandler) TestOrderNotification(c *gin.Context) {
	order, err := h.kasirSvc.TestOrderNotification()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.TestOrderNotificationResponse{
			Success: false,
			Message: "Gagal membuat simulasi notifikasi: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.TestOrderNotificationResponse{
		Success: true,
		Message: "Simulasi notifikasi pesanan berhasil dikirim",
		Data:    order,
	})
}

// GET /kasir/pesanan-anggota
func (h *KasirHandler) GetPesananAnggota(c *gin.Context) {
	pesanan, err := h.kasirSvc.GetPesananAnggota()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.KasirDataResponse[[]model.PesananAnggotaDTO]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[[]model.PesananAnggotaDTO]{
		Success: true,
		Message: "Daftar pesanan anggota berhasil dimuat",
		Data:    pesanan,
	})
}

// POST /kasir/simpan-transaksi-kasir
func (h *KasirHandler) SimpanTransaksiKasir(c *gin.Context) {
	var req model.SimpanTransaksiKasirRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{
			Success: false,
			Message: "Format data transaksi tidak valid: " + err.Error(),
		})
		return
	}

	kasirID := c.GetInt("user_id")
	if err := h.kasirSvc.SimpanTransaksiKasir(kasirID, &req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.BasicResponse{
		Success: true,
		Message: "Pesanan berhasil dikonfirmasi dan diselesaikan",
	})
}

// POST /kasir/tolak-pesanan-anggota
func (h *KasirHandler) TolakPesananAnggota(c *gin.Context) {
	var req model.TolakPesananRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{
			Success: false,
			Message: "Format data tolak pesanan tidak valid: " + err.Error(),
		})
		return
	}

	kasirID := c.GetInt("user_id")
	if err := h.kasirSvc.TolakPesananAnggota(kasirID, &req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.BasicResponse{
		Success: true,
		Message: "Pesanan anggota berhasil ditolak & stok/saldo telah dikembalikan",
	})
}

// GET /kasir/all-pembayaran-hutang
func (h *KasirHandler) GetAllPembayaranHutang(c *gin.Context) {
	list, err := h.kasirSvc.GetAllPembayaranHutang()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.KasirDataResponse[[]model.PembayaranHutangDTO]{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KasirDataResponse[[]model.PembayaranHutangDTO]{
		Success: true,
		Message: "Daftar pembayaran hutang berhasil dimuat",
		Data:    list,
	})
}

// POST /kasir/approve-pembayaran-hutang
func (h *KasirHandler) ApprovePembayaranHutang(c *gin.Context) {
	var req model.ApprovePembayaranHutangRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{
			Success: false,
			Message: "Format persetujuan pembayaran hutang tidak valid: " + err.Error(),
		})
		return
	}

	kasirID := c.GetInt("user_id")
	if err := h.kasirSvc.ApprovePembayaranHutang(kasirID, &req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	msg := "Pembayaran hutang anggota berhasil disetujui"
	if req.Action == "reject" {
		msg = "Pengajuan pembayaran hutang anggota telah ditolak"
	}

	c.JSON(http.StatusOK, model.BasicResponse{
		Success: true,
		Message: msg,
	})
}
