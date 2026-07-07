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

- `store.go` — all SQLite logic (Transaction/Summary types, OpenStore/List/Add/Delete/Summary). DB at `~/.config/Kompta/kompta.db` (respects `XDG_CONFIG_HOME`). Amounts are signed int64 kamas: positive = gain, negative = dépense. Dates are `YYYY-MM-DD` TEXT.
- `app.go` — Wails-bound methods (thin delegation to Store); errors surface as rejected promises in the frontend.
- `frontend/wailsjs/` — generated bindings; regenerate with `wails generate module` (or any `wails dev`/`wails build`) after changing bound Go method signatures, before writing frontend code against them.
- `frontend/src/lib/categories.ts` — transaction category list (frontend-only; backend stores any string).
- UI is in French.
