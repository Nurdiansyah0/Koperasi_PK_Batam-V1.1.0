package repository

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/koperasipk/backend-go/internal/model"
)

type AnggotaRepo struct {
	db *sqlx.DB
}

func NewAnggotaRepo(db *sqlx.DB) *AnggotaRepo {
	return &AnggotaRepo{db: db}
}

// GetAnggotaByUserID mengambil data anggota berdasarkan user_id
func (r *AnggotaRepo) GetAnggotaByUserID(userID int) (*model.Anggota, *model.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user model.User
	err := r.db.GetContext(ctx, &user, `
		SELECT user_id, username, role, COALESCE(created_at, '') as created_at
		FROM users WHERE user_id = ?
	`, userID)
	if err != nil {
		return nil, nil, err
	}

	var anggota model.Anggota
	err = r.db.GetContext(ctx, &anggota, `
		SELECT anggota_id, user_id, nama_lengkap, email,
		       saldo, simpanan_pokok, simpanan_wajib, hutang, shu,
		       persetujuan_shu_master_at
		FROM anggota WHERE user_id = ?
		LIMIT 1
	`, userID)
	if err != nil {
		return nil, &user, err
	}

	return &anggota, &user, nil
}

// GetProfil mengambil profil terhitung untuk anggota
func (r *AnggotaRepo) GetProfil(userID int) (*model.ProfilAnggotaDTO, error) {
	anggota, user, err := r.GetAnggotaByUserID(userID)
	if err != nil {
		return nil, err
	}

	simpananPokok := anggota.SimpananPokok
	allowance := 0.0
	if simpananPokok > 0 {
		allowance = 100000.0
	}
	limitHutang := 0.0
	if simpananPokok > 0 {
		limitHutang = simpananPokok + allowance
	}
	sisaLimit := math.Max(0, limitHutang-anggota.Hutang)

	return &model.ProfilAnggotaDTO{
		AnggotaID:       anggota.AnggotaID,
		UserID:          user.UserID,
		NamaLengkap:     anggota.NamaLengkap,
		Username:        user.Username,
		Saldo:           anggota.Saldo,
		Hutang:          anggota.Hutang,
		Shu:             anggota.Shu,
		SimpananPokok:   simpananPokok,
		AllowanceHutang: allowance,
		LimitHutang:     limitHutang,
		SisaLimitHutang: sisaLimit,
	}, nil
}

