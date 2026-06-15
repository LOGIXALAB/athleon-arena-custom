# Athleon Arena — Setup (one-time Supabase wiring)

The app code builds and its domain tests run **without** any backend. To bring the
database online (booking, scoring persistence, admin, etc.) do the following once.

## 1. Create a Supabase project
1. Go to https://supabase.com → New project (free tier is fine).
2. Pick a region close to Pakistan (e.g. Singapore / Mumbai).
3. Wait for it to provision.

## 2. Collect keys → `.env.local`
Copy `.env.example` to `.env.local` and fill in, from **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role secret key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=<any long random string>
```

## 3. Link the CLI and push the schema
```
npx supabase login                       # opens browser, paste access token
npx supabase link --project-ref <ref>    # <ref> = the subdomain of your URL
npm run db:push                          # applies supabase/migrations/0001_init.sql
npm run db:types                         # regenerate typed schema (optional, recommended)
```
> No Docker is required — these commands talk to the cloud project directly.

## 4. Seed data + staff accounts
```
npm run seed        # venue, sports, court, schedules, pricing, plans, flags, demo history
                    # + staff auth users (admin/owner/ops/scorer @athleon.pk)
```
Staff passwords are written to `seed-credentials.txt` (gitignored).

## 5. Enable Realtime broadcast (for live scoring / display)
Supabase Realtime broadcast works out of the box with the anon key. If your project
enforces "private channels only", live screens will need a signed token — that path is
isolated in `src/lib/realtime/useChannel.ts`.

## 6. Verify
```
npm run dev
# then open http://localhost:3000/api/health  → { ok: true, counts: {...} }
```
