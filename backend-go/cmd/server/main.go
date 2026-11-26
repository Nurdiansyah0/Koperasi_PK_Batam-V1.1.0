package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/koperasipk/backend-go/internal/config"
	"github.com/koperasipk/backend-go/internal/database"
	"github.com/koperasipk/backend-go/internal/handler"
	"github.com/koperasipk/backend-go/internal/middleware"
	"github.com/koperasipk/backend-go/internal/repository"
	"github.com/koperasipk/backend-go/internal/service"
)

func main() {
	// Load config
	cfg := config.Load()

	// Connect DB
	db := database.Connect(cfg)
	defer db.Close()

	// Wire dependencies
	userRepo := repository.NewUserRepo(db)
	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTExpiryHours)
	authHandler := handler.NewAuthHandler(authSvc)

	anggotaRepo := repository.NewAnggotaRepo(db)
	anggotaSvc := service.NewAnggotaService(anggotaRepo)
	anggotaHandler := handler.NewAnggotaHandler(anggotaSvc)

	kasirRepo := repository.NewKasirRepo(db)
	kasirSvc := service.NewKasirService(kasirRepo)
	kasirHandler := handler.NewKasirHandler(kasirSvc)

	adminRepo := repository.NewAdminRepo(db)
	adminSvc := service.NewAdminService(adminRepo)
	adminHandler := handler.NewAdminHandler(adminSvc)

	// Setup router
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Use(middleware.CORS())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "koperasi-go-backend"})
	})

	// Public routes (tanpa auth)
	r.POST("/login", authHandler.Login)
	r.POST("/reset-password", authHandler.ResetPassword)

	// Protected routes (butuh Bearer token)
	protected := r.Group("/")
	protected.Use(middleware.AuthRequired(cfg.JWTSecret))
	{
		// 1. Auth & User Profile
		protected.GET("/me", authHandler.Me)
		protected.POST("/logout", authHandler.Logout)
		protected.POST("/change-password", authHandler.ChangePassword)

		// 2. Anggota Features
		protected.GET("/anggota/profil", anggotaHandler.GetProfil)
		protected.POST("/anggota/transaksi", anggotaHandler.SimpanTransaksi)
		protected.GET("/anggota/transaksi", anggotaHandler.GetHistoriTransaksi)
		protected.POST("/anggota/bayar-hutang", anggotaHandler.BayarHutang)
		protected.GET("/anggota/bayar-hutang", anggotaHandler.GetHistoriBayarHutang)
		protected.GET("/anggota/barang", anggotaHandler.GetBarang)
		protected.GET("/barang", anggotaHandler.GetBarang)
		protected.GET("/anggota/paket-belanja", anggotaHandler.GetPaketBelanja)
		protected.GET("/anggota/cek-kelayakan-tarik-tunai", anggotaHandler.CekKelayakanTarikTunai)
		protected.POST("/anggota/setujui-master-consent-shu", anggotaHandler.SetujuiMasterConsentShu)
		protected.POST("/anggota/ajukan-tarik-tunai", anggotaHandler.AjukanTarikTunai)
		protected.GET("/anggota/riwayat-tarik-tunai", anggotaHandler.GetRiwayatTarikTunai)

		// 3. Kasir (POS) Features
		protected.GET("/kasir/dashboard", kasirHandler.GetDashboard)
		protected.GET("/kasir/transaksi-terbaru", kasirHandler.GetTransaksiTerbaru)
		protected.GET("/kasir/barang-belanja", kasirHandler.GetDataBarang)
		protected.GET("/kasir/paket-belanja", anggotaHandler.GetPaketBelanja)
		protected.GET("/kasir/all-anggota", kasirHandler.GetAllAnggota)
		protected.GET("/kasir/cari-profil-anggota", kasirHandler.CariProfilAnggota)
		protected.POST("/kasir/buat-transaksi", kasirHandler.BuatTransaksi)
		protected.POST("/kasir/history-transaksi", kasirHandler.GetHistoryTransaksi)
		protected.POST("/kasir/setor-admin", kasirHandler.SetorAdmin)
		protected.GET("/kasir/setoran-history", kasirHandler.GetRiwayatSetoran)
		protected.GET("/kasir/daftar-kasir", kasirHandler.GetDaftarKasir)
		protected.GET("/kasir/serah-terima-for-me", kasirHandler.GetSerahTerimaForMe)
		protected.POST("/kasir/create-serah-terima", kasirHandler.CreateSerahTerima)
		protected.POST("/kasir/approve-serah-terima", kasirHandler.ApproveSerahTerima)
		protected.POST("/kasir/reject-serah-terima", kasirHandler.RejectSerahTerima)
		protected.GET("/kasir/antrean-tarik-tunai", kasirHandler.GetAntreanTarikTunai)
		protected.POST("/kasir/proses-tarik-tunai", kasirHandler.ProsesTarikTunai)
		protected.GET("/kasir/latest-pending-orders", kasirHandler.GetLatestPendingOrders)
		protected.POST("/kasir/test-order-notification", kasirHandler.TestOrderNotification)
		protected.GET("/kasir/pesanan-anggota", kasirHandler.GetPesananAnggota)
		protected.POST("/kasir/simpan-transaksi-kasir", kasirHandler.SimpanTransaksiKasir)
		protected.POST("/kasir/tolak-pesanan-anggota", kasirHandler.TolakPesananAnggota)
		protected.GET("/kasir/all-pembayaran-hutang", kasirHandler.GetAllPembayaranHutang)
		protected.POST("/kasir/approve-pembayaran-hutang", kasirHandler.ApprovePembayaranHutang)

		// 4. Admin Features
		protected.GET("/admin/dashboard-stats", adminHandler.GetDashboardStats)
		protected.GET("/admin/barang", adminHandler.GetBarang)
		protected.POST("/admin/tambah-barang", adminHandler.TambahBarang)
		protected.POST("/admin/update-barang", adminHandler.UpdateBarang)
		protected.POST("/admin/hapus-barang", adminHandler.HapusBarang)
		protected.POST("/admin/restock-barang", adminHandler.RestockBarang)
		protected.POST("/admin/mutasi-stok", adminHandler.MutasiStok)
		protected.GET("/admin/anggota", adminHandler.GetAnggota)
		protected.POST("/admin/tambah-user", adminHandler.TambahUser)
		protected.POST("/admin/reset-password-user", adminHandler.ResetPasswordUser)
		protected.GET("/admin/setoran-kasir", adminHandler.GetSetoranKasir)
		protected.POST("/admin/approve-setoran-kasir", adminHandler.ApproveSetoranKasir)
		protected.GET("/admin/shu-management", adminHandler.GetShuManagement)
		protected.POST("/admin/laporan-transaksi", adminHandler.GetLaporanTransaksi)
		protected.GET("/admin/jabatan", adminHandler.GetDaftarJabatan)
		protected.GET("/admin/laporan-tarik-tunai", adminHandler.GetLaporanTarikTunai)
	}

	addr := ":" + cfg.AppPort
	log.Printf("🚀 Koperasi Go Backend berjalan di http://localhost%s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("❌ Gagal menjalankan server: %v", err)
	}
}
