---
phase: 03-alert-system-cron-worker
plan: 01
subsystem: twilio-client
tags: [twilio, sms, migration, supabase, server-only, singleton, typescript]
dependency_graph:
  requires: [lib/twilio.ts (Phase 1 stub), supabase alerts table (Phase 1 schema)]
  provides: [supabase/migrations/001_alerts_unique.sql, lib/twilio.ts (full implementation)]
  affects: [app/api/alerts/route.ts (Plan 03-02), app/api/cron/check-seats/route.ts (Plan 03-03)]
tech_stack:
  added: []
  patterns:
    - Module-level Twilio singleton initialized once per cold start (mirrors lib/banner.ts)
    - import 'server-only' as first line to prevent client-bundle inclusion at build time
    - Twilio v5 default import called as function — twilio(sid, token) not new twilio(...)
    - sendSeatAlert throws on all errors — error 21610 opt-out handling delegated to cron caller
key_files:
  created:
    - supabase/migrations/001_alerts_unique.sql
  modified:
    - lib/twilio.ts
decisions: []
metrics:
  duration: "~8 minutes (includes manual Supabase checkpoint)"
  completed: "2026-04-23"
  tasks_completed: 3
  files_created: 1
  files_modified: 1
---

# Phase 3 Plan 01: Supabase Unique Constraint Migration + Twilio v5 Client Summary

**One-liner:** Twilio v5 singleton client with server-only guard and sendSeatAlert SMS dispatch, plus PostgreSQL UNIQUE constraint on (crn, phone_number) applied to live Supabase project.

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Create supabase/migrations/001_alerts_unique.sql | Done | 8dc0a66 |
| 2 | [MANUAL] Apply unique constraint in Supabase Dashboard | Done | (manual — no commit) |
| 3 | Replace lib/twilio.ts stub with full Twilio v5 implementation | Done | 7cefc83 |

## Files Created / Modified

### supabase/migrations/001_alerts_unique.sql (new)

```sql
ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_crn_phone_unique UNIQUE (crn, phone_number);
```

Constraint name: `alerts_crn_phone_unique`
Constraint type: `UNIQUE`
Columns: `(crn, phone_number)`
Applied to: live Supabase CoursesIQ project

### lib/twilio.ts (full replacement of Phase 1 stub)

**Exports:**

```typescript
export async function sendSeatAlert(
  phone: string,      // E.164 format e.g. '+16015551234'
  courseName: string, // Human-readable course name
  crn: string         // Course Reference Number
): Promise<string>    // Returns Twilio message.sid
```

**Internal:**
- `twilioClient` — module-level Twilio singleton (one instance per cold start)
- Initialized from `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` env vars

**SMS body format (ALRT-08):**
```
🎉 A seat just opened in ${courseName} (${crn})! Register now before it fills up: mybanner.msstate.edu — CoursesIQ
```

## Constraint Application — Manual Step

The unique constraint was applied by the developer via Supabase SQL Editor (Task 2 checkpoint).

- **SQL run:** `ALTER TABLE public.alerts ADD CONSTRAINT alerts_crn_phone_unique UNIQUE (crn, phone_number);`
- **Result:** "Success. No rows returned."
- **Verification:** User confirmed via information_schema query returning one row with constraint_name = 'alerts_crn_phone_unique' and constraint_type = 'UNIQUE'.
- **Duplicate rows before migration:** None reported — migration applied cleanly without needing the pre-cleanup DELETE.

## Verification Results

| Check | Result |
|-------|--------|
| supabase/migrations/001_alerts_unique.sql exists | PASS |
| File contains `alerts_crn_phone_unique` | PASS |
| File contains `UNIQUE (crn, phone_number)` | PASS |
| File contains `ALTER TABLE public.alerts` | PASS |
| Constraint applied to live DB (user confirmed) | PASS |
| lib/twilio.ts line 1 = `import 'server-only'` | PASS |
| `import twilio from 'twilio'` present | PASS |
| `twilioClient = twilio(` (module-level singleton) | PASS |
| `process.env.TWILIO_ACCOUNT_SID!` present | PASS |
| `process.env.TWILIO_AUTH_TOKEN!` present | PASS |
| `process.env.TWILIO_PHONE_NUMBER!` present | PASS |
| `export async function sendSeatAlert` present | PASS |
| `Promise<string>` return type | PASS |
| `message.sid` returned | PASS |
| `mybanner.msstate.edu` in SMS body | PASS |
| `Not implemented` stub text absent | PASS |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0 |

## Deviations from Plan

None — plan executed exactly as written. The implementation matches the spec in 03-01-PLAN.md without any structural or behavioral changes.

## Known Stubs

None — lib/twilio.ts is fully implemented. No placeholder text, hardcoded empty values, or TODO markers remain. The stub `throw new Error('Not implemented — Phase 3')` has been fully replaced.

## Threat Model — Mitigations Verified

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-03-04 | `import 'server-only'` prevents TWILIO_ACCOUNT_SID/AUTH_TOKEN from reaching client bundle | Applied — line 1 of lib/twilio.ts |
| T-03-05 | SMS body params (courseName, crn) originate from Supabase/Banner — no user-controlled input at dispatch | Accepted — no change needed |
| T-03-06 | sms_sent_at gate prevents duplicate sends per event | Enforced by cron caller (Plan 03-03) |
| T-03-07 | No duplicate (crn, phone_number) rows existed before migration | Clean apply — no pre-cleanup needed |

## Threat Flags

None — no new network endpoints, auth paths, or unplanned trust boundaries introduced.

## Implementation Notes for Plans 03-02 and 03-03

**Plan 03-02 (POST /api/alerts)** can import:
```typescript
// No import needed from lib/twilio.ts for the alerts route
// The unique constraint (alerts_crn_phone_unique) now provides DB-level deduplication
// App-level SELECT + 409 check in the route is defense-in-depth on top of the constraint
```

**Plan 03-03 (GET /api/cron/check-seats)** imports:
```typescript
import { sendSeatAlert } from '@/lib/twilio'
// Route must also declare: export const runtime = 'nodejs'
// Error handling pattern for 21610:
try {
  const sid = await sendSeatAlert(phone, courseName, crn)
  // success — set sms_sent_at, is_active=false, sms_sid
} catch (err: unknown) {
  const code = (err as { code?: number }).code
  if (code === 21610) {
    // opted out — set sms_opted_out = true only; do NOT set sms_sent_at
  }
}
```

## Self-Check: PASSED

- [x] `G:/MSU Course/supabase/migrations/001_alerts_unique.sql` exists with correct DDL
- [x] `G:/MSU Course/lib/twilio.ts` exists with full Twilio v5 implementation
- [x] Commit 8dc0a66 exists in git log (Task 1: migration file)
- [x] Commit 7cefc83 exists in git log (Task 3: Twilio implementation)
- [x] `npx tsc --noEmit` exits 0 — no TypeScript errors
- [x] `npm run lint` exits 0 — no ESLint errors
- [x] `import 'server-only'` is line 1 of lib/twilio.ts
- [x] No "Not implemented" stub text remains in lib/twilio.ts
