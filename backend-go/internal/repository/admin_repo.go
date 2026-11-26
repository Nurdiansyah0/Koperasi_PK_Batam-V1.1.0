package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/koperasipk/backend-go/internal/model"
	"golang.org/x/crypto/bcrypt"
)

type AdminRepo struct {
	db *sqlx.DB
}

func NewAdminRepo(db *sqlx.DB) *AdminRepo {
	return &AdminRepo{db: db}
}

// GetDashboardStats menghitung metrik agregat untuk dashboard Admin
func (r *AdminRepo) GetDashboardStats() (*model.AdminDashboardResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Daily Metrics
	type DailyRow struct {
		TotalCount      int     `db:"total_count"`
		TotalPendapatan float64 `db:"total_pendapatan"`
		TotalKeuntungan float64 `db:"total_keuntungan"`
	}
	var dr DailyRow
	_ = r.db.GetContext(ctx, &dr, `
		SELECT COUNT(*) as total_count,
		       COALESCE(SUM(total_harga), 0) as total_pendapatan,
		       COALESCE(SUM(total_keuntungan), 0) as total_keuntungan
		FROM transaksi
		WHERE status = 'selesai' AND DATE(created_at) = DATE('now', 'localtime')
	`)

	// 2. Anggota Aggregates
	type AnggotaStat struct {
		TotalAnggota     int     `db:"total_anggota"`
		TotalHutang      float64 `db:"total_hutang"`
		TotalSaldo       float64 `db:"total_saldo"`
		TotalShu         float64 `db:"total_shu"`
		LimitKritisCount int     `db:"limit_kritis_count"`
	}
	var as AnggotaStat
	_ = r.db.GetContext(ctx, &as, `
		SELECT COUNT(*) as total_anggota,
		       COALESCE(SUM(hutang), 0) as total_hutang,
		       COALESCE(SUM(saldo), 0) as total_saldo,
		       COALESCE(SUM(shu), 0) as total_shu,
		       COALESCE(SUM(CASE WHEN hutang >= 300000 THEN 1 ELSE 0 END), 0) as limit_kritis_count
		FROM anggota
	`)

	// 3. Total Aset Barang (Stok * Harga Modal)
	var totalAsetBarang float64
	_ = r.db.GetContext(ctx, &totalAsetBarang, `
		SELECT COALESCE(SUM(stok * harga_modal), 0) FROM barang
	`)

	// 4. Stok Kritis (< PKM atau stok <= 2)
	type KritisRow struct {
		BarangID   int     `db:"barang_id"`
		NamaBarang string  `db:"nama_barang"`
		Stok       int     `db:"stok"`
		Pkm        *int    `db:"pkm"`
		HargaModal float64 `db:"harga_modal"`
	}
	var kritisRows []KritisRow
	_ = r.db.SelectContext(ctx, &kritisRows, `
		SELECT barang_id, nama_barang, stok, pkm, COALESCE(harga_modal, 0) as harga_modal
		FROM barang
		WHERE stok <= 2 OR stok < COALESCE(pkm, 1)
		ORDER BY stok ASC
		LIMIT 5
	`)

	var stokKritisCount int
	_ = r.db.GetContext(ctx, &stokKritisCount, `
		SELECT COUNT(*) FROM barang WHERE stok <= 2 OR stok < COALESCE(pkm, 1)
	`)

	kritisItems := make([]model.StokKritisItemDTO, 0, len(kritisRows))
	for _, kr := range kritisRows {
		kritisItems = append(kritisItems, model.StokKritisItemDTO{
			BarangID:   kr.BarangID,
			NamaBarang: kr.NamaBarang,
			Stok:       kr.Stok,
			Pkm:        kr.Pkm,
			HargaModal: kr.HargaModal,
		})
	}

	// 5. Pending Setoran Kasir
	type SetoranStat struct {
		PendingCount   int     `db:"pending_count"`
		PendingNominal float64 `db:"pending_nominal"`
	}
	var ss SetoranStat
	_ = r.db.GetContext(ctx, &ss, `
		SELECT COUNT(*) as pending_count, COALESCE(SUM(nominal), 0) as pending_nominal
		FROM setoran_kasir WHERE status = 'pending'
	`)

	// 6. Restock Bulan Ini
	var totalRestockBulan float64
	_ = r.db.GetContext(ctx, &totalRestockBulan, `
		SELECT COALESCE(SUM(total_biaya), 0)
		FROM riwayat_restock
		WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
	`)

	return &model.AdminDashboardResponse{
		Success:                 true,
		TotalAnggota:            as.TotalAnggota,
		TotalTransaksiHariIni:   dr.TotalCount,
		TotalPendapatanHariIni:  dr.TotalPendapatan,
		TotalKeuntunganHariIni:  dr.TotalKeuntungan,
		TotalHutangBeredar:      as.TotalHutang,
		TotalSaldoAnggota:       as.TotalSaldo,
		TotalShuTersedia:        as.TotalShu,
		TotalShuPengurus:        0,
		TotalShuKoperasi:        0,
		TotalAsetBarang:         totalAsetBarang,
		StokKritisCount:         stokKritisCount,
		StokKritisItems:         kritisItems,
		SetoranPendingCount:     ss.PendingCount,
		SetoranPendingNominal:   ss.PendingNominal,
		AnggotaLimitKritisCount: as.LimitKritisCount,
		TotalRestockBulanIni:    totalRestockBulan,
		ExpiredCount:            0,
		NearExpiryCount:         0,
	}, nil
}

