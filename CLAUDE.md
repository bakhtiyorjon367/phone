# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This app tracks a small iPhone import/resale business: phones are bought in Korea, grouped into courier "batches" (max 3 phones) for physical shipment abroad, and later "settled" when the buyer abroad pays. A single `Budget` document tracks running liquid cash across these stages. It's a two-part repo: a FastAPI/MongoDB backend and a React/Vite frontend, deployed independently to the same EC2 host.

The frontend is a Telegram Mini App: it only runs correctly inside Telegram's WebView (see Auth below), and all business data (`Phone`/`Batch`/`Budget`) is still one shared, ungated ledger — the `role`-based auth only gates who's allowed to *see and act on* it, it does not partition data per user.

## Commands

### Backend (`backend/`)

```bash
# from backend/, with a virtualenv active (.venv is the convention here)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Run uvicorn from inside `backend/`, not the repo root — all backend imports (`from core.database import ...`, `from routes import ...`, etc.) are absolute against `backend/` as the import root, not against `app/`. Note `main.py`'s own `if __name__ == "__main__"` block calls `uvicorn.run("app.main:app", ...)`, which does not match this layout and will fail if run with `python main.py`; use the `uvicorn main:app` invocation above instead.

Requires a `MONGO_URI` env var (loaded from `backend/.env`, gitignored) pointing at a MongoDB instance; the `iphone_tracker` database and its collections (`phones`, `batches`, `budget`, `users`) are created/initialized automatically via Beanie on startup (`core/database.py`), including seeding a singleton `Budget` document if one doesn't exist yet.

Also requires a `TELEGRAM_BOT_TOKEN` env var (same `backend/.env`) — it's the HMAC secret used to verify the Telegram Mini App `initData` sent by the frontend (see Auth below). Without it every authenticated route returns 500.

There is no test suite or lint config in `backend/` currently.

### Frontend (`frontend/`)

```bash
npm install
npm run dev       # vite dev server
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview
```

The API client (`src/api/client.ts`) calls a relative `/api` base URL with no Vite dev-server proxy configured in `vite.config.ts`. In production this works because the backend is reverse-proxied under the same origin; for local dev against a real backend you'll need to either add a Vite proxy for `/api` → `http://localhost:8000` or otherwise put both under one origin.

There is no test suite currently.

## Architecture

### Backend: routes → services → models

- **`models/`** — Beanie `Document` classes (`Phone`, `Batch`, `Budget`, `User`, `Settlement`) are both the domain model and the MongoDB schema. `Phone.status` is a state machine: `IN_KOREA` → `IN_TRANSIT` → `SETTLED`. `Phone.target_receivable` (a property, not a stored field) is `purchase_cost + delivery_share + profit`. `User.role` is `user` or `admin` (see Auth below). `Settlement` is a append-only log, one row per "Confirm Payment" action (`phone_ids` + `total_recovered` + `created_at`) — it exists purely for the Cash Flow tab's "Received Money History"; it's written in `phones_service.settle()` but nothing else reads or mutates it.
- **`routes/`** — thin FastAPI routers (one per resource: `phones`, `batches`, `budget`, `dashboard`, `users`, `settlements`), each mounted under `/api/<resource>`. They parse the request schema and delegate straight to a matching `services/*_service.py` function; no business logic lives here. (`users` and `settlements` are the exception — small enough that their handlers live directly in the route file, no matching `*_service.py`.)
- **`services/`** — the actual business logic (budget deduction/credit, phone status transitions, batch fee splitting, dashboard aggregation). This is where to look when changing how money or stock moves.
- **`schemas/api_schemas.py`** — all request-body Pydantic models in one file (not split per route).
- **`core/database.py`** — `init_db()`, called from the FastAPI `lifespan` in `main.py`, wires up Beanie against the `iphone_tracker` database and seeds the singleton `Budget`.

