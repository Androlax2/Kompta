package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

// Transaction is a single ledger entry. Amount is signed kamas:
// positive for a gain, negative for a dépense.
type Transaction struct {
	ID        int64  `json:"id"`
	Date      string `json:"date"` // YYYY-MM-DD
	Amount    int64  `json:"amount"`
	Category  string `json:"category"`
	Note      string `json:"note"`
	CreatedAt string `json:"createdAt"`
}

// Summary aggregates the whole ledger. TotalExpenses is returned as a
// positive value.
type Summary struct {
	Balance       int64 `json:"balance"`
	TotalIncome   int64 `json:"totalIncome"`
	TotalExpenses int64 `json:"totalExpenses"`
	Count         int64 `json:"count"`
}

type Store struct {
	db *sql.DB
}

const schema = `
CREATE TABLE IF NOT EXISTS transactions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT    NOT NULL,
    amount     INTEGER NOT NULL,
    category   TEXT    NOT NULL,
    note       TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
`

// OpenStore opens (and creates if needed) the SQLite database under the
// user's config directory, e.g. ~/.config/Kompta/kompta.db on Linux.
func OpenStore() (*Store, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, fmt.Errorf("impossible de trouver le dossier de configuration: %w", err)
	}
	dir := filepath.Join(configDir, "Kompta")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("impossible de créer le dossier %s: %w", dir, err)
	}

	db, err := sql.Open("sqlite", filepath.Join(dir, "kompta.db"))
	if err != nil {
		return nil, fmt.Errorf("impossible d'ouvrir la base de données: %w", err)
	}
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		db.Close()
		return nil, err
	}
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, fmt.Errorf("impossible d'initialiser le schéma: %w", err)
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) List() ([]Transaction, error) {
	rows, err := s.db.Query(
		"SELECT id, date, amount, category, note, created_at FROM transactions ORDER BY date DESC, id DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	transactions := []Transaction{}
	for rows.Next() {
		var t Transaction
		if err := rows.Scan(&t.ID, &t.Date, &t.Amount, &t.Category, &t.Note, &t.CreatedAt); err != nil {
			return nil, err
		}
		transactions = append(transactions, t)
	}
	return transactions, rows.Err()
}

func (s *Store) Add(t Transaction) (Transaction, error) {
	if t.Amount == 0 {
		return Transaction{}, fmt.Errorf("le montant ne peut pas être nul")
	}
	if t.Category == "" {
		return Transaction{}, fmt.Errorf("la catégorie est obligatoire")
	}
	if t.Date == "" {
		t.Date = time.Now().Format("2006-01-02")
	} else if _, err := time.Parse("2006-01-02", t.Date); err != nil {
		return Transaction{}, fmt.Errorf("date invalide: %s", t.Date)
	}

	res, err := s.db.Exec(
		"INSERT INTO transactions (date, amount, category, note) VALUES (?, ?, ?, ?)",
		t.Date, t.Amount, t.Category, t.Note)
	if err != nil {
		return Transaction{}, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return Transaction{}, err
	}

	var saved Transaction
	err = s.db.QueryRow(
		"SELECT id, date, amount, category, note, created_at FROM transactions WHERE id = ?", id).
		Scan(&saved.ID, &saved.Date, &saved.Amount, &saved.Category, &saved.Note, &saved.CreatedAt)
	if err != nil {
		return Transaction{}, err
	}
	return saved, nil
}

func (s *Store) Delete(id int64) error {
	res, err := s.db.Exec("DELETE FROM transactions WHERE id = ?", id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("transaction introuvable (id %d)", id)
	}
	return nil
}

func (s *Store) Summary() (Summary, error) {
	var sum Summary
	err := s.db.QueryRow(`
		SELECT
			COALESCE(SUM(amount), 0),
			COALESCE(SUM(CASE WHEN amount > 0 THEN amount END), 0),
			COALESCE(-SUM(CASE WHEN amount < 0 THEN amount END), 0),
			COUNT(*)
		FROM transactions`).
		Scan(&sum.Balance, &sum.TotalIncome, &sum.TotalExpenses, &sum.Count)
	return sum, err
}
