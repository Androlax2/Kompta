package main

import (
	"context"
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx   context.Context
	store *Store
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	store, err := OpenStore()
	if err != nil {
		runtime.LogErrorf(ctx, "ouverture de la base de données: %v", err)
		return
	}
	a.store = store
}

// shutdown is called when the app closes.
func (a *App) shutdown(_ context.Context) {
	if a.store != nil {
		a.store.Close()
	}
}

var errNoStore = fmt.Errorf("la base de données n'est pas disponible")

func (a *App) ListTransactions() ([]Transaction, error) {
	if a.store == nil {
		return nil, errNoStore
	}
	return a.store.List()
}

func (a *App) AddTransaction(t Transaction) (Transaction, error) {
	if a.store == nil {
		return Transaction{}, errNoStore
	}
	return a.store.Add(t)
}

func (a *App) DeleteTransaction(id int64) error {
	if a.store == nil {
		return errNoStore
	}
	return a.store.Delete(id)
}

func (a *App) GetSummary() (Summary, error) {
	if a.store == nil {
		return Summary{}, errNoStore
	}
	return a.store.Summary()
}

func (a *App) ListActivities() ([]ActivityWithStats, error) {
	if a.store == nil {
		return nil, errNoStore
	}
	return a.store.ListActivities()
}

func (a *App) GetActivity(id int64) (ActivityWithStats, error) {
	if a.store == nil {
		return ActivityWithStats{}, errNoStore
	}
	return a.store.GetActivity(id)
}

func (a *App) DeleteActivity(id int64) error {
	if a.store == nil {
		return errNoStore
	}
	return a.store.DeleteActivity(id)
}

func (a *App) ListTransactionsByActivity(activityID int64) ([]Transaction, error) {
	if a.store == nil {
		return nil, errNoStore
	}
	return a.store.ListByActivity(activityID)
}

func (a *App) ListItems(activityID int64) ([]ItemWithStats, error) {
	if a.store == nil {
		return nil, errNoStore
	}
	return a.store.ListItems(activityID)
}

func (a *App) AddItem(activityID int64, name string, startKamas int64) (Item, error) {
	if a.store == nil {
		return Item{}, errNoStore
	}
	return a.store.AddItem(activityID, name, startKamas)
}

func (a *App) FinishItem(id int64, endKamas int64) error {
	if a.store == nil {
		return errNoStore
	}
	return a.store.FinishItem(id, endKamas)
}

func (a *App) AddSale(itemID int64, amount int64) (Transaction, error) {
	if a.store == nil {
		return Transaction{}, errNoStore
	}
	return a.store.AddSale(itemID, amount)
}

func (a *App) DeleteItem(id int64) error {
	if a.store == nil {
		return errNoStore
	}
	return a.store.DeleteItem(id)
}
