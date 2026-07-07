package main

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func openTestStore(t *testing.T) *Store {
	t.Helper()
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())
	store, err := OpenStore()
	if err != nil {
		t.Fatalf("OpenStore: %v", err)
	}
	t.Cleanup(func() { store.Close() })
	return store
}

func TestAddListSummaryDelete(t *testing.T) {
	store := openTestStore(t)

	gain, err := store.Add(Transaction{Date: "2026-07-07", Amount: 1250000, Category: "Vente", Note: "100 blés"})
	if err != nil {
		t.Fatalf("Add gain: %v", err)
	}
	if gain.ID == 0 || gain.CreatedAt == "" {
		t.Errorf("expected ID and CreatedAt to be set, got %+v", gain)
	}

	if _, err := store.Add(Transaction{Date: "2026-07-06", Amount: -50000, Category: "Achat"}); err != nil {
		t.Fatalf("Add dépense: %v", err)
	}

	list, err := store.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("expected 2 transactions, got %d", len(list))
	}
	if list[0].Date != "2026-07-07" {
		t.Errorf("expected most recent first, got %s", list[0].Date)
	}

	sum, err := store.Summary()
	if err != nil {
		t.Fatalf("Summary: %v", err)
	}
	if sum.Balance != 1200000 || sum.TotalIncome != 1250000 || sum.TotalExpenses != 50000 || sum.Count != 2 {
		t.Errorf("unexpected summary: %+v", sum)
	}

	if err := store.Delete(gain.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	sum, _ = store.Summary()
	if sum.Balance != -50000 || sum.Count != 1 {
		t.Errorf("unexpected summary after delete: %+v", sum)
	}
}

func TestAddValidation(t *testing.T) {
	store := openTestStore(t)

	if _, err := store.Add(Transaction{Amount: 0, Category: "Vente"}); err == nil {
		t.Error("expected error for zero amount")
	}
	if _, err := store.Add(Transaction{Amount: 100, Category: ""}); err == nil {
		t.Error("expected error for empty category")
	}
	if _, err := store.Add(Transaction{Amount: 100, Category: "Vente", Date: "07/07/2026"}); err == nil {
		t.Error("expected error for malformed date")
	}

	saved, err := store.Add(Transaction{Amount: 100, Category: "Vente"})
	if err != nil {
		t.Fatalf("Add without date: %v", err)
	}
	if saved.Date == "" {
		t.Error("expected date to default to today")
	}
}

func TestDeleteMissing(t *testing.T) {
	store := openTestStore(t)
	if err := store.Delete(999); err == nil {
		t.Error("expected error for missing id")
	}
}

func TestMigrationFromOldSchema(t *testing.T) {
	configHome := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", configHome)

	// Create a database with the pre-activities schema and one row.
	dir := filepath.Join(configHome, "Kompta")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	db, err := sql.Open("sqlite", filepath.Join(dir, "kompta.db"))
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(`
		CREATE TABLE transactions (
		    id         INTEGER PRIMARY KEY AUTOINCREMENT,
		    date       TEXT    NOT NULL,
		    amount     INTEGER NOT NULL,
		    category   TEXT    NOT NULL,
		    note       TEXT    NOT NULL DEFAULT '',
		    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
		);
		INSERT INTO transactions (date, amount, category) VALUES ('2026-07-01', 42, 'Vente');`)
	if err != nil {
		t.Fatal(err)
	}
	db.Close()

	store, err := OpenStore()
	if err != nil {
		t.Fatalf("OpenStore on old schema: %v", err)
	}
	defer store.Close()

	list, err := store.List()
	if err != nil {
		t.Fatalf("List after migration: %v", err)
	}
	if len(list) != 1 || list[0].Amount != 42 || list[0].ActivityID != 0 {
		t.Errorf("expected migrated row untagged, got %+v", list)
	}
}

func TestMigrationIdempotent(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())

	store, err := OpenStore()
	if err != nil {
		t.Fatalf("first OpenStore: %v", err)
	}
	activity, err := store.AddActivity("Monter Tailleur")
	if err != nil {
		t.Fatalf("AddActivity: %v", err)
	}
	store.Close()

	store, err = OpenStore()
	if err != nil {
		t.Fatalf("second OpenStore: %v", err)
	}
	defer store.Close()
	if _, err := store.Add(Transaction{Amount: 100, Category: "Vente", ActivityID: activity.ID}); err != nil {
		t.Fatalf("Add tagged after reopen: %v", err)
	}
}

