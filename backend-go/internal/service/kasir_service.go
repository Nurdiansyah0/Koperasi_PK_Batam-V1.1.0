package service

import (
	"errors"

	"github.com/koperasipk/backend-go/internal/model"
	"github.com/koperasipk/backend-go/internal/repository"
)

type KasirService struct {
	kasirRepo *repository.KasirRepo
}

func NewKasirService(kasirRepo *repository.KasirRepo) *KasirService {
	return &KasirService{kasirRepo: kasirRepo}
}

func (s *KasirService) GetDashboard(kasirID int) (*model.DashboardKasirDTO, error) {
	return s.kasirRepo.GetDashboard(kasirID)
}

func (s *KasirService) GetTransaksiTerbaru(kasirID int) ([]model.TransaksiTerbaruDTO, error) {
	return s.kasirRepo.GetTransaksiTerbaru(kasirID)
}

func (s *KasirService) GetDataBarang() ([]model.BarangKasirDTO, error) {
	return s.kasirRepo.GetDataBarang()
}

func (s *KasirService) GetAllAnggota() ([]model.AnggotaKasirDTO, error) {
	return s.kasirRepo.GetAllAnggota()
}

func (s *KasirService) CariProfilAnggota(search string, anggotaID *int) (*model.AnggotaKasirDTO, error) {
	return s.kasirRepo.CariProfilAnggota(search, anggotaID)
}

func (s *KasirService) BuatTransaksi(kasirID int, req *model.BuatTransaksiRequest) (*model.BuatTransaksiResponse, error) {
	if len(req.Items) == 0 {
		return nil, errors.New("Keranjang belanja kasir tidak boleh kosong.")
	}
	return s.kasirRepo.BuatTransaksi(kasirID, req)
}

func (s *KasirService) GetHistoryTransaksi(kasirID int, req *model.HistoryTransaksiRequest) (*model.LaravelPaginatorDTO[model.RiwayatTransaksiDTO], error) {
	return s.kasirRepo.GetHistoryTransaksi(kasirID, req)
}

func (s *KasirService) SetorAdmin(kasirID int, nominal float64) error {
	if nominal <= 0 {
		return errors.New("Nominal setoran harus lebih dari 0.")
	}
	return s.kasirRepo.SetorAdmin(kasirID, nominal)
}

func (s *KasirService) GetRiwayatSetoran(kasirID int) ([]model.SetoranKasirDTO, error) {
	return s.kasirRepo.GetRiwayatSetoran(kasirID)
}

func (s *KasirService) GetDaftarKasir() ([]model.DaftarKasirDTO, error) {
	return s.kasirRepo.GetDaftarKasir()
}

func (s *KasirService) GetSerahTerimaForMe(kasirID, page, perPage int) (*model.LaravelPaginatorDTO[model.SerahTerimaDTO], error) {
	return s.kasirRepo.GetSerahTerimaForMe(kasirID, page, perPage)
}

func (s *KasirService) CreateSerahTerima(kasirFrom, kasirTo int, uangFisik float64, catatan *string) (*model.CreateSerahTerimaDataDTO, error) {
	if kasirFrom == kasirTo {
		return nil, errors.New("Tidak dapat melakukan serah terima ke diri sendiri.")
	}
	return s.kasirRepo.CreateSerahTerima(kasirFrom, kasirTo, uangFisik, catatan)
}

func (s *KasirService) ApproveSerahTerima(serahID, kasirTo int) error {
	return s.kasirRepo.ApproveSerahTerima(serahID, kasirTo)
}

func (s *KasirService) RejectSerahTerima(serahID, kasirTo int, alasan string) error {
	if alasan == "" {
		return errors.New("Alasan penolakan serah terima wajib diisi.")
	}
	return s.kasirRepo.RejectSerahTerima(serahID, kasirTo, alasan)
}

func (s *KasirService) GetAntreanTarikTunai() ([]model.AntreanTarikTunaiDTO, error) {
	return s.kasirRepo.GetAntreanTarikTunai()
}

func (s *KasirService) ProsesTarikTunai(kasirID, tarikID int) (*model.TarikTunaiReceiptDTO, error) {
	return s.kasirRepo.ProsesTarikTunai(kasirID, tarikID)
}

func (s *KasirService) GetLatestPendingOrders(kasirID int) (*model.LatestPendingOrdersResponse, error) {
	return s.kasirRepo.GetLatestPendingOrders(kasirID)
}

func (s *KasirService) TestOrderNotification() (*model.LatestOrderDTO, error) {
	return s.kasirRepo.TestOrderNotification()
}

func (s *KasirService) GetPesananAnggota() ([]model.PesananAnggotaDTO, error) {
	return s.kasirRepo.GetPesananAnggota()
}

func (s *KasirService) SimpanTransaksiKasir(kasirID int, req *model.SimpanTransaksiKasirRequest) error {
	var ids []int
	if req.TransaksiID != nil {
		ids = append(ids, *req.TransaksiID)
	}
	for _, t := range req.Transaksi {
		ids = append(ids, t.TransaksiID)
	}
	if len(ids) == 0 {
		return errors.New("Tidak ada ID transaksi yang dipilih")
	}
	return s.kasirRepo.SimpanTransaksiKasir(kasirID, ids)
}

func (s *KasirService) TolakPesananAnggota(kasirID int, req *model.TolakPesananRequest) error {
	var ids []int
	if req.TransaksiID != nil {
		ids = append(ids, *req.TransaksiID)
	}
	ids = append(ids, req.TransaksiIDs...)
	if len(ids) == 0 {
		return errors.New("Tidak ada ID transaksi yang dipilih")
	}
	return s.kasirRepo.TolakPesananAnggota(kasirID, ids, req.Alasan)
}

func (s *KasirService) GetAllPembayaranHutang() ([]model.PembayaranHutangDTO, error) {
	return s.kasirRepo.GetAllPembayaranHutang()
}

func (s *KasirService) ApprovePembayaranHutang(kasirID int, req *model.ApprovePembayaranHutangRequest) error {
	if req.Action != "approve" && req.Action != "reject" {
		return errors.New("Action harus 'approve' atau 'reject'")
	}
	return s.kasirRepo.ApprovePembayaranHutang(kasirID, req.PembayaranID, req.Action, req.MetodePembayaran)
}
