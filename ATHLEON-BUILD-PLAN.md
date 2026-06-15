# Athleon Arena — Full Site Build Plan

## Context

Athleon Arena is a sports venue (cricket + futsal on one court at launch) needing a complete digital platform: brand site, booking, payments, team registration, live scoring, big-screen display, ops console, and owner dashboard. The baseline architecture is `C:\Users\SAPPHIRE PC\Downloads\files\athleon-arena-technical-plan.md` (Next.js + Postgres, sport-plugin engine, event-sourced scoring). The client has made these **overriding changes**:

1. **No QR check-in, no kiosk, no venue hardware agent, no automated lights** — all dropped. Arrival = ops manager clicks "Mark arrived".
2. **Payments**: after the booking form the customer picks one of three options: (a) online Easypaisa/JazzCash — **stub adapter**, feature-flagged "coming soon" (no merchant account yet); (b) **bank transfer** — venue bank details shown, customer uploads screenshot via site or sends on WhatsApp, ops verifies; (c) **reserve & pay cash on arrival** — ops records cash and confirms. Ops manager manually confirms all manual payments.
3. **Post-booking**: confirmation screen shows a button to the team-registration page (manage link). After ops confirms, ops console shows a **"Send on WhatsApp"** button (pre-filled `wa.me` link with the manage URL — confirmed choice; WhatsApp Business API rejected as it costs ~PKR 2.79/message).
4. **Scoring**: ONE capability link — the manage page has a "Score Match" tab that **unlocks 30 min before `starts_at`** (server-enforced). Customers self-score via token; staff can also score. Dual-auth on event APIs.
5. **Display switching**: from the scoring panel, toggle the court display between **headline** scoreboard and a **detailed tabular scorecard** (full batting/bowling cards for both teams; futsal: scorers/cards) via a realtime command.
6. **Placeholders**: teams default "Team A/B", players "Player 1..N"; real names can be entered any time (before/during/after match) and update live everywhere.
7. **Memberships**: full implementation (plans CRUD, member assignment, pricing discounts, marketing section).

**Confirmed stack**: Next.js 15 (App Router, TS, Tailwind, `src/`) + **Supabase cloud** (Postgres, Auth for staff, Realtime broadcast, Storage). Single app (not a monorepo) with `src/lib/core/**` as the pure-domain layer (no framework imports). Machine: Windows 11, Node 24, npm, git, **no Docker** (cloud-only Supabase workflow: `link` + `db push` + `gen types --linked`).