// GetBarang mengambil inventori lengkap barang untuk Admin
func (r *AdminRepo) GetBarang() ([]model.AdminBarangDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		BarangID   int     `db:"barang_id"`
		NamaBarang string  `db:"nama_barang"`
		Stok       int     `db:"stok"`
		StokToko   int     `db:"stok_toko"`
		StokGudang int     `db:"stok_gudang"`
		HargaModal float64 `db:"harga_modal"`
		HargaJual  float64 `db:"harga_jual"`
		Keuntungan float64 `db:"keuntungan"`
		Pkm        *int    `db:"pkm"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT barang_id, nama_barang, stok, stok_toko, stok_gudang,
		       COALESCE(harga_modal, 0) as harga_modal,
		       COALESCE(harga_jual, 0) as harga_jual,
		       COALESCE(keuntungan, 0) as keuntungan,
		       pkm
		FROM barang
		ORDER BY nama_barang ASC
	`)
	if err != nil {
		return nil, err
	}

	list := make([]model.AdminBarangDTO, 0, len(rows))
	for _, row := range rows {
		st := row.StokToko
		sg := row.StokGudang
		list = append(list, model.AdminBarangDTO{
			BarangID:   row.BarangID,
			NamaBarang: row.NamaBarang,
			Stok:       row.Stok,
			StokToko:   &st,
			StokGudang: &sg,
			HargaModal: row.HargaModal,
			HargaJual:  row.HargaJual,
			Keuntungan: row.Keuntungan,
			Pkm:        row.Pkm,
		})
	}

	return list, nil
}

