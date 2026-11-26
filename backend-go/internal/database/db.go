package database

import (
	"fmt"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	"github.com/koperasipk/backend-go/internal/config"
	_ "modernc.org/sqlite"
)

func Connect(cfg *config.Config) *sqlx.DB {
	var db *sqlx.DB
	var err error

	if cfg.DBDriver == "sqlite" {
		log.Printf("Connecting to SQLite database: %s", cfg.DBPath)
		db, err = sqlx.Connect("sqlite", cfg.DBPath)
	} else {
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=Local&charset=utf8mb4",
			cfg.DBUser, cfg.DBPass, cfg.DBHost, cfg.DBPort, cfg.DBName,
		)
		log.Printf("Connecting to MySQL database: %s:%s/%s", cfg.DBHost, cfg.DBPort, cfg.DBName)
		db, err = sqlx.Connect("mysql", dsn)
	}

	if err != nil {
		log.Fatalf("❌ Gagal connect ke database (%s): %v", cfg.DBDriver, err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	log.Printf("✅ Database terhubung (%s)", cfg.DBDriver)
	return db
}
