package model

// ─── Dashboard Admin ─────────────────────────────────────────────────────────

type StokKritisItemDTO struct {
	BarangID   int     `json:"barang_id"`
	NamaBarang string  `json:"nama_barang"`
	Stok       int     `json:"stok"`
	Pkm        *int    `json:"pkm,omitempty"`
	HargaModal float64 `json:"harga_modal"`
}

type AdminDashboardResponse struct {
	Success                 bool                `json:"success"`
	TotalAnggota            int                 `json:"total_anggota"`
	TotalTransaksiHariIni   int                 `json:"total_transaksi_hari_ini"`
	TotalPendapatanHariIni  float64             `json:"total_pendapatan_hari_ini"`
	TotalKeuntunganHariIni  float64             `json:"total_keuntungan_hari_ini"`
	TotalHutangBeredar      float64             `json:"total_hutang_beredar"`
	TotalSaldoAnggota       float64             `json:"total_saldo_anggota"`
	TotalShuTersedia        float64             `json:"total_shu_tersedia"`
	TotalShuPengurus        float64             `json:"total_shu_pengurus"`
	TotalShuKoperasi        float64             `json:"total_shu_koperasi"`
	TotalAsetBarang         float64             `json:"total_aset_barang"`
	StokKritisCount         int                 `json:"stok_kritis_count"`
	StokKritisItems         []StokKritisItemDTO `json:"stok_kritis_items"`
	SetoranPendingCount     int                 `json:"setoran_pending_count"`
	SetoranPendingNominal   float64             `json:"setoran_pending_nominal"`
	AnggotaLimitKritisCount int                 `json:"anggota_limit_kritis_count"`
	TotalRestockBulanIni    float64             `json:"total_restock_bulan_ini"`
	ExpiredCount            int                 `json:"expired_count"`
	NearExpiryCount         int                 `json:"near_expiry_count"`
}

// ─── Barang & Stok Admin ─────────────────────────────────────────────────────

type AdminBarangDTO struct {
	BarangID       int      `json:"barang_id"`
	NamaBarang     string   `json:"nama_barang"`
	Stok           int      `json:"stok"`
	StokToko       *int     `json:"stok_toko,omitempty"`
	StokGudang     *int     `json:"stok_gudang,omitempty"`
	HargaModal     float64  `json:"harga_modal"`
	HargaJual      float64  `json:"harga_jual"`
	Keuntungan     float64  `json:"keuntungan"`
	Pkm            *int     `json:"pkm,omitempty"`
	Satuan         *string  `json:"satuan,omitempty"`
	Kategori       *string  `json:"kategori,omitempty"`
}

type AdminBarangListResponse struct {
	Success bool             `json:"success"`
	Data    []AdminBarangDTO `json:"data"`
}

type TambahBarangRequest struct {
	NamaBarang string  `json:"nama_barang" binding:"required"`
	HargaModal float64 `json:"harga_modal" binding:"required,min=0"`
	HargaJual  float64 `json:"harga_jual" binding:"required,min=0"`
	StokToko   int     `json:"stok_toko"`
	StokGudang int     `json:"stok_gudang"`
	Pkm        *int    `json:"pkm,omitempty"`
	Satuan     *string `json:"satuan,omitempty"`
	Kategori   *string `json:"kategori,omitempty"`
}

type UpdateBarangRequest struct {
	BarangID   int     `json:"barang_id" binding:"required"`
	NamaBarang string  `json:"nama_barang" binding:"required"`
	HargaModal float64 `json:"harga_modal" binding:"required,min=0"`
	HargaJual  float64 `json:"harga_jual" binding:"required,min=0"`
	Pkm        *int    `json:"pkm,omitempty"`
	Satuan     *string `json:"satuan,omitempty"`
	Kategori   *string `json:"kategori,omitempty"`
}

type HapusBarangRequest struct {
	BarangID int `json:"barang_id" binding:"required"`
}