// TambahBarang menambah barang baru ke master inventori
func (r *AdminRepo) TambahBarang(req *model.TambahBarangRequest) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	stokTotal := req.StokToko + req.StokGudang
	keuntungan := req.HargaJual - req.HargaModal
	pkm := 1
	if req.Pkm != nil {
		pkm = *req.Pkm
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO barang (nama_barang, stok, stok_toko, stok_gudang, harga_modal, harga_jual, keuntungan, pkm, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	`, req.NamaBarang, stokTotal, req.StokToko, req.StokGudang, req.HargaModal, req.HargaJual, keuntungan, pkm)
	return err
}

// UpdateBarang mengubah data harga dan PKM barang
func (r *AdminRepo) UpdateBarang(req *model.UpdateBarangRequest) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	keuntungan := req.HargaJual - req.HargaModal
	_, err := r.db.ExecContext(ctx, `
		UPDATE barang
		SET nama_barang = ?, harga_modal = ?, harga_jual = ?, keuntungan = ?, pkm = ?, updated_at = CURRENT_TIMESTAMP
		WHERE barang_id = ?
	`, req.NamaBarang, req.HargaModal, req.HargaJual, keuntungan, req.Pkm, req.BarangID)
	return err
}

// HapusBarang menghapus barang dari master
func (r *AdminRepo) HapusBarang(barangID int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, `DELETE FROM barang WHERE barang_id = ?`, barangID)
	return err
}

// RestockBarang menambah stok dan mencatat transaksi restock
func (r *AdminRepo) RestockBarang(adminID int, req *model.RestockBarangRequest) (*model.StokMutationResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var b struct {
		StokToko   int     `db:"stok_toko"`
		StokGudang int     `db:"stok_gudang"`
		HargaModal float64 `db:"harga_modal"`
	}
	err = tx.GetContext(ctx, &b, `SELECT stok_toko, stok_gudang, COALESCE(harga_modal, 0) as harga_modal FROM barang WHERE barang_id = ?`, req.BarangID)
	if err != nil {
		return nil, errors.New("Barang tidak ditemukan")
	}

	hBeli := b.HargaModal
	if req.HargaBeliSatuan != nil && *req.HargaBeliSatuan > 0 {
		hBeli = *req.HargaBeliSatuan
	}
	totalBiaya := hBeli * float64(req.JumlahTambah)

	// Update stok gudang sebagai default restock
	stokGudangBaru := b.StokGudang + req.JumlahTambah
	stokBaru := b.StokToko + stokGudangBaru

	_, err = tx.ExecContext(ctx, `
		UPDATE barang
		SET stok_gudang = ?, stok = ?, updated_at = CURRENT_TIMESTAMP
		WHERE barang_id = ?
	`, stokGudangBaru, stokBaru, req.BarangID)
	if err != nil {
		return nil, err
	}

	ket := ""
	if req.Catatan != nil {
		ket = *req.Catatan
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO riwayat_restock (barang_id, admin_id, jumlah_tambah, harga_beli_satuan, total_biaya, sumber_dana, catatan, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, 'kas_koperasi', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`, req.BarangID, adminID, req.JumlahTambah, hBeli, totalBiaya, ket)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &model.StokMutationResponse{
		Success:    true,
		Message:    fmt.Sprintf("Restock %d pcs berhasil!", req.JumlahTambah),
		StokBaru:   stokBaru,
		StokToko:   b.StokToko,
		StokGudang: stokGudangBaru,
	}, nil
}

// MutasiStok memindahkan stok antara toko dan gudang
func (r *AdminRepo) MutasiStok(req *model.MutasiStokRequest) (*model.StokMutationResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var b struct {
		StokToko   int `db:"stok_toko"`
		StokGudang int `db:"stok_gudang"`
	}
	err = tx.GetContext(ctx, &b, `SELECT stok_toko, stok_gudang FROM barang WHERE barang_id = ?`, req.BarangID)
	if err != nil {
		return nil, errors.New("Barang tidak ditemukan")
	}

	stokToko := b.StokToko
	stokGudang := b.StokGudang

	if req.Tipe == "gudang_ke_toko" {
		if stokGudang < req.Jumlah {
			return nil, fmt.Errorf("Stok gudang tidak mencukupi (Tersedia: %d, Diminta: %d)", stokGudang, req.Jumlah)
		}
		stokGudang -= req.Jumlah
		stokToko += req.Jumlah
	} else if req.Tipe == "toko_ke_gudang" {
		if stokToko < req.Jumlah {
			return nil, fmt.Errorf("Stok toko tidak mencukupi (Tersedia: %d, Diminta: %d)", stokToko, req.Jumlah)
		}
		stokToko -= req.Jumlah
		stokGudang += req.Jumlah
	} else {
		return nil, errors.New("Tipe mutasi tidak valid (harus 'gudang_ke_toko' atau 'toko_ke_gudang')")
	}

	stokTotal := stokToko + stokGudang

	_, err = tx.ExecContext(ctx, `
		UPDATE barang
		SET stok_toko = ?, stok_gudang = ?, stok = ?, updated_at = CURRENT_TIMESTAMP
		WHERE barang_id = ?
	`, stokToko, stokGudang, stokTotal, req.BarangID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &model.StokMutationResponse{
		Success:    true,
		Message:    fmt.Sprintf("Mutasi stok %d pcs berhasil!", req.Jumlah),
		StokBaru:   stokTotal,
		StokToko:   stokToko,
		StokGudang: stokGudang,
	}, nil
}

// GetAnggota mengambil seluruh buku anggota untuk Admin
func (r *AdminRepo) GetAnggota() ([]model.AdminAnggotaDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		AnggotaID   int     `db:"anggota_id"`
		UserID      int     `db:"user_id"`
		NamaLengkap *string `db:"nama_lengkap"`
		Username    string  `db:"username"`
		Saldo       float64 `db:"saldo"`
		Hutang      float64 `db:"hutang"`
		Shu         float64 `db:"shu"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT a.anggota_id, COALESCE(a.user_id, 0) as user_id,
		       a.nama_lengkap, COALESCE(u.username, '') as username,
		       COALESCE(a.saldo, 0) as saldo,
		       COALESCE(a.hutang, 0) as hutang,
		       COALESCE(a.shu, 0) as shu
		FROM anggota a
		LEFT JOIN users u ON u.user_id = a.user_id
		ORDER BY a.nama_lengkap ASC
	`)
	if err != nil {
		return nil, err
	}

	list := make([]model.AdminAnggotaDTO, 0, len(rows))
	for _, row := range rows {
		list = append(list, model.AdminAnggotaDTO{
			AnggotaID:   row.AnggotaID,
			UserID:      row.UserID,
			NamaLengkap: row.NamaLengkap,
			Username:    row.Username,
			Saldo:       row.Saldo,
			Hutang:      row.Hutang,
			Shu:         row.Shu,
		})
	}

	return list, nil
}