**Blocking input at Phase 0**: user must create the Supabase project and supply `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (and CLI access token to link/push).

---

## Booking state machine (revised)

Statuses: `pending_payment | pending_verification | reserved | confirmed | checked_in | in_progress | completed | cancelled | expired | no_show`. New `bookings.payment_method`: `online | bank_transfer | cash_on_arrival`.

- **online** → `pending_payment`, hold 15 min (kept for future gateway).
- **bank_transfer** → `pending_verification`, hold `min(starts_at, created_at + 4h)`; uploading proof extends hold to `starts_at` and notifies ops. Ops "Confirm payment" → `confirmed`.
- **cash_on_arrival** → `reserved`, **no hold expiry** (holds until slot); ops "Arrived + cash" records payment and moves `reserved → confirmed → checked_in` atomically; ops can release a slot ≥20 min after start.
- **walk-in** (ops) → `confirmed` directly with cash payment row.
- `confirmed` → "Mark arrived" → `checked_in` → auto `in_progress` at `starts_at` → auto `completed` at `ends_at`. No-show worker: `reserved|confirmed` past `ends_at` with no arrival → `no_show`.

Transitions table in `src/lib/core/booking/transitions.ts`. Postgres exclusion constraint (`btree_gist`) covers all live statuses listed above.

## Schema deltas vs the doc

- **Dropped**: `check_ins`, `devices`, `device_commands` (+ enum, + §9.7 endpoints).
- **Modified**: `booking_status` enum (+`pending_verification`, +`reserved`); `bookings` + `payment_method`, `arrived_at`, `arrival_marked_by`; `payments` + `verified_by/verified_at/note`, status gains `pending_verification`; `venues` + `settings jsonb` (bank details, WhatsApp number); `staff_users.id` = Supabase auth uid; `match_events` + `recorded_via ('staff'|'manage_token'|'system')`.
- **Added**: `payment_proofs` (booking_id, storage_path, note); `court_display_state` (court_id PK, mode `headline|scorecard`, match_id) — persisted display mode, truth-row + broadcast-push pattern.
- **Storage buckets**: `team-logos` (private), `payment-proofs` (private, server-signed uploads), `gallery` (public read).
- **RLS**: enabled everywhere with no anon policies; all access via route handlers using the service-role key (`import 'server-only'`).

## Realtime (Supabase broadcast channels, anon-subscribable)

| Channel | Events | Subscribers |
|---|---|---|
| `match:{matchId}` | `event_appended`, `event_reverted`, `roster_updated`, `match_completed` | display, scorer panel, manage Score tab |
| `court:{courtId}` | `display_mode`, `match_assigned`, `idle` | display, ops |
| `ops:{venueId}` | `booking_created`, `proof_uploaded`, `booking_confirmed`, `arrived` | ops console |

Server publishes via the Realtime **HTTP broadcast endpoint** (service-role key) from route handlers — no long-lived sockets. Clients use a `useChannel` hook with reconnect + snapshot refetch (`GET /api/matches/:id/state`).

## Scoring auth (dual)

`src/lib/auth/scoring-auth.ts`, used by events/revert/display-mode/match-create:
1. Staff session with role ≥ scorer → allow.
2. Else `x-manage-token` header: booking by token → match must belong to it → status ∈ (reserved, confirmed, checked_in, in_progress) → window `starts_at − 30min ≤ now ≤ ends_at + 30min` (403 `SCORING_LOCKED` outside; manage tab shows countdown).

Match creation from manage page auto-seeds placeholder players (Player 1..N per format). Reducers store `playerId` only; `scoreboard(state, ctx)` resolves names from fresh context → renames update live with zero event-log impact. `ScoreboardModel` gains a sport-agnostic `detail.sections[]` (title/columns/rows/footer) for the tabular display mode — cricket maps batting/bowling cards, futsal maps goals/cards.

## Payments & notify adapters

`PaymentProvider` registry: `easypaisa_jazzcash` (stub; UI card disabled "Coming soon" unless `feature_flags.online_payments`), `bank_transfer` (details + proof upload + "I'll send on WhatsApp" deep link), `cash` (ops-side). `NotifyRegistry` with `wa-click-to-send` adapter composing `https://wa.me/<digits>?text=<encoded msg ≤ ~500 chars>`; Business API adapter can be added later as one file.

## Directory structure (key paths)

```
D:\Projects\Athleon\
├── supabase/migrations/0001_init.sql · seed.sql      # full schema + seed
├── scripts/seed-staff.ts                              # auth users + staff_users
└── src/
    ├── middleware.ts                                  # RBAC: /score /ops /admin
    ├── app/
    │   ├── (marketing)/  page, memberships, gallery
    │   ├── book/[sport]/                              # date → slot → details → payment choice → done
    │   ├── manage/[token]/                            # tabs: Booking · Teams & Players · Score Match
    │   ├── score/[matchId]/  display/[courtId]/  ops/  admin/  login/
    │   └── api/  (availability, bookings, manage/*, matches/*, ops/*, admin/*, internal/tick)
    ├── lib/
    │   ├── core/   # PURE: sports (contract/registry/engine/cricket/futsal), booking,
    │   │           # pricing, payments, notify, memberships, analytics
    │   ├── db/     # server.ts (service role), browser.ts, queries, types.gen.ts
    │   ├── auth/   # staff.ts, manage-token.ts, scoring-auth.ts
    │   └── realtime/  # channels, publish (HTTP broadcast), useChannel
    └── components/  # CricketPanel, GenericPad, scoreboard/{Headline,ScorecardTable}, SlotGrid…
```

## Build phases (each ends with verification)

