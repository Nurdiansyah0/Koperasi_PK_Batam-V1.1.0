package service

import (
	"errors"
	"fmt"

	"github.com/koperasipk/backend-go/internal/model"
	"github.com/koperasipk/backend-go/internal/repository"
)

type AnggotaService struct {
	anggotaRepo *repository.AnggotaRepo
}

func NewAnggotaService(anggotaRepo *repository.AnggotaRepo) *AnggotaService {
	return &AnggotaService{anggotaRepo: anggotaRepo}
}

func (s *AnggotaService) GetProfil(userID int) (*model.ProfilAnggotaDTO, error) {
	return s.anggotaRepo.GetProfil(userID)
}

func (s *AnggotaService) GetHistoriTransaksi(userID, page, perPage int) (*model.TransaksiPaginatorDTO, error) {
	anggota, _, err := s.anggotaRepo.GetAnggotaByUserID(userID)
	if err != nil {
		return nil, errors.New("Data anggota tidak ditemukan")
	}
	return s.anggotaRepo.GetHistoriTransaksi(anggota.AnggotaID, page, perPage)
}

func (s *AnggotaService) GetBarang() ([]model.BarangAnggotaDTO, error) {
	return s.anggotaRepo.GetBarang()
}

func (s *AnggotaService) GetPaketBelanja() ([]model.PaketBelanjaDTO, error) {
	// Standard paket belanja hemat koperasi
	pakets := []model.PaketBelanjaDTO{
		{
			ID:          "paket_sarapan",
			NamaPaket:   "Paket Sarapan Hemat",
			Deskripsi:   "Roti dan kopi sachet untuk sarapan pagi praktis.",
			Tag:         "Paling Populer",
			Icon:        "☕",
			TotalHarga:  15000,
			IsAvailable: true,
			Items: []model.PaketItemDTO{
				{BarangID: 1, NamaBarang: "Kopi Sachet", Jumlah: 2, Qty: 2, HargaSatuan: 3000, Subtotal: 6000, StokTersedia: 10},
				{BarangID: 2, NamaBarang: "Roti Manis", Jumlah: 1, Qty: 1, HargaSatuan: 9000, Subtotal: 9000, StokTersedia: 10},
			},
		},
		{
			ID:          "paket_sembako_mini",
			NamaPaket:   "Paket Sembako Mini",
			Deskripsi:   "Minyak goreng 1L dan gula pasir 1kg untuk kebutuhan harian.",
			Tag:         "Hemat 10%",
			Icon:        "🛒",
			TotalHarga:  35000,
			IsAvailable: true,
			Items: []model.PaketItemDTO{
				{BarangID: 3, NamaBarang: "Minyak Goreng 1L", Jumlah: 1, Qty: 1, HargaSatuan: 20000, Subtotal: 20000, StokTersedia: 10},
				{BarangID: 4, NamaBarang: "Gula Pasir 1kg", Jumlah: 1, Qty: 1, HargaSatuan: 15000, Subtotal: 15000, StokTersedia: 10},
			},
		},
	}
	return pakets, nil
}

func (s *AnggotaService) CekKelayakanTarikTunai(userID int) (*model.KelayakanTarikTunaiDTO, error) {
	anggota, _, err := s.anggotaRepo.GetAnggotaByUserID(userID)
	if err != nil {
		return nil, errors.New("Data anggota tidak ditemukan")
	}
	return s.anggotaRepo.CekKelayakanTarikTunai(anggota.AnggotaID)
}

func (s *AnggotaService) SetujuiMasterConsent(userID int) (*model.MasterConsentDataDTO, error) {
	anggota, _, err := s.anggotaRepo.GetAnggotaByUserID(userID)
	if err != nil {
		return nil, errors.New("Data anggota tidak ditemukan")
	}
	if err := s.anggotaRepo.SetujuiMasterConsent(anggota.AnggotaID); err != nil {
		return nil, err
	}
	nowStr := "sekarang"
	return &model.MasterConsentDataDTO{
		HasMasterConsent:       true,
		PersetujuanShuMasterAt: &nowStr,
	}, nil
}

func (s *AnggotaService) AjukanTarikTunai(userID int, req *model.AjukanTarikTunaiRequest) (*model.AjukanTarikDataDTO, error) {
	anggota, _, err := s.anggotaRepo.GetAnggotaByUserID(userID)
	if err != nil {
		return nil, errors.New("Data anggota tidak ditemukan")
	}

	// Evaluasi kelayakan
	kelayakan, err := s.anggotaRepo.CekKelayakanTarikTunai(anggota.AnggotaID)
	if err != nil {
		return nil, err
	}

	if !kelayakan.IsEligible {
		msg := "Pengajuan penarikan belum memenuhi syarat:"
		for _, r := range kelayakan.IneligibleReasons {
			msg += " " + r
		}
		return nil, errors.New(msg)
	}

	if req.Nominal <= 0 {
		return nil, errors.New("Nominal penarikan harus lebih dari 0")
	}

	if req.Nominal > kelayakan.FinalWithdrawalLimit {
		return nil, fmt.Errorf("Nominal penarikan (Rp %.0f) melebihi batas maksimal penarikan SHU Rp %.0f", req.Nominal, kelayakan.FinalWithdrawalLimit)
	}

	return s.anggotaRepo.AjukanTarikTunai(anggota.AnggotaID, req.Nominal, req.SumberDana, req.TransaksiID, req.Keterangan)
}

func (s *AnggotaService) GetRiwayatTarikTunai(userID int) ([]model.TarikTunaiItemDTO, error) {
	anggota, _, err := s.anggotaRepo.GetAnggotaByUserID(userID)
	if err != nil {
		return nil, errors.New("Data anggota tidak ditemukan")
	}
	return s.anggotaRepo.GetRiwayatTarikTunai(anggota.AnggotaID)
}

func (s *AnggotaService) SimpanTransaksi(userID int, req model.SimpanTransaksiRequest) (*model.SimpanTransaksiResponse, error) {
	anggota, _, err := s.anggotaRepo.GetAnggotaByUserID(userID)
	if err != nil {
		return nil, errors.New("Data anggota tidak ditemukan")
	}
	return s.anggotaRepo.SimpanTransaksi(anggota.AnggotaID, req)
}

func (s *AnggotaService) BayarHutang(userID int, jumlah float64) (int, error) {
	anggota, _, err := s.anggotaRepo.GetAnggotaByUserID(userID)
	if err != nil {
		return 0, errors.New("Data anggota tidak ditemukan")
	}
	if jumlah <= 0 {
		return 0, errors.New("Jumlah pembayaran hutang harus lebih dari 0")
	}
	return s.anggotaRepo.BayarHutang(anggota.AnggotaID, jumlah)
}

func (s *AnggotaService) GetHistoriBayarHutang(userID int) ([]model.HistoriBayarHutangDTO, error) {
	anggota, _, err := s.anggotaRepo.GetAnggotaByUserID(userID)
	if err != nil {
		return nil, errors.New("Data anggota tidak ditemukan")
	}
	return s.anggotaRepo.GetHistoriBayarHutang(anggota.AnggotaID)
}