func TestActivities(t *testing.T) {
	store := openTestStore(t)

	activity, err := store.AddActivity("  Monter Tailleur 1→100  ")
	if err != nil {
		t.Fatalf("AddActivity: %v", err)
	}
	if activity.ID == 0 || activity.CreatedAt == "" {
		t.Errorf("expected ID and CreatedAt to be set, got %+v", activity)
	}
	if activity.Name != "Monter Tailleur 1→100" {
		t.Errorf("expected trimmed name, got %q", activity.Name)
	}

	if _, err := store.AddActivity("   "); err == nil {
		t.Error("expected error for empty name")
	}
	if _, err := store.AddActivity("Monter Tailleur 1→100"); err == nil {
		t.Error("expected error for duplicate name")
	}

	empty, err := store.AddActivity("Vide")
	if err != nil {
		t.Fatalf("AddActivity empty: %v", err)
	}

	if _, err := store.Add(Transaction{Amount: 500000, Category: "Vente", ActivityID: activity.ID}); err != nil {
		t.Fatalf("Add tagged gain: %v", err)
	}
	if _, err := store.Add(Transaction{Amount: -200000, Category: "Achat", ActivityID: activity.ID}); err != nil {
		t.Fatalf("Add tagged dépense: %v", err)
	}
	if _, err := store.Add(Transaction{Amount: 100, Category: "Autre"}); err != nil {
		t.Fatalf("Add untagged: %v", err)
	}

	activities, err := store.ListActivities()
	if err != nil {
		t.Fatalf("ListActivities: %v", err)
	}
	if len(activities) != 2+len(SeededActivities) {
		t.Fatalf("expected %d activities (incl. seeded), got %d", 2+len(SeededActivities), len(activities))
	}
	byID := map[int64]ActivityWithStats{}
	for _, a := range activities {
		byID[a.ID] = a
	}
	tailor := byID[activity.ID]
	if tailor.Balance != 300000 || tailor.TotalIncome != 500000 || tailor.TotalExpenses != 200000 || tailor.Count != 2 {
		t.Errorf("unexpected tailor stats: %+v", tailor)
	}
	if v := byID[empty.ID]; v.Balance != 0 || v.Count != 0 {
		t.Errorf("unexpected empty activity stats: %+v", v)
	}

	got, err := store.GetActivity(activity.ID)
	if err != nil {
		t.Fatalf("GetActivity: %v", err)
	}
	if got.Balance != 300000 || got.Name != "Monter Tailleur 1→100" {
		t.Errorf("unexpected GetActivity result: %+v", got)
	}
	if _, err := store.GetActivity(999); err == nil {
		t.Error("expected error for missing activity")
	}

	tagged, err := store.ListByActivity(activity.ID)
	if err != nil {
		t.Fatalf("ListByActivity: %v", err)
	}
	if len(tagged) != 2 {
		t.Errorf("expected 2 tagged transactions, got %d", len(tagged))
	}

	sum, err := store.Summary()
	if err != nil {
		t.Fatalf("Summary: %v", err)
	}
	if sum.Count != 3 {
		t.Errorf("expected global summary to count everything, got %+v", sum)
	}
}

func TestAddWithMissingActivity(t *testing.T) {
	store := openTestStore(t)
	if _, err := store.Add(Transaction{Amount: 100, Category: "Vente", ActivityID: 999}); err == nil {
		t.Error("expected error for missing activity id")
	}
}

func TestRenameActivity(t *testing.T) {
	store := openTestStore(t)
	a, _ := store.AddActivity("Alchimiste")
	b, _ := store.AddActivity("Bûcheron")

	if err := store.RenameActivity(a.ID, "Alchimiste 1→200"); err != nil {
		t.Fatalf("RenameActivity: %v", err)
	}
	got, _ := store.GetActivity(a.ID)
	if got.Name != "Alchimiste 1→200" {
		t.Errorf("expected renamed activity, got %q", got.Name)
	}
	if err := store.RenameActivity(a.ID, "Bûcheron"); err == nil {
		t.Error("expected error renaming to existing name")
	}
	if err := store.RenameActivity(b.ID, "Bûcheron"); err != nil {
		t.Errorf("renaming to own name should be allowed: %v", err)
	}
	if err := store.RenameActivity(999, "X"); err == nil {
		t.Error("expected error for missing id")
	}
}

func findActivity(t *testing.T, store *Store, name string) ActivityWithStats {
	t.Helper()
	activities, err := store.ListActivities()
	if err != nil {
		t.Fatalf("ListActivities: %v", err)
	}
	for _, a := range activities {
		if a.Name == name {
			return a
		}
	}
	t.Fatalf("activity %q not found", name)
	return ActivityWithStats{}
}

func TestSeededActivities(t *testing.T) {
	store := openTestStore(t)
	findActivity(t, store, "Forgemagie")
	findActivity(t, store, "Métiers")

	// Seeding must be idempotent across reopens (same DB).
	if _, err := store.AddActivity("Forgemagie"); err == nil {
		t.Error("expected duplicate error for seeded name")
	}
}