// TambahUser membuat user baru lengkap dengan akun buku anggota
func (r *AdminRepo) TambahUser(adminID int, req *model.TambahUserRequest) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx, `
		INSERT INTO users (username, password_hash, role, created_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)
	`, req.Username, string(hash), req.Role)
	if err != nil {
		return err
	}

	userID, _ := res.LastInsertId()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO anggota (user_id, nama_lengkap, email, saldo, simpanan_pokok, simpanan_wajib, hutang, shu, created_at)
		VALUES (?, ?, ?, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP)
	`, userID, req.NamaLengkap, req.Username+"@koperasi.local")
	if err != nil {
		return err
	}

	if req.Role != "anggota" {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO jabatan_anggota (user_id, role, status, ditugaskan_oleh, catatan, assigned_at)
			VALUES (?, ?, 'aktif', ?, 'Penugasan awal pendaftaran', CURRENT_TIMESTAMP)
		`, userID, req.Role, adminID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// ResetPasswordUser me-reset password anggota oleh Admin
func (r *AdminRepo) ResetPasswordUser(userID int, newPassword string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = r.db.ExecContext(ctx, `UPDATE users SET password_hash = ? WHERE user_id = ?`, string(hash), userID)
	return err
}

// GetSetoranKasir mengambil seluruh setoran kasir untuk divalidasi Admin
func (r *AdminRepo) GetSetoranKasir() ([]model.SetoranKasirItemDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		SetoranID int     `db:"setoran_id"`
		Nominal   float64 `db:"nominal"`
		Status    string  `db:"status"`
		NamaKasir *string `db:"nama_kasir"`
		CreatedAt string  `db:"created_at"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT s.setoran_id, s.nominal, s.status,
		       COALESCE(u.username, 'Kasir') as nama_kasir,
		       COALESCE(s.created_at, '') as created_at
		FROM setoran_kasir s
		LEFT JOIN users u ON u.user_id = s.kasir_id
		ORDER BY s.created_at DESC
	`)
	if err != nil {
		return nil, err
	}

	list := make([]model.SetoranKasirItemDTO, 0, len(rows))
	for _, row := range rows {
		cAt := row.CreatedAt
		list = append(list, model.SetoranKasirItemDTO{
			ID:        row.SetoranID,
			SetoranID: row.SetoranID,
			Nominal:   row.Nominal,
			NamaKasir: row.NamaKasir,
			CreatedAt: &cAt,
			Tanggal:   &cAt,
			Status:    row.Status,
		})
	}

	return list, nil
}

// ApproveSetoranKasir menyetujui setoran kasir
func (r *AdminRepo) ApproveSetoranKasir(setoranID, adminID int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, `
		UPDATE setoran_kasir
		SET status = 'approved', approved_by = ?
		WHERE setoran_id = ?
	`, adminID, setoranID)
	return err
}

