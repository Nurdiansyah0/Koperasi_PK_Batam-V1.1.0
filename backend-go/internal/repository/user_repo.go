package repository

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/koperasipk/backend-go/internal/model"
)

type UserRepo struct {
	db *sqlx.DB
}

func NewUserRepo(db *sqlx.DB) *UserRepo {
	return &UserRepo{db: db}
}

// FindByUsernameOrFullName mencari user berdasarkan username atau nama lengkap anggota (case-insensitive)
func (r *UserRepo) FindByUsernameOrFullName(identifier string) (*model.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	clean := strings.ToLower(strings.TrimSpace(identifier))
	var user model.User
	err := r.db.GetContext(ctx, &user, `
		SELECT u.user_id, u.username, u.password_hash, u.role, COALESCE(u.created_at, '') as created_at
		FROM users u
		LEFT JOIN anggota a ON a.user_id = u.user_id
		WHERE LOWER(u.username) = ? OR LOWER(COALESCE(a.nama_lengkap, '')) = ?
		LIMIT 1
	`, clean, clean)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByID mencari user + anggota data
func (r *UserRepo) FindByID(userID int) (*model.User, *model.Anggota, []string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user model.User
	err := r.db.GetContext(ctx, &user, `
		SELECT user_id, username, password_hash, role, COALESCE(created_at, '') as created_at
		FROM users WHERE user_id = ?
	`, userID)
	if err != nil {
		return nil, nil, nil, err
	}

	var anggota model.Anggota
	hasAnggota := true
	err = r.db.GetContext(ctx, &anggota, `
		SELECT anggota_id, user_id, nama_lengkap, email,
		       saldo, simpanan_pokok, simpanan_wajib, hutang, shu,
		       persetujuan_shu_master_at
		FROM anggota WHERE user_id = ?
		LIMIT 1
	`, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			hasAnggota = false
		} else {
			return nil, nil, nil, err
		}
	}

	// Ambil active roles dari jabatan_anggota
	var activeRoles []string
	_ = r.db.SelectContext(ctx, &activeRoles, `
		SELECT role FROM jabatan_anggota WHERE user_id = ? AND status = 'aktif'
	`, userID)

	var pAnggota *model.Anggota
	if hasAnggota {
		pAnggota = &anggota
	}

	return &user, pAnggota, activeRoles, nil
}

// UpdatePassword update password_hash user
func (r *UserRepo) UpdatePassword(userID int, newHash string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, `
		UPDATE users SET password_hash = ? WHERE user_id = ?
	`, newHash, userID)
	return err
}