func TestItemLifecycle(t *testing.T) {
	store := openTestStore(t)
	fm := findActivity(t, store, "Forgemagie")

	if _, err := store.AddItem(fm.ID, "   ", 1000, ""); err == nil {
		t.Error("expected error for empty item name")
	}
	if _, err := store.AddItem(fm.ID, "Coiffe", -5, ""); err == nil {
		t.Error("expected error for negative start kamas")
	}
	if _, err := store.AddItem(999, "Coiffe", 1000, ""); err == nil {
		t.Error("expected error for missing activity")
	}

	item, err := store.AddItem(fm.ID, "  Coiffe Moon +40 fo  ", 1000000, "https://api.dofusdb.fr/img/items/16002.png")
	if err != nil {
		t.Fatalf("AddItem: %v", err)
	}
	if item.Name != "Coiffe Moon +40 fo" || item.Done || item.StartKamas != 1000000 {
		t.Errorf("unexpected item: %+v", item)
	}
	if item.ImgURL != "https://api.dofusdb.fr/img/items/16002.png" {
		t.Errorf("expected img URL round-trip, got %q", item.ImgURL)
	}

	items, err := store.ListItems(fm.ID)
	if err != nil {
		t.Fatalf("ListItems: %v", err)
	}
	if len(items) != 1 || items[0].Spent != 0 || items[0].Count != 0 || items[0].Done {
		t.Errorf("unexpected fresh item stats: %+v", items)
	}

	if err := store.FinishItem(item.ID, -1); err == nil {
		t.Error("expected error for negative end kamas")
	}
	if err := store.FinishItem(999, 0); err == nil {
		t.Error("expected error for missing item")
	}
	if err := store.FinishItem(item.ID, 400000); err != nil {
		t.Fatalf("FinishItem: %v", err)
	}
	if err := store.FinishItem(item.ID, 400000); err == nil {
		t.Error("expected error finishing twice")
	}

	// The kamas difference became a dépense tagged to item + activity,
	// with the activity name as category.
	list, _ := store.List()
	if len(list) != 1 {
		t.Fatalf("expected 1 auto transaction, got %d", len(list))
	}
	auto := list[0]
	if auto.Amount != -600000 || auto.Category != "Forgemagie" || auto.ItemID != item.ID || auto.ActivityID != fm.ID {
		t.Errorf("unexpected auto transaction: %+v", auto)
	}

	if _, err := store.AddSale(item.ID, 0); err == nil {
		t.Error("expected error for zero sale")
	}
	if _, err := store.AddSale(999, 100); err == nil {
		t.Error("expected error for missing item")
	}
	sale, err := store.AddSale(item.ID, 900000)
	if err != nil {
		t.Fatalf("AddSale: %v", err)
	}
	if sale.Amount != 900000 || sale.Category != "Vente" || sale.ItemID != item.ID || sale.ActivityID != fm.ID {
		t.Errorf("unexpected sale transaction: %+v", sale)
	}

	items, _ = store.ListItems(fm.ID)
	it := items[0]
	if !it.Done || it.EndKamas != 400000 || it.Spent != 600000 || it.Sales != 900000 || it.Balance != 300000 || it.Count != 2 {
		t.Errorf("unexpected item stats: %+v", it)
	}

	// Activity stats include the item's transactions.
	fm = findActivity(t, store, "Forgemagie")
	if fm.Balance != 300000 || fm.Count != 2 {
		t.Errorf("unexpected activity stats: %+v", fm)
	}
}

func TestFinishItemNoDifference(t *testing.T) {
	store := openTestStore(t)
	fm := findActivity(t, store, "Forgemagie")
	item, _ := store.AddItem(fm.ID, "Rien dépensé", 500, "")
	if err := store.FinishItem(item.ID, 500); err != nil {
		t.Fatalf("FinishItem: %v", err)
	}
	list, _ := store.List()
	if len(list) != 0 {
		t.Errorf("expected no transaction for zero difference, got %d", len(list))
	}
	items, _ := store.ListItems(fm.ID)
	if !items[0].Done {
		t.Error("expected item to be done")
	}
}

func TestDeleteItemUntags(t *testing.T) {
	store := openTestStore(t)
	fm := findActivity(t, store, "Métiers")
	item, _ := store.AddItem(fm.ID, "Lot de coiffes", 10000, "")
	if err := store.FinishItem(item.ID, 4000); err != nil {
		t.Fatalf("FinishItem: %v", err)
	}
	if _, err := store.AddSale(item.ID, 8000); err != nil {
		t.Fatalf("AddSale: %v", err)
	}

	if err := store.DeleteItem(item.ID); err != nil {
		t.Fatalf("DeleteItem: %v", err)
	}
	if err := store.DeleteItem(item.ID); err == nil {
		t.Error("expected error deleting twice")
	}

	list, _ := store.List()
	if len(list) != 2 {
		t.Fatalf("expected transactions kept, got %d", len(list))
	}
	for _, tr := range list {
		if tr.ItemID != 0 {
			t.Errorf("expected untagged item, got %+v", tr)
		}
		if tr.ActivityID != fm.ID {
			t.Errorf("expected activity tag kept, got %+v", tr)
		}
	}
}

