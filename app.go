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
