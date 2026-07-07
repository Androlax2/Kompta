package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// Transaction is a single ledger entry. Amount is signed kamas:
// positive for a gain, negative for a dépense. ActivityID 0 means
// the transaction is not tagged to any activity.
type Transaction struct {
	ID         int64  `json:"id"`
	Date       string `json:"date"` // YYYY-MM-DD
	Amount     int64  `json:"amount"`
	Category   string `json:"category"`
	Note       string `json:"note"`
	ActivityID int64  `json:"activityId"`
	ItemID     int64  `json:"itemId"`
	CreatedAt  string `json:"createdAt"`
}

// Activity is a project whose profit/loss is tracked separately,
// e.g. "Monter Tailleur 1→100".
type Activity struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"createdAt"`
}

// ActivityWithStats is an activity plus aggregates over its
// transactions. TotalExpenses is returned as a positive value.
type ActivityWithStats struct {
	ID            int64  `json:"id"`
	Name          string `json:"name"`
	CreatedAt     string `json:"createdAt"`
	Balance       int64  `json:"balance"`
	TotalIncome   int64  `json:"totalIncome"`
	TotalExpenses int64  `json:"totalExpenses"`
	Count         int64  `json:"count"`
}

// Item is a crafted/maged object (or batch) tracked inside an
// activity. Its cost is captured by kamas snapshots: StartKamas when
// work begins, EndKamas when it is finished (Done). The spent
// difference and every sale become transactions tagged with ItemID.
type Item struct {
	ID         int64  `json:"id"`
	ActivityID int64  `json:"activityId"`
	Name       string `json:"name"`
	StartKamas int64  `json:"startKamas"`
	EndKamas   int64  `json:"endKamas"` // meaningful only when Done
	Done       bool   `json:"done"`
	CreatedAt  string `json:"createdAt"`
}

// ItemWithStats is an item plus aggregates over its transactions.
// Spent is returned as a positive value.
type ItemWithStats struct {
	ID         int64  `json:"id"`
	ActivityID int64  `json:"activityId"`
	Name       string `json:"name"`
	StartKamas int64  `json:"startKamas"`
	EndKamas   int64  `json:"endKamas"`
	Done       bool   `json:"done"`
	CreatedAt  string `json:"createdAt"`
	Spent      int64  `json:"spent"`
	Sales      int64  `json:"sales"`
	Balance    int64  `json:"balance"`
	Count      int64  `json:"count"`
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
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT    NOT NULL,
    amount      INTEGER NOT NULL,
    category    TEXT    NOT NULL,
    note        TEXT    NOT NULL DEFAULT '',
    activity_id INTEGER NOT NULL DEFAULT 0,
    item_id     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE TABLE IF NOT EXISTS activities (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL,
    name        TEXT    NOT NULL,
    start_kamas INTEGER NOT NULL,
    end_kamas   INTEGER,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
`

// SeededActivities are the fixed activities every book starts with.
var SeededActivities = []string{"Forgemagie", "Métiers"}

