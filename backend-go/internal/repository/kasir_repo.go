package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/koperasipk/backend-go/internal/model"
)

type KasirRepo struct {
	db *sqlx.DB
}

func NewKasirRepo(db *sqlx.DB) *KasirRepo {
	return &KasirRepo{db: db}
}

// GetDashboard mengambil ringkasan dashboard kasir
func (r *KasirRepo) GetDashboard(kasirID int) (*model.DashboardKasirDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Daily Stats (Selesai hari ini)
	type DailyStat struct {
		TotalTransaksi int     `db:"total_transaksi"`
		TotalPenjualan float64 `db:"total_penjualan"`
	}
	var ds DailyStat
	_ = r.db.GetContext(ctx, &ds, `
		SELECT COUNT(*) as total_transaksi, COALESCE(SUM(total_harga), 0) as total_penjualan
		FROM transaksi
		WHERE kasir_id = ? AND status = 'selesai' AND DATE(created_at) = DATE('now', 'localtime')
	`, kasirID)

	// 2. Item terjual hari ini
	var itemTerjual int
	_ = r.db.GetContext(ctx, &itemTerjual, `
		SELECT COALESCE(SUM(d.jumlah), 0)
		FROM transaksi_detail d
		JOIN transaksi t ON t.transaksi_id = d.transaksi_id
		WHERE t.kasir_id = ? AND t.status = 'selesai' AND DATE(t.created_at) = DATE('now', 'localtime')
	`, kasirID)

	// 3. Total transaksi all-time dilayani
	var totalDilayani int
	_ = r.db.GetContext(ctx, &totalDilayani, `
		SELECT COUNT(*) FROM transaksi WHERE kasir_id = ? AND status = 'selesai'
	`, kasirID)

	// 4. Saldo Kas Kasir (transaksi tunai hari ini dikurangi setoran/penarikan)
	var cashIn float64
	_ = r.db.GetContext(ctx, &cashIn, `
		SELECT COALESCE(SUM(total_harga), 0)
		FROM transaksi
		WHERE kasir_id = ? AND status = 'selesai' AND (metode_pembayaran = 'cash' OR metode_pembayaran = 'tunai')
		AND DATE(created_at) = DATE('now', 'localtime')
	`, kasirID)

	var cashOutSetor float64
	_ = r.db.GetContext(ctx, &cashOutSetor, `
		SELECT COALESCE(SUM(nominal), 0)
		FROM setoran_kasir
		WHERE kasir_id = ? AND status = 'approved' AND DATE(created_at) = DATE('now', 'localtime')
	`, kasirID)

	saldoKas := math.Max(0, cashIn-cashOutSetor)

	// 5. Pending counts
	var pendingSerahTerima int
	_ = r.db.GetContext(ctx, &pendingSerahTerima, `
		SELECT COUNT(*) FROM serah_terima_kasir WHERE kasir_to = ? AND status = 'pending'
	`, kasirID)

	var pendingPesanan int
	_ = r.db.GetContext(ctx, &pendingPesanan, `
		SELECT COUNT(*) FROM transaksi WHERE status = 'pending'
	`, kasirID)

	var pendingHutang int
	_ = r.db.GetContext(ctx, &pendingHutang, `
		SELECT COUNT(*) FROM pembayaran_hutang WHERE status = 'pending'
	`)

	// 6. Transaksi Terbaru (10 transaksi)
	transaksiTerbaru, _ := r.GetTransaksiTerbaru(kasirID)

	return &model.DashboardKasirDTO{
		TotalPendapatanHariIni:  ds.TotalPenjualan,
		TotalTransaksiHariIni:   ds.TotalTransaksi,
		TotalItemTerjualHariIni: itemTerjual,
		TotalTransaksiDilayani:  totalDilayani,
		SaldoKas:                saldoKas,
		PendingSerahTerima:      pendingSerahTerima,
		PendingPesanan:          pendingPesanan,
		PendingHutang:           pendingHutang,
		TransaksiTerbaru:        transaksiTerbaru,
	}, nil
}

// GetTransaksiTerbaru mengambil 10 transaksi terakhir kasir
func (r *KasirRepo) GetTransaksiTerbaru(kasirID int) ([]model.TransaksiTerbaruDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		TransaksiID      int     `db:"transaksi_id"`
		TotalHarga       float64 `db:"total_harga"`
		MetodePembayaran string  `db:"metode_pembayaran"`
		Status           string  `db:"status"`
		CreatedAt        string  `db:"created_at"`
		NamaAnggota      *string `db:"nama_anggota"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT t.transaksi_id, COALESCE(t.total_harga, 0) as total_harga,
		       COALESCE(t.metode_pembayaran, 'cash') as metode_pembayaran,
		       COALESCE(t.status, 'selesai') as status,
		       COALESCE(t.created_at, '') as created_at,
		       a.nama_lengkap as nama_anggota
		FROM transaksi t
		LEFT JOIN anggota a ON a.anggota_id = t.anggota_id
		WHERE t.kasir_id = ?
		ORDER BY t.created_at DESC
		LIMIT 10
	`, kasirID)
	if err != nil {
		return nil, err
	}

	list := make([]model.TransaksiTerbaruDTO, 0, len(rows))
	for _, row := range rows {
		cAt := row.CreatedAt
		list = append(list, model.TransaksiTerbaruDTO{
			ID:               row.TransaksiID,
			TransaksiID:      row.TransaksiID,
			CreatedAt:        &cAt,
			TotalHarga:       row.TotalHarga,
			MetodePembayaran: row.MetodePembayaran,
			Status:           row.Status,
			NamaAnggota:      row.NamaAnggota,
		})
	}

	return list, nil
}

// GetDataBarang mengambil barang aktif untuk POS
func (r *KasirRepo) GetDataBarang() ([]model.BarangKasirDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		BarangID  int     `db:"barang_id"`
		Nama      string  `db:"nama_barang"`
		StokToko  int     `db:"stok_toko"`
		HargaJual float64 `db:"harga_jual"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT barang_id, nama_barang, stok_toko, COALESCE(harga_jual, 0) as harga_jual
		FROM barang
		WHERE stok_toko > 0
		ORDER BY nama_barang ASC
	`)
	if err != nil {
		return nil, err
	}

	list := make([]model.BarangKasirDTO, 0, len(rows))
	for _, row := range rows {
		h := row.HargaJual
		list = append(list, model.BarangKasirDTO{
			BarangID:  row.BarangID,
			Nama:      row.Nama,
			Stok:      row.StokToko,
			HargaJual: h,
			Harga:     &h,
		})
	}

	return list, nil
}

