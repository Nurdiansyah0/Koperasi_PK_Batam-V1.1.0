package model

// DB model — sesuai tabel users + anggota
type User struct {
	UserID       int    `db:"user_id"`
	Username     string `db:"username"`
	PasswordHash string `db:"password_hash"`
	Role         string `db:"role"`
	CreatedAt    string `db:"created_at"`
}

type Anggota struct {
	AnggotaID              int      `db:"anggota_id"`
	UserID                 *int     `db:"user_id"`
	NamaLengkap            *string  `db:"nama_lengkap"`
	Email                  *string  `db:"email"`
	Saldo                  float64  `db:"saldo"`
	SimpananPokok          float64  `db:"simpanan_pokok"`
	SimpananWajib          float64  `db:"simpanan_wajib"`
	Hutang                 float64  `db:"hutang"`
	Shu                    float64  `db:"shu"`
	PersetujuanShuMasterAt *string  `db:"persetujuan_shu_master_at"`
}

type JabatanAnggota struct {
	JabatanID int    `db:"jabatan_id"`
	UserID    int    `db:"user_id"`
	Role      string `db:"role"`
	Status    string `db:"status"`
}

// DTO — response ke Android (kompatibel penuh dengan UserDto.kt)
type UserDTO struct {
	UserID                 int      `json:"user_id"`
	ID                     int      `json:"id"`
	Username               string   `json:"username"`
	Role                   string   `json:"role"`
	AnggotaID              *int     `json:"anggota_id,omitempty"`
	NamaLengkap            *string  `json:"nama_lengkap,omitempty"`
	Saldo                  float64  `json:"saldo"`
	Hutang                 float64  `json:"hutang"`
	Shu                    float64  `json:"shu"`
	PersetujuanShuMasterAt *string  `json:"persetujuan_shu_master_at,omitempty"`
	ActiveRoles            []string `json:"active_roles"`
	IsAdmin                bool     `json:"is_admin"`
	IsKasir                bool     `json:"is_kasir"`
}
