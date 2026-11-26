package model

// Profil Anggota DTO
type ProfilAnggotaDTO struct {
	AnggotaID       int     `json:"anggota_id"`
	UserID          int     `json:"user_id"`
	NamaLengkap     *string `json:"nama_lengkap"`
	Username        string  `json:"username"`
	Saldo           float64 `json:"saldo"`
	Hutang          float64 `json:"hutang"`
	Shu             float64 `json:"shu"`
	SimpananPokok   float64 `json:"simpanan_pokok"`
	AllowanceHutang float64 `json:"allowance_hutang"`
	LimitHutang     float64 `json:"limit_hutang"`
	SisaLimitHutang float64 `json:"sisa_limit_hutang"`
}

type AnggotaProfilResponse struct {
	Success bool              `json:"success"`
	Message string            `json:"message"`
	Error   *string           `json:"error,omitempty"`
	User    *ProfilAnggotaDTO `json:"user,omitempty"`
}

// Transaksi Anggota DTO
type TransaksiDetailItemDTO struct {
	TransaksiDetailID int     `json:"transaksi_detail_id"`
	BarangID          int     `json:"barang_id"`
	NamaBarang        string  `json:"nama_barang"`
	Jumlah            int     `json:"jumlah"`
	HargaSatuan       float64 `json:"harga_satuan"`
	Subtotal          float64 `json:"subtotal"`
}

type TransaksiAnggotaDTO struct {
	TransaksiID      int                      `json:"transaksi_id"`
	AnggotaID        *int                     `json:"anggota_id,omitempty"`
	KasirID          *int                     `json:"kasir_id,omitempty"`
	TotalHarga       float64                  `json:"total_harga"`
	TotalKeuntungan  float64                  `json:"total_keuntungan"`
	MetodePembayaran string                   `json:"metode_pembayaran"`
	Status           string                   `json:"status"`
	CreatedAt        *string                  `json:"created_at,omitempty"`
	NamaKasir        *string                  `json:"nama_kasir,omitempty"`
	Items            []TransaksiDetailItemDTO `json:"items"`
}

type TransaksiPaginatorDTO struct {
	CurrentPage int                   `json:"current_page"`
	Data        []TransaksiAnggotaDTO `json:"data"`
	LastPage    int                   `json:"last_page"`
	PerPage     int                   `json:"per_page"`
	Total       int                   `json:"total"`
}

type HistoriTransaksiResponse struct {
	Success bool                   `json:"success"`
	Message string                 `json:"message"`
	Error   *string                `json:"error,omitempty"`
	Data    *TransaksiPaginatorDTO `json:"data,omitempty"`
}

// Barang Anggota DTO
type BarangAnggotaDTO struct {
	BarangID              int      `json:"barang_id"`
	NamaBarang            string   `json:"nama_barang"`
	Stok                  int      `json:"stok"`
	HargaJual             float64  `json:"harga_jual"`
	Harga                 *float64 `json:"harga,omitempty"`
	Satuan                *string  `json:"satuan,omitempty"`
	Kategori              *string  `json:"kategori,omitempty"`
	HariKadaluarsaToko    *int     `json:"hari_kadaluarsa_toko,omitempty"`
	StatusKadaluarsaToko  *string  `json:"status_kadaluarsa_toko,omitempty"`
	HariKadaluarsaGudang  *int     `json:"hari_kadaluarsa_gudang,omitempty"`
	StatusKadaluarsaGudang *string `json:"status_kadaluarsa_gudang,omitempty"`
}

type AnggotaBarangResponse struct {
	Success bool               `json:"success"`
	Message string             `json:"message"`
	Error   *string            `json:"error,omitempty"`
	Data    []BarangAnggotaDTO `json:"data"`
}

// Paket Belanja DTO
type PaketItemDTO struct {
	BarangID      int     `json:"barang_id"`
	NamaBarang    string  `json:"nama_barang"`
	Jumlah        int     `json:"jumlah"`
	Qty           int     `json:"qty"`
	HargaSatuan   float64 `json:"harga_satuan"`
	Subtotal      float64 `json:"subtotal"`
	StokTersedia  int     `json:"stok_tersedia"`
}