// GetAllAnggota mengambil seluruh data anggota untuk dropdown kasir
func (r *KasirRepo) GetAllAnggota() ([]model.AnggotaKasirDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		AnggotaID     int     `db:"anggota_id"`
		UserID        int     `db:"user_id"`
		NamaLengkap   string  `db:"nama_lengkap"`
		Username      string  `db:"username"`
		Email         *string `db:"email"`
		Saldo         float64 `db:"saldo"`
		Hutang        float64 `db:"hutang"`
		Shu           float64 `db:"shu"`
		SimpananPokok float64 `db:"simpanan_pokok"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT a.anggota_id, COALESCE(a.user_id, 0) as user_id,
		       COALESCE(a.nama_lengkap, '') as nama_lengkap,
		       COALESCE(u.username, '') as username,
		       a.email,
		       COALESCE(a.saldo, 0) as saldo,
		       COALESCE(a.hutang, 0) as hutang,
		       COALESCE(a.shu, 0) as shu,
		       COALESCE(a.simpanan_pokok, 0) as simpanan_pokok
		FROM anggota a
		LEFT JOIN users u ON u.user_id = a.user_id
		ORDER BY a.nama_lengkap ASC
	`)
	if err != nil {
		return nil, err
	}

	list := make([]model.AnggotaKasirDTO, 0, len(rows))
	for _, row := range rows {
		allowance := 0.0
		if row.SimpananPokok > 0 {
			allowance = 100000.0
		}
		limitHutang := 0.0
		if row.SimpananPokok > 0 {
			limitHutang = row.SimpananPokok + allowance
		}
		sisaLimit := math.Max(0, limitHutang-row.Hutang)
		nLengkap := row.NamaLengkap

		list = append(list, model.AnggotaKasirDTO{
			AnggotaID:       row.AnggotaID,
			UserID:          row.UserID,
			NamaLengkap:     row.NamaLengkap,
			Nama:            &nLengkap,
			Username:        row.Username,
			Email:           row.Email,
			Saldo:           row.Saldo,
			Hutang:          row.Hutang,
			Shu:             row.Shu,
			SimpananPokok:   row.SimpananPokok,
			AllowanceHutang: allowance,
			LimitHutang:     limitHutang,
			SisaLimitHutang: sisaLimit,
		})
	}

	return list, nil
}

// CariProfilAnggota mencari anggota by search term atau anggota_id
func (r *KasirRepo) CariProfilAnggota(search string, anggotaID *int) (*model.AnggotaKasirDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		AnggotaID     int     `db:"anggota_id"`
		UserID        int     `db:"user_id"`
		NamaLengkap   string  `db:"nama_lengkap"`
		Username      string  `db:"username"`
		Email         *string `db:"email"`
		Saldo         float64 `db:"saldo"`
		Hutang        float64 `db:"hutang"`
		Shu           float64 `db:"shu"`
		SimpananPokok float64 `db:"simpanan_pokok"`
	}

	var row Row
	var err error

	if anggotaID != nil && *anggotaID > 0 {
		err = r.db.GetContext(ctx, &row, `
			SELECT a.anggota_id, COALESCE(a.user_id, 0) as user_id,
			       COALESCE(a.nama_lengkap, '') as nama_lengkap,
			       COALESCE(u.username, '') as username,
			       a.email,
			       COALESCE(a.saldo, 0) as saldo,
			       COALESCE(a.hutang, 0) as hutang,
			       COALESCE(a.shu, 0) as shu,
			       COALESCE(a.simpanan_pokok, 0) as simpanan_pokok
			FROM anggota a
			LEFT JOIN users u ON u.user_id = a.user_id
			WHERE a.anggota_id = ?
			LIMIT 1
		`, *anggotaID)
	} else {
		err = r.db.GetContext(ctx, &row, `
			SELECT a.anggota_id, COALESCE(a.user_id, 0) as user_id,
			       COALESCE(a.nama_lengkap, '') as nama_lengkap,
			       COALESCE(u.username, '') as username,
			       a.email,
			       COALESCE(a.saldo, 0) as saldo,
			       COALESCE(a.hutang, 0) as hutang,
			       COALESCE(a.shu, 0) as shu,
			       COALESCE(a.simpanan_pokok, 0) as simpanan_pokok
			FROM anggota a
			LEFT JOIN users u ON u.user_id = a.user_id
			WHERE a.nama_lengkap LIKE ? OR u.username LIKE ?
			LIMIT 1
		`, "%"+search+"%", "%"+search+"%")
	}

	if err != nil {
		return nil, err
	}

	allowance := 0.0
	if row.SimpananPokok > 0 {
		allowance = 100000.0
	}
	limitHutang := 0.0
	if row.SimpananPokok > 0 {
		limitHutang = row.SimpananPokok + allowance
	}
	sisaLimit := math.Max(0, limitHutang-row.Hutang)
	nLengkap := row.NamaLengkap

	return &model.AnggotaKasirDTO{
		AnggotaID:       row.AnggotaID,
		UserID:          row.UserID,
		NamaLengkap:     row.NamaLengkap,
		Nama:            &nLengkap,
		Username:        row.Username,
		Email:           row.Email,
		Saldo:           row.Saldo,
		Hutang:          row.Hutang,
		Shu:             row.Shu,
		SimpananPokok:   row.SimpananPokok,
		AllowanceHutang: allowance,
		LimitHutang:     limitHutang,
		SisaLimitHutang: sisaLimit,
	}, nil
}

