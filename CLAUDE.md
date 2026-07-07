# Kompta

Desktop accounting tool for Dofus kamas. Wails v2 (Go backend, SQLite via modernc.org/sqlite) + React 18 / TypeScript / Tailwind v4 / shadcn/ui frontend.

## Build & run

On Arch Linux, webkit2gtk-4.0 is not available — always pass the webkit 4.1 tag:

```bash
wails dev -tags webkit2_41     # dev mode with HMR
wails build -tags webkit2_41   # production binary → build/bin/kompta
```

Other commands:

```bash
go test ./...                  # backend store tests (store_test.go)
cd frontend && npm run build   # tsc type-check + vite build
```

## Architecture

- `store.go` — all SQLite logic (Transaction/Summary/Activity/Item types and their CRUD). DB at `~/.config/Kompta/kompta.db` (respects `XDG_CONFIG_HOME`). Amounts are signed int64 kamas: positive = gain, negative = dépense. Dates are `YYYY-MM-DD` TEXT. `transactions.activity_id`/`item_id` 0 means untagged (no NULL, no SQL FK — existence checked in Go). Schema changes for existing DBs go in `migrate()` (idempotent, pragma_table_info checks), which also seeds the fixed activities (`SeededActivities`: Forgemagie, Métiers).
- **Items workflow**: an item/batch captures cost via kamas snapshots — `AddItem` stores start kamas (+ optional DofusDB icon URL), `FinishItem` stores end kamas and auto-creates the difference as a transaction (category = activity name); `AddSale` creates "Vente" gains. Item P/L = SUM of its tagged transactions.
- `dofusdb.go` — proxy to the DofusDB fan API (`api.dofusdb.fr/items`, French-name regex search, 5s timeout); done backend-side so the webview avoids CORS. Icons are hot-linked `<img>` URLs; UI falls back gracefully offline.
- `app.go` — Wails-bound methods (thin delegation to Store); errors surface as rejected promises in the frontend. Also lifecycle hooks: `beforeClose` saves window geometry (`window.go` → `~/.config/Kompta/window.json`) and shows a quit-guard dialog when a craft is still open.
- `build/appicon.svg` — icon source of truth; regenerate the embedded PNG with `rsvg-convert -w 1024 -h 1024 build/appicon.svg -o build/appicon.png`.
- `frontend/wailsjs/` — generated bindings; regenerate with `wails generate module` (or any `wails dev`/`wails build`) after changing bound Go method signatures, before writing frontend code against them.
- Transaction categories are free strings; the history UI derives its filter/edit lists from existing data (no fixed list).
- `frontend/src/components/BalanceChart.tsx` — hand-rolled SVG chart (no chart lib); `lib/profitability.ts` — client-side craft grouping for the Rentabilité ranking.
- UI is in French.