// GetHistoriTransaksi mengambil daftar transaksi anggota berpaginasi beserta item-itemnya
func (r *AnggotaRepo) GetHistoriTransaksi(anggotaID, page, perPage int) (*model.TransaksiPaginatorDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 15
	}
	offset := (page - 1) * perPage

	var total int
	err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM transaksi WHERE anggota_id = ?`, anggotaID)
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
		KasirID          *int    `db:"kasir_id"`
		TotalHarga       float64 `db:"total_harga"`
		TotalKeuntungan  float64 `db:"total_keuntungan"`
		MetodePembayaran string  `db:"metode_pembayaran"`
		Status           string  `db:"status"`
		CreatedAt        string  `db:"created_at"`
		NamaKasir        *string `db:"nama_kasir"`
	}

	var rows []TrxRow
	err = r.db.SelectContext(ctx, &rows, `
		SELECT t.transaksi_id, t.anggota_id, t.kasir_id,
		       COALESCE(t.total_harga, 0) as total_harga,
		       COALESCE(t.total_keuntungan, 0) as total_keuntungan,
		       COALESCE(t.metode_pembayaran, 'tunai') as metode_pembayaran,
		       COALESCE(t.status, 'selesai') as status,
		       COALESCE(t.created_at, '') as created_at,
		       u.username as nama_kasir
		FROM transaksi t
		LEFT JOIN users u ON u.user_id = t.kasir_id
		WHERE t.anggota_id = ?
		ORDER BY t.created_at DESC
		LIMIT ? OFFSET ?
	`, anggotaID, perPage, offset)
	if err != nil {
		return nil, err
	}

	trxList := make([]model.TransaksiAnggotaDTO, 0, len(rows))
	for _, row := range rows {
		// Ambil detail items
		type ItemRow struct {
			DetailID    int     `db:"detail_id"`
			BarangID    int     `db:"barang_id"`
			NamaBarang  string  `db:"nama_barang"`
			Jumlah      int     `db:"jumlah"`
			HargaSatuan float64 `db:"harga_satuan"`
			Subtotal    float64 `db:"subtotal"`
		}
		var itemRows []ItemRow
		_ = r.db.SelectContext(ctx, &itemRows, `
			SELECT d.detail_id, d.barang_id,
			       COALESCE(b.nama_barang, 'Barang') as nama_barang,
			       COALESCE(d.jumlah, 1) as jumlah,
			       COALESCE(d.harga_satuan, 0) as harga_satuan,
			       COALESCE(d.subtotal, 0) as subtotal
			FROM transaksi_detail d
			LEFT JOIN barang b ON b.barang_id = d.barang_id
			WHERE d.transaksi_id = ?
		`, row.TransaksiID)

		items := make([]model.TransaksiDetailItemDTO, 0, len(itemRows))
		for _, item := range itemRows {
			items = append(items, model.TransaksiDetailItemDTO{
				TransaksiDetailID: item.DetailID,
				BarangID:          item.BarangID,
				NamaBarang:        item.NamaBarang,
				Jumlah:            item.Jumlah,
				HargaSatuan:       item.HargaSatuan,
				Subtotal:          item.Subtotal,
			})
		}

		createdAt := row.CreatedAt
		trxList = append(trxList, model.TransaksiAnggotaDTO{
			TransaksiID:      row.TransaksiID,
			AnggotaID:        row.AnggotaID,
			KasirID:          row.KasirID,
			TotalHarga:       row.TotalHarga,
			TotalKeuntungan:  row.TotalKeuntungan,
			MetodePembayaran: row.MetodePembayaran,
			Status:           row.Status,
			CreatedAt:        &createdAt,
			NamaKasir:        row.NamaKasir,
			Items:            items,
		})
	}

	return &model.TransaksiPaginatorDTO{
		CurrentPage: page,
		Data:        trxList,
		LastPage:    lastPage,
		PerPage:     perPage,
		Total:       total,
	}, nil
}

// GetBarang mengambil katalog barang yang memiliki stok di toko
func (r *AnggotaRepo) GetBarang() ([]model.BarangAnggotaDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type BarangRow struct {
		BarangID  int     `db:"barang_id"`
		Nama      string  `db:"nama_barang"`
		StokToko  int     `db:"stok_toko"`
		HargaJual float64 `db:"harga_jual"`
	}

	var rows []BarangRow
	err := r.db.SelectContext(ctx, &rows, `
		SELECT barang_id, nama_barang, stok_toko, COALESCE(harga_jual, 0) as harga_jual
		FROM barang
		WHERE stok_toko > 0
		ORDER BY nama_barang ASC
	`)
	if err != nil {
		return nil, err
	}

	result := make([]model.BarangAnggotaDTO, 0, len(rows))
	for _, row := range rows {
		hJual := row.HargaJual
		result = append(result, model.BarangAnggotaDTO{
			BarangID:  row.BarangID,
			NamaBarang: row.Nama,
			Stok:      row.StokToko,
			HargaJual: hJual,
			Harga:     &hJual,
		})
	}

	return result, nil
}

// CekKelayakanTarikTunai mengevaluasi aturan kelayakan penarikan SHU
func (r *AnggotaRepo) CekKelayakanTarikTunai(anggotaID int) (*model.KelayakanTarikTunaiDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var anggota model.Anggota
	err := r.db.GetContext(ctx, &anggota, `
		SELECT anggota_id, user_id, nama_lengkap, saldo, hutang, shu, persetujuan_shu_master_at
		FROM anggota WHERE anggota_id = ?
	`, anggotaID)
	if err != nil {
		return nil, err
	}

	// 1. Cek master consent
	hasMasterConsent := anggota.PersetujuanShuMasterAt != nil && *anggota.PersetujuanShuMasterAt != ""

	// 2. Cek pembelian hari ini (min Rp 25.000)
	var belanjaHariIni float64
	_ = r.db.GetContext(ctx, &belanjaHariIni, `
		SELECT COALESCE(SUM(total_harga), 0)
		FROM transaksi
		WHERE anggota_id = ? AND DATE(created_at) = DATE('now', 'localtime')
	`, anggotaID)

	minThreshold := 25000.0
	hasValidPurchase := belanjaHariIni >= minThreshold

	// 3. Cek hutang aktif
	hasActiveLoan := anggota.Hutang > 0

	// 4. Cek pending ticket
	type TicketRow struct {
		TarikID       int     `db:"tarik_id"`
		KodePenarikan string  `db:"kode_penarikan"`
		Nominal       float64 `db:"nominal"`
		SumberDana    string  `db:"sumber_dana"`
		CreatedAt     string  `db:"created_at"`
	}
	var ticketRow TicketRow
	var pendingTicket *model.PendingTarikTicketDTO
	err = r.db.GetContext(ctx, &ticketRow, `
		SELECT tarik_id, kode_penarikan, nominal, sumber_dana, COALESCE(created_at, '') as created_at
		FROM tarik_tunai
		WHERE anggota_id = ? AND status = 'pending'
		LIMIT 1
	`, anggotaID)
	if err == nil {
		cAt := ticketRow.CreatedAt
		pendingTicket = &model.PendingTarikTicketDTO{
			TarikID:       ticketRow.TarikID,
			KodePenarikan: ticketRow.KodePenarikan,
			Nominal:       ticketRow.Nominal,
			SumberDana:    ticketRow.SumberDana,
			CreatedAt:     &cAt,
		}
	}

	// Hitung kuota penarikan (maksimal 50% SHU atau dibulatkan ke bawah ke kelipatan 50.000)
	rawLimit := anggota.Shu
	preRound := math.Floor(rawLimit/50000.0) * 50000.0
	finalLimit := math.Max(0, preRound)

	var ineligibleReasons []string
	if !hasMasterConsent {
		ineligibleReasons = append(ineligibleReasons, "Belum menyetujui Master Consent SHU.")
	}
	if !hasValidPurchase {
		ineligibleReasons = append(ineligibleReasons, fmt.Sprintf("Belum ada transaksi belanja hari ini minimal Rp %.0f (Saat ini: Rp %.0f).", minThreshold, belanjaHariIni))
	}
	if hasActiveLoan {
		ineligibleReasons = append(ineligibleReasons, fmt.Sprintf("Masih memiliki saldo hutang aktif sebesar Rp %.0f.", anggota.Hutang))
	}
	if finalLimit <= 0 {
		ineligibleReasons = append(ineligibleReasons, "Saldo SHU tidak memenuhi batas minimal penarikan kelipatan Rp 50.000.")
	}
	if pendingTicket != nil {
		ineligibleReasons = append(ineligibleReasons, fmt.Sprintf("Masih ada tiket penarikan aktif (%s) yang menunggu proses di kasir.", pendingTicket.KodePenarikan))
	}

	isEligible := len(ineligibleReasons) == 0

	return &model.KelayakanTarikTunaiDTO{
		HasMasterConsent:      hasMasterConsent,
		HasValidPurchaseToday: hasValidPurchase,
		MinPurchaseThreshold:  minThreshold,
		BelanjaHariIni:        belanjaHariIni,
		HasActiveLoan:         hasActiveLoan,
		HutangAktif:           anggota.Hutang,
		EligibleShu:           anggota.Shu,
		RawWithdrawalLimit:    rawLimit,
		PreRoundLimit:         preRound,
		FinalWithdrawalLimit:  finalLimit,
		MaxKuotaTarikTunai:    finalLimit,
		MaxShuWithdrawal:      finalLimit,
		IsEligible:            isEligible,
		IneligibleReasons:     ineligibleReasons,
		PendingTicket:         pendingTicket,
	}, nil
}

// SetujuiMasterConsent mengupdate persetujuan consent SHU
func (r *AnggotaRepo) SetujuiMasterConsent(anggotaID int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, `
		UPDATE anggota
		SET persetujuan_shu_master_at = CURRENT_TIMESTAMP
		WHERE anggota_id = ?
	`, anggotaID)
	return err
}

// AjukanTarikTunai menyimpan tiket pengajuan penarikan
func (r *AnggotaRepo) AjukanTarikTunai(anggotaID int, nominal float64, sumberDana string, transaksiID *int, keterangan *string) (*model.AjukanTarikDataDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	kode := fmt.Sprintf("TRK-%s-%04d", time.Now().Format("060102"), rand.Intn(10000))

	ket := ""
	if keterangan != nil {
		ket = *keterangan
	}

	res, err := r.db.ExecContext(ctx, `
		INSERT INTO tarik_tunai (kode_penarikan, anggota_id, nominal, status, sumber_dana, transaksi_id, keterangan, persetujuan_shu, created_at)
		VALUES (?, ?, ?, 'pending', ?, ?, ?, 1, CURRENT_TIMESTAMP)
	`, kode, anggotaID, nominal, sumberDana, transaksiID, ket)
	if err != nil {
		return nil, err
	}

	lastID, _ := res.LastInsertId()

	var namaAnggota *string
	_ = r.db.GetContext(ctx, &namaAnggota, `SELECT nama_lengkap FROM anggota WHERE anggota_id = ?`, anggotaID)

	return &model.AjukanTarikDataDTO{
		TarikID:       int(lastID),
		KodePenarikan: kode,
		Nominal:       nominal,
		SumberDana:    sumberDana,
		Status:        "pending",
		NamaAnggota:   namaAnggota,
		CreatedAt:     time.Now().Format("2006-01-02 15:04:05"),
	}, nil
}

// GetRiwayatTarikTunai mengambil histori pengajuan tarik tunai anggota
func (r *AnggotaRepo) GetRiwayatTarikTunai(anggotaID int) ([]model.TarikTunaiItemDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		TarikID        int      `db:"tarik_id"`
		KodePenarikan  *string  `db:"kode_penarikan"`
		Status         string   `db:"status"`
		Nominal        float64  `db:"nominal"`
		SumberDana     string   `db:"sumber_dana"`
		TransaksiID    *int     `db:"transaksi_id"`
		BelanjaNominal *float64 `db:"belanja_nominal"`
		AlasanTolak    *string  `db:"alasan_tolak"`
		ApprovedAt     *string  `db:"approved_at"`
		Keterangan     *string  `db:"keterangan"`
		KasirName      *string  `db:"kasir_name"`
		CreatedAt      *string  `db:"created_at"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT t.tarik_id, t.kode_penarikan, t.status, t.nominal, t.sumber_dana,
		       t.transaksi_id, trx.total_harga as belanja_nominal,
		       t.alasan_tolak, t.approved_at, t.keterangan,
		       u.username as kasir_name, t.created_at
		FROM tarik_tunai t
		LEFT JOIN transaksi trx ON trx.transaksi_id = t.transaksi_id
		LEFT JOIN users u ON u.user_id = t.kasir_id
		WHERE t.anggota_id = ?
		ORDER BY t.created_at DESC
	`, anggotaID)
	if err != nil {
		return nil, err
	}

	list := make([]model.TarikTunaiItemDTO, 0, len(rows))
	for _, r := range rows {
		bNom := 0.0
		if r.BelanjaNominal != nil {
			bNom = *r.BelanjaNominal
		}
		list = append(list, model.TarikTunaiItemDTO{
			TarikID:        r.TarikID,
			KodePenarikan:  r.KodePenarikan,
			Status:         r.Status,
			Nominal:        r.Nominal,
			SumberDana:     r.SumberDana,
			TransaksiID:    r.TransaksiID,
			BelanjaNominal: bNom,
			AlasanTolak:    r.AlasanTolak,
			ApprovedAt:     r.ApprovedAt,
			Keterangan:     r.Keterangan,
			KasirName:      r.KasirName,
			CreatedAt:      r.CreatedAt,
		})
	}

	return list, nil
}

// BayarHutang mengajukan pembayaran hutang ke kasir
func (r *AnggotaRepo) BayarHutang(anggotaID int, jumlah float64) (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := r.db.ExecContext(ctx, `
		INSERT INTO pembayaran_hutang (anggota_id, nominal, status, created_at, metode_pembayaran)
		VALUES (?, ?, 'pending', CURRENT_TIMESTAMP, 'cash')
	`, anggotaID, jumlah)
	if err != nil {
		return 0, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	return int(id), nil
}

// GetHistoriBayarHutang mengambil riwayat pengajuan pembayaran hutang anggota
func (r *AnggotaRepo) GetHistoriBayarHutang(anggotaID int) ([]model.HistoriBayarHutangDTO, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type Row struct {
		PembayaranID     int     `db:"pembayaran_id"`
		AnggotaID        *int    `db:"anggota_id"`
		KasirID          *int    `db:"kasir_id"`
		Nominal          float64 `db:"nominal"`
		Status           string  `db:"status"`
		MetodePembayaran *string `db:"metode_pembayaran"`
		ApprovedAt       *string `db:"approved_at"`
		CreatedAt        *string `db:"created_at"`
	}

	var rows []Row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT pembayaran_id, anggota_id, kasir_id, nominal, status, metode_pembayaran, approved_at, created_at
		FROM pembayaran_hutang
		WHERE anggota_id = ?
		ORDER BY created_at DESC
	`, anggotaID)
	if err != nil {
		return nil, err
	}

	list := make([]model.HistoriBayarHutangDTO, 0, len(rows))
	for _, r := range rows {
		nom := r.Nominal
		list = append(list, model.HistoriBayarHutangDTO{
			PembayaranID:     r.PembayaranID,
			AnggotaID:        r.AnggotaID,
			KasirID:          r.KasirID,
			Nominal:          r.Nominal,
			Jumlah:           &nom,
			Status:           r.Status,
			MetodePembayaran: r.MetodePembayaran,
			ApprovedAt:       r.ApprovedAt,
			CreatedAt:        r.CreatedAt,
		})
	}
	return list, nil
}