func TestDeleteActivityUntags(t *testing.T) {
	store := openTestStore(t)
	activity, _ := store.AddActivity("Pêcheur")
	if _, err := store.Add(Transaction{Amount: 1000, Category: "Récolte", ActivityID: activity.ID}); err != nil {
		t.Fatalf("Add: %v", err)
	}

	if err := store.DeleteActivity(activity.ID); err != nil {
		t.Fatalf("DeleteActivity: %v", err)
	}

	tagged, _ := store.ListByActivity(activity.ID)
	if len(tagged) != 0 {
		t.Errorf("expected no tagged transactions after delete, got %d", len(tagged))
	}
	all, _ := store.List()
	if len(all) != 1 || all[0].ActivityID != 0 {
		t.Errorf("expected transaction kept and untagged, got %+v", all)
	}
	if err := store.DeleteActivity(999); err == nil {
		t.Error("expected error for missing id")
	}
}

func TestUpdateTransaction(t *testing.T) {
	store := openTestStore(t)
	fm := findActivity(t, store, "Forgemagie")

	orig, err := store.Add(Transaction{Date: "2026-07-01", Amount: 100000, Category: "Vente", Note: "avant", ActivityID: fm.ID})
	if err != nil {
		t.Fatalf("Add: %v", err)
	}

	orig.Date = "2026-07-05"
	orig.Amount = -250000
	orig.Category = "Achat"
	orig.Note = "après"
	saved, err := store.Update(orig)
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if saved.Date != "2026-07-05" || saved.Amount != -250000 || saved.Category != "Achat" || saved.Note != "après" {
		t.Errorf("unexpected updated transaction: %+v", saved)
	}
	if saved.ActivityID != fm.ID || saved.CreatedAt == "" {
		t.Errorf("expected tags and createdAt preserved, got %+v", saved)
	}

	sum, _ := store.Summary()
	if sum.Balance != -250000 || sum.Count != 1 {
		t.Errorf("expected summary to reflect update, got %+v", sum)
	}
}

func TestUpdateValidation(t *testing.T) {
	store := openTestStore(t)
	orig, err := store.Add(Transaction{Amount: 100, Category: "Vente"})
	if err != nil {
		t.Fatalf("Add: %v", err)
	}

	bad := orig
	bad.Amount = 0
	if _, err := store.Update(bad); err == nil {
		t.Error("expected error for zero amount")
	}
	bad = orig
	bad.Category = ""
	if _, err := store.Update(bad); err == nil {
		t.Error("expected error for empty category")
	}
	bad = orig
	bad.Date = "07/07/2026"
	if _, err := store.Update(bad); err == nil {
		t.Error("expected error for malformed date")
	}
	bad = orig
	bad.ActivityID = 999
	if _, err := store.Update(bad); err == nil {
		t.Error("expected error for missing activity")
	}
	bad = orig
	bad.ID = 999
	if _, err := store.Update(bad); err == nil {
		t.Error("expected error for missing transaction id")
	}
}

func TestSearchDofusItems(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/items" {
			t.Errorf("unexpected path %q", r.URL.Path)
		}
		q := r.URL.Query()
		if q.Get("name.fr[$regex]") != "coiffe" || q.Get("name.fr[$options]") != "i" || q.Get("$limit") != "8" {
			t.Errorf("unexpected query params: %v", q)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"total": 2, "limit": 8, "skip": 0, "data": [
			{"name": {"fr": "La Coiffe du Ploukosse", "en": "Slob Headgear"}, "img": "https://api.dofusdb.fr/img/items/16002.png", "level": 60},
			{"name": {"fr": ""}, "img": "ignored.png", "level": 1}
		]}`))
	}))
	defer server.Close()

	items, err := searchDofusItems(server.URL, "coiffe")
	if err != nil {
		t.Fatalf("searchDofusItems: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item (empty names skipped), got %d", len(items))
	}
	if items[0].Name != "La Coiffe du Ploukosse" || items[0].ImgURL != "https://api.dofusdb.fr/img/items/16002.png" || items[0].Level != 60 {
		t.Errorf("unexpected item: %+v", items[0])
	}
}

func TestSearchDofusItemsErrors(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	if _, err := searchDofusItems(server.URL, "coiffe"); err == nil {
		t.Error("expected error for HTTP 500")
	}
}