type PaketBelanjaDTO struct {
	ID          string         `json:"id"`
	NamaPaket   string         `json:"nama_paket"`
	Deskripsi   string         `json:"deskripsi"`
	Tag         string         `json:"tag"`
	Icon        string         `json:"icon"`
	TotalHarga  float64        `json:"total_harga"`
	Items       []PaketItemDTO `json:"items"`
	IsAvailable bool           `json:"is_available"`
}

type PaketBelanjaResponse struct {
	Success          bool              `json:"success"`
	Message          string            `json:"message"`
	Error            *string           `json:"error,omitempty"`
	Data             []PaketBelanjaDTO `json:"data"`
	SeringDibeli     *PaketBelanjaDTO  `json:"sering_dibeli,omitempty"`
	AiRecommendation *PaketBelanjaDTO  `json:"ai_recommendation,omitempty"`
}

// Kelayakan Tarik Tunai DTO
type KelayakanTarikTunaiResponse struct {
	Success bool                       `json:"success"`
	Message string                     `json:"message"`
	Error   *string                    `json:"error,omitempty"`
	Data    *KelayakanTarikTunaiDTO    `json:"data,omitempty"`
}

type KelayakanTarikTunaiDTO struct {
	HasMasterConsent     bool                    `json:"has_master_consent"`
	HasValidPurchaseToday bool                   `json:"has_valid_purchase_today"`
	MinPurchaseThreshold float64                 `json:"min_purchase_threshold"`
	BelanjaHariIni       float64                 `json:"belanja_hari_ini"`
	HasActiveLoan        bool                    `json:"has_active_loan"`
	HutangAktif          float64                 `json:"hutang_aktif"`
	EligibleShu          float64                 `json:"eligible_shu"`
	RawWithdrawalLimit   float64                 `json:"raw_withdrawal_limit"`
	PreRoundLimit        float64                 `json:"pre_round_limit"`
	FinalWithdrawalLimit float64                 `json:"final_withdrawal_limit"`
	MaxKuotaTarikTunai   float64                 `json:"max_kuota_tarik_tunai"`
	MaxShuWithdrawal     float64                 `json:"max_shu_withdrawal"`
	IsEligible           bool                    `json:"is_eligible"`
	IneligibleReasons    []string                `json:"ineligible_reasons"`
	PendingTicket        *PendingTarikTicketDTO  `json:"pending_ticket,omitempty"`
}

type PendingTarikTicketDTO struct {
	TarikID       int     `json:"tarik_id"`
	KodePenarikan string  `json:"kode_penarikan"`
	Nominal       float64 `json:"nominal"`
	SumberDana    string  `json:"sumber_dana"`
	CreatedAt     *string `json:"created_at,omitempty"`
}

type MasterConsentResponse struct {
	Success bool                  `json:"success"`
	Message string                `json:"message"`
	Error   *string               `json:"error,omitempty"`
	Data    *MasterConsentDataDTO `json:"data,omitempty"`
}

type MasterConsentDataDTO struct {
	HasMasterConsent       bool    `json:"has_master_consent"`
	PersetujuanShuMasterAt *string `json:"persetujuan_shu_master_at,omitempty"`
}

// Tarik Tunai DTO
type TarikTunaiItemDTO struct {
	TarikID        int      `json:"tarik_id"`
	KodePenarikan  *string  `json:"kode_penarikan,omitempty"`
	Status         string   `json:"status"`
	Nominal        float64  `json:"nominal"`
	SumberDana     string   `json:"sumber_dana"`
	TransaksiID    *int     `json:"transaksi_id,omitempty"`
	BelanjaNominal float64  `json:"belanja_nominal"`
	AlasanTolak    *string  `json:"alasan_tolak,omitempty"`
	ApprovedAt     *string  `json:"approved_at,omitempty"`
	Keterangan     *string  `json:"keterangan,omitempty"`
	KasirName      *string  `json:"kasir_name,omitempty"`
	CreatedAt      *string  `json:"created_at,omitempty"`
}

type RiwayatTarikTunaiResponse struct {
	Success bool                `json:"success"`
	Message string              `json:"message"`
	Error   *string             `json:"error,omitempty"`
	Data    []TarikTunaiItemDTO `json:"data"`
}