// SimpanTransaksi membuat transaksi pemesanan online oleh anggota
func (r *AnggotaRepo) SimpanTransaksi(anggotaID int, req model.SimpanTransaksiRequest) (*model.SimpanTransaksiResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 1. Validasi stok barang dan hitung total
	type BarangRow struct {
		BarangID    int     `db:"barang_id"`
		NamaBarang  string  `db:"nama_barang"`
		StokToko    int     `db:"stok_toko"`
		HargaJual   float64 `db:"harga_jual"`
		HargaModal  float64 `db:"harga_modal"`
	}

	totalHarga := 0.0
	totalKeuntungan := 0.0

	type ItemCalc struct {
		BarangID    int
		Jumlah      int
		HargaSatuan float64
		Subtotal    float64
		Keuntungan  float64
	}
	itemsCalc := make([]ItemCalc, 0, len(req.Items))

	for _, it := range req.Items {
		var b BarangRow
		err := tx.GetContext(ctx, &b, `
			SELECT barang_id, nama_barang, stok_toko, harga_jual, harga_modal
			FROM barang WHERE barang_id = ?
		`, it.BarangID)
		if err != nil {
			return nil, fmt.Errorf("Barang ID %d tidak ditemukan", it.BarangID)
		}
		if b.StokToko < it.Jumlah {
			return nil, fmt.Errorf("Stok tidak mencukupi untuk %s (tersisa %d)", b.NamaBarang, b.StokToko)
		}

		subtotal := b.HargaJual * float64(it.Jumlah)
		keuntungan := (b.HargaJual - b.HargaModal) * float64(it.Jumlah)
		totalHarga += subtotal
		totalKeuntungan += keuntungan

		itemsCalc = append(itemsCalc, ItemCalc{
			BarangID:    b.BarangID,
			Jumlah:      it.Jumlah,
			HargaSatuan: b.HargaJual,
			Subtotal:    subtotal,
			Keuntungan:  keuntungan,
		})

		// Potong stok toko
		_, err = tx.ExecContext(ctx, `UPDATE barang SET stok_toko = stok_toko - ? WHERE barang_id = ?`, it.Jumlah, b.BarangID)
		if err != nil {
			return nil, err
		}
	}

	// 2. Cek saldo atau limit hutang anggota
	type AnggotaRow struct {
		Hutang        float64 `db:"hutang"`
		Saldo         float64 `db:"saldo"`
		Shu           float64 `db:"shu"`
		SimpananPokok float64 `db:"simpanan_pokok"`
	}
	var a AnggotaRow
	err = tx.GetContext(ctx, &a, `
		SELECT hutang, saldo, shu, simpanan_pokok
		FROM anggota WHERE anggota_id = ?
	`, anggotaID)
	if err != nil {
		return nil, errors.New("Data anggota tidak ditemukan")
	}

	metode := req.MetodePembayaran
	if metode == "hutang" {
		allowance := 0.0
		if a.SimpananPokok > 0 {
			allowance = 100000.0
		}
		limit := a.SimpananPokok + allowance
		if limit <= 0 {
			limit = 300000 // default batas limit jika belum diset
		}
		if a.Hutang+totalHarga > limit {
			return nil, fmt.Errorf("Limit hutang tidak mencukupi. Plafon: Rp %.0f, Hutang saat ini: Rp %.0f, Sisa limit: Rp %.0f", limit, a.Hutang, math.Max(0, limit-a.Hutang))
		}
		_, err = tx.ExecContext(ctx, `UPDATE anggota SET hutang = hutang + ? WHERE anggota_id = ?`, totalHarga, anggotaID)
		if err != nil {
			return nil, err
		}
	} else if metode == "saldo" || metode == "ewallet" {
		if a.Saldo < totalHarga {
			return nil, fmt.Errorf("Saldo E-Wallet tidak mencukupi (Tersedia: Rp %.0f, Total belanja: Rp %.0f)", a.Saldo, totalHarga)
		}
		_, err = tx.ExecContext(ctx, `UPDATE anggota SET saldo = saldo - ? WHERE anggota_id = ?`, totalHarga, anggotaID)
		if err != nil {
			return nil, err
		}
	}

	// 3. Simpan transaksi utama dengan status pending
	resTrx, err := tx.ExecContext(ctx, `
		INSERT INTO transaksi (anggota_id, total_harga, total_keuntungan, metode_pembayaran, status, created_at)
		VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
	`, anggotaID, totalHarga, totalKeuntungan, metode)
	if err != nil {
		return nil, err
	}
	trxID64, err := resTrx.LastInsertId()
	if err != nil {
		return nil, err
	}
	transaksiID := int(trxID64)

	// 4. Simpan transaksi_detail
	for _, it := range itemsCalc {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO transaksi_detail (transaksi_id, barang_id, jumlah, harga_satuan, subtotal, keuntungan)
			VALUES (?, ?, ?, ?, ?, ?)
		`, transaksiID, it.BarangID, it.Jumlah, it.HargaSatuan, it.Subtotal, it.Keuntungan)
		if err != nil {
			return nil, err
		}
	}

	// 5. Opsi Tarik Tunai saat belanja
	var tarikTunaiDTO *model.CheckoutTarikTunaiDTO
	if req.SertakanTarikTunai != nil && *req.SertakanTarikTunai && req.TarikTunaiNominal != nil && *req.TarikTunaiNominal > 0 {
		nominalTarik := *req.TarikTunaiNominal
		if totalHarga <= 25000 {
			return nil, fmt.Errorf("Syarat tarik tunai saat belanja: Total pesanan belanja harus lebih dari Rp 25.000 (Saat ini: Rp %.0f)", totalHarga)
		}

		sumberDana := "shu"
		if req.TarikTunaiSumber != nil && *req.TarikTunaiSumber != "" {
			sumberDana = *req.TarikTunaiSumber
		}

		sisaShu := a.Shu
		sisaSaldo := a.Saldo

		if sumberDana == "shu" {
			if a.Shu < nominalTarik {
				return nil, fmt.Errorf("Saldo SHU tidak mencukupi untuk tarik tunai Rp %.0f (SHU tersedia: Rp %.0f)", nominalTarik, a.Shu)
			}
			_, err = tx.ExecContext(ctx, `UPDATE anggota SET shu = shu - ? WHERE anggota_id = ?`, nominalTarik, anggotaID)
			if err != nil {
				return nil, err
			}
			sisaShu -= nominalTarik
		} else {
			if a.Saldo < nominalTarik {
				return nil, fmt.Errorf("Saldo E-Wallet tidak mencukupi untuk tarik tunai Rp %.0f (Saldo tersedia: Rp %.0f)", nominalTarik, a.Saldo)
			}
			_, err = tx.ExecContext(ctx, `UPDATE anggota SET saldo = saldo - ? WHERE anggota_id = ?`, nominalTarik, anggotaID)
			if err != nil {
				return nil, err
			}
			sisaSaldo -= nominalTarik
		}

		kodePenarikan := fmt.Sprintf("TRX-%s-%04d", time.Now().Format("20060102"), rand.Intn(10000))
		resTT, err := tx.ExecContext(ctx, `
			INSERT INTO tarik_tunai (kode_penarikan, anggota_id, nominal, sumber_dana, status, transaksi_id, created_at)
			VALUES (?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
		`, kodePenarikan, anggotaID, nominalTarik, sumberDana, transaksiID)
		if err != nil {
			return nil, err
		}
		ttID64, _ := resTT.LastInsertId()

		uangBersih := math.Max(0, nominalTarik-totalHarga)
		tarikTunaiDTO = &model.CheckoutTarikTunaiDTO{
			TarikID:              int(ttID64),
			KodePenarikan:        kodePenarikan,
			NominalTarik:         nominalTarik,
			PotongBelanja:        totalHarga,
			UangBersihDiserahkan: uangBersih,
			SumberDana:           sumberDana,
			SisaShu:              sisaShu,
			SisaSaldo:            sisaSaldo,
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &model.SimpanTransaksiResponse{
		Success:     true,
		Message:     "Pesanan belanja berhasil dibuat dan menunggu konfirmasi kasir",
		TransaksiID: &transaksiID,
		TarikTunai:  tarikTunaiDTO,
	}, nil
}
