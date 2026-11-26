package model

// Generic response untuk kasir
type KasirDataResponse[T any] struct {
	Success bool    `json:"success"`
	Message string  `json:"message"`
	Error   *string `json:"error,omitempty"`
	Data    T       `json:"data"`
}

type LaravelPaginatorDTO[T any] struct {
	CurrentPage int `json:"current_page"`
	LastPage    int `json:"last_page"`
	Total       int `json:"total"`
	PerPage     int `json:"per_page"`
	Data        []T `json:"data"`
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

type ActiveShiftDetailDTO struct {
	SerahID           int     `json:"serah_id"`
	KasirFromName     string  `json:"kasir_from_name"`
	KasirFromUsername string  `json:"kasir_from_username"`
	KasirToName       string  `json:"kasir_to_name"`
	KasirToUsername   string  `json:"kasir_to_username"`
	CreatedAt         *string `json:"created_at,omitempty"`
}

type TransaksiTerbaruDTO struct {
	ID               int     `json:"id"`
	TransaksiID      int     `json:"transaksi_id"`
	CreatedAt        *string `json:"created_at,omitempty"`
	TotalHarga       float64 `json:"total_harga"`
	MetodePembayaran string  `json:"metode_pembayaran"`
	Status           string  `json:"status"`
	NamaAnggota      *string `json:"nama_anggota,omitempty"`
}

type DashboardKasirDTO struct {
	TotalPendapatanHariIni   float64                `json:"total_pendapatan_hari_ini"`
	TotalTransaksiHariIni    int                    `json:"total_transaksi_hari_ini"`
	TotalItemTerjualHariIni  int                    `json:"total_item_terjual_hari_ini"`
	TotalTransaksiDilayani   int                    `json:"total_transaksi_dilayani"`
	SaldoKas                 float64                `json:"saldo_kas"`
	PendingSerahTerima       int                    `json:"pending_serah_terima"`
	PendingPesanan           int                    `json:"pending_pesanan"`
	PendingHutang            int                    `json:"pending_hutang"`
	TransaksiTerbaru         []TransaksiTerbaruDTO  `json:"transaksi_terbaru"`
	ActiveShift              *ActiveShiftDetailDTO  `json:"active_shift,omitempty"`
}

// ─── Barang & Anggota Kasir ──────────────────────────────────────────────────

type BarangKasirDTO struct {
	BarangID  int      `json:"barang_id"`
	Nama      string   `json:"nama_barang"`
	HargaJual float64  `json:"harga_jual"`
	Harga     *float64 `json:"harga,omitempty"`
	Stok      int      `json:"stok"`
	Satuan    *string  `json:"satuan,omitempty"`
}

type AnggotaKasirDTO struct {
	AnggotaID       int     `json:"anggota_id"`
	UserID          int     `json:"user_id"`
	NamaLengkap     string  `json:"nama_lengkap"`
	Nama            *string `json:"nama,omitempty"`
	Username        string  `json:"username"`
	Email           *string `json:"email,omitempty"`
	Saldo           float64 `json:"saldo"`
	Hutang          float64 `json:"hutang"`
	Shu             float64 `json:"shu"`
	SimpananPokok   float64 `json:"simpanan_pokok"`
	AllowanceHutang float64 `json:"allowance_hutang"`
	LimitHutang     float64 `json:"limit_hutang"`
	SisaLimitHutang float64 `json:"sisa_limit_hutang"`
}

type CariProfilAnggotaResponse struct {
	Success bool             `json:"success"`
	Message string           `json:"message"`
	Profil  *AnggotaKasirDTO `json:"profil,omitempty"`
}

// ─── Transaksi POS / Checkout ────────────────────────────────────────────────

type CheckoutItemRequest struct {
	BarangID    int      `json:"barang_id" binding:"required"`
	Jumlah      int      `json:"jumlah" binding:"required,min=1"`
	HargaSatuan *float64 `json:"harga_satuan,omitempty"`
}

type BuatTransaksiRequest struct {
	Items               []CheckoutItemRequest `json:"items" binding:"required,min=1"`
	AnggotaID           *int                  `json:"anggota_id,omitempty"`
	MetodePembayaran    string                `json:"metode_pembayaran" binding:"required"`
	Total               *float64              `json:"total,omitempty"`
	SertakanTarikTunai  *bool                 `json:"sertakan_tarik_tunai,omitempty"`
	TarikTunaiNominal   *float64              `json:"tarik_tunai_nominal,omitempty"`
	TarikTunaiSumber    *string               `json:"tarik_tunai_sumber,omitempty"`
	PersetujuanShu      *bool                 `json:"persetujuan_shu,omitempty"`
}

type PosTarikTunaiResultDTO struct {
	TarikID               int     `json:"tarik_id"`
	KodePenarikan         string  `json:"kode_penarikan"`
	NominalTarik          float64 `json:"nominal_tarik"`
	PotongBelanja         float64 `json:"potong_belanja"`
	UangBersihDiserahkan  float64 `json:"uang_bersih_diserahkan"`
	SumberDana            string  `json:"sumber_dana"`
	SisaShu               float64 `json:"sisa_shu"`
}

type BuatTransaksiResponse struct {
	Success         bool                    `json:"success"`
	Message         string                  `json:"message"`
	Error           *string                 `json:"error,omitempty"`
	TransaksiID     *int                    `json:"transaksi_id,omitempty"`
	Total           *float64                `json:"total,omitempty"`
	TotalKeuntungan *float64                `json:"total_keuntungan,omitempty"`
	TarikTunai      *PosTarikTunaiResultDTO `json:"tarik_tunai,omitempty"`
}

// ─── Riwayat Transaksi Kasir ─────────────────────────────────────────────────

type RiwayatTransaksiDetailDTO struct {
	TransaksiDetailID int     `json:"transaksi_detail_id"`
	BarangID          int     `json:"barang_id"`
	NamaBarang        string  `json:"nama_barang"`
	Jumlah            int     `json:"jumlah"`
	HargaSatuan       float64 `json:"harga_satuan"`
	Subtotal          float64 `json:"subtotal"`
}

type RiwayatTransaksiDTO struct {
	ID               int                         `json:"id"`
	TransaksiID      int                         `json:"transaksi_id"`
	AnggotaID        *int                        `json:"anggota_id,omitempty"`
	Total            float64                     `json:"total"`
	TotalHarga       float64                     `json:"total_harga"`
	TotalKeuntungan  float64                     `json:"total_keuntungan"`
	JenisTransaksi   string                      `json:"jenis_transaksi"`
	MetodePembayaran string                      `json:"metode_pembayaran"`
	Status           string                      `json:"status"`
	Tanggal          *string                     `json:"tanggal,omitempty"`
	CreatedAt        *string                     `json:"created_at,omitempty"`
	NamaAnggota      *string                     `json:"nama_anggota,omitempty"`
	NamaKasir        *string                     `json:"nama_kasir,omitempty"`
	Details          []RiwayatTransaksiDetailDTO `json:"details"`
}

type HistoryTransaksiRequest struct {
	Page             int     `json:"page"`
	PerPage          int     `json:"per_page"`
	Search           *string `json:"search,omitempty"`
	TanggalAwal      *string `json:"tanggal_awal,omitempty"`
	TanggalAkhir     *string `json:"tanggal_akhir,omitempty"`
	MetodePembayaran *string `json:"metode_pembayaran,omitempty"`
	Status           *string `json:"status,omitempty"`
}

// ─── Setoran Kasir ───────────────────────────────────────────────────────────

type SetoranKasirDTO struct {
	SetoranID  int     `json:"setoran_id"`
	ID         int     `json:"id"`
	KasirID    *int    `json:"kasir_id,omitempty"`
	Nominal    float64 `json:"nominal"`
	Status     string  `json:"status"`
	ApprovedBy *int    `json:"approved_by,omitempty"`
	CreatedAt  *string `json:"created_at,omitempty"`
}

type SetorAdminRequest struct {
	Nominal float64 `json:"nominal" binding:"required,min=1"`
	Catatan *string `json:"catatan,omitempty"`
}

// ─── Serah Terima Shift ──────────────────────────────────────────────────────

type DaftarKasirDTO struct {
	UserID      int    `json:"user_id"`
	Username    string `json:"username"`
	NamaLengkap string `json:"nama_lengkap"`
}

type SerahTerimaDTO struct {
	SerahID         int     `json:"serah_id"`
	KasirFrom       int     `json:"kasir_from"`
	KasirTo         int     `json:"kasir_to"`
	KasirFromName   string  `json:"kasir_from_name"`
	KasirToName     string  `json:"kasir_to_name"`
	Status          string  `json:"status"`
	UangFisik       float64 `json:"uang_fisik"`
	SaldoKasSistem  float64 `json:"saldo_kas_sistem"`
	SelisihKas      float64 `json:"selisih_kas"`
	Catatan         *string `json:"catatan,omitempty"`
	AlasanPenolakan *string `json:"alasan_penolakan,omitempty"`
	CreatedAt       *string `json:"created_at,omitempty"`
}

type SerahTerimaDraftDTO struct {
	KasirID        int     `json:"kasir_id"`
	SaldoKasSistem float64 `json:"saldo_kas_sistem"`
	TotalPenjualan float64 `json:"total_penjualan"`
	TotalSetoran   float64 `json:"total_setoran"`
	TotalTarikTunai float64 `json:"total_tarik_tunai"`
}

type CreateSerahTerimaRequest struct {
	KasirTo   int     `json:"kasir_to" binding:"required"`
	UangFisik float64 `json:"uang_fisik" binding:"required"`
	Catatan   *string `json:"catatan,omitempty"`
}

type CreateSerahTerimaDataDTO struct {
	SerahID int `json:"serah_id"`
}

type ApproveSerahTerimaRequest struct {
	SerahID int `json:"serah_id" binding:"required"`
}

type RejectSerahTerimaRequest struct {
	SerahID int    `json:"serah_id" binding:"required"`
	Alasan  string `json:"alasan" binding:"required"`
}

// ─── Tarik Tunai Kasir ──────────────────────────────────────────────────────

type AntreanTarikTunaiDTO struct {
	TarikID       int     `json:"tarik_id"`
	KodePenarikan string  `json:"kode_penarikan"`
	AnggotaID     int     `json:"anggota_id"`
	NamaAnggota   string  `json:"nama_anggota"`
	Nominal       float64 `json:"nominal"`
	SumberDana    string  `json:"sumber_dana"`
	Status        string  `json:"status"`
	CreatedAt     string  `json:"created_at"`
}

type ProsesTarikTunaiRequest struct {
	TarikID int `json:"tarik_id" binding:"required"`
}

type TarikTunaiRequest struct {
	AnggotaID   int     `json:"anggota_id" binding:"required"`
	Nominal     float64 `json:"nominal" binding:"required"`
	SumberDana  string  `json:"sumber_dana" binding:"required"`
	TransaksiID *int    `json:"transaksi_id,omitempty"`
}

type TarikTunaiReceiptDTO struct {
	TarikID              int     `json:"tarik_id"`
	KodePenarikan        string  `json:"kode_penarikan"`
	NamaAnggota          string  `json:"nama_anggota"`
	Nominal              float64 `json:"nominal"`
	SumberDana           string  `json:"sumber_dana"`
	UangBersihDiserahkan float64 `json:"uang_bersih_diserahkan"`
	Status               string  `json:"status"`
	KasirName            string  `json:"kasir_name"`
	ApprovedAt           string  `json:"approved_at"`
}

// ─── Pembayaran Hutang Kasir ────────────────────────────────────────────────

type PembayaranHutangDTO struct {
	PembayaranID int     `json:"pembayaran_id"`
	AnggotaID    int     `json:"anggota_id"`
	NamaAnggota  string  `json:"nama_anggota"`
	Nominal      float64 `json:"nominal"`
	Status       string  `json:"status"`
	CreatedAt    *string `json:"created_at,omitempty"`
	NamaKasir    *string `json:"nama_kasir,omitempty"`
}

type ApprovePembayaranHutangRequest struct {
	PembayaranID     int    `json:"pembayaran_id" binding:"required"`
	Action           string `json:"action" binding:"required"`
	MetodePembayaran string `json:"metode_pembayaran"`
}

// ─── Pesanan Anggota Online & Polling ────────────────────────────────────────

type PesananTarikTunaiDTO struct {
	TarikID              int     `json:"tarik_id"`
	KodePenarikan        string  `json:"kode_penarikan"`
	Nominal              float64 `json:"nominal"`
	SumberDana           string  `json:"sumber_dana"`
	UangBersihDiserahkan float64 `json:"uang_bersih_diserahkan"`
}

type PesananItemDTO struct {
	BarangID    int     `json:"barang_id"`
	NamaBarang  string  `json:"nama_barang"`
	Jumlah      int     `json:"jumlah"`
	HargaSatuan float64 `json:"harga_satuan"`
}

type PesananAnggotaDTO struct {
	TransaksiID      int                   `json:"transaksi_id"`
	AnggotaID        *int                  `json:"anggota_id,omitempty"`
	NamaAnggota      string                `json:"nama_anggota"`
	MetodePembayaran string                `json:"metode_pembayaran"`
	TotalHarga       float64               `json:"total_harga"`
	CreatedAt        *string               `json:"created_at,omitempty"`
	TarikTunai       *PesananTarikTunaiDTO `json:"tarik_tunai,omitempty"`
	Items            []PesananItemDTO      `json:"items"`
}

type SimpanTransaksiIdDTO struct {
	TransaksiID int `json:"transaksi_id"`
}

type SimpanTransaksiKasirRequest struct {
	Transaksi   []SimpanTransaksiIdDTO `json:"transaksi,omitempty"`
	TransaksiID *int                   `json:"transaksi_id,omitempty"`
}

type TolakPesananRequest struct {
	TransaksiIDs []int   `json:"transaksi_ids,omitempty"`
	TransaksiID  *int    `json:"transaksi_id,omitempty"`
	Alasan       *string `json:"alasan,omitempty"`
}

type LatestOrderDTO struct {
	TransaksiID      int     `json:"transaksi_id"`
	AnggotaID        *int    `json:"anggota_id,omitempty"`
	NamaAnggota      string  `json:"nama_anggota"`
	Username         string  `json:"username"`
	TotalHarga       float64 `json:"total_harga"`
	MetodePembayaran string  `json:"metode_pembayaran"`
	ItemsCount       int     `json:"items_count"`
	ItemsSummary     string  `json:"items_summary"`
	CreatedAt        *string `json:"created_at,omitempty"`
	IsTest           bool    `json:"is_test"`
}

type LatestPendingOrdersResponse struct {
	Success         bool             `json:"success"`
	IsActiveShift   bool             `json:"is_active_shift"`
	PendingCount    int              `json:"pending_count"`
	LatestOrder     *LatestOrderDTO  `json:"latest_order"`
	Orders          []LatestOrderDTO `json:"orders"`
	ServerTimestamp *float64         `json:"server_timestamp,omitempty"`
}

type TestOrderNotificationResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    *LatestOrderDTO `json:"data,omitempty"`
}
