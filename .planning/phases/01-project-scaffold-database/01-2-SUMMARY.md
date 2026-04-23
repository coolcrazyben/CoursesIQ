---
phase: 1
plan: 2
subsystem: database + lib-clients
tags: [supabase, rls, typescript, server-only]
dependency_graph:
  requires: [01-1-project-scaffold.md]
  provides: [supabase/schema.sql, lib/supabase/client.ts, lib/supabase/server.ts, lib/supabase/admin.ts, lib/banner.ts, lib/twilio.ts]
  affects: [phase-2, phase-3]
key_files:
  created:
    - supabase/schema.sql
    - lib/supabase/client.ts
    - lib/supabase/server.ts
    - lib/supabase/admin.ts
    - lib/banner.ts
    - lib/twilio.ts
decisions:
  - "server-only package required manual installation (not in create-next-app scaffold)"
  - "SUPABASE_SERVICE_ROLE_KEY populated during plan execution (real JWT, not placeholder)"
  - "Twilio credentials (ACCOUNT_SID, AUTH_TOKEN) also populated ahead of Phase 3"
metrics:
  completed: "2026-04-22"
  tasks_completed: 5
  files_created: 6
---

# Phase 1 Plan 2: Supabase Schema + lib/ Clients Summary

**One-liner:** Supabase project provisioned, schema migrated (alerts + courses tables with RLS), and all lib/ integration modules written — database foundation and Phase 2/3 contracts established.

## Supabase Project

- **Project URL:** `https://pnuylsopxjhegcmzmtcu.supabase.co`
- **Region:** (project default)
- **Tables created:** `alerts` (16 columns), `courses` (7 columns)
- **RLS:** Enabled on both tables
- **Policies:**
  - `anon_insert_alerts` on `alerts` (anon INSERT only — no SELECT for PII protection)
  - `anon_select_courses` on `courses` (anon SELECT — course info is public)

## Environment Variables in .env.local

Names only (values are secrets — never commit them):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID` *(populated ahead of Phase 3)*
- `TWILIO_AUTH_TOKEN` *(populated ahead of Phase 3)*
- `TWILIO_PHONE_NUMBER` *(placeholder — set after toll-free number provisioned)*
- `CRON_SECRET`

## Tasks Completed

| Task | Name | Status |
|------|------|--------|
| 1 | [MANUAL] Create Supabase project + .env.local | Done (pre-existing) |
| 2 | Write supabase/schema.sql | Done |
| 3 | [MANUAL] Apply SQL migration in Supabase Dashboard | Done |
| 4 | Write lib/supabase/{client,server,admin}.ts | Done |
| 5 | Write lib/banner.ts + lib/twilio.ts stubs | Done |
| 6 | Verify TypeScript + lint | Done |

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Exit 0 — no errors |
| `npm run lint` | Exit 0 — 0 errors, 7 warnings (expected `_` stub params) |
| Structural: admin uses `@supabase/supabase-js` | ✓ |
| Structural: admin has `import 'server-only'` | ✓ |
| Structural: admin has `persistSession: false` | ✓ |
| Structural: server awaits `cookies()` | ✓ |
| Structural: banner exports `establishSession`, `getSeatsByCRN` | ✓ |
| Structural: twilio exports `sendSeatAlert` + runtime warning | ✓ |
| Structural: schema has both tables + RLS + policies | ✓ |

## Notes

- `server-only` package was not in the Phase 1 scaffold — installed during this plan (`npm install server-only`)
- Lint warnings (7) are all `@typescript-eslint/no-unused-vars` on `_`-prefixed stub params — expected and non-blocking
- Twilio credentials populated early (user had them available); `TWILIO_PHONE_NUMBER` remains placeholder until toll-free number is provisioned

## Function Signatures — No Deviations

All exported signatures match plan exactly:
- `establishSession(): Promise<string>`
- `getSeatsByCRN(_crn, _subject, _courseNumber, _termCode): Promise<unknown>`
- `sendSeatAlert(_phone, _courseName, _crn): Promise<string>`

## Commit

- `f80f739` — feat(phase-1-plan-2): add Supabase schema + all lib/ integration modules
