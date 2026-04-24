---
phase: 03-alert-system-cron-worker
plan: 03
subsystem: cron-worker
tags: [cron, twilio, supabase, vercel, nodejs-runtime, batching, sms, typescript]
dependency_graph:
  requires:
    - lib/twilio.ts (Plan 03-01)
    - lib/banner.ts (Phase 2)
    - lib/supabase/admin.ts (Phase 1)
    - supabase alerts table with unique constraint (Plan 03-01 migration)
  provides:
    - app/api/cron/check-seats/route.ts (GET — authenticated cron handler)
    - vercel.json (5-minute cron schedule configuration)
  affects:
    - Supabase alerts table rows (sms_sent_at, is_active, sms_sid, sms_opted_out updates)
tech_stack:
  added: []
  patterns:
    - export const runtime = 'nodejs' as absolute first line (DEPL-04)
    - CRON_SECRET Bearer token auth guard — returns 401 before any processing
    - Supabase .is('sms_sent_at', null) for NULL filter (not .eq())
    - Supabase .not('sms_sent_at', 'is', null) for IS NOT NULL
    - Map<string, typeof alerts> grouping by subject:course_number for Banner call batching
    - Set deduplication of CRNs within each group — one Banner call per unique CRN
    - Twilio error 21610 caught via (err as { code?: number }).code === 21610
    - Re-alert reset pattern: reactivates alerts when seats close after prior notification
key_files:
  created:
    - app/api/cron/check-seats/route.ts
    - vercel.json
  modified: []
decisions:
  - "runtime export placed before comment block (line 1) per DEPL-04 — comments moved after export"
metrics:
  duration: "~2 minutes"
  completed: "2026-04-23"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 3 Plan 03: Cron Worker — GET /api/cron/check-seats + vercel.json Summary

**One-liner:** Authenticated cron route that batches Banner API calls by (subject, course_number), dispatches Twilio SMS on seat openings, handles TCPA opt-out (error 21610), supports re-alert reset on seat closure, with 5-minute Vercel cron schedule in vercel.json.

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Create app/api/cron/check-seats/route.ts — authenticated cron handler | Done | 7a831de |
| 2 | Create vercel.json with 5-minute cron configuration | Done | 1ad68d6 |

## Files Created

### app/api/cron/check-seats/route.ts (new)

**Exports:**
- `GET` — authenticated cron handler (NextRequest → NextResponse)
- `runtime = 'nodejs'` — Node.js runtime declaration (line 1, before all imports)

**Key behaviors:**
- Auth guard: `auth !== \`Bearer ${process.env.CRON_SECRET}\`` → 401 immediately
- Fetches active alerts: `.eq('is_active', true).is('sms_sent_at', null).eq('sms_opted_out', false)`
- Groups by `${subject}:${course_number}` using `Map<string, typeof alerts>`
- Deduplicates CRNs with `[...new Set(groupAlerts.map(a => a.crn))]`
- One `getSeatsByCRN` call per unique CRN (batching core)
- On `seatsAvailable > 0`: calls `sendSeatAlert`, updates `sms_sent_at + is_active=false + sms_sid` atomically
- On Twilio error 21610: sets `sms_opted_out: true` only — does NOT set `sms_sent_at`
- On other Twilio errors: logs and continues (does not abort cron run)
- Re-alert reset: queries `is_active=false AND sms_sent_at IS NOT NULL AND sms_opted_out=false`, resets `sms_sent_at=null, is_active=true` when seats close
- Returns `{ checked: number, alerted: number }`

### vercel.json (new)

```json
{
  "crons": [
    {
      "path": "/api/cron/check-seats",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

- Path: `/api/cron/check-seats`
- Schedule: `*/5 * * * *` (every 5 minutes — requires Vercel Pro plan)
- Vercel automatically injects `Authorization: Bearer <CRON_SECRET>` from project env vars

## Verification Results

| Check | Result |
|-------|--------|
| `export const runtime = 'nodejs'` is line 1 | PASS |
| `import { adminClient }` present | PASS |
| `import { getSeatsByCRN }` present | PASS |
| `import { sendSeatAlert }` present | PASS |
| `CRON_SECRET` in auth comparison | PASS |
| `.is('sms_sent_at', null)` NULL filter (not `.eq()`) | PASS |
| `groups` Map batching by subject:course_number | PASS |
| `uniqueCrns` Set deduplication | PASS |
| `crnAlerts` per-CRN subscriber filtering | PASS |
| `seatsAvailable` check | PASS |
| `21610` opt-out error code handled | PASS |
| `sms_opted_out: true` set on opt-out | PASS |
| `sms_sent_at` + `sms_sid` in success update | PASS |
| `{ checked, alerted }` return shape | PASS |
| `.not('sms_sent_at', 'is', null)` IS NOT NULL filter | PASS |
| `vercel.json` path = `/api/cron/check-seats` | PASS |
| `vercel.json` schedule = `*/5 * * * *` | PASS |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved runtime declaration above comment block**

- **Found during:** Task 1 structural verification
- **Issue:** Initial file write placed a two-line comment block before `export const runtime = 'nodejs'`. The plan's DEPL-04 constraint and the automated verification check require `runtime` to be the absolute first line — before any comments.
- **Fix:** Moved `export const runtime = 'nodejs'` to line 1; comment block moved to lines 2–3 immediately after.
- **Files modified:** `app/api/cron/check-seats/route.ts`
- **Commit:** Included in 7a831de (same task commit)

## Known Stubs

None — both files are fully implemented. No placeholder text, hardcoded empty values, or TODO markers remain.

## Threat Model — Mitigations Verified

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-03-01 | `auth !== \`Bearer ${CRON_SECRET}\`` returns 401 before any processing | Applied — lines 12–15 of route.ts |
| T-03-03 | `.is('sms_sent_at', null)` gate excludes already-notified alerts from cron runs | Applied — line 22 of route.ts |
| T-03-04 | `adminClient` imported from `lib/supabase/admin.ts` which has `import 'server-only'` guard | Applied — service_role key never reaches client bundle |
| T-03-13 | If `CRON_SECRET` is undefined, `Bearer undefined` comparison still requires exact match; operator must set env var in Vercel | Accepted — documented in route comments |

## Threat Flags

None — no new network endpoints beyond the planned `/api/cron/check-seats` route. No new auth paths, file access patterns, or unplanned trust boundaries introduced.

## Self-Check: PASSED

- [x] `G:/MSU Course/app/api/cron/check-seats/route.ts` exists with `export const runtime = 'nodejs'` as line 1
- [x] `G:/MSU Course/vercel.json` exists with correct path and schedule
- [x] Commit 7a831de exists in git log (Task 1: cron route)
- [x] Commit 1ad68d6 exists in git log (Task 2: vercel.json)
- [x] `npx tsc --noEmit` exits 0 — no TypeScript errors
- [x] `npm run lint` exits 0 — no ESLint errors
- [x] All 15 structural checks on route.ts pass
- [x] Both vercel.json checks pass
