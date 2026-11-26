package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/koperasipk/backend-go/internal/model"
	"github.com/koperasipk/backend-go/internal/service"
)

type AnggotaHandler struct {
	anggotaSvc *service.AnggotaService
}

func NewAnggotaHandler(anggotaSvc *service.AnggotaService) *AnggotaHandler {
	return &AnggotaHandler{anggotaSvc: anggotaSvc}
}

// GET /anggota/profil
func (h *AnggotaHandler) GetProfil(c *gin.Context) {
	userID := c.GetInt("user_id")
	profil, err := h.anggotaSvc.GetProfil(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.AnggotaProfilResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.AnggotaProfilResponse{
		Success: true,
		Message: "Profil anggota berhasil dimuat",
		User:    profil,
	})
}

// GET /anggota/transaksi
func (h *AnggotaHandler) GetHistoriTransaksi(c *gin.Context) {
	userID := c.GetInt("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	paginator, err := h.anggotaSvc.GetHistoriTransaksi(userID, page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.HistoriTransaksiResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.HistoriTransaksiResponse{
		Success: true,
		Message: "Histori transaksi berhasil dimuat",
		Data:    paginator,
	})
}

// GET /anggota/barang & GET /barang
func (h *AnggotaHandler) GetBarang(c *gin.Context) {
	barang, err := h.anggotaSvc.GetBarang()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.AnggotaBarangResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.AnggotaBarangResponse{
		Success: true,
		Message: "Katalog barang berhasil dimuat",
		Data:    barang,
	})
}

// GET /anggota/paket-belanja
func (h *AnggotaHandler) GetPaketBelanja(c *gin.Context) {
	pakets, err := h.anggotaSvc.GetPaketBelanja()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.PaketBelanjaResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.PaketBelanjaResponse{
		Success: true,
		Message: "Paket belanja berhasil dimuat",
		Data:    pakets,
	})
}

// GET /anggota/cek-kelayakan-tarik-tunai
func (h *AnggotaHandler) CekKelayakanTarikTunai(c *gin.Context) {
	userID := c.GetInt("user_id")
	kelayakan, err := h.anggotaSvc.CekKelayakanTarikTunai(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.KelayakanTarikTunaiResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.KelayakanTarikTunaiResponse{
		Success: true,
		Message: "Pengecekan kelayakan penarikan berhasil",
		Data:    kelayakan,
	})
}

// POST /anggota/setujui-master-consent-shu
func (h *AnggotaHandler) SetujuiMasterConsentShu(c *gin.Context) {
	userID := c.GetInt("user_id")
	data, err := h.anggotaSvc.SetujuiMasterConsent(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.MasterConsentResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.MasterConsentResponse{
		Success: true,
		Message: "Persetujuan Master Consent SHU berhasil disimpan",
		Data:    data,
	})
}

// POST /anggota/ajukan-tarik-tunai
func (h *AnggotaHandler) AjukanTarikTunai(c *gin.Context) {
	var req model.AjukanTarikTunaiRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.AjukanTarikTunaiResponse{
			Success: false,
			Message: "Data pengajuan tidak valid: " + err.Error(),
		})
		return
	}

	userID := c.GetInt("user_id")
	data, err := h.anggotaSvc.AjukanTarikTunai(userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.AjukanTarikTunaiResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.AjukanTarikTunaiResponse{
		Success: true,
		Message: "Tiket penarikan tunai berhasil dibuat! Silakan tunjukkan kode tiket ini ke kasir toko.",
		Data:    data,
	})
}

// GET /anggota/riwayat-tarik-tunai
func (h *AnggotaHandler) GetRiwayatTarikTunai(c *gin.Context) {
	userID := c.GetInt("user_id")
	data, err := h.anggotaSvc.GetRiwayatTarikTunai(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.RiwayatTarikTunaiResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.RiwayatTarikTunaiResponse{
		Success: true,
		Message: "Riwayat penarikan berhasil dimuat",
		Data:    data,
	})
}

// POST /anggota/transaksi
func (h *AnggotaHandler) SimpanTransaksi(c *gin.Context) {
	var req model.SimpanTransaksiRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.SimpanTransaksiResponse{
			Success: false,
			Message: "Format data pemesanan tidak valid: " + err.Error(),
		})
		return
	}

	userID := c.GetInt("user_id")
	res, err := h.anggotaSvc.SimpanTransaksi(userID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.SimpanTransaksiResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, res)
}

// POST /anggota/bayar-hutang
func (h *AnggotaHandler) BayarHutang(c *gin.Context) {
	var req model.BayarHutangRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BayarHutangResponse{
			Success: false,
			Message: "Nominal pembayaran tidak valid: " + err.Error(),
		})
		return
	}

	userID := c.GetInt("user_id")
	pembayaranID, err := h.anggotaSvc.BayarHutang(userID, req.Jumlah)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.BayarHutangResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.BayarHutangResponse{
		Success:      true,
		Message:      "Pengajuan pembayaran hutang berhasil dibuat, silakan serahkan uang ke kasir.",
		PembayaranID: &pembayaranID,
	})
}

// GET /anggota/bayar-hutang
func (h *AnggotaHandler) GetHistoriBayarHutang(c *gin.Context) {
	userID := c.GetInt("user_id")
	data, err := h.anggotaSvc.GetHistoriBayarHutang(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.HistoriBayarHutangResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.HistoriBayarHutangResponse{
		Success: true,
		Message: "Riwayat pembayaran hutang berhasil dimuat",
		Data:    data,
	})
}