// BuatTransaksi memproses checkout kasir dengan transaksi database atomic
func (r *KasirRepo) BuatTransaksi(kasirID int, req *model.BuatTransaksiRequest) (*model.BuatTransaksiResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 1. Validasi Anggota
	if req.AnggotaID == nil || *req.AnggotaID <= 0 {
		return nil, errors.New("Transaksi POS wajib memilih Anggota Koperasi.")
	}

	var anggota model.Anggota
	err = tx.GetContext(ctx, &anggota, `
		SELECT anggota_id, user_id, saldo, hutang, shu, simpanan_pokok
		FROM anggota WHERE anggota_id = ?
	`, *req.AnggotaID)
	if err != nil {
		return nil, errors.New("Data anggota tidak ditemukan.")
	}

	// 2. Validasi & Kurangi Stok Toko
	var totalHarga float64
	var totalKeuntungan float64

	type ProcessedItem struct {
		BarangID    int
		Jumlah      int
		HargaSatuan float64
		Subtotal    float64
		Keuntungan  float64
	}
	processedItems := make([]ProcessedItem, 0, len(req.Items))

	for _, item := range req.Items {
		var b struct {
			BarangID   int     `db:"barang_id"`
			NamaBarang string  `db:"nama_barang"`
			StokToko   int     `db:"stok_toko"`
			HargaModal float64 `db:"harga_modal"`
			HargaJual  float64 `db:"harga_jual"`
			Keuntungan float64 `db:"keuntungan"`
		}

		err := tx.GetContext(ctx, &b, `
			SELECT barang_id, nama_barang, stok_toko,
			       COALESCE(harga_modal, 0) as harga_modal,
			       COALESCE(harga_jual, 0) as harga_jual,
			       COALESCE(keuntungan, 0) as keuntungan
			FROM barang WHERE barang_id = ?
		`, item.BarangID)
		if err != nil {
			return nil, fmt.Errorf("Barang ID %d tidak ditemukan.", item.BarangID)
		}

		if b.StokToko < item.Jumlah {
			return nil, fmt.Errorf("Stok barang '%s' tidak mencukupi (Tersedia: %d, Diminta: %d).", b.NamaBarang, b.StokToko, item.Jumlah)
		}

		// Potong stok toko
		_, err = tx.ExecContext(ctx, `
			UPDATE barang SET stok_toko = stok_toko - ? WHERE barang_id = ?
		`, item.Jumlah, item.BarangID)
		if err != nil {
			return nil, err
		}

		hSatuan := b.HargaJual
		if item.HargaSatuan != nil && *item.HargaSatuan > 0 {
			hSatuan = *item.HargaSatuan
		}

		subtotal := hSatuan * float64(item.Jumlah)
		itemKeuntungan := (hSatuan - b.HargaModal) * float64(item.Jumlah)

		totalHarga += subtotal
		totalKeuntungan += itemKeuntungan

		processedItems = append(processedItems, ProcessedItem{
			BarangID:    item.BarangID,
			Jumlah:      item.Jumlah,
			HargaSatuan: hSatuan,
			Subtotal:    subtotal,
			Keuntungan:  itemKeuntungan,
		})
	}

	// 3. Validasi Metode Pembayaran
	metode := req.MetodePembayaran
	switch metode {
	case "saldo", "e-wallet":
		if anggota.Saldo < totalHarga {
			return nil, fmt.Errorf("Saldo E-Wallet anggota tidak mencukupi (Saldo: Rp %.0f, Total: Rp %.0f).", anggota.Saldo, totalHarga)
		}
		_, err = tx.ExecContext(ctx, `UPDATE anggota SET saldo = saldo - ? WHERE anggota_id = ?`, totalHarga, anggota.AnggotaID)
		if err != nil {
			return nil, err
		}

	case "hutang":
		allowance := 0.0
		if anggota.SimpananPokok > 0 {
			allowance = 100000.0
		}
		limitHutang := anggota.SimpananPokok + allowance
		sisaLimit := math.Max(0, limitHutang-anggota.Hutang)
		if totalHarga > sisaLimit {
			return nil, fmt.Errorf("Total belanja melebihi sisa limit hutang anggota (Sisa limit: Rp %.0f, Total: Rp %.0f).", sisaLimit, totalHarga)
		}
		_, err = tx.ExecContext(ctx, `UPDATE anggota SET hutang = hutang + ? WHERE anggota_id = ?`, totalHarga, anggota.AnggotaID)
		if err != nil {
			return nil, err
		}
	}

	// 4. Insert Transaksi
	res, err := tx.ExecContext(ctx, `
		INSERT INTO transaksi (anggota_id, kasir_id, total_harga, total_keuntungan, metode_pembayaran, status, created_at)
		VALUES (?, ?, ?, ?, ?, 'selesai', CURRENT_TIMESTAMP)
	`, anggota.AnggotaID, kasirID, totalHarga, totalKeuntungan, metode)
	if err != nil {
		return nil, err
	}

	trxID, _ := res.LastInsertId()

	// 5. Insert Transaksi Detail
	for _, it := range processedItems {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO transaksi_detail (transaksi_id, barang_id, jumlah, harga_satuan, subtotal, keuntungan)
			VALUES (?, ?, ?, ?, ?, ?)
		`, trxID, it.BarangID, it.Jumlah, it.HargaSatuan, it.Subtotal, it.Keuntungan)
		if err != nil {
			return nil, err
		}
	}

	// Commit transaksi
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	id := int(trxID)
	return &model.BuatTransaksiResponse{
		Success:         true,
		Message:         "Transaksi kasir berhasil disimpan!",
		TransaksiID:     &id,
		Total:           &totalHarga,
		TotalKeuntungan: &totalKeuntungan,
	}, nil
}

// GetHistoryTransaksi mengambil daftar riwayat transaksi kasir
func (r *KasirRepo) GetHistoryTransaksi(kasirID int, req *model.HistoryTransaksiRequest) (*model.LaravelPaginatorDTO[model.RiwayatTransaksiDTO], error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	var total int
	err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM transaksi WHERE kasir_id = ?`, kasirID)
	if err != nil {
		return nil, err
	}

	lastPage := int(math.Ceil(float64(total) / float64(perPage)))
	if lastPage < 1 {
		lastPage = 1
	}

	type TrxRow struct {
		TransaksiID      int     `db:"transaksi_id"`
		AnggotaID        *int    `db:"anggota_id"`
		TotalHarga       float64 `db:"total_harga"`
		TotalKeuntungan  float64 `db:"total_keuntungan"`
		MetodePembayaran string  `db:"metode_pembayaran"`
		Status           string  `db:"status"`
		CreatedAt        string  `db:"created_at"`
		NamaAnggota      *string `db:"nama_anggota"`
		NamaKasir        *string `db:"nama_kasir"`
	}

	var rows []TrxRow
	err = r.db.SelectContext(ctx, &rows, `
		SELECT t.transaksi_id, t.anggota_id,
		       COALESCE(t.total_harga, 0) as total_harga,
		       COALESCE(t.total_keuntungan, 0) as total_keuntungan,
		       COALESCE(t.metode_pembayaran, 'cash') as metode_pembayaran,
		       COALESCE(t.status, 'selesai') as status,
		       COALESCE(t.created_at, '') as created_at,
		       a.nama_lengkap as nama_anggota,
		       u.username as nama_kasir
		FROM transaksi t
		LEFT JOIN anggota a ON a.anggota_id = t.anggota_id
		LEFT JOIN users u ON u.user_id = t.kasir_id
		WHERE t.kasir_id = ?
		ORDER BY t.created_at DESC
		LIMIT ? OFFSET ?
	`, kasirID, perPage, offset)
	if err != nil {
		return nil, err
	}

	list := make([]model.RiwayatTransaksiDTO, 0, len(rows))
	for _, row := range rows {
		cAt := row.CreatedAt
		list = append(list, model.RiwayatTransaksiDTO{
			ID:               row.TransaksiID,
			TransaksiID:      row.TransaksiID,
			AnggotaID:        row.AnggotaID,
			Total:            row.TotalHarga,
			TotalHarga:       row.TotalHarga,
			TotalKeuntungan:  row.TotalKeuntungan,
			JenisTransaksi:   "penjualan",
			MetodePembayaran: row.MetodePembayaran,
			Status:           row.Status,
			CreatedAt:        &cAt,
			NamaAnggota:      row.NamaAnggota,
			NamaKasir:        row.NamaKasir,
		})
	}

	return &model.LaravelPaginatorDTO[model.RiwayatTransaksiDTO]{
		CurrentPage: page,
		LastPage:    lastPage,
		Total:       total,
		PerPage:     perPage,
		Data:        list,
	}, nil
}