// migrate brings pre-existing databases up to the current schema and
// seeds the fixed activities.
func migrate(db *sql.DB) error {
	for _, col := range []string{"activity_id", "item_id"} {
		var has int
		err := db.QueryRow(
			"SELECT COUNT(*) FROM pragma_table_info('transactions') WHERE name = ?", col).
			Scan(&has)
		if err != nil {
			return err
		}
		if has == 0 {
			if _, err := db.Exec(
				"ALTER TABLE transactions ADD COLUMN " + col + " INTEGER NOT NULL DEFAULT 0"); err != nil {
				return err
			}
		}
	}
	if _, err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_transactions_activity ON transactions(activity_id);
		CREATE INDEX IF NOT EXISTS idx_transactions_item ON transactions(item_id);
		CREATE INDEX IF NOT EXISTS idx_items_activity ON items(activity_id);`); err != nil {
		return err
	}
	for _, name := range SeededActivities {
		if _, err := db.Exec("INSERT OR IGNORE INTO activities (name) VALUES (?)", name); err != nil {
			return err
		}
	}
	return nil
}

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
	if err := migrate(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("impossible de migrer le schéma: %w", err)
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

const transactionColumns = "id, date, amount, category, note, activity_id, item_id, created_at"

func (s *Store) queryTransactions(query string, args ...any) ([]Transaction, error) {
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	transactions := []Transaction{}
	for rows.Next() {
		var t Transaction
		if err := rows.Scan(&t.ID, &t.Date, &t.Amount, &t.Category, &t.Note, &t.ActivityID, &t.ItemID, &t.CreatedAt); err != nil {
			return nil, err
		}
		transactions = append(transactions, t)
	}
	return transactions, rows.Err()
}

func (s *Store) List() ([]Transaction, error) {
	return s.queryTransactions(
		"SELECT " + transactionColumns + " FROM transactions ORDER BY date DESC, id DESC")
}

func (s *Store) ListByActivity(activityID int64) ([]Transaction, error) {
	return s.queryTransactions(
		"SELECT "+transactionColumns+" FROM transactions WHERE activity_id = ? ORDER BY date DESC, id DESC",
		activityID)
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
	if t.ActivityID != 0 {
		var n int
		if err := s.db.QueryRow(
			"SELECT COUNT(*) FROM activities WHERE id = ?", t.ActivityID).Scan(&n); err != nil {
			return Transaction{}, err
		}
		if n == 0 {
			return Transaction{}, fmt.Errorf("activité introuvable (id %d)", t.ActivityID)
		}
	}
	if t.ItemID != 0 {
		var n int
		if err := s.db.QueryRow(
			"SELECT COUNT(*) FROM items WHERE id = ?", t.ItemID).Scan(&n); err != nil {
			return Transaction{}, err
		}
		if n == 0 {
			return Transaction{}, fmt.Errorf("objet introuvable (id %d)", t.ItemID)
		}
	}

	res, err := s.db.Exec(
		"INSERT INTO transactions (date, amount, category, note, activity_id, item_id) VALUES (?, ?, ?, ?, ?, ?)",
		t.Date, t.Amount, t.Category, t.Note, t.ActivityID, t.ItemID)
	if err != nil {
		return Transaction{}, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return Transaction{}, err
	}

	var saved Transaction
	err = s.db.QueryRow(
		"SELECT "+transactionColumns+" FROM transactions WHERE id = ?", id).
		Scan(&saved.ID, &saved.Date, &saved.Amount, &saved.Category, &saved.Note, &saved.ActivityID, &saved.ItemID, &saved.CreatedAt)
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

const activityStatsQuery = `
	SELECT a.id, a.name, a.created_at,
	       COALESCE(SUM(t.amount), 0),
	       COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount END), 0),
	       COALESCE(-SUM(CASE WHEN t.amount < 0 THEN t.amount END), 0),
	       COUNT(t.id)
	FROM activities a
	LEFT JOIN transactions t ON t.activity_id = a.id`

func scanActivityStats(row interface{ Scan(...any) error }) (ActivityWithStats, error) {
	var a ActivityWithStats
	err := row.Scan(&a.ID, &a.Name, &a.CreatedAt,
		&a.Balance, &a.TotalIncome, &a.TotalExpenses, &a.Count)
	return a, err
}

func (s *Store) AddActivity(name string) (Activity, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return Activity{}, fmt.Errorf("le nom de l'activité est obligatoire")
	}
	var n int
	if err := s.db.QueryRow(
		"SELECT COUNT(*) FROM activities WHERE name = ?", name).Scan(&n); err != nil {
		return Activity{}, err
	}
	if n > 0 {
		return Activity{}, fmt.Errorf("une activité nommée « %s » existe déjà", name)
	}

	res, err := s.db.Exec("INSERT INTO activities (name) VALUES (?)", name)
	if err != nil {
		return Activity{}, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return Activity{}, err
	}

	var saved Activity
	err = s.db.QueryRow(
		"SELECT id, name, created_at FROM activities WHERE id = ?", id).
		Scan(&saved.ID, &saved.Name, &saved.CreatedAt)
	if err != nil {
		return Activity{}, err
	}
	return saved, nil
}

func (s *Store) ListActivities() ([]ActivityWithStats, error) {
	rows, err := s.db.Query(activityStatsQuery + " GROUP BY a.id ORDER BY a.id DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	activities := []ActivityWithStats{}
	for rows.Next() {
		a, err := scanActivityStats(rows)
		if err != nil {
			return nil, err
		}
		activities = append(activities, a)
	}
	return activities, rows.Err()
}

func (s *Store) GetActivity(id int64) (ActivityWithStats, error) {
	a, err := scanActivityStats(s.db.QueryRow(
		activityStatsQuery+" WHERE a.id = ? GROUP BY a.id", id))
	if err == sql.ErrNoRows {
		return ActivityWithStats{}, fmt.Errorf("activité introuvable (id %d)", id)
	}
	return a, err
}

func (s *Store) RenameActivity(id int64, name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("le nom de l'activité est obligatoire")
	}
	var n int
	if err := s.db.QueryRow(
		"SELECT COUNT(*) FROM activities WHERE name = ? AND id != ?", name, id).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return fmt.Errorf("une activité nommée « %s » existe déjà", name)
	}

	res, err := s.db.Exec("UPDATE activities SET name = ? WHERE id = ?", name, id)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return fmt.Errorf("activité introuvable (id %d)", id)
	}
	return nil
}

// DeleteActivity removes an activity and untags its transactions
// (they are kept with activity_id 0).
func (s *Store) DeleteActivity(id int64) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("UPDATE transactions SET activity_id = 0 WHERE activity_id = ?", id); err != nil {
		return err
	}
	res, err := tx.Exec("DELETE FROM activities WHERE id = ?", id)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return fmt.Errorf("activité introuvable (id %d)", id)
	}
	return tx.Commit()
}

func (s *Store) AddItem(activityID int64, name string, startKamas int64) (Item, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return Item{}, fmt.Errorf("le nom de l'objet est obligatoire")
	}
	if startKamas < 0 {
		return Item{}, fmt.Errorf("les kamas de départ ne peuvent pas être négatifs")
	}
	var n int
	if err := s.db.QueryRow(
		"SELECT COUNT(*) FROM activities WHERE id = ?", activityID).Scan(&n); err != nil {
		return Item{}, err
	}
	if n == 0 {
		return Item{}, fmt.Errorf("activité introuvable (id %d)", activityID)
	}

	res, err := s.db.Exec(
		"INSERT INTO items (activity_id, name, start_kamas) VALUES (?, ?, ?)",
		activityID, name, startKamas)
	if err != nil {
		return Item{}, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return Item{}, err
	}

	var saved Item
	var endKamas sql.NullInt64
	err = s.db.QueryRow(
		"SELECT id, activity_id, name, start_kamas, end_kamas, created_at FROM items WHERE id = ?", id).
		Scan(&saved.ID, &saved.ActivityID, &saved.Name, &saved.StartKamas, &endKamas, &saved.CreatedAt)
	if err != nil {
		return Item{}, err
	}
	saved.Done = endKamas.Valid
	saved.EndKamas = endKamas.Int64
	return saved, nil
}

func (s *Store) ListItems(activityID int64) ([]ItemWithStats, error) {
	rows, err := s.db.Query(`
		SELECT i.id, i.activity_id, i.name, i.start_kamas, i.end_kamas, i.created_at,
		       COALESCE(-SUM(CASE WHEN t.amount < 0 THEN t.amount END), 0),
		       COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount END), 0),
		       COALESCE(SUM(t.amount), 0),
		       COUNT(t.id)
		FROM items i
		LEFT JOIN transactions t ON t.item_id = i.id
		WHERE i.activity_id = ?
		GROUP BY i.id
		ORDER BY i.id DESC`, activityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []ItemWithStats{}
	for rows.Next() {
		var it ItemWithStats
		var endKamas sql.NullInt64
		if err := rows.Scan(&it.ID, &it.ActivityID, &it.Name, &it.StartKamas, &endKamas, &it.CreatedAt,
			&it.Spent, &it.Sales, &it.Balance, &it.Count); err != nil {
			return nil, err
		}
		it.Done = endKamas.Valid
		it.EndKamas = endKamas.Int64
		items = append(items, it)
	}
	return items, rows.Err()
}

// FinishItem records the ending kamas snapshot. The difference with
// the starting snapshot becomes a transaction tagged to the item
// (a dépense in the normal case).
func (s *Store) FinishItem(id int64, endKamas int64) error {
	if endKamas < 0 {
		return fmt.Errorf("les kamas restants ne peuvent pas être négatifs")
	}
	var (
		activityID, startKamas int64
		name                   string
		existingEnd            sql.NullInt64
	)
	err := s.db.QueryRow(
		"SELECT activity_id, name, start_kamas, end_kamas FROM items WHERE id = ?", id).
		Scan(&activityID, &name, &startKamas, &existingEnd)
	if err == sql.ErrNoRows {
		return fmt.Errorf("objet introuvable (id %d)", id)
	}
	if err != nil {
		return err
	}
	if existingEnd.Valid {
		return fmt.Errorf("« %s » est déjà terminé", name)
	}
	var category string
	if err := s.db.QueryRow(
		"SELECT name FROM activities WHERE id = ?", activityID).Scan(&category); err != nil {
		if err != sql.ErrNoRows {
			return err
		}
		category = "Autre"
	}

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("UPDATE items SET end_kamas = ? WHERE id = ?", endKamas, id); err != nil {
		return err
	}
	if diff := endKamas - startKamas; diff != 0 {
		if _, err := tx.Exec(
			"INSERT INTO transactions (date, amount, category, note, activity_id, item_id) VALUES (?, ?, ?, ?, ?, ?)",
			time.Now().Format("2006-01-02"), diff, category, name, activityID, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// AddSale records a sale for an item as a gain transaction.
func (s *Store) AddSale(itemID int64, amount int64) (Transaction, error) {
	if amount <= 0 {
		return Transaction{}, fmt.Errorf("le montant de la vente doit être supérieur à 0")
	}
	var activityID int64
	var name string
	err := s.db.QueryRow(
		"SELECT activity_id, name FROM items WHERE id = ?", itemID).Scan(&activityID, &name)
	if err == sql.ErrNoRows {
		return Transaction{}, fmt.Errorf("objet introuvable (id %d)", itemID)
	}
	if err != nil {
		return Transaction{}, err
	}
	return s.Add(Transaction{
		Amount:     amount,
		Category:   "Vente",
		Note:       name,
		ActivityID: activityID,
		ItemID:     itemID,
	})
}

// DeleteItem removes an item and untags its transactions (they are
// kept with item_id 0, still tagged to the activity).
func (s *Store) DeleteItem(id int64) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("UPDATE transactions SET item_id = 0 WHERE item_id = ?", id); err != nil {
		return err
	}
	res, err := tx.Exec("DELETE FROM items WHERE id = ?", id)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return fmt.Errorf("objet introuvable (id %d)", id)
	}
	return tx.Commit()
}
