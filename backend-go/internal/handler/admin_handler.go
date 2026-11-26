package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/koperasipk/backend-go/internal/model"
	"github.com/koperasipk/backend-go/internal/service"
)

type AdminHandler struct {
	adminSvc *service.AdminService
}

func NewAdminHandler(adminSvc *service.AdminService) *AdminHandler {
	return &AdminHandler{adminSvc: adminSvc}
}

// GET /admin/dashboard-stats
func (h *AdminHandler) GetDashboardStats(c *gin.Context) {
	stats, err := h.adminSvc.GetDashboardStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

// GET /admin/barang
func (h *AdminHandler) GetBarang(c *gin.Context) {
	data, err := h.adminSvc.GetBarang()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.AdminBarangListResponse{Success: false})
		return
	}
	c.JSON(http.StatusOK, model.AdminBarangListResponse{Success: true, Data: data})
}

// POST /admin/tambah-barang
func (h *AdminHandler) TambahBarang(c *gin.Context) {
	var req model.TambahBarangRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{Success: false, Message: "Data barang tidak valid: " + err.Error()})
		return
	}

	if err := h.adminSvc.TambahBarang(&req); err != nil {
		c.JSON(http.StatusInternalServerError, model.BasicResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, model.BasicResponse{Success: true, Message: "Barang berhasil ditambahkan!"})
}

// POST /admin/update-barang
func (h *AdminHandler) UpdateBarang(c *gin.Context) {
	var req model.UpdateBarangRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{Success: false, Message: "Data barang tidak valid"})
		return
	}

	if err := h.adminSvc.UpdateBarang(&req); err != nil {
		c.JSON(http.StatusInternalServerError, model.BasicResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, model.BasicResponse{Success: true, Message: "Barang berhasil diperbarui!"})
}

// POST /admin/hapus-barang
func (h *AdminHandler) HapusBarang(c *gin.Context) {
	var req model.HapusBarangRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{Success: false, Message: "ID barang tidak valid"})
		return
	}

	if err := h.adminSvc.HapusBarang(req.BarangID); err != nil {
		c.JSON(http.StatusInternalServerError, model.BasicResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, model.BasicResponse{Success: true, Message: "Barang berhasil dihapus!"})
}

// POST /admin/restock-barang
func (h *AdminHandler) RestockBarang(c *gin.Context) {
	var req model.RestockBarangRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.StokMutationResponse{Success: false, Message: "Data restock tidak valid"})
		return
	}

	adminID := c.GetInt("user_id")
	res, err := h.adminSvc.RestockBarang(adminID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.StokMutationResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

// POST /admin/mutasi-stok
func (h *AdminHandler) MutasiStok(c *gin.Context) {
	var req model.MutasiStokRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.StokMutationResponse{Success: false, Message: "Data mutasi tidak valid"})
		return
	}

	res, err := h.adminSvc.MutasiStok(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.StokMutationResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GET /admin/anggota
func (h *AdminHandler) GetAnggota(c *gin.Context) {
	data, err := h.adminSvc.GetAnggota()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.AdminAnggotaListResponse{Success: false})
		return
	}
	c.JSON(http.StatusOK, model.AdminAnggotaListResponse{Success: true, Data: data})
}

// POST /admin/tambah-user
func (h *AdminHandler) TambahUser(c *gin.Context) {
	var req model.TambahUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{Success: false, Message: "Data user tidak valid: " + err.Error()})
		return
	}

	adminID := c.GetInt("user_id")
	if err := h.adminSvc.TambahUser(adminID, &req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, model.BasicResponse{Success: true, Message: "User dan akun anggota berhasil dibuat!"})
}

// POST /admin/reset-password-user
func (h *AdminHandler) ResetPasswordUser(c *gin.Context) {
	var req model.ResetPasswordUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{Success: false, Message: "Format data tidak valid"})
		return
	}

	if err := h.adminSvc.ResetPasswordUser(req.UserID, req.PasswordBaru); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, model.BasicResponse{Success: true, Message: "Password user berhasil direset!"})
}

// GET /admin/setoran-kasir
func (h *AdminHandler) GetSetoranKasir(c *gin.Context) {
	data, err := h.adminSvc.GetSetoranKasir()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.SetoranKasirListResponse{Success: false})
		return
	}
	c.JSON(http.StatusOK, model.SetoranKasirListResponse{Success: true, Data: data})
}

// POST /admin/approve-setoran-kasir
func (h *AdminHandler) ApproveSetoranKasir(c *gin.Context) {
	var req model.ApproveSetoranRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{Success: false, Message: "ID setoran tidak valid"})
		return
	}

	adminID := c.GetInt("user_id")
	if err := h.adminSvc.ApproveSetoranKasir(req.SetoranID, adminID); err != nil {
		c.JSON(http.StatusBadRequest, model.BasicResponse{Success: false, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, model.BasicResponse{Success: true, Message: "Setoran kasir berhasil disetujui!"})
}

// GET /admin/shu-management
func (h *AdminHandler) GetShuManagement(c *gin.Context) {
	data, err := h.adminSvc.GetShuManagement()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ShuManagementResponse{Success: false})
		return
	}
	c.JSON(http.StatusOK, model.ShuManagementResponse{Success: true, Data: data})
}

// POST /admin/laporan-transaksi
func (h *AdminHandler) GetLaporanTransaksi(c *gin.Context) {
	var req model.LaporanTransaksiRequest
	_ = c.ShouldBindJSON(&req)

	res, err := h.adminSvc.GetLaporanTransaksi(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.LaporanTransaksiResponse{Success: false})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GET /admin/jabatan
func (h *AdminHandler) GetDaftarJabatan(c *gin.Context) {
	data, err := h.adminSvc.GetDaftarJabatan()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.JabatanListResponse{Success: false})
		return
	}
	c.JSON(http.StatusOK, model.JabatanListResponse{Success: true, Data: data})
}

// GET /admin/laporan-tarik-tunai
func (h *AdminHandler) GetLaporanTarikTunai(c *gin.Context) {
	data, err := h.adminSvc.GetLaporanTarikTunai()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.LaporanTarikTunaiResponse{Success: false})
		return
	}
	c.JSON(http.StatusOK, model.LaporanTarikTunaiResponse{Success: true, Data: data})
}