type RestockBarangRequest struct {
	BarangID        int      `json:"barang_id" binding:"required"`
	JumlahTambah    int      `json:"jumlah_tambah" binding:"required,min=1"`
	HargaBeliSatuan *float64 `json:"harga_beli_satuan,omitempty"`
	TujuanLokasi    *string  `json:"tujuan_lokasi,omitempty"`
	Catatan         *string  `json:"catatan,omitempty"`
}

type MutasiStokRequest struct {
	BarangID int    `json:"barang_id" binding:"required"`
	Jumlah   int    `json:"jumlah" binding:"required,min=1"`
	Tipe     string `json:"tipe" binding:"required"` // "gudang_ke_toko" atau "toko_ke_gudang"
	Catatan  *string `json:"catatan,omitempty"`
}

type StokMutationResponse struct {
	Success    bool   `json:"success"`
	Message    string `json:"message"`
	StokBaru   int    `json:"stok_baru"`
	StokToko   int    `json:"stok_toko"`
	StokGudang int    `json:"stok_gudang"`
}

// ─── Anggota & User Management Admin ─────────────────────────────────────────

type AdminAnggotaDTO struct {
	AnggotaID   int     `json:"anggota_id"`
	UserID      int     `json:"user_id"`
	NamaLengkap *string `json:"nama_lengkap,omitempty"`
	Username    string  `json:"username"`
	Saldo       float64 `json:"saldo"`
	Hutang      float64 `json:"hutang"`
	Shu         float64 `json:"shu"`
}

type AdminAnggotaListResponse struct {
	Success bool              `json:"success"`
	Data    []AdminAnggotaDTO `json:"data"`
}

type TambahUserRequest struct {
	Username    string `json:"username" binding:"required"`
	Password    string `json:"password" binding:"required,min=6"`
	Role        string `json:"role" binding:"required"`
	NamaLengkap string `json:"nama_lengkap" binding:"required"`
}

type UpdateUserRequest struct {
	UserID      int     `json:"user_id" binding:"required"`
	NamaLengkap *string `json:"nama_lengkap,omitempty"`
	Role        *string `json:"role,omitempty"`
}

type ResetPasswordUserRequest struct {
	UserID       int    `json:"user_id" binding:"required"`
	PasswordBaru string `json:"password_baru" binding:"required,min=6"`
}

type HapusUserRequest struct {
	UserID int `json:"user_id" binding:"required"`
}

// ─── Setoran Kasir Admin ─────────────────────────────────────────────────────

type SetoranKasirItemDTO struct {
	ID        int     `json:"id"`
	SetoranID int     `json:"setoran_id"`
	Nominal   float64 `json:"nominal"`
	NamaKasir *string `json:"nama_kasir,omitempty"`
	Tanggal   *string `json:"tanggal,omitempty"`
	CreatedAt *string `json:"created_at,omitempty"`
	Status    string  `json:"status"`
}

type SetoranKasirListResponse struct {
	Success bool                  `json:"success"`
	Data    []SetoranKasirItemDTO `json:"data"`
}

type ApproveSetoranRequest struct {
	SetoranID int `json:"setoran_id" binding:"required"`
}

// ─── SHU Management Admin ────────────────────────────────────────────────────

type ShuManagementSummaryDTO struct {
	TotalShu     float64 `json:"total_shu"`
	TotalSaldo   float64 `json:"total_saldo"`
	TotalHutang  float64 `json:"total_hutang"`
	TotalAnggota int     `json:"total_anggota"`
}

type ShuAnggotaDTO struct {
	AnggotaID   int     `json:"anggota_id"`
	NamaLengkap string  `json:"nama_lengkap"`
	Shu         float64 `json:"shu"`
	Saldo       float64 `json:"saldo"`
	Hutang      float64 `json:"hutang"`
}

type ShuManagementDataDTO struct {
	Summary ShuManagementSummaryDTO `json:"summary"`
	Anggota []ShuAnggotaDTO         `json:"anggota"`
}