// SetorAdmin menyimpan setoran kasir ke admin
func (r *KasirRepo) SetorAdmin(kasirID int, nominal float64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO setoran_kasir (kasir_id, nominal, status, created_at)
		VALUES (?, ?, 'pending', CURRENT_TIMESTAMP)
	`, kasirID, nominal)
	return err
}

// GetRiwayatSetoran mengambil histori setoran kasir
func (r *KasirRepo) GetRiwayatSetoran(kasirID int) ([]model.SetoranKasirDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		SetoranID  int     `db:"setoran_id"`
		KasirID    *int    `db:"kasir_id"`
		Nominal    float64 `db:"nominal"`
		Status     string  `db:"status"`
		ApprovedBy *int    `db:"approved_by"`
		CreatedAt  string  `db:"created_at"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT setoran_id, kasir_id, nominal, status, approved_by, COALESCE(created_at, '') as created_at
		FROM setoran_kasir
		WHERE kasir_id = ?
		ORDER BY created_at DESC
	`, kasirID)
	if err != nil {
		return nil, err
	}

	list := make([]model.SetoranKasirDTO, 0, len(rows))
	for _, row := range rows {
		cAt := row.CreatedAt
		list = append(list, model.SetoranKasirDTO{
			SetoranID:  row.SetoranID,
			ID:         row.SetoranID,
			KasirID:    row.KasirID,
			Nominal:    row.Nominal,
			Status:     row.Status,
			ApprovedBy: row.ApprovedBy,
			CreatedAt:  &cAt,
		})
	}

	return list, nil
}

// GetDaftarKasir mengambil daftar user kasir untuk tujuan serah terima
func (r *KasirRepo) GetDaftarKasir() ([]model.DaftarKasirDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		UserID      int    `db:"user_id"`
		Username    string `db:"username"`
		NamaLengkap string `db:"nama_lengkap"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT u.user_id, u.username, COALESCE(a.nama_lengkap, u.username) as nama_lengkap
		FROM users u
		LEFT JOIN anggota a ON a.user_id = u.user_id
		WHERE u.role = 'kasir'
		ORDER BY u.username ASC
	`)
	if err != nil {
		return nil, err
	}

	list := make([]model.DaftarKasirDTO, 0, len(rows))
	for _, row := range rows {
		list = append(list, model.DaftarKasirDTO{
			UserID:      row.UserID,
			Username:    row.Username,
			NamaLengkap: row.NamaLengkap,
		})
	}

	return list, nil
}

// GetSerahTerimaForMe mengambil daftar serah terima kasir masuk / keluar
func (r *KasirRepo) GetSerahTerimaForMe(kasirID, page, perPage int) (*model.LaravelPaginatorDTO[model.SerahTerimaDTO], error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	var total int
	err := r.db.GetContext(ctx, &total, `
		SELECT COUNT(*) FROM serah_terima_kasir WHERE kasir_to = ? OR kasir_from = ?
	`, kasirID, kasirID)
	if err != nil {
		return nil, err
	}

	lastPage := int(math.Ceil(float64(total) / float64(perPage)))
	if lastPage < 1 {
		lastPage = 1
	}

	type Row struct {
		SerahID         int     `db:"serah_id"`
		KasirFrom       int     `db:"kasir_from"`
		KasirTo         int     `db:"kasir_to"`
		Status          string  `db:"status"`
		HasilOpname     *string `db:"hasil_opname"`
		AlasanPenolakan *string `db:"alasan_penolakan"`
		CreatedAt       string  `db:"created_at"`
		KasirFromName   string  `db:"kasir_from_name"`
		KasirToName     string  `db:"kasir_to_name"`
	}

	var rows []Row
	err = r.db.SelectContext(ctx, &rows, `
		SELECT st.serah_id, st.kasir_from, st.kasir_to, st.status,
		       st.hasil_opname, st.alasan_penolakan, COALESCE(st.created_at, '') as created_at,
		       COALESCE(uf.username, '') as kasir_from_name,
		       COALESCE(ut.username, '') as kasir_to_name
		FROM serah_terima_kasir st
		LEFT JOIN users uf ON uf.user_id = st.kasir_from
		LEFT JOIN users ut ON ut.user_id = st.kasir_to
		WHERE st.kasir_to = ? OR st.kasir_from = ?
		ORDER BY st.created_at DESC
		LIMIT ? OFFSET ?
	`, kasirID, kasirID, perPage, offset)
	if err != nil {
		return nil, err
	}

	list := make([]model.SerahTerimaDTO, 0, len(rows))
	for _, row := range rows {
		cAt := row.CreatedAt
		uangFisik := 0.0
		if row.HasilOpname != nil {
			var h map[string]interface{}
			if err := json.Unmarshal([]byte(*row.HasilOpname), &h); err == nil {
				if uf, ok := h["uang_fisik"].(float64); ok {
					uangFisik = uf
				}
			}
		}

		list = append(list, model.SerahTerimaDTO{
			SerahID:         row.SerahID,
			KasirFrom:       row.KasirFrom,
			KasirTo:         row.KasirTo,
			KasirFromName:   row.KasirFromName,
			KasirToName:     row.KasirToName,
			Status:          row.Status,
			UangFisik:       uangFisik,
			AlasanPenolakan: row.AlasanPenolakan,
			CreatedAt:       &cAt,
		})
	}

	return &model.LaravelPaginatorDTO[model.SerahTerimaDTO]{
		CurrentPage: page,
		LastPage:    lastPage,
		Total:       total,
		PerPage:     perPage,
		Data:        list,
	}, nil
}

// CreateSerahTerima membuat draft penyerahan shift kasir
func (r *KasirRepo) CreateSerahTerima(kasirFrom, kasirTo int, uangFisik float64, catatan *string) (*model.CreateSerahTerimaDataDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	payload := map[string]interface{}{
		"uang_fisik": uangFisik,
		"catatan":    catatan,
		"timestamp":  time.Now().Format("2006-01-02 15:04:05"),
	}
	b, _ := json.Marshal(payload)

	res, err := r.db.ExecContext(ctx, `
		INSERT INTO serah_terima_kasir (kasir_from, kasir_to, hasil_opname, status, created_at, updated_at)
		VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`, kasirFrom, kasirTo, string(b))
	if err != nil {
		return nil, err
	}

	id, _ := res.LastInsertId()
	return &model.CreateSerahTerimaDataDTO{SerahID: int(id)}, nil
}

// ApproveSerahTerima menyetujui penerimaan shift kasir
func (r *KasirRepo) ApproveSerahTerima(serahID, kasirTo int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, `
		UPDATE serah_terima_kasir
		SET status = 'approved', updated_at = CURRENT_TIMESTAMP
		WHERE serah_id = ? AND kasir_to = ? AND status = 'pending'
	`, serahID, kasirTo)
	return err
}

// RejectSerahTerima menolak penerimaan shift kasir
func (r *KasirRepo) RejectSerahTerima(serahID, kasirTo int, alasan string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, `
		UPDATE serah_terima_kasir
		SET status = 'rejected', alasan_penolakan = ?, updated_at = CURRENT_TIMESTAMP
		WHERE serah_id = ? AND kasir_to = ? AND status = 'pending'
	`, alasan, serahID, kasirTo)
	return err
}

// GetAntreanTarikTunai mengambil antrean pengajuan tarik tunai anggota
func (r *KasirRepo) GetAntreanTarikTunai() ([]model.AntreanTarikTunaiDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		TarikID       int     `db:"tarik_id"`
		KodePenarikan string  `db:"kode_penarikan"`
		AnggotaID     int     `db:"anggota_id"`
		NamaAnggota   string  `db:"nama_lengkap"`
		Nominal       float64 `db:"nominal"`
		SumberDana    string  `db:"sumber_dana"`
		Status        string  `db:"status"`
		CreatedAt     string  `db:"created_at"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT t.tarik_id, t.kode_penarikan, t.anggota_id,
		       COALESCE(a.nama_lengkap, '') as nama_lengkap,
		       t.nominal, t.sumber_dana, t.status,
		       COALESCE(t.created_at, '') as created_at
		FROM tarik_tunai t
		LEFT JOIN anggota a ON a.anggota_id = t.anggota_id
		WHERE t.status = 'pending'
		ORDER BY t.created_at ASC
	`)
	if err != nil {
		return nil, err
	}

	list := make([]model.AntreanTarikTunaiDTO, 0, len(rows))
	for _, row := range rows {
		list = append(list, model.AntreanTarikTunaiDTO{
			TarikID:       row.TarikID,
			KodePenarikan: row.KodePenarikan,
			AnggotaID:     row.AnggotaID,
			NamaAnggota:   row.NamaAnggota,
			Nominal:       row.Nominal,
			SumberDana:    row.SumberDana,
			Status:        row.Status,
			CreatedAt:     row.CreatedAt,
		})
	}

	return list, nil
}

// ProsesTarikTunai mengeksekusi penarikan tunai anggota di kasir
func (r *KasirRepo) ProsesTarikTunai(kasirID, tarikID int) (*model.TarikTunaiReceiptDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var t struct {
		TarikID       int     `db:"tarik_id"`
		KodePenarikan string  `db:"kode_penarikan"`
		AnggotaID     int     `db:"anggota_id"`
		Nominal       float64 `db:"nominal"`
		SumberDana    string  `db:"sumber_dana"`
		Status        string  `db:"status"`
	}
	err = tx.GetContext(ctx, &t, `
		SELECT tarik_id, kode_penarikan, anggota_id, nominal, sumber_dana, status
		FROM tarik_tunai WHERE tarik_id = ?
	`, tarikID)
	if err != nil {
		return nil, errors.New("Tiket penarikan tidak ditemukan.")
	}
	if t.Status != "pending" {
		return nil, errors.New("Tiket penarikan sudah diproses sebelumnya.")
	}

	// Update status tiket
	_, err = tx.ExecContext(ctx, `
		UPDATE tarik_tunai
		SET status = 'approved', kasir_id = ?, approved_at = CURRENT_TIMESTAMP
		WHERE tarik_id = ?
	`, kasirID, tarikID)
	if err != nil {
		return nil, err
	}

	// Potong saldo SHU atau E-Wallet anggota
	if t.SumberDana == "shu" {
		_, err = tx.ExecContext(ctx, `UPDATE anggota SET shu = shu - ? WHERE anggota_id = ?`, t.Nominal, t.AnggotaID)
	} else {
		_, err = tx.ExecContext(ctx, `UPDATE anggota SET saldo = saldo - ? WHERE anggota_id = ?`, t.Nominal, t.AnggotaID)
	}
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	var namaAnggota string
	_ = r.db.GetContext(ctx, &namaAnggota, `SELECT COALESCE(nama_lengkap, '') FROM anggota WHERE anggota_id = ?`, t.AnggotaID)
	var kasirName string
	_ = r.db.GetContext(ctx, &kasirName, `SELECT username FROM users WHERE user_id = ?`, kasirID)

	return &model.TarikTunaiReceiptDTO{
		TarikID:              t.TarikID,
		KodePenarikan:        t.KodePenarikan,
		NamaAnggota:          namaAnggota,
		Nominal:              t.Nominal,
		SumberDana:           t.SumberDana,
		UangBersihDiserahkan: t.Nominal,
		Status:               "approved",
		KasirName:            kasirName,
		ApprovedAt:           time.Now().Format("2006-01-02 15:04:05"),
	}, nil
}

// ─── Pesanan Anggota Online & Polling Notifikasi ─────────────────────────────

// GetLatestPendingOrders mengambil pesanan tertunda untuk polling alert kasir
func (r *KasirRepo) GetLatestPendingOrders(kasirID int) (*model.LatestPendingOrdersResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Cek active shift
	var activeShiftCount int
	_ = r.db.GetContext(ctx, &activeShiftCount, `
		SELECT COUNT(*) FROM serah_terima_kasir WHERE kasir_to = ? AND status = 'approved'
	`, kasirID)
	isActiveShift := activeShiftCount > 0

	// Jika kasirID adalah admin, selalu aktif
	var role string
	_ = r.db.GetContext(ctx, &role, `SELECT role FROM users WHERE user_id = ?`, kasirID)
	if role == "admin" {
		isActiveShift = true
	}

	// 2. Query 10 pending orders
	type OrderRow struct {
		TransaksiID      int     `db:"transaksi_id"`
		AnggotaID        *int    `db:"anggota_id"`
		NamaAnggota      *string `db:"nama_anggota"`
		Username         *string `db:"username"`
		TotalHarga       float64 `db:"total_harga"`
		MetodePembayaran string  `db:"metode_pembayaran"`
		CreatedAt        *string `db:"created_at"`
	}

	var rows []OrderRow
	err := r.db.SelectContext(ctx, &rows, `
		SELECT t.transaksi_id, t.anggota_id,
		       COALESCE(a.nama_lengkap, 'Anggota #' || t.anggota_id) as nama_anggota,
		       COALESCE(u.username, '') as username,
		       t.total_harga, t.metode_pembayaran, t.created_at
		FROM transaksi t
		LEFT JOIN anggota a ON a.anggota_id = t.anggota_id
		LEFT JOIN users u ON u.user_id = a.user_id
		WHERE t.status = 'pending'
		ORDER BY t.created_at DESC, t.transaksi_id DESC
		LIMIT 10
	`)
	if err != nil {
		return nil, err
	}

	orders := make([]model.LatestOrderDTO, 0, len(rows))
	for _, row := range rows {
		// Detail items
		type ItemRow struct {
			Jumlah     int    `db:"jumlah"`
			NamaBarang string `db:"nama_barang"`
		}
		var itemRows []ItemRow
		_ = r.db.SelectContext(ctx, &itemRows, `
			SELECT d.jumlah, COALESCE(b.nama_barang, 'Item') as nama_barang
			FROM transaksi_detail d
			LEFT JOIN barang b ON b.barang_id = d.barang_id
			WHERE d.transaksi_id = ?
		`, row.TransaksiID)

		var summaries []string
		for _, ir := range itemRows {
			summaries = append(summaries, fmt.Sprintf("%dx %s", ir.Jumlah, ir.NamaBarang))
		}
		summaryStr := strings.Join(summaries, ", ")

		namaAnggota := ""
		if row.NamaAnggota != nil {
			namaAnggota = *row.NamaAnggota
		}
		uname := ""
		if row.Username != nil {
			uname = *row.Username
		}

		orders = append(orders, model.LatestOrderDTO{
			TransaksiID:      row.TransaksiID,
			AnggotaID:        row.AnggotaID,
			NamaAnggota:      namaAnggota,
			Username:         uname,
			TotalHarga:       row.TotalHarga,
			MetodePembayaran: row.MetodePembayaran,
			ItemsCount:       len(itemRows),
			ItemsSummary:     summaryStr,
			CreatedAt:        row.CreatedAt,
			IsTest:           false,
		})
	}

	var latestOrder *model.LatestOrderDTO
	if len(orders) > 0 {
		latestOrder = &orders[0]
	}

	nowTs := float64(time.Now().UnixNano()) / 1e9
	return &model.LatestPendingOrdersResponse{
		Success:         true,
		IsActiveShift:   isActiveShift,
		PendingCount:    len(orders),
		LatestOrder:     latestOrder,
		Orders:          orders,
		ServerTimestamp: &nowTs,
	}, nil
}

// TestOrderNotification mensimulasikan notifikasi pesanan masuk
func (r *KasirRepo) TestOrderNotification() (*model.LatestOrderDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var dummyNama string
	_ = r.db.GetContext(ctx, &dummyNama, `SELECT COALESCE(nama_lengkap, 'Zulkarnain') FROM anggota LIMIT 1`)
	if dummyNama == "" {
		dummyNama = "Zulkarnain"
	}

	nowStr := time.Now().Format("2006-01-02 15:04:05")
	simulatedID := 9000 + rand.Intn(999)

	return &model.LatestOrderDTO{
		TransaksiID:      simulatedID,
		AnggotaID:        nil,
		NamaAnggota:      dummyNama,
		Username:         "anggota_simulasi",
		TotalHarga:       25500,
		MetodePembayaran: "hutang",
		ItemsCount:       2,
		ItemsSummary:     "2x Kopi Kapal Api, 1x Roti Manis",
		CreatedAt:        &nowStr,
		IsTest:           true,
	}, nil
}

// GetPesananAnggota mengambil semua antrean pesanan anggota yang statusnya pending
func (r *KasirRepo) GetPesananAnggota() ([]model.PesananAnggotaDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type TrxRow struct {
		TransaksiID      int     `db:"transaksi_id"`
		AnggotaID        *int    `db:"anggota_id"`
		NamaAnggota      *string `db:"nama_anggota"`
		MetodePembayaran string  `db:"metode_pembayaran"`
		TotalHarga       float64 `db:"total_harga"`
		CreatedAt        *string `db:"created_at"`
	}

	var trxs []TrxRow
	err := r.db.SelectContext(ctx, &trxs, `
		SELECT t.transaksi_id, t.anggota_id,
		       COALESCE(a.nama_lengkap, 'Unknown') as nama_anggota,
		       t.metode_pembayaran, t.total_harga, t.created_at
		FROM transaksi t
		LEFT JOIN anggota a ON a.anggota_id = t.anggota_id
		WHERE t.status = 'pending'
		ORDER BY t.created_at DESC
	`)
	if err != nil {
		return nil, err
	}

	result := make([]model.PesananAnggotaDTO, 0, len(trxs))
	for _, t := range trxs {
		// Items
		type DetailRow struct {
			BarangID    int     `db:"barang_id"`
			NamaBarang  string  `db:"nama_barang"`
			Jumlah      int     `db:"jumlah"`
			HargaSatuan float64 `db:"harga_satuan"`
		}
		var dRows []DetailRow
		_ = r.db.SelectContext(ctx, &dRows, `
			SELECT d.barang_id, COALESCE(b.nama_barang, '') as nama_barang, d.jumlah, d.harga_satuan
			FROM transaksi_detail d
			LEFT JOIN barang b ON b.barang_id = d.barang_id
			WHERE d.transaksi_id = ?
		`, t.TransaksiID)

		items := make([]model.PesananItemDTO, 0, len(dRows))
		for _, d := range dRows {
			items = append(items, model.PesananItemDTO{
				BarangID:    d.BarangID,
				NamaBarang:  d.NamaBarang,
				Jumlah:      d.Jumlah,
				HargaSatuan: d.HargaSatuan,
			})
		}

		// Attached tarik tunai jika ada
		type TTRow struct {
			TarikID       int     `db:"tarik_id"`
			KodePenarikan string  `db:"kode_penarikan"`
			Nominal       float64 `db:"nominal"`
			SumberDana    string  `db:"sumber_dana"`
		}
		var ttRow TTRow
		var ttDTO *model.PesananTarikTunaiDTO
		errTT := r.db.GetContext(ctx, &ttRow, `
			SELECT tarik_id, kode_penarikan, nominal, sumber_dana
			FROM tarik_tunai
			WHERE transaksi_id = ? AND status = 'pending'
		`, t.TransaksiID)
		if errTT == nil {
			uangBersih := math.Max(0, ttRow.Nominal-t.TotalHarga)
			ttDTO = &model.PesananTarikTunaiDTO{
				TarikID:              ttRow.TarikID,
				KodePenarikan:        ttRow.KodePenarikan,
				Nominal:              ttRow.Nominal,
				SumberDana:           ttRow.SumberDana,
				UangBersihDiserahkan: uangBersih,
			}
		}

		namaAnggota := "Unknown"
		if t.NamaAnggota != nil {
			namaAnggota = *t.NamaAnggota
		}

		result = append(result, model.PesananAnggotaDTO{
			TransaksiID:      t.TransaksiID,
			AnggotaID:        t.AnggotaID,
			NamaAnggota:      namaAnggota,
			MetodePembayaran: t.MetodePembayaran,
			TotalHarga:       t.TotalHarga,
			CreatedAt:        t.CreatedAt,
			TarikTunai:       ttDTO,
			Items:            items,
		})
	}

	return result, nil
}

// SimpanTransaksiKasir memproses & menyelesaikan pesanan anggota oleh kasir
func (r *KasirRepo) SimpanTransaksiKasir(kasirID int, transaksiIDs []int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	tahun := time.Now().Year()

	for _, tid := range transaksiIDs {
		var trx struct {
			TransaksiID     int     `db:"transaksi_id"`
			AnggotaID       *int    `db:"anggota_id"`
			TotalKeuntungan float64 `db:"total_keuntungan"`
			Status          string  `db:"status"`
		}
		err := tx.GetContext(ctx, &trx, `
			SELECT transaksi_id, anggota_id, total_keuntungan, status
			FROM transaksi WHERE transaksi_id = ? AND status = 'pending'
		`, tid)
		if err != nil {
			continue // skip jika tidak ada atau bukan pending
		}

		// Update status transaksi jadi selesai
		_, err = tx.ExecContext(ctx, `
			UPDATE transaksi
			SET status = 'selesai', kasir_id = ?
			WHERE transaksi_id = ?
		`, kasirID, tid)
		if err != nil {
			return err
		}

		// Hitung dan distribusikan SHU (60% anggota, 10% & 30% koperasi)
		if trx.AnggotaID != nil && trx.TotalKeuntungan > 0 {
			shu60 := trx.TotalKeuntungan * 0.60
			shu10 := trx.TotalKeuntungan * 0.10
			shu30 := trx.TotalKeuntungan * 0.30

			_, err = tx.ExecContext(ctx, `UPDATE anggota SET shu = shu + ? WHERE anggota_id = ?`, shu60, *trx.AnggotaID)
			if err != nil {
				return err
			}

			// Catat distribusi SHU
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO shu_distribusi (anggota_id, tahun, shu_60_percent, shu_10_percent, shu_30_percent, created_at)
				VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			`, *trx.AnggotaID, tahun, shu60, shu10, shu30)
		}

		// Selesaikan attached tarik tunai jika ada
		_, _ = tx.ExecContext(ctx, `
			UPDATE tarik_tunai
			SET status = 'approved', kasir_id = ?, approved_at = CURRENT_TIMESTAMP
			WHERE transaksi_id = ? AND status = 'pending'
		`, kasirID, tid)
	}

	return tx.Commit()
}