Key domain rules enforced in the service layer:
- Buying a phone (`phones_service.create`) immediately debits `Budget.current_cash` by `purchase_cost`.
- Creating a batch (`batches_service.create`) requires phones to currently be `IN_KOREA`, debits the total courier fee from `Budget`, splits it evenly across the phones into `delivery_share`, and flips them to `IN_TRANSIT`.
- Settling phones (`phones_service.settle`) credits `Budget.current_cash` by the sum of each phone's `target_receivable`, flips them to `SETTLED`, and (if at least one phone was actually newly settled) writes one `Settlement` record for the whole call.
- `dashboard_service.dashboard()` recomputes summary stats (stock value, amount owed by the buyer abroad, realized profit) from the current `Phone`/`Budget` state on every call rather than maintaining running totals — it's the place to update if new dashboard figures are needed.

### Auth: Telegram Mini App + roles

`core/telegram_auth.py` verifies Telegram's signed `initData` (HMAC-SHA256 with `TELEGRAM_BOT_TOKEN` as the key, per Telegram's WebApp validation algorithm) sent by the frontend as `Authorization: tma <initData>` on every request. Two FastAPI dependencies gate routes:
- `get_current_user` — verifies the signature, auto-provisions a `User` document keyed on `telegram_id` the first time it sees that Telegram account (this is the "auto create user via telegramAuth" flow), and returns it. **The very first user ever to authenticate is bootstrapped as `admin`**; everyone after that defaults to `role="user"` — promoting further admins currently means editing the `users` collection directly (no admin UI for it yet).
- `require_admin` — wraps `get_current_user` and additionally requires `role == "admin"`, returning 403 otherwise.

Route gating: `dashboard`, `budget`, and `batches` routers require admin on every endpoint (declared at the router level via `dependencies=[Depends(require_admin)]`). In `phones`, only `GET /api/phones/all` is open to any authenticated user — `buy`/`in-korea`/`unsettled`/`settle` are admin-only (gated per-route, since the router is mixed).

`telegram_username` is intentionally not user-editable (`schemas.UserUpdateRequest` only accepts `display_name`/`bio`); it's kept in sync from Telegram's own data on every login instead.

### Frontend: single-page, tab-based

There's no router — `App.tsx` is one component that switches between views (`cash` / `insert` / `deliver` / `all` / `my`) via local `activeTab` state, and refetches all dashboard/phone/batch data from `src/api/client.ts` whenever a `refreshTrigger` counter is bumped (i.e. after any mutation). `src/api/types.ts` mirrors the backend's response/document shapes by hand — when changing a backend model or schema, update this file too, there's no shared type generation between the two.

On mount, `App.tsx` calls `initTelegramWebApp()` (`src/telegram.ts`, thin wrapper around the `window.Telegram.WebApp` global loaded via the `telegram-web-app.js` script tag in `index.html`) and `fetchMe()` before anything else; `src/api/client.ts`'s axios instance attaches `Authorization: tma <initData>` to every request via a request interceptor, reading `initData` fresh off `window.Telegram.WebApp` each time. Outside of Telegram (e.g. a plain browser tab) `initData` is empty, auth fails, and the app shows an error screen instead of the UI. Non-admin users only ever see the "All Phones" and "My" tabs — the bottom nav conditionally renders the admin-only tabs, and admin-only data fetches (`fetchDashboard`/`fetchKoreaStock`/`fetchUnsettledPhones`/`fetchAllBatches`) are skipped entirely for `role: "user"` accounts to avoid firing requests that will 403.

### Deployment

GitHub Actions (`.github/workflows/`) deploys on push to `main`, path-filtered per side:
- `deploy-frontend.yml` — builds with `npm ci && npm run build`, then scp's `frontend/dist/*` to the EC2 host.
- `deploy-backend.yml` — SSHes into EC2, `git pull`s, reinstalls requirements into an existing `venv`, and restarts the `fastapi-phone.service` systemd unit.

There's no CI test/lint gate before deploy, and no staging environment — a push to `main` under `frontend/` or `backend/` goes straight to production.