type ShuManagementResponse struct {
	Success bool                  `json:"success"`
	Data    *ShuManagementDataDTO `json:"data,omitempty"`
}

type TopupShuRequest struct {
	NamaAnggota string  `json:"nama_anggota" binding:"required"`
	Nominal     float64 `json:"nominal" binding:"required,min=1"`
}

type ProsesKonversiShuRequest struct {
	AnggotaID int     `json:"anggota_id" binding:"required"`
	Nominal   float64 `json:"nominal" binding:"required,min=1"`
	Target    string  `json:"target" binding:"required"` // "wallet" atau "hutang"
}

// ─── Laporan Transaksi Admin ─────────────────────────────────────────────────

type LaporanTransaksiRequest struct {
	TanggalAwal  *string `json:"tanggal_awal,omitempty"`
	TanggalAkhir *string `json:"tanggal_akhir,omitempty"`
	KasirID      *int    `json:"kasir_id,omitempty"`
}

type LaporanSummaryDTO struct {
	TotalTransaksi  int     `json:"total_transaksi"`
	TotalPendapatan float64 `json:"total_pendapatan"`
	TotalKeuntungan float64 `json:"total_keuntungan"`
}

type LaporanTransaksiItemDTO struct {
	TransaksiID      int     `json:"transaksi_id"`
	Tanggal          string  `json:"tanggal"`
	NamaKasir        string  `json:"nama_kasir"`
	NamaAnggota      string  `json:"nama_anggota"`
	TotalHarga       float64 `json:"total_harga"`
	TotalKeuntungan  float64 `json:"total_keuntungan"`
	MetodePembayaran string  `json:"metode_pembayaran"`
	Status           string  `json:"status"`
}

type LaporanTransaksiResponse struct {
	Success bool                      `json:"success"`
	Summary *LaporanSummaryDTO        `json:"summary,omitempty"`
	Data    []LaporanTransaksiItemDTO `json:"data"`
}

// ─── Jabatan Management Admin ────────────────────────────────────────────────

type JabatanItemDTO struct {
	JabatanID      int     `json:"jabatan_id"`
	UserID         int     `json:"user_id"`
	Username       string  `json:"username"`
	NamaLengkap    string  `json:"nama_lengkap"`
	Role           string  `json:"role"`
	Status         string  `json:"status"`
	Catatan        *string `json:"catatan,omitempty"`
	AssignedAt     *string `json:"assigned_at,omitempty"`
	RevokedAt      *string `json:"revoked_at,omitempty"`
	DitugaskanOleh string  `json:"ditugaskan_oleh"`
}

type JabatanListResponse struct {
	Success bool             `json:"success"`
	Data    []JabatanItemDTO `json:"data"`
}

type AssignJabatanRequest struct {
	UserID  int     `json:"user_id" binding:"required"`
	Role    string  `json:"role" binding:"required"`
	Catatan *string `json:"catatan,omitempty"`
}

type RevokeJabatanRequest struct {
	JabatanID int `json:"jabatan_id" binding:"required"`
}

// ─── Laporan Tarik Tunai Admin ───────────────────────────────────────────────

type TarikTunaiReportItemDTO struct {
	TarikID        int     `json:"tarik_id"`
	NamaAnggota    string  `json:"nama_anggota"`
	KasirName      string  `json:"kasir_name"`
	Nominal        float64 `json:"nominal"`
	SumberDana     string  `json:"sumber_dana"`
	TransaksiID    *int    `json:"transaksi_id,omitempty"`
	BelanjaNominal float64 `json:"belanja_nominal"`
	PersetujuanShu bool    `json:"persetujuan_shu"`
	Keterangan     *string `json:"keterangan,omitempty"`
	CreatedAt      *string `json:"created_at,omitempty"`
}

type LaporanTarikTunaiResponse struct {
	Success bool                      `json:"success"`
	Data    []TarikTunaiReportItemDTO `json:"data"`
}
