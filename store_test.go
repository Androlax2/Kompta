package main

import "testing"

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