type AjukanTarikTunaiRequest struct {
	Nominal        float64 `json:"nominal" binding:"required"`
	SumberDana     string  `json:"sumber_dana" binding:"required"`
	PersetujuanShu *bool   `json:"persetujuan_shu,omitempty"`
	TransaksiID    *int    `json:"transaksi_id,omitempty"`
	Keterangan     *string `json:"keterangan,omitempty"`
}

type AjukanTarikTunaiResponse struct {
	Success bool                  `json:"success"`
	Message string                `json:"message"`
	Error   *string               `json:"error,omitempty"`
	Data    *AjukanTarikDataDTO   `json:"data,omitempty"`
}

type AjukanTarikDataDTO struct {
	TarikID       int     `json:"tarik_id"`
	KodePenarikan string  `json:"kode_penarikan"`
	Nominal       float64 `json:"nominal"`
	SumberDana    string  `json:"sumber_dana"`
	Status        string  `json:"status"`
	NamaAnggota   *string `json:"nama_anggota,omitempty"`
	CreatedAt     string  `json:"created_at"`
}

// Checkout & Pesanan DTO
type CheckoutItemDTO struct {
	BarangID int `json:"barang_id" binding:"required"`
	Jumlah   int `json:"jumlah" binding:"required,min=1"`
}

type SimpanTransaksiRequest struct {
	MetodePembayaran   string            `json:"metode_pembayaran" binding:"required"`
	Items              []CheckoutItemDTO `json:"items" binding:"required,min=1"`
	Catatan            *string           `json:"catatan,omitempty"`
	SertakanTarikTunai *bool             `json:"sertakan_tarik_tunai,omitempty"`
	TarikTunaiNominal  *float64          `json:"tarik_tunai_nominal,omitempty"`
	TarikTunaiSumber   *string           `json:"tarik_tunai_sumber,omitempty"`
	PersetujuanShu     *bool             `json:"persetujuan_shu,omitempty"`
}

type CheckoutTarikTunaiDTO struct {
	TarikID              int     `json:"tarik_id"`
	KodePenarikan        string  `json:"kode_penarikan"`
	NominalTarik         float64 `json:"nominal_tarik"`
	PotongBelanja        float64 `json:"potong_belanja"`
	UangBersihDiserahkan float64 `json:"uang_bersih_diserahkan"`
	SumberDana           string  `json:"sumber_dana"`
	SisaShu              float64 `json:"sisa_shu"`
	SisaSaldo            float64 `json:"sisa_saldo"`
}

type SimpanTransaksiResponse struct {
	Success     bool                   `json:"success"`
	Message     string                 `json:"message"`
	Error       *string                `json:"error,omitempty"`
	TransaksiID *int                   `json:"transaksi_id,omitempty"`
	TarikTunai  *CheckoutTarikTunaiDTO `json:"tarik_tunai,omitempty"`
}

// ─── Bayar Hutang Anggota ───────────────────────────────────────────────────

type BayarHutangRequest struct {
	Jumlah float64 `json:"jumlah" binding:"required,min=1"`
}

type BayarHutangResponse struct {
	Success      bool    `json:"success"`
	Message      string  `json:"message"`
	Error        *string `json:"error,omitempty"`
	PembayaranID *int    `json:"pembayaran_id,omitempty"`
}

type HistoriBayarHutangDTO struct {
	PembayaranID     int      `json:"pembayaran_id"`
	AnggotaID        *int     `json:"anggota_id,omitempty"`
	KasirID          *int     `json:"kasir_id,omitempty"`
	Nominal          float64  `json:"nominal"`
	Jumlah           *float64 `json:"jumlah,omitempty"`
	Status           string   `json:"status"`
	MetodePembayaran *string  `json:"metode_pembayaran,omitempty"`
	ApprovedAt       *string  `json:"approved_at,omitempty"`
	CreatedAt        *string  `json:"created_at,omitempty"`
}

type HistoriBayarHutangResponse struct {
	Success bool                    `json:"success"`
	Message string                  `json:"message"`
	Error   *string                 `json:"error,omitempty"`
	Data    []HistoriBayarHutangDTO `json:"data"`
}
