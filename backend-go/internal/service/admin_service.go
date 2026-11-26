package service

import (
	"errors"

	"github.com/koperasipk/backend-go/internal/model"
	"github.com/koperasipk/backend-go/internal/repository"
)

type AdminService struct {
	adminRepo *repository.AdminRepo
}

func NewAdminService(adminRepo *repository.AdminRepo) *AdminService {
	return &AdminService{adminRepo: adminRepo}
}

func (s *AdminService) GetDashboardStats() (*model.AdminDashboardResponse, error) {
	return s.adminRepo.GetDashboardStats()
}

func (s *AdminService) GetBarang() ([]model.AdminBarangDTO, error) {
	return s.adminRepo.GetBarang()
}

func (s *AdminService) TambahBarang(req *model.TambahBarangRequest) error {
	if req.NamaBarang == "" {
		return errors.New("Nama barang tidak boleh kosong")
	}
	return s.adminRepo.TambahBarang(req)
}

func (s *AdminService) UpdateBarang(req *model.UpdateBarangRequest) error {
	return s.adminRepo.UpdateBarang(req)
}

func (s *AdminService) HapusBarang(barangID int) error {
	return s.adminRepo.HapusBarang(barangID)
}

func (s *AdminService) RestockBarang(adminID int, req *model.RestockBarangRequest) (*model.StokMutationResponse, error) {
	if req.JumlahTambah <= 0 {
		return nil, errors.New("Jumlah restock harus lebih dari 0")
	}
	return s.adminRepo.RestockBarang(adminID, req)
}

func (s *AdminService) MutasiStok(req *model.MutasiStokRequest) (*model.StokMutationResponse, error) {
	if req.Jumlah <= 0 {
		return nil, errors.New("Jumlah mutasi harus lebih dari 0")
	}
	return s.adminRepo.MutasiStok(req)
}

func (s *AdminService) GetAnggota() ([]model.AdminAnggotaDTO, error) {
	return s.adminRepo.GetAnggota()
}

func (s *AdminService) TambahUser(adminID int, req *model.TambahUserRequest) error {
	return s.adminRepo.TambahUser(adminID, req)
}

func (s *AdminService) ResetPasswordUser(userID int, newPassword string) error {
	if len(newPassword) < 6 {
		return errors.New("Password baru minimal 6 karakter")
	}
	return s.adminRepo.ResetPasswordUser(userID, newPassword)
}

func (s *AdminService) GetSetoranKasir() ([]model.SetoranKasirItemDTO, error) {
	return s.adminRepo.GetSetoranKasir()
}

func (s *AdminService) ApproveSetoranKasir(setoranID, adminID int) error {
	return s.adminRepo.ApproveSetoranKasir(setoranID, adminID)
}

func (s *AdminService) GetShuManagement() (*model.ShuManagementDataDTO, error) {
	return s.adminRepo.GetShuManagement()
}

func (s *AdminService) GetLaporanTransaksi(req *model.LaporanTransaksiRequest) (*model.LaporanTransaksiResponse, error) {
	return s.adminRepo.GetLaporanTransaksi(req)
}

func (s *AdminService) GetDaftarJabatan() ([]model.JabatanItemDTO, error) {
	return s.adminRepo.GetDaftarJabatan()
}

func (s *AdminService) GetLaporanTarikTunai() ([]model.TarikTunaiReportItemDTO, error) {
	return s.adminRepo.GetLaporanTarikTunai()
}
