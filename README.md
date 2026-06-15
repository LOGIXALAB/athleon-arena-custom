# Athleon Arena

Digital platform for an indoor sports venue (cricket + futsal at launch) — brand
site, booking, payments, team registration, live event-sourced scoring, big-screen
display, ops console, and owner dashboard. Built to scale to multiple courts,
sports, and venues without rework.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind v4 · Supabase
(Postgres, Auth, Realtime broadcast, Storage) · Vitest.

## Quick start

```bash
npm install
cp .env.example .env.local      # fill in Supabase keys — see SETUP.md
npm run dev                     # http://localhost:3000
```

Without Supabase keys the marketing site still renders (with seed-default data).
For the full app (booking, scoring, admin) follow **[SETUP.md](SETUP.md)** to push
the schema and seed data.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Vitest (cricket/futsal reducers, pricing, booking) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run db:push` | Apply `supabase/migrations` to the linked project |
| `npm run seed` | Seed reference data + staff accounts |

## Interfaces

| Route | Who | Auth |
|---|---|---|
| `/` · `/memberships` · `/gallery` | Public | none |
| `/book/[sport]` | Public | phone captured |
| `/manage/[token]` | Customer | capability token (roster + scoring) |
| `/score/[matchId]` | Scorer | staff session |
| `/display/[courtId]` | Big screen | public (kiosk) |
| `/ops` | Ops manager | staff session |
| `/admin` | Owner / admin | staff session |

## Architecture highlights

- **Sport plugin engine** (`src/lib/core/sports`) — pure reducers; adding a sport
  is one module + one `sports` row. Cricket + futsal at launch.
- **Event-sourced scoring** — `match_events` is the truth; score is derived.
  Undo = mark reverted + re-derive. Append serialized via an `append_match_event`
  RPC under a row lock.
- **One capability link** does roster *and* scoring; the Score tab unlocks 30 min
  before the slot (server-enforced). Dual auth: staff session **or** manage token.
- **Payments** — bank transfer (+ screenshot proof), reserve & pay cash on arrival,
  or online (Easypaisa/JazzCash adapter, stubbed behind a feature flag). Ops
  manually confirms manual payments.
- **Display** switches between headline and full scorecard live from the scorer
  panel via a realtime command (persisted in `court_display_state`).
- **Pricing** — most-specific-rule-wins engine; rules are owner-editable rows.
- **No-overlap guarantee** — Postgres exclusion constraint, race-proof.
- Booking lifecycle, workers (`athleon_tick`), RBAC, audit log, feature flags.

See [ATHLEON-BUILD-PLAN.md](ATHLEON-BUILD-PLAN.md) for the full build plan.