// GetShuManagement mengambil ringkasan pembagian SHU
func (r *AdminRepo) GetShuManagement() (*model.ShuManagementDataDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Stat struct {
		TotalShu     float64 `db:"total_shu"`
		TotalSaldo   float64 `db:"total_saldo"`
		TotalHutang  float64 `db:"total_hutang"`
		TotalAnggota int     `db:"total_anggota"`
	}
	var stat Stat
	_ = r.db.GetContext(ctx, &stat, `
		SELECT COALESCE(SUM(shu), 0) as total_shu,
		       COALESCE(SUM(saldo), 0) as total_saldo,
		       COALESCE(SUM(hutang), 0) as total_hutang,
		       COUNT(*) as total_anggota
		FROM anggota
	`)

	type Row struct {
		AnggotaID   int     `db:"anggota_id"`
		NamaLengkap string  `db:"nama_lengkap"`
		Shu         float64 `db:"shu"`
		Saldo       float64 `db:"saldo"`
		Hutang      float64 `db:"hutang"`
	}
	var rows []Row
	_ = r.db.SelectContext(ctx, &rows, `
		SELECT anggota_id, COALESCE(nama_lengkap, '') as nama_lengkap,
		       COALESCE(shu, 0) as shu,
		       COALESCE(saldo, 0) as saldo,
		       COALESCE(hutang, 0) as hutang
		FROM anggota
		ORDER BY shu DESC
		LIMIT 100
	`)

	anggotaList := make([]model.ShuAnggotaDTO, 0, len(rows))
	for _, r := range rows {
		anggotaList = append(anggotaList, model.ShuAnggotaDTO{
			AnggotaID:   r.AnggotaID,
			NamaLengkap: r.NamaLengkap,
			Shu:         r.Shu,
			Saldo:       r.Saldo,
			Hutang:      r.Hutang,
		})
	}

	return &model.ShuManagementDataDTO{
		Summary: model.ShuManagementSummaryDTO{
			TotalShu:     stat.TotalShu,
			TotalSaldo:   stat.TotalSaldo,
			TotalHutang:  stat.TotalHutang,
			TotalAnggota: stat.TotalAnggota,
		},
		Anggota: anggotaList,
	}, nil
}

// GetLaporanTransaksi mengambil rekapan transaksi dengan filter tanggal
func (r *AdminRepo) GetLaporanTransaksi(req *model.LaporanTransaksiRequest) (*model.LaporanTransaksiResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		TransaksiID      int     `db:"transaksi_id"`
		Tanggal          string  `db:"tanggal"`
		NamaKasir        string  `db:"nama_kasir"`
		NamaAnggota      string  `db:"nama_anggota"`
		TotalHarga       float64 `db:"total_harga"`
		TotalKeuntungan  float64 `db:"total_keuntungan"`
		MetodePembayaran string  `db:"metode_pembayaran"`
		Status           string  `db:"status"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT t.transaksi_id,
		       COALESCE(t.created_at, '') as tanggal,
		       COALESCE(u.username, 'Kasir') as nama_kasir,
		       COALESCE(a.nama_lengkap, 'Non-Anggota') as nama_anggota,
		       COALESCE(t.total_harga, 0) as total_harga,
		       COALESCE(t.total_keuntungan, 0) as total_keuntungan,
		       COALESCE(t.metode_pembayaran, 'cash') as metode_pembayaran,
		       COALESCE(t.status, 'selesai') as status
		FROM transaksi t
		LEFT JOIN users u ON u.user_id = t.kasir_id
		LEFT JOIN anggota a ON a.anggota_id = t.anggota_id
		ORDER BY t.created_at DESC
		LIMIT 100
	`)
	if err != nil {
		return nil, err
	}

	var sumTotal float64
	var sumKeuntungan float64
	list := make([]model.LaporanTransaksiItemDTO, 0, len(rows))
	for _, row := range rows {
		sumTotal += row.TotalHarga
		sumKeuntungan += row.TotalKeuntungan
		list = append(list, model.LaporanTransaksiItemDTO{
			TransaksiID:      row.TransaksiID,
			Tanggal:          row.Tanggal,
			NamaKasir:        row.NamaKasir,
			NamaAnggota:      row.NamaAnggota,
			TotalHarga:       row.TotalHarga,
			TotalKeuntungan:  row.TotalKeuntungan,
			MetodePembayaran: row.MetodePembayaran,
			Status:           row.Status,
		})
	}

	return &model.LaporanTransaksiResponse{
		Success: true,
		Summary: &model.LaporanSummaryDTO{
			TotalTransaksi:  len(rows),
			TotalPendapatan: sumTotal,
			TotalKeuntungan: sumKeuntungan,
		},
		Data: list,
	}, nil
}

