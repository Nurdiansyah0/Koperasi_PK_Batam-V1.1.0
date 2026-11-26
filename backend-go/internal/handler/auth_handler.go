package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/koperasipk/backend-go/internal/model"
	"github.com/koperasipk/backend-go/internal/service"
)

type AuthHandler struct {
	authSvc *service.AuthService
}

func NewAuthHandler(authSvc *service.AuthService) *AuthHandler {
	return &AuthHandler{authSvc: authSvc}
}

// POST /login
func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		errMsg := "Username dan password wajib diisi"
		c.JSON(http.StatusBadRequest, model.LoginResponse{
			Success: false,
			Message: errMsg,
			Error:   &errMsg,
		})
		return
	}

	token, user, err := h.authSvc.Login(req.Username, req.Password)
	if err != nil {
		errMsg := err.Error()
		c.JSON(http.StatusUnauthorized, model.LoginResponse{
			Success: false,
			Message: errMsg,
			Error:   &errMsg,
		})
		return
	}

	c.JSON(http.StatusOK, model.LoginResponse{
		Success: true,
		Message: "Login berhasil",
		Token:   token,
		User:    user,
	})
}

// GET /me
func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetInt("user_id")
	user, err := h.authSvc.Me(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.MeResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, model.MeResponse{
		Success: true,
		Message: "OK",
		User:    user,
	})
}

// POST /logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// JWT stateless — client side drop token
	c.JSON(http.StatusOK, model.OkResponse("Logged out successfully"))
}

// POST /change-password
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrResponse("Data tidak valid: "+err.Error()))
		return
	}

	userID := c.GetInt("user_id")
	if err := h.authSvc.ChangePassword(userID, req.CurrentPassword, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, model.OkResponse("Password berhasil diubah"))
}

// POST /reset-password
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req struct {
		Username     string `json:"username" binding:"required"`
		DigitHutang  string `json:"digit_hutang" binding:"required"`
		DigitShu     string `json:"digit_shu" binding:"required"`
		PasswordBaru string `json:"password_baru" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrResponse("Data tidak valid: "+err.Error()))
		return
	}

	if err := h.authSvc.ResetPassword(req.Username, req.DigitHutang, req.DigitShu, req.PasswordBaru); err != nil {
		status := http.StatusUnprocessableEntity
		if err.Error() == "Username anggota tidak ditemukan" {
			status = http.StatusNotFound
		} else if err.Error() == "Akun ini bukan akun anggota atau data buku anggota tidak terdaftar" {
			status = http.StatusBadRequest
		}
		c.JSON(status, model.ErrResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, model.OkResponse("Password berhasil diperbarui! Silakan masuk menggunakan password baru Anda."))
}
