package service

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/koperasipk/backend-go/internal/middleware"
	"github.com/koperasipk/backend-go/internal/model"
	"github.com/koperasipk/backend-go/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo   *repository.UserRepo
	jwtSecret  string
	jwtExpiry  time.Duration
}

func NewAuthService(userRepo *repository.UserRepo, jwtSecret string, jwtExpiryHours int) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
		jwtExpiry: time.Duration(jwtExpiryHours) * time.Hour,
	}
}

// Login validasi kredensial, return token + UserDTO
func (s *AuthService) Login(username, password string) (*string, *model.UserDTO, error) {
	user, err := s.userRepo.FindByUsernameOrFullName(strings.TrimSpace(username))
	if err != nil {
		return nil, nil, errors.New("Username atau password salah")
	}

	if err := s.checkPassword(user.PasswordHash, password); err != nil {
		return nil, nil, errors.New("Username atau password salah")
	}

	_, anggota, activeRoles, err := s.userRepo.FindByID(user.UserID)
	if err != nil {
		return nil, nil, errors.New("Gagal mengambil data profil")
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, nil, errors.New("Gagal membuat token")
	}

	dto := s.buildUserDTO(user, anggota, activeRoles)
	return &token, dto, nil
}

// Me mengambil profil user dari userID
func (s *AuthService) Me(userID int) (*model.UserDTO, error) {
	user, anggota, activeRoles, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("User tidak ditemukan")
	}
	return s.buildUserDTO(user, anggota, activeRoles), nil
}

// ChangePassword ganti password user yang sudah login
func (s *AuthService) ChangePassword(userID int, currentPassword, newPassword string) error {
	user, _, _, err := s.userRepo.FindByID(userID)
	if err != nil {
		return errors.New("User tidak ditemukan")
	}

	if err := s.checkPassword(user.PasswordHash, currentPassword); err != nil {
		return errors.New("Password saat ini tidak sesuai")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("Gagal memproses password baru")
	}

	return s.userRepo.UpdatePassword(userID, string(newHash))
}

// ResetPassword reset via challenge 2-digit hutang depan & 3-digit SHU belakang (sesuai aturan bisnis Koperasi PK)
func (s *AuthService) ResetPassword(username, digitHutang, digitShu, passwordBaru string) error {
	user, err := s.userRepo.FindByUsernameOrFullName(username)
	if err != nil {
		return errors.New("Username anggota tidak ditemukan")
	}

	_, anggota, _, err := s.userRepo.FindByID(user.UserID)
	if err != nil || anggota == nil {
		return errors.New("Akun ini bukan akun anggota atau data buku anggota tidak terdaftar")
	}

	// 1. Expected 2 digit depan hutang anggota
	expectedHutang := computeExpectedHutang(anggota.Hutang)
	// 2. Expected 3 digit belakang SHU anggota
	expectedShu := computeExpectedShu(anggota.Shu)

	inputHutang := strings.TrimSpace(digitHutang)
	inputShu := strings.TrimSpace(digitShu)

	hutangMatch := (inputHutang == expectedHutang)
	shuMatch := (inputShu == expectedShu)

	if !hutangMatch && !shuMatch {
		return errors.New("2 digit depan hutang dan 3 digit belakang SHU tidak cocok dengan data buku anggota.")
	}
	if !hutangMatch {
		return errors.New("2 digit depan hutang tidak sesuai dengan data buku anggota (tanyakan ke kasir/pengurus jika lupa).")
	}
	if !shuMatch {
		return errors.New("3 digit belakang SHU tidak sesuai dengan data buku anggota (tanyakan ke kasir/pengurus jika lupa).")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(passwordBaru), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("Gagal memproses password baru")
	}

	return s.userRepo.UpdatePassword(user.UserID, string(newHash))
}

// --- internal helpers ---

func (s *AuthService) checkPassword(hash, password string) error {
	// PHP bcrypt generates $2y$; convert to $2a$ for Go bcrypt compatibility
	h := hash
	if strings.HasPrefix(h, "$2y$") {
		h = "$2a$" + h[4:]
	}
	return bcrypt.CompareHashAndPassword([]byte(h), []byte(password))
}

func (s *AuthService) generateToken(user *model.User) (string, error) {
	claims := middleware.Claims{
		UserID:   user.UserID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.jwtExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) buildUserDTO(user *model.User, anggota *model.Anggota, rawActiveRoles []string) *model.UserDTO {
	// Susun roles unik: role dari jabatan_anggota + user.Role + selalu sertakan 'anggota'
	roleMap := make(map[string]bool)
	for _, r := range rawActiveRoles {
		roleMap[strings.ToLower(r)] = true
	}
	if user.Role != "" {
		roleMap[strings.ToLower(user.Role)] = true
	}
	roleMap["anggota"] = true

	var finalRoles []string
	for r := range roleMap {
		finalRoles = append(finalRoles, r)
	}

	isAdmin := roleMap["admin"]
	isKasir := roleMap["kasir"]

	dto := &model.UserDTO{
		UserID:      user.UserID,
		ID:          user.UserID,
		Username:    user.Username,
		Role:        user.Role,
		Saldo:       0,
		Hutang:      0,
		Shu:         0,
		ActiveRoles: finalRoles,
		IsAdmin:     isAdmin,
		IsKasir:     isKasir,
	}

	if anggota != nil {
		dto.AnggotaID = &anggota.AnggotaID
		dto.NamaLengkap = anggota.NamaLengkap
		dto.Saldo = anggota.Saldo
		dto.Hutang = anggota.Hutang
		dto.Shu = anggota.Shu
		dto.PersetujuanShuMasterAt = anggota.PersetujuanShuMasterAt
	}

	return dto
}

func computeExpectedHutang(hutang float64) string {
	hInt := int64(hutang)
	if hInt <= 0 {
		return "00"
	}
	s := strconv.FormatInt(hInt, 10)
	if len(s) < 2 {
		s = "0" + s
	}
	return s[:2] // 2 digit depan
}

func computeExpectedShu(shu float64) string {
	sInt := int64(shu)
	if sInt <= 0 {
		return "000"
	}
	s := strconv.FormatInt(sInt, 10)
	for len(s) < 3 {
		s = "0" + s
	}
	return s[len(s)-3:] // 3 digit belakang
}
