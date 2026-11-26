package config

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort        string
	AppEnv         string
	DBDriver       string // "sqlite" or "mysql"
	DBPath         string // path to sqlite file
	DBHost         string
	DBPort         string
	DBName         string
	DBUser         string
	DBPass         string
	JWTSecret      string
	JWTExpiryHours int
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	appEnv := getEnv("APP_ENV", "development")
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		if appEnv == "production" {
			log.Fatal("JWT_SECRET environment variable must be set in production")
		}
		jwtSecret = generateEphemeralSecret()
		log.Println("WARNING: JWT_SECRET not set, using ephemeral random secret for development")
	}

	expiryHours, _ := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))

	return &Config{
		AppPort:        getEnv("APP_PORT", "8081"),
		AppEnv:         appEnv,
		DBDriver:       getEnv("DB_DRIVER", "sqlite"),
		DBPath:         getEnv("DB_PATH", "../backend-laravel/database/database.sqlite"),
		DBHost:         getEnv("DB_HOST", "127.0.0.1"),
		DBPort:         getEnv("DB_PORT", "3306"),
		DBName:         getEnv("DB_NAME", "koperasi_db"),
		DBUser:         getEnv("DB_USER", "root"),
		DBPass:         getEnv("DB_PASS", ""),
		JWTSecret:      jwtSecret,
		JWTExpiryHours: expiryHours,
	}
}

func generateEphemeralSecret() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		log.Fatal("failed to generate ephemeral JWT secret:", err)
	}
	return hex.EncodeToString(b)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