- **Phase 0 — Scaffold + env**: create-next-app, deps (`@supabase/supabase-js @supabase/ssr zod date-fns date-fns-tz vitest`, dev `supabase`), git init, dark floodlit theme tokens (near-black surfaces, volt-green accent, condensed numerals). **Collect Supabase keys from user**; `supabase init` + `link`. Verify: preview screenshot, `tsc --noEmit`.
- **Phase 1 — Schema + seed**: `0001_init.sql` (full schema, exclusion constraint, RLS, buckets, pg_cron tick fn), `db push`, `gen types`, seed.sql + seed-staff.ts. Verify: health route counts; overlapping-insert script gets `23P01`.
- **Phase 2 — Pure core + tests**: sport contract/registry/engine, cricket module (reduce/validate/scoreboard incl. detail sections), futsal module, pricing engine, transitions/slots/availability, memberships apply, payment/notify registries. Verify: `vitest run` green (golden scorecards = highest-value suite).
- **Phase 3 — Marketing site**: hero w/ CTAs from `sports`, about, memberships (flag-gated), gallery, contact (wa.me). Verify: screenshots desktop+mobile.
- **Phase 4 — Booking flow**: availability API, create-booking API (server-side pricing, 409 on `23P01`), 5-step book flow with payment-choice step, confirmation → "Set up your teams & players" button, manage page v1 (roster editor w/ roles from `roster_schema`, logo + proof uploads, cancel). Verify in preview: full bank-transfer booking, double-book rejection.
- **Phase 5 — Staff auth + ops console**: login, middleware RBAC, ops Today timeline, booking drawer (proof viewer, Confirm payment, Mark arrived ± cash, **Send on WhatsApp** wa.me button, cancel/no-show/extend), walk-in dialog, admin shell + staff CRUD + feature flags. Verify in preview: ops confirms Phase-4 booking; wa.me href contains manage link.
- **Phase 6 — Match engine + scoring**: append/revert routes (seq assignment via Postgres RPC with row lock), state/events endpoints, dual auth, match-create with placeholder players, CricketPanel + GenericPad mounted on staff `/score` and manage Score tab (locked-countdown UI). Verify in preview: score toss→balls→wicket→undo via manage token; future booking shows lock + API 403.
- **Phase 7 — Display + mode switch**: `/display/[courtId]` idle→live(headline|scorecard)→result, persisted mode on load, scorer-panel Display toggle → `POST /display-mode` → broadcast; live roster rename propagation. Verify: multi-view preview, screenshots of both modes, rename reflects on display.
- **Phase 8 — Admin dashboard**: pricing CRUD + live price preview, schedules/blocks, full memberships (plans CRUD, assignment, discount end-to-end in booking), analytics (revenue, occupancy, peak-split, source-split, sports-mix, no-shows, memberships, heatmap), audit browser. Verify: new peak rule changes grid price; member phone gets discount; analytics screenshots.
- **Phase 9 — Workers + hardening + E2E**: tick() (expire holds, promote in_progress, complete, no-show) via pg_cron + `POST /api/internal/tick` (CRON_SECRET), cancellation policy gate, rate limiting on public POSTs, per-phone live-reservation cap (2), empty/error states, mobile pass. Verify: scripted E2E of all three payment paths + tick expiry; `vitest`, `tsc`, `next build` clean.

## Seed data

Venue "Athleon Arena" (Asia/Karachi, bank details + WhatsApp in `settings`); sports cricket/futsal with roster schemas; Court 1 with both sports; schedules 09:00–23:00 daily, 60-min slots; pricing: base 3000 PKR + Peak Fri–Sun 18:00–23:00 5000 PKR; membership plans silver/gold/elite (5/10/15%); flags: memberships ON, online_payments OFF; staff users admin/owner/ops/scorer @athleon.pk via `seed-staff.ts`; a few historical bookings so analytics renders.

## Risks / gotchas to honor during build

Next 15 async `params`/`cookies`; no Docker (never `supabase start`/`db diff`); anon broadcast channels must be allowed in project Realtime settings (fallback: server-signed JWTs, isolated in `useChannel`); `23P01` mapping to 409; per-match seq via RPC row-lock (PostgREST has no client transactions); all slot math through `date-fns-tz` with venue timezone; service-role client `server-only`; scoring window re-reads `ends_at` (extension-safe); wa.me text ≤ ~500 chars; Tailwind v4 config-in-CSS.

## Verification (end-to-end)

Run dev server via Claude Preview MCP; walk the full journey: book (bank transfer) → upload proof → ops confirm → WhatsApp button → manage roster → score tab unlocks (seed a now-starting booking) → score a cricket innings → display headline + scorecard toggle → rename player live → complete → analytics reflect it. Plus `vitest run`, `npx tsc --noEmit`, `next build`.