// TolakPesananAnggota menolak pesanan anggota dan mengembalikan stok serta saldo/limit
func (r *KasirRepo) TolakPesananAnggota(kasirID int, transaksiIDs []int, alasan *string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	alasanStr := "Pesanan ditolak oleh kasir"
	if alasan != nil && *alasan != "" {
		alasanStr = *alasan
	}

	for _, tid := range transaksiIDs {
		var trx struct {
			TransaksiID      int     `db:"transaksi_id"`
			AnggotaID        *int    `db:"anggota_id"`
			TotalHarga       float64 `db:"total_harga"`
			MetodePembayaran string  `db:"metode_pembayaran"`
			Status           string  `db:"status"`
		}
		err := tx.GetContext(ctx, &trx, `
			SELECT transaksi_id, anggota_id, total_harga, metode_pembayaran, status
			FROM transaksi WHERE transaksi_id = ? AND status = 'pending'
		`, tid)
		if err != nil {
			continue
		}

		// 1. Kembalikan stok barang
		type Detail struct {
			BarangID int `db:"barang_id"`
			Jumlah   int `db:"jumlah"`
		}
		var details []Detail
		_ = tx.SelectContext(ctx, &details, `SELECT barang_id, jumlah FROM transaksi_detail WHERE transaksi_id = ?`, tid)
		for _, d := range details {
			_, _ = tx.ExecContext(ctx, `UPDATE barang SET stok_toko = stok_toko + ? WHERE barang_id = ?`, d.Jumlah, d.BarangID)
		}

		// 2. Kembalikan hutang / saldo anggota
		if trx.AnggotaID != nil {
			if trx.MetodePembayaran == "hutang" {
				_, _ = tx.ExecContext(ctx, `UPDATE anggota SET hutang = MAX(0, hutang - ?) WHERE anggota_id = ?`, trx.TotalHarga, *trx.AnggotaID)
			} else if trx.MetodePembayaran == "saldo" || trx.MetodePembayaran == "ewallet" {
				_, _ = tx.ExecContext(ctx, `UPDATE anggota SET saldo = saldo + ? WHERE anggota_id = ?`, trx.TotalHarga, *trx.AnggotaID)
			}

			// 2b. Kembalikan attached tarik tunai jika ada
			var tt struct {
				TarikID    int     `db:"tarik_id"`
				Nominal    float64 `db:"nominal"`
				SumberDana string  `db:"sumber_dana"`
			}
			errTT := tx.GetContext(ctx, &tt, `SELECT tarik_id, nominal, sumber_dana FROM tarik_tunai WHERE transaksi_id = ? AND status = 'pending'`, tid)
			if errTT == nil {
				if tt.SumberDana == "shu" {
					_, _ = tx.ExecContext(ctx, `UPDATE anggota SET shu = shu + ? WHERE anggota_id = ?`, tt.Nominal, *trx.AnggotaID)
				} else {
					_, _ = tx.ExecContext(ctx, `UPDATE anggota SET saldo = saldo + ? WHERE anggota_id = ?`, tt.Nominal, *trx.AnggotaID)
				}
				_, _ = tx.ExecContext(ctx, `UPDATE tarik_tunai SET status = 'rejected', alasan_tolak = ?, kasir_id = ? WHERE tarik_id = ?`, alasanStr, kasirID, tt.TarikID)
			}
		}

		// 3. Update transaksi jadi ditolak
		_, err = tx.ExecContext(ctx, `
			UPDATE transaksi
			SET status = 'ditolak', kasir_id = ?
			WHERE transaksi_id = ?
		`, kasirID, tid)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// GetAllPembayaranHutang mengambil daftar pembayaran hutang yang menunggu konfirmasi kasir
func (r *KasirRepo) GetAllPembayaranHutang() ([]model.PembayaranHutangDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		PembayaranID int     `db:"pembayaran_id"`
		AnggotaID    int     `db:"anggota_id"`
		NamaAnggota  *string `db:"nama_anggota"`
		Nominal      float64 `db:"nominal"`
		Status       string  `db:"status"`
		CreatedAt    *string `db:"created_at"`
		NamaKasir    *string `db:"nama_kasir"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT p.pembayaran_id, p.anggota_id,
		       COALESCE(a.nama_lengkap, 'Unknown') as nama_anggota,
		       p.nominal, p.status, p.created_at,
		       u.username as nama_kasir
		FROM pembayaran_hutang p
		LEFT JOIN anggota a ON a.anggota_id = p.anggota_id
		LEFT JOIN users u ON u.user_id = p.kasir_id
		ORDER BY CASE p.status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 WHEN 'rejected' THEN 3 ELSE 4 END,
		         p.created_at DESC
	`)
	if err != nil {
		return nil, err
	}

	list := make([]model.PembayaranHutangDTO, 0, len(rows))
	for _, r := range rows {
		nama := "Unknown"
		if r.NamaAnggota != nil {
			nama = *r.NamaAnggota
		}
		list = append(list, model.PembayaranHutangDTO{
			PembayaranID: r.PembayaranID,
			AnggotaID:    r.AnggotaID,
			NamaAnggota:  nama,
			Nominal:      r.Nominal,
			Status:       r.Status,
			CreatedAt:    r.CreatedAt,
			NamaKasir:    r.NamaKasir,
		})
	}
	return list, nil
}

// ApprovePembayaranHutang menyetujui atau menolak pembayaran hutang anggota
func (r *KasirRepo) ApprovePembayaranHutang(kasirID int, pembayaranID int, action string, metodePembayaran string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var p struct {
		PembayaranID int     `db:"pembayaran_id"`
		AnggotaID    int     `db:"anggota_id"`
		Nominal      float64 `db:"nominal"`
		Status       string  `db:"status"`
	}
	err = tx.GetContext(ctx, &p, `
		SELECT pembayaran_id, anggota_id, nominal, status
		FROM pembayaran_hutang WHERE pembayaran_id = ?
	`, pembayaranID)
	if err != nil {
		return errors.New("Data pembayaran hutang tidak ditemukan")
	}
	if p.Status != "pending" {
		return errors.New("Data pembayaran hutang sudah diproses sebelumnya")
	}

	if action == "approve" {
		// Potong hutang anggota
		_, err = tx.ExecContext(ctx, `
			UPDATE anggota
			SET hutang = MAX(0, hutang - ?)
			WHERE anggota_id = ?
		`, p.Nominal, p.AnggotaID)
		if err != nil {
			return err
		}

		metode := "cash"
		if metodePembayaran != "" {
			metode = metodePembayaran
		}

		_, err = tx.ExecContext(ctx, `
			UPDATE pembayaran_hutang
			SET status = 'approved', kasir_id = ?, approved_at = CURRENT_TIMESTAMP, metode_pembayaran = ?
			WHERE pembayaran_id = ?
		`, kasirID, metode, pembayaranID)
		if err != nil {
			return err
		}
	} else {
		_, err = tx.ExecContext(ctx, `
			UPDATE pembayaran_hutang
			SET status = 'rejected', kasir_id = ?, approved_at = CURRENT_TIMESTAMP
			WHERE pembayaran_id = ?
		`, kasirID, pembayaranID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