// GetDaftarJabatan mengambil penugasan jabatan pengurus & kasir
func (r *AdminRepo) GetDaftarJabatan() ([]model.JabatanItemDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		JabatanID      int     `db:"jabatan_id"`
		UserID         int     `db:"user_id"`
		Username       string  `db:"username"`
		NamaLengkap    string  `db:"nama_lengkap"`
		Role           string  `db:"role"`
		Status         string  `db:"status"`
		Catatan        *string `db:"catatan"`
		AssignedAt     string  `db:"assigned_at"`
		DitugaskanOleh string  `db:"ditugaskan_oleh"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT j.jabatan_id, j.user_id, u.username,
		       COALESCE(a.nama_lengkap, u.username) as nama_lengkap,
		       j.role, j.status, j.catatan,
		       COALESCE(j.assigned_at, '') as assigned_at,
		       COALESCE(adm.username, 'Admin') as ditugaskan_oleh
		FROM jabatan_anggota j
		JOIN users u ON u.user_id = j.user_id
		LEFT JOIN anggota a ON a.user_id = j.user_id
		LEFT JOIN users adm ON adm.user_id = j.ditugaskan_oleh
		ORDER BY j.assigned_at DESC
	`)
	if err != nil {
		return nil, err
	}

	list := make([]model.JabatanItemDTO, 0, len(rows))
	for _, row := range rows {
		aAt := row.AssignedAt
		list = append(list, model.JabatanItemDTO{
			JabatanID:      row.JabatanID,
			UserID:         row.UserID,
			Username:       row.Username,
			NamaLengkap:    row.NamaLengkap,
			Role:           row.Role,
			Status:         row.Status,
			Catatan:        row.Catatan,
			AssignedAt:     &aAt,
			DitugaskanOleh: row.DitugaskanOleh,
		})
	}

	return list, nil
}

// GetLaporanTarikTunai mengambil histori penarikan tunai anggota untuk audit Admin
func (r *AdminRepo) GetLaporanTarikTunai() ([]model.TarikTunaiReportItemDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		TarikID        int      `db:"tarik_id"`
		NamaAnggota    string   `db:"nama_anggota"`
		KasirName      string   `db:"kasir_name"`
		Nominal        float64  `db:"nominal"`
		SumberDana     string   `db:"sumber_dana"`
		TransaksiID    *int     `db:"transaksi_id"`
		BelanjaNominal *float64 `db:"belanja_nominal"`
		Keterangan     *string  `db:"keterangan"`
		CreatedAt      string   `db:"created_at"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT t.tarik_id,
		       COALESCE(a.nama_lengkap, 'Anggota') as nama_anggota,
		       COALESCE(u.username, 'Kasir') as kasir_name,
		       t.nominal, t.sumber_dana, t.transaksi_id,
		       trx.total_harga as belanja_nominal,
		       t.keterangan,
		       COALESCE(t.created_at, '') as created_at
		FROM tarik_tunai t
		LEFT JOIN anggota a ON a.anggota_id = t.anggota_id
		LEFT JOIN users u ON u.user_id = t.kasir_id
		LEFT JOIN transaksi trx ON trx.transaksi_id = t.transaksi_id
		ORDER BY t.created_at DESC
		LIMIT 100
	`)
	if err != nil {
		return nil, err
	}

	list := make([]model.TarikTunaiReportItemDTO, 0, len(rows))
	for _, row := range rows {
		bNom := 0.0
		if row.BelanjaNominal != nil {
			bNom = *row.BelanjaNominal
		}
		cAt := row.CreatedAt
		list = append(list, model.TarikTunaiReportItemDTO{
			TarikID:        row.TarikID,
			NamaAnggota:    row.NamaAnggota,
			KasirName:      row.KasirName,
			Nominal:        row.Nominal,
			SumberDana:     row.SumberDana,
			TransaksiID:    row.TransaksiID,
			BelanjaNominal: bNom,
			PersetujuanShu: true,
			Keterangan:     row.Keterangan,
			CreatedAt:      &cAt,
		})
	}

	return list, nil
}
