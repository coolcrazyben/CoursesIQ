---
phase: 03-alert-system-cron-worker
plan: 02
subsystem: alerts-api
tags: [post-route, zod, libphonenumber-js, supabase, adminClient, E.164, duplicate-detection, typescript]
dependency_graph:
  requires:
    - lib/supabase/admin.ts (Phase 1 — adminClient export)
    - lib/constants.ts (Phase 2 — CURRENT_TERM_CODE)
    - supabase alerts table unique constraint alerts_crn_phone_unique (Phase 3 Plan 01)
  provides:
    - app/api/alerts/route.ts (POST /api/alerts handler)
  affects:
    - app/api/cron/check-seats/route.ts (Plan 03-03 — inserts rows this cron reads)
    - Frontend AlertForm (Phase 4 — submits to this endpoint)
tech_stack:
  added: []
  patterns:
    - export const runtime = 'nodejs' as absolute first line (DEPL-04 compliance)
    - Zod safeParse for body validation with issues array in 400 response
    - parsePhoneNumber(raw, 'US') with isValid() guard + try/catch for E.164 normalization
    - adminClient (service-role) for both duplicate SELECT and INSERT — no user session
    - .maybeSingle() returns null (not error) on zero rows — correct for duplicate check
    - 23505 unique_violation catch as race-condition-safe duplicate fallback
key_files:
  created:
    - app/api/alerts/route.ts
  modified: []
decisions:
  - runtime comment moved below the export declaration to satisfy must_haves line-1 constraint
metrics:
  duration: "~77 seconds"
  completed: "2026-04-23"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 3 Plan 02: POST /api/alerts Route Handler Summary

**One-liner:** POST /api/alerts with Zod validation, E.164 phone normalization via libphonenumber-js, app-level duplicate SELECT + DB-level 23505 catch, and 201 {id} response on successful Supabase insert.

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Create app/api/alerts/route.ts — POST handler | Done | 7a831de |

## Files Created / Modified

### app/api/alerts/route.ts (new)

**Exports:**
- `POST(request: NextRequest): Promise<NextResponse>` — alert subscription handler
- `runtime = 'nodejs'` — Node.js runtime declaration (DEPL-04)

**Request body schema (Zod):**
```typescript
{
  crn: string (min 1, required),
  subject: string (min 1, required),
  course_number: string (min 1, required),
  phone_number: string (min 1, required),
  email: string (email format, optional),
  course_name: string (optional),
  term_code: string (optional, defaults to CURRENT_TERM_CODE = '202630')
}
```

**Response behavior:**
- `201 { id: uuid }` — alert created, E.164 phone stored in Supabase
- `400 { error: 'Invalid JSON body' }` — malformed JSON
- `400 { error: 'Validation failed', issues: [...] }` — Zod schema failure (missing required fields)
- `400 { error: 'Invalid phone number' }` — libphonenumber-js rejects phone or isValid() false
- `409 { error: 'Alert already exists for this CRN and phone number' }` — app-level duplicate (SELECT found row)
- `409 { error: 'Duplicate alert' }` — DB-level 23505 unique_violation (race condition)
- `500 { error: 'Failed to create alert' }` — Supabase error on SELECT or INSERT

**Phone normalization flow:**
```
raw input "601-555-1234" → parsePhoneNumber('601-555-1234', 'US') → .isValid() → .number → "+16015551234"
```
All US phone formats normalize to E.164: dashes, parentheses, country prefix with/without +.

**Duplicate detection flow:**
1. SELECT id FROM alerts WHERE crn = ? AND phone_number = ? → `.maybeSingle()` → returns null if no match
2. If row found → 409 immediately (no INSERT attempted)
3. INSERT → if error.code === '23505' → 409 (race condition safety net)

## Verification Results

| Check | Result |
|-------|--------|
| File exists at app/api/alerts/route.ts | PASS |
| Line 1 starts with `export const runtime` | PASS |
| `import { z } from 'zod'` present | PASS |
| `import { parsePhoneNumber } from 'libphonenumber-js'` present | PASS |
| `import { adminClient } from '@/lib/supabase/admin'` present | PASS |
| `import { CURRENT_TERM_CODE } from '@/lib/constants'` present | PASS |
| `AlertSchema` Zod schema defined | PASS |
| `safeParse(body)` called | PASS |
| `parsePhoneNumber(phone_number, 'US')` called | PASS |
| `.isValid()` checked | PASS |
| `.maybeSingle()` used for duplicate check | PASS |
| `'23505'` unique_violation code handled | PASS |
| `NextResponse.json({ id: data.id }, { status: 201 })` present | PASS |
| No `Not implemented` stub text | PASS |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved comment below runtime declaration**
- **Found during:** Task 1 verification
- **Issue:** The plan's `<action>` code block included a comment block before `export const runtime = 'nodejs'`. The `must_haves` and `acceptance_criteria` require line 1 to start with `export const runtime`. The structural verification script confirmed this with: `runtime must be first line; found: // Required: imports...`
- **Fix:** Moved the two comment lines below the `export const runtime = 'nodejs'` declaration.
- **Files modified:** app/api/alerts/route.ts
- **Commit:** 7a831de (same commit — fix applied before first commit)

## Known Stubs

None — app/api/alerts/route.ts is fully implemented. All behaviors are wired: Zod validation, phone normalization, duplicate check, Supabase insert, error handling. No placeholder text, hardcoded empty values, or TODO markers remain.

## Threat Model — Mitigations Verified

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-03-02 | `parsePhoneNumber(raw, 'US')` normalizes to E.164; `.isValid()` rejects invalid numbers; only `.number` (E.164) stored, not raw input | Applied — lines 44-52 of route.ts |
| T-03-08 | Zod `.string().min(1)` prevents empty strings; values stored as-is in text columns via parameterized Supabase client | Applied — AlertSchema lines 12-20 |
| T-03-09 | RLS on alerts table has no anon SELECT policy; `adminClient` uses SUPABASE_SERVICE_ROLE_KEY (never NEXT_PUBLIC_) | Enforced by schema + admin.ts import |
| T-03-10 | v1 defers rate limiting per plan — accepted | N/A |
| T-03-11 | Route is intentionally unauthenticated; duplicate protection via CRN+phone uniqueness | By design |

## Threat Flags

None — no new network endpoints, auth paths, or unplanned trust boundaries introduced beyond what the plan specified (POST /api/alerts was the planned endpoint).

## Implementation Notes for Plan 03-03

**Plan 03-03 (GET /api/cron/check-seats)** reads rows inserted by this route:
- Rows have `is_active = true`, `sms_sent_at = null` at creation
- `phone_number` is stored in E.164 — can be passed directly to `sendSeatAlert(phone, ...)`
- `term_code` defaults to `CURRENT_TERM_CODE = '202630'` if not provided by caller

## Self-Check: PASSED

- [x] `G:/MSU Course/app/api/alerts/route.ts` exists
- [x] Line 1 is `export const runtime = 'nodejs'`
- [x] All 13 structural checks pass (node -e verification script)
- [x] Commit 7a831de exists in git log
- [x] `npx tsc --noEmit` exits 0 — no TypeScript errors
- [x] `npm run lint` exits 0 — no ESLint errors
- [x] No "Not implemented" stub text remains
